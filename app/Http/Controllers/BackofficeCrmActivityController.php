<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompleteBackofficeCrmActivityRequest;
use App\Http\Requests\StoreBackofficeCrmActivityRequest;
use App\Models\CrmActivity;
use App\Models\CrmLead;
use App\Services\CrmLeadService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BackofficeCrmActivityController extends Controller
{
    public function __construct(
        private readonly CrmLeadService $leads
    ) {}

    public function index(
        Request $request
    ): JsonResponse {
        $data = $request->validate([
            'lead_id' => [
                'nullable',
                'uuid',
                'exists:crm_leads,id',
            ],

            'type' => [
                'nullable',
                Rule::in(
                    CrmActivity::types()
                ),
            ],

            'status' => [
                'nullable',
                Rule::in(
                    CrmActivity::statuses()
                ),
            ],

            'assigned_to_user_id' => [
                'nullable',
                'uuid',
                'exists:users,id',
            ],

            'scheduled' => [
                'nullable',
                Rule::in([
                    'overdue',
                    'today',
                    'upcoming',
                ]),
            ],

            'per_page' => [
                'nullable',
                'integer',
                'min:10',
                'max:100',
            ],
        ]);

        $query = CrmActivity::query()
            ->with([
                'lead:id,company_name,nif,current_stage_id',
                'lead.currentStage',
                'assignedTo:id,name,email',
                'createdBy:id,name,email',
            ]);

        if ($leadId = $data['lead_id'] ?? null) {
            $query->where(
                'crm_lead_id',
                $leadId
            );
        }

        if ($type = $data['type'] ?? null) {
            $query->where(
                'type',
                $type
            );
        }

        if ($status = $data['status'] ?? null) {
            $query->where(
                'status',
                $status
            );
        }

        if (
            $assignedTo =
                $data[
                    'assigned_to_user_id'
                ]
                ?? null
        ) {
            $query->where(
                'assigned_to_user_id',
                $assignedTo
            );
        }

        $this->applyScheduledFilter(
            $query,
            $data['scheduled'] ?? null
        );

        $paginator = $query
            ->orderByRaw(
                'scheduled_at IS NULL'
            )
            ->orderBy(
                'scheduled_at'
            )
            ->orderByDesc(
                'created_at'
            )
            ->paginate(
                $data['per_page']
                    ?? 20
            );

        return response()->json([
            'data' => collect(
                $paginator->items()
            )
                ->map(
                    fn (
                        CrmActivity $activity
                    ): array => $this->serialize(
                        $activity
                    )
                )
                ->values(),

            'meta' => [
                'current_page' => $paginator
                    ->currentPage(),

                'last_page' => $paginator
                    ->lastPage(),

                'per_page' => $paginator
                    ->perPage(),

                'total' => $paginator
                    ->total(),

                'from' => $paginator
                    ->firstItem(),

                'to' => $paginator
                    ->lastItem(),
            ],
        ]);
    }

    public function store(
        StoreBackofficeCrmActivityRequest $request,
        string $leadId
    ): JsonResponse {
        $lead = CrmLead::query()
            ->findOrFail(
                $leadId
            );

        $data = $request->validated();

        if (
            $data['status'] ===
                CrmActivity::STATUS_COMPLETED &&
            empty(
                $data['completed_at']
            )
        ) {
            $data['completed_at'] =
                now();
        }

        $activity = $lead
            ->activities()
            ->create([
                ...$data,

                'created_by_user_id' => $request
                    ->user()
                    ?->id,
            ]);

        if (
            in_array(
                $activity->type,
                [
                    CrmActivity::TYPE_CALL,
                    CrmActivity::TYPE_EMAIL,
                    CrmActivity::TYPE_WHATSAPP,
                    CrmActivity::TYPE_MEETING,
                    CrmActivity::TYPE_DEMO,
                ],
                true
            ) &&
            $activity->status ===
                CrmActivity::STATUS_COMPLETED
        ) {
            $this
                ->leads
                ->markContacted(
                    $lead,
                    $activity
                        ->completed_at
                        ?->toDateTimeString()
                );
        }

        $activity->load([
            'lead.currentStage',
            'assignedTo:id,name,email',
            'createdBy:id,name,email',
        ]);

        return response()->json([
            'message' => 'Atividade registada com sucesso.',

            'data' => $this->serialize(
                $activity
            ),
        ], 201);
    }

    public function complete(
        CompleteBackofficeCrmActivityRequest $request,
        string $id
    ): JsonResponse {
        $activity = CrmActivity::query()
            ->with(
                'lead'
            )
            ->findOrFail(
                $id
            );

        if (
            $activity->status !==
            CrmActivity::STATUS_PLANNED
        ) {
            throw ValidationException::withMessages([
                'activity' => 'Apenas atividades planeadas podem ser concluídas.',
            ]);
        }

        $data = $request->validated();

        $activity->status =
            CrmActivity::STATUS_COMPLETED;

        $activity->outcome =
            $data['outcome']
            ?? $activity->outcome;

        $activity->completed_at =
            $data['completed_at']
            ?? now();

        $activity->save();

        if (
            in_array(
                $activity->type,
                [
                    CrmActivity::TYPE_CALL,
                    CrmActivity::TYPE_EMAIL,
                    CrmActivity::TYPE_WHATSAPP,
                    CrmActivity::TYPE_MEETING,
                    CrmActivity::TYPE_DEMO,
                ],
                true
            )
        ) {
            $this
                ->leads
                ->markContacted(
                    $activity->lead,
                    $activity
                        ->completed_at
                        ?->toDateTimeString()
                );
        }

        $activity->load([
            'lead.currentStage',
            'assignedTo:id,name,email',
            'createdBy:id,name,email',
        ]);

        return response()->json([
            'message' => 'Atividade concluída com sucesso.',

            'data' => $this->serialize(
                $activity
            ),
        ]);
    }

    public function cancel(
        string $id
    ): JsonResponse {
        $activity = CrmActivity::query()
            ->findOrFail(
                $id
            );

        if (
            $activity->status !==
            CrmActivity::STATUS_PLANNED
        ) {
            throw ValidationException::withMessages([
                'activity' => 'Apenas atividades planeadas podem ser canceladas.',
            ]);
        }

        $activity->status =
            CrmActivity::STATUS_CANCELED;

        $activity->save();

        $activity->load([
            'lead.currentStage',
            'assignedTo:id,name,email',
            'createdBy:id,name,email',
        ]);

        return response()->json([
            'message' => 'Atividade cancelada.',

            'data' => $this->serialize(
                $activity
            ),
        ]);
    }

    private function applyScheduledFilter(
        Builder $query,
        ?string $filter
    ): void {
        if (! $filter) {
            return;
        }

        if ($filter === 'overdue') {
            $query
                ->where(
                    'status',
                    CrmActivity::STATUS_PLANNED
                )
                ->whereNotNull(
                    'scheduled_at'
                )
                ->where(
                    'scheduled_at',
                    '<',
                    now()
                );

            return;
        }

        if ($filter === 'today') {
            $query->whereBetween(
                'scheduled_at',
                [
                    now()->startOfDay(),
                    now()->endOfDay(),
                ]
            );

            return;
        }

        if ($filter === 'upcoming') {
            $query->where(
                'scheduled_at',
                '>',
                now()->endOfDay()
            );
        }
    }

    private function serialize(
        CrmActivity $activity
    ): array {
        $activity->loadMissing([
            'lead.currentStage',
            'assignedTo',
            'createdBy',
        ]);

        return [
            'id' => $activity->id,

            'type' => $activity->type,

            'status' => $activity->status,

            'subject' => $activity->subject,

            'description' => $activity->description,

            'outcome' => $activity->outcome,

            'metadata' => $activity->metadata,

            'scheduled_at' => $activity
                ->scheduled_at,

            'completed_at' => $activity
                ->completed_at,

            'created_at' => $activity
                ->created_at,

            'updated_at' => $activity
                ->updated_at,

            'lead' => $activity->lead
                ? [
                    'id' => $activity
                        ->lead
                        ->id,

                    'company_name' => $activity
                        ->lead
                        ->company_name,

                    'nif' => $activity
                        ->lead
                        ->nif,

                    'stage' => $activity
                        ->lead
                        ->currentStage
                        ? [
                            'id' => $activity
                                ->lead
                                ->currentStage
                                ->id,

                            'name' => $activity
                                ->lead
                                ->currentStage
                                ->name,

                            'color' => $activity
                                ->lead
                                ->currentStage
                                ->color,
                        ]
                        : null,
                ]
                : null,

            'assigned_to' => $activity->assignedTo
                ? [
                    'id' => $activity
                        ->assignedTo
                        ->id,

                    'name' => $activity
                        ->assignedTo
                        ->name,

                    'email' => $activity
                        ->assignedTo
                        ->email,
                ]
                : null,

            'created_by' => $activity->createdBy
                ? [
                    'id' => $activity
                        ->createdBy
                        ->id,

                    'name' => $activity
                        ->createdBy
                        ->name,
                ]
                : null,
        ];
    }
}
