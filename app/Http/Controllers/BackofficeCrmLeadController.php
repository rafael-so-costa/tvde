<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListBackofficeCrmLeadsRequest;
use App\Http\Requests\StoreBackofficeCrmLeadRequest;
use App\Http\Requests\UpdateBackofficeCrmLeadRequest;
use App\Models\CrmLead;
use App\Services\CrmLeadService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class BackofficeCrmLeadController extends Controller
{
    public function __construct(
        private readonly CrmLeadService $leads
    ) {}

    public function index(
        ListBackofficeCrmLeadsRequest $request
    ): JsonResponse {
        $data = $request->validated();

        $query = CrmLead::query()
            ->with([
                'currentStage',
                'assignedTo:id,name,email',
                'convertedTenant:id,nome,slug,nif,ativo',
                'tvdeOperator:id,nif,display_name',
                'tags',
            ]);

        if ($search = $data['search'] ?? null) {
            $query->where(
                function (
                    Builder $query
                ) use ($search): void {
                    $query
                        ->where(
                            'company_name',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'nif',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'contact_name',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'email',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'phone',
                            'like',
                            "%{$search}%"
                        );
                }
            );
        }

        if ($stageId = $data['stage_id'] ?? null) {
            $query->where(
                'current_stage_id',
                $stageId
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

        if ($priority = $data['priority'] ?? null) {
            $query->where(
                'priority',
                $priority
            );
        }

        if ($source = $data['source'] ?? null) {
            $query->where(
                'source',
                $source
            );
        }

        if ($district = $data['district'] ?? null) {
            $query->where(
                'district',
                $district
            );
        }

        if (
            $municipality =
                $data['municipality']
                ?? null
        ) {
            $query->where(
                'municipality',
                $municipality
            );
        }

        if ($tagId = $data['tag_id'] ?? null) {
            $query->whereHas(
                'tags',
                fn (Builder $query) => $query->where(
                    'crm_tags.id',
                    $tagId
                )
            );
        }

        if (
            ($data['converted'] ?? null) ===
            'yes'
        ) {
            $query->whereNotNull(
                'converted_tenant_id'
            );
        }

        if (
            ($data['converted'] ?? null) ===
            'no'
        ) {
            $query->whereNull(
                'converted_tenant_id'
            );
        }

        $this->applyFollowUpFilter(
            $query,
            $data['follow_up'] ?? null
        );

        $paginator = $query
            ->orderByRaw(
                'next_follow_up_at IS NULL'
            )
            ->orderBy(
                'next_follow_up_at'
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
                    fn (CrmLead $lead) => $this->summary(
                        $lead
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
        StoreBackofficeCrmLeadRequest $request
    ): JsonResponse {
        $lead = $this
            ->leads
            ->create(
                $request->validated(),
                $request->user()
            );

        return response()->json([
            'message' => 'Lead criado com sucesso.',

            'data' => $this->detail(
                $lead
            ),
        ], 201);
    }

    public function show(
        string $id
    ): JsonResponse {
        $lead = CrmLead::query()
            ->findOrFail(
                $id
            );

        $lead = $this
            ->leads
            ->loadLead(
                $lead
            );

        return response()->json([
            'data' => $this->detail(
                $lead
            ),
        ]);
    }

    public function update(
        UpdateBackofficeCrmLeadRequest $request,
        string $id
    ): JsonResponse {
        $lead = CrmLead::query()
            ->findOrFail(
                $id
            );

        $lead = $this
            ->leads
            ->update(
                $lead,
                $request->validated()
            );

        return response()->json([
            'message' => 'Lead atualizado com sucesso.',

            'data' => $this->detail(
                $lead
            ),
        ]);
    }

    private function applyFollowUpFilter(
        Builder $query,
        ?string $filter
    ): void {
        if (! $filter) {
            return;
        }

        if ($filter === 'none') {
            $query->whereNull(
                'next_follow_up_at'
            );

            return;
        }

        if ($filter === 'overdue') {
            $query
                ->whereNotNull(
                    'next_follow_up_at'
                )
                ->where(
                    'next_follow_up_at',
                    '<',
                    now()->startOfDay()
                );

            return;
        }

        if ($filter === 'today') {
            $query->whereBetween(
                'next_follow_up_at',
                [
                    now()->startOfDay(),
                    now()->endOfDay(),
                ]
            );

            return;
        }

        if ($filter === 'upcoming') {
            $query->where(
                'next_follow_up_at',
                '>',
                now()->endOfDay()
            );
        }
    }

    private function summary(
        CrmLead $lead
    ): array {
        $lead->loadMissing([
            'currentStage',
            'assignedTo',
            'convertedTenant',
            'tvdeOperator',
            'tags',
        ]);

        return [
            'id' => $lead->id,

            'nif' => $lead->nif,

            'company_name' => $lead->company_name,

            'contact_name' => $lead->contact_name,

            'email' => $lead->email,

            'phone' => $lead->phone,

            'district' => $lead->district,

            'municipality' => $lead->municipality,

            'source' => $lead->source,

            'source_detail' => $lead->source_detail,

            'priority' => $lead->priority,

            'last_contacted_at' => $lead->last_contacted_at,

            'next_follow_up_at' => $lead->next_follow_up_at,

            'converted_at' => $lead->converted_at,

            'created_at' => $lead->created_at,

            'updated_at' => $lead->updated_at,

            'stage' => $this->stage(
                $lead->currentStage
            ),

            'assigned_to' => $lead->assignedTo
                    ? [
                        'id' => $lead
                            ->assignedTo
                            ->id,

                        'name' => $lead
                            ->assignedTo
                            ->name,

                        'email' => $lead
                            ->assignedTo
                            ->email,
                    ]
                    : null,

            'converted_tenant' => $lead->convertedTenant
                    ? [
                        'id' => $lead
                            ->convertedTenant
                            ->id,

                        'nome' => $lead
                            ->convertedTenant
                            ->nome,

                        'slug' => $lead
                            ->convertedTenant
                            ->slug,

                        'nif' => $lead
                            ->convertedTenant
                            ->nif,

                        'ativo' => $lead
                            ->convertedTenant
                            ->ativo,
                    ]
                    : null,

            'tvde_operator' => $lead->tvdeOperator
                    ? [
                        'id' => $lead
                            ->tvdeOperator
                            ->id,

                        'nif' => $lead
                            ->tvdeOperator
                            ->nif,

                        'display_name' => $lead
                            ->tvdeOperator
                            ->display_name,
                    ]
                    : null,

            'tags' => $lead
                ->tags
                ->map(
                    fn ($tag) => [
                        'id' => $tag->id,

                        'name' => $tag->name,

                        'slug' => $tag->slug,

                        'color' => $tag->color,
                    ]
                )
                ->values(),
        ];
    }

    private function detail(
        CrmLead $lead
    ): array {
        $lead = $this
            ->leads
            ->loadLead(
                $lead
            );

        return [
            ...$this->summary(
                $lead
            ),

            'website' => $lead->website,

            'notes' => $lead->notes,

            'lost_reason' => $lead->lost_reason,

            'metadata' => $lead->metadata,

            'created_by' => $lead->createdBy
                    ? [
                        'id' => $lead
                            ->createdBy
                            ->id,

                        'name' => $lead
                            ->createdBy
                            ->name,

                        'email' => $lead
                            ->createdBy
                            ->email,
                    ]
                    : null,

            'stage_history' => $lead
                ->stageHistories
                ->map(
                    fn ($history) => [
                        'id' => $history->id,

                        'from_stage' => $this->stage(
                            $history
                                ->fromStage
                        ),

                        'to_stage' => $this->stage(
                            $history
                                ->toStage
                        ),

                        'changed_by' => $history
                            ->changedBy
                                ? [
                                    'id' => $history
                                        ->changedBy
                                        ->id,

                                    'name' => $history
                                        ->changedBy
                                        ->name,
                                ]
                                : null,

                        'note' => $history
                            ->note,

                        'changed_at' => $history
                            ->changed_at,
                    ]
                )
                ->values(),

            'activities' => $lead
                ->activities
                ->map(
                    fn ($activity) => $this
                        ->activity(
                            $activity
                        )
                )
                ->values(),
        ];
    }

    private function stage(
        $stage
    ): ?array {
        if (! $stage) {
            return null;
        }

        return [
            'id' => $stage->id,
            'code' => $stage->code,
            'name' => $stage->name,
            'category' => $stage->category,
            'color' => $stage->color,
            'position' => $stage->position,
            'is_terminal' => $stage->is_terminal,
        ];
    }

    private function activity(
        $activity
    ): array {
        return [
            'id' => $activity->id,
            'type' => $activity->type,
            'status' => $activity->status,
            'subject' => $activity->subject,
            'description' => $activity->description,
            'outcome' => $activity->outcome,
            'scheduled_at' => $activity->scheduled_at,
            'completed_at' => $activity->completed_at,
            'created_at' => $activity->created_at,

            'assigned_to' => $activity->assignedTo
                    ? [
                        'id' => $activity
                            ->assignedTo
                            ->id,

                        'name' => $activity
                            ->assignedTo
                            ->name,
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
