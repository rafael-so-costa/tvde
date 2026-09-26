<?php

namespace App\Http\Controllers;

use App\Http\Requests\ResolveAlertRequest;
use App\Http\Requests\SnoozeAlertRequest;
use App\Models\Alert;
use App\Services\AlertService;
use App\Services\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Database\Eloquent\Relations\Relation;
use App\Services\PermissionService;

class AlertController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private AlertService $service,
        private PermissionService $permissionService
    ) {}

    public function index(
        Request $request
    ): JsonResponse {
        $validated = $request->validate([
            'status' => [
                'nullable',
                Rule::in([
                    'open',
                    'resolved',
                    'all',
                ]),
            ],

            'severity' => [
                'nullable',
                Rule::in([
                    'low',
                    'medium',
                    'high',
                    'critical',
                ]),
            ],

            'category' => [
                'nullable',
                'string',
                'max:60',
            ],

            'unread' => [
                'nullable',
                'boolean',
            ],

            'acknowledged' => [
                'nullable',
                'boolean',
            ],

            'include_snoozed' => [
                'nullable',
                'boolean',
            ],

            'search' => [
                'nullable',
                'string',
                'max:150',
            ],

            'page' => [
                'nullable',
                'integer',
                'min:1',
            ],

            'per_page' => [
                'nullable',
                'integer',
                'min:1',
                'max:100',
            ],
        ]);

        $tenantId = $this->tenantId();
        $userId = $request->user()->id;

        $query = Alert::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereHas(
                'recipients',
                fn(Builder $query) =>
                $this->recipientScope(
                    $query,
                    $tenantId,
                    $userId
                )
            )
            ->with([
                'rule:id,code,name,category',
                'recipients' => function ($query) use (
                    $tenantId,
                    $userId
                ) {
                    $this->recipientScope(
                        $query,
                        $tenantId,
                        $userId
                    );
                },
            ]);

        $status =
            $validated['status']
            ?? 'open';

        if ($status !== 'all') {
            $query->where(
                'status',
                $status
            );
        }

        if (!empty($validated['severity'])) {
            $query->where(
                'severity',
                $validated['severity']
            );
        }

        if (!empty($validated['category'])) {
            $query->where(
                'category',
                $validated['category']
            );
        }

        if (array_key_exists(
            'unread',
            $validated
        )) {
            $unread = (bool)
            $validated['unread'];

            $query->whereHas(
                'recipients',
                function (Builder $query) use (
                    $tenantId,
                    $userId,
                    $unread
                ) {
                    $this->recipientScope(
                        $query,
                        $tenantId,
                        $userId
                    );

                    $unread
                        ? $query->whereNull(
                            'read_at'
                        )
                        : $query->whereNotNull(
                            'read_at'
                        );
                }
            );
        }

        if (array_key_exists(
            'acknowledged',
            $validated
        )) {
            $acknowledged = (bool)
            $validated['acknowledged'];

            $query->whereHas(
                'recipients',
                function (Builder $query) use (
                    $tenantId,
                    $userId,
                    $acknowledged
                ) {
                    $this->recipientScope(
                        $query,
                        $tenantId,
                        $userId
                    );

                    $acknowledged
                        ? $query->whereNotNull(
                            'acknowledged_at'
                        )
                        : $query->whereNull(
                            'acknowledged_at'
                        );
                }
            );
        }

        $includeSnoozed = (bool)(
            $validated['include_snoozed']
            ?? false
        );

        if (!$includeSnoozed) {
            $query->whereHas(
                'recipients',
                function (Builder $query) use (
                    $tenantId,
                    $userId
                ) {
                    $this->recipientScope(
                        $query,
                        $tenantId,
                        $userId
                    );

                    $query->where(
                        function (Builder $query) {
                            $query
                                ->whereNull(
                                    'snoozed_until'
                                )
                                ->orWhere(
                                    'snoozed_until',
                                    '<=',
                                    now()
                                );
                        }
                    );
                }
            );
        }

        if (!empty($validated['search'])) {
            $search = trim(
                $validated['search']
            );

            $query->where(
                function (Builder $query) use (
                    $search
                ) {
                    $query
                        ->where(
                            'title',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'message',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'rule_code',
                            'like',
                            "%{$search}%"
                        );
                }
            );
        }

        $this->orderAlerts(
            $query
        );

        $paginator = $query->paginate(
            (int)(
                $validated['per_page']
                ?? 30
            )
        );

        return response()->json([
            'data' => collect(
                $paginator->items()
            )
                ->map(
                    fn(Alert $alert) =>
                    $this->serialize(
                        $alert
                    )
                )
                ->values(),

            'meta' => [
                'current_page' =>
                $paginator->currentPage(),

                'last_page' =>
                $paginator->lastPage(),

                'per_page' =>
                $paginator->perPage(),

                'total' =>
                $paginator->total(),
            ],
        ]);
    }

    public function summary(
        Request $request
    ): JsonResponse {
        $tenantId = $this->tenantId();
        $userId = $request->user()->id;

        $visible = $this->visibleOpenQuery(
            $tenantId,
            $userId
        );

        $unread = (clone $visible)
            ->whereHas(
                'recipients',
                function (Builder $query) use (
                    $tenantId,
                    $userId
                ) {
                    $this->recipientScope(
                        $query,
                        $tenantId,
                        $userId
                    );

                    $query->whereNull(
                        'read_at'
                    );
                }
            )
            ->count();

        $critical = (clone $visible)
            ->where(
                'severity',
                'critical'
            )
            ->count();

        $high = (clone $visible)
            ->where(
                'severity',
                'high'
            )
            ->count();

        $snoozed = Alert::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'status',
                'open'
            )
            ->whereHas(
                'recipients',
                function (Builder $query) use (
                    $tenantId,
                    $userId
                ) {
                    $this->recipientScope(
                        $query,
                        $tenantId,
                        $userId
                    );

                    $query->where(
                        'snoozed_until',
                        '>',
                        now()
                    );
                }
            )
            ->count();

        $items = $this->visibleOpenQuery(
            $tenantId,
            $userId
        )
            ->with([
                'rule:id,code,name,category',
                'recipients' => function ($query) use (
                    $tenantId,
                    $userId
                ) {
                    $this->recipientScope(
                        $query,
                        $tenantId,
                        $userId
                    );
                },
            ]);

        $this->orderAlerts(
            $items
        );

        return response()->json([
            'data' => [
                'total' => $visible->count(),
                'unread' => $unread,
                'critical' => $critical,
                'high' => $high,
                'snoozed' => $snoozed,

                'can_resolve' =>
                $this->permissionService->allows(
                    $request->user(),
                    'alertas',
                    'configurar',
                    $tenantId
                ),

                'items' => $items
                    ->limit(8)
                    ->get()
                    ->map(
                        fn(Alert $alert) =>
                        $this->serialize(
                            $alert
                        )
                    )
                    ->values(),
            ],
        ]);
    }

    public function show(
        Request $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'data' => $this->serialize(
                $this->findRecipientAlert(
                    $request,
                    $id
                )
            ),
        ]);
    }

    public function markRead(
        Request $request,
        string $id
    ): JsonResponse {
        $alert = $this->findRecipientAlert(
            $request,
            $id
        );

        $recipient =
            $this->service->markRead(
                $alert,
                $request->user(),
                $this->tenantId()
            );

        return response()->json([
            'message' =>
            'Alerta marcado como lido.',

            'data' => $this
                ->recipientData(
                    $recipient
                ),
        ]);
    }

    public function markAllRead(
        Request $request
    ): JsonResponse {
        $count =
            $this->service->markAllRead(
                $request->user(),
                $this->tenantId()
            );

        return response()->json([
            'message' =>
            'Alertas marcados como lidos.',

            'data' => [
                'updated' => $count,
            ],
        ]);
    }

    public function acknowledge(
        Request $request,
        string $id
    ): JsonResponse {
        $alert = $this->findRecipientAlert(
            $request,
            $id
        );

        $recipient =
            $this->service->acknowledge(
                $alert,
                $request->user(),
                $this->tenantId()
            );

        return response()->json([
            'message' =>
            'Alerta reconhecido.',

            'data' => $this
                ->recipientData(
                    $recipient
                ),
        ]);
    }

    public function snooze(
        SnoozeAlertRequest $request,
        string $id
    ): JsonResponse {
        $alert = $this->findRecipientAlert(
            $request,
            $id
        );

        $until = CarbonImmutable::parse(
            $request->validated(
                'snoozed_until'
            )
        );

        $recipient =
            $this->service->snooze(
                $alert,
                $request->user(),
                $this->tenantId(),
                $until
            );

        return response()->json([
            'message' =>
            'Alerta adiado.',

            'data' => $this
                ->recipientData(
                    $recipient
                ),
        ]);
    }

    public function resolve(
        ResolveAlertRequest $request,
        string $id
    ): JsonResponse {
        $alert = Alert::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->findOrFail(
                $id
            );

        $alert = $this->service->resolve(
            $alert,
            $request->user(),
            $this->tenantId(),
            $request->validated(
                'note'
            )
        );

        return response()->json([
            'message' =>
            'Alerta resolvido.',

            'data' => $this->serialize(
                $alert
            ),
        ]);
    }

    private function visibleOpenQuery(
        string $tenantId,
        string $userId
    ): Builder {
        return Alert::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'status',
                'open'
            )
            ->whereHas(
                'recipients',
                function (Builder $query) use (
                    $tenantId,
                    $userId
                ) {
                    $this->recipientScope(
                        $query,
                        $tenantId,
                        $userId
                    );

                    $query->where(
                        function (Builder $query) {
                            $query
                                ->whereNull(
                                    'snoozed_until'
                                )
                                ->orWhere(
                                    'snoozed_until',
                                    '<=',
                                    now()
                                );
                        }
                    );
                }
            );
    }

    private function recipientScope(
        Builder|Relation $query,
        string $tenantId,
        string $userId
    ): void {
        $query
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'user_id',
                $userId
            )
            ->where(
                'active',
                true
            );
    }

    private function findRecipientAlert(
        Request $request,
        string $id
    ): Alert {
        $tenantId = $this->tenantId();
        $userId = $request->user()->id;

        return Alert::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereHas(
                'recipients',
                fn(Builder $query) =>
                $this->recipientScope(
                    $query,
                    $tenantId,
                    $userId
                )
            )
            ->with([
                'rule:id,code,name,category',
                'recipients' => function ($query) use (
                    $tenantId,
                    $userId
                ) {
                    $this->recipientScope(
                        $query,
                        $tenantId,
                        $userId
                    );
                },
            ])
            ->findOrFail(
                $id
            );
    }

    private function orderAlerts(
        Builder $query
    ): void {
        $query
            ->orderByRaw(
                <<<'SQL'
CASE severity
    WHEN 'critical' THEN 0
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
    ELSE 4
END
SQL
            )
            ->orderByRaw(
                'CASE WHEN due_at IS NULL THEN 1 ELSE 0 END'
            )
            ->orderBy(
                'due_at'
            )
            ->orderByDesc(
                'triggered_at'
            );
    }

    private function serialize(
        Alert $alert
    ): array {
        $recipient =
            $alert->relationLoaded(
                'recipients'
            )
            ? $alert->recipients->first()
            : null;

        return [
            'id' => $alert->id,
            'rule_code' => $alert->rule_code,

            'rule' => $alert->rule
                ? [
                    'id' => $alert->rule->id,
                    'code' => $alert->rule->code,
                    'name' => $alert->rule->name,
                    'category' => $alert->rule->category,
                ]
                : null,

            'source_type' =>
            $alert->source_type,

            'source_id' =>
            $alert->source_id,

            'category' => $alert->category,
            'severity' => $alert->severity,
            'status' => $alert->status,

            'title' => $alert->title,
            'message' => $alert->message,

            'due_at' =>
            $alert->due_at?->toISOString(),

            'triggered_at' =>
            $alert
                ->triggered_at
                ?->toISOString(),

            'resolved_at' =>
            $alert
                ->resolved_at
                ?->toISOString(),

            'resolution_type' =>
            $alert->resolution_type,

            'resolution_note' =>
            $alert->resolution_note,

            'action_url' =>
            $alert->action_url,

            'metadata' =>
            $alert->metadata,

            'recipient' => $recipient
                ? $this->recipientData(
                    $recipient
                )
                : null,
        ];
    }

    private function recipientData(
        $recipient
    ): array {
        return [
            'id' => $recipient->id,

            'read_at' =>
            $recipient
                ->read_at
                ?->toISOString(),

            'acknowledged_at' =>
            $recipient
                ->acknowledged_at
                ?->toISOString(),

            'snoozed_until' =>
            $recipient
                ->snoozed_until
                ?->toISOString(),

            'active' =>
            (bool)$recipient->active,
        ];
    }

    private function tenantId(): string
    {
        if (!$this->tenantContext->hasTenant()) {
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        return $this
            ->tenantContext
            ->requireId();
    }
}
