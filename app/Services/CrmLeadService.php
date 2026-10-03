<?php

namespace App\Services;

use App\Models\CrmLead;
use App\Models\CrmLeadStageHistory;
use App\Models\CrmPipelineStage;
use App\Models\Tenant;
use App\Models\TvdeOperator;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CrmLeadService
{
    public function create(
        array $data,
        ?User $actor = null
    ): CrmLead {
        return DB::transaction(
            function () use (
                $data,
                $actor
            ): CrmLead {
                $stage = $this->resolveInitialStage(
                    $data['current_stage_id']
                        ?? null
                );

                $tagIds = $data['tag_ids']
                    ?? [];

                unset(
                    $data['tag_ids'],
                    $data['current_stage_id']
                );

                $lead = CrmLead::create([
                    ...$data,

                    'current_stage_id' => $stage->id,

                    'created_by_user_id' => $actor?->id,

                    'source' => $data['source']
                        ?? CrmLead::SOURCE_MANUAL,

                    'priority' => $data['priority']
                        ?? CrmLead::PRIORITY_NORMAL,
                ]);

                $this->syncTags(
                    $lead,
                    $tagIds
                );

                $this->recordStageHistory(
                    lead: $lead,
                    fromStage: null,
                    toStage: $stage,
                    actor: $actor,
                    note: 'Lead criado.'
                );

                return $this->loadLead(
                    $lead
                );
            }
        );
    }

    public function update(
        CrmLead $lead,
        array $data
    ): CrmLead {
        return DB::transaction(
            function () use (
                $lead,
                $data
            ): CrmLead {
                $tagIds = array_key_exists(
                    'tag_ids',
                    $data
                )
                    ? $data['tag_ids']
                    : null;

                unset(
                    $data['tag_ids']
                );

                /*
                 * Mudanças de pipeline passam exclusivamente
                 * por moveStage(), garantindo histórico.
                 */
                unset(
                    $data['current_stage_id'],
                    $data['converted_tenant_id'],
                    $data['converted_at']
                );

                $lead->fill(
                    $data
                );

                $lead->save();

                if ($tagIds !== null) {
                    $this->syncTags(
                        $lead,
                        $tagIds
                    );
                }

                return $this->loadLead(
                    $lead
                );
            }
        );
    }

    public function createFromOperators(
        array $operatorIds,
        ?User $actor = null,
        ?string $assignedToUserId = null,
        string $priority = CrmLead::PRIORITY_NORMAL,
        array $tagIds = []
    ): array {
        return DB::transaction(
            function () use (
                $operatorIds,
                $actor,
                $assignedToUserId,
                $priority,
                $tagIds
            ): array {
                $stage = $this->defaultStage();

                $operators = TvdeOperator::query()
                    ->whereIn(
                        'id',
                        $operatorIds
                    )
                    ->with([
                        'registrations' => function (
                            $query
                        ): void {
                            $query
                                ->where(
                                    'active',
                                    true
                                )
                                ->orderBy(
                                    'source'
                                );
                        },

                        'nifEnrichment',
                    ])
                    ->get();

                $tenantNifs = Tenant::query()
                    ->whereIn(
                        'nif',
                        $operators
                            ->pluck('nif')
                            ->filter()
                            ->values()
                    )
                    ->pluck(
                        'nif'
                    )
                    ->filter()
                    ->flip();

                $existingByOperator =
                    CrmLead::query()
                        ->whereIn(
                            'tvde_operator_id',
                            $operators
                                ->pluck('id')
                        )
                        ->get()
                        ->keyBy(
                            'tvde_operator_id'
                        );

                $existingByNif =
                    CrmLead::query()
                        ->whereIn(
                            'nif',
                            $operators
                                ->pluck('nif')
                                ->filter()
                        )
                        ->get()
                        ->keyBy(
                            'nif'
                        );

                $created = [];
                $existing = [];
                $customers = [];

                foreach (
                    $operators as $operator
                ) {
                    if (
                        $tenantNifs->has(
                            $operator->nif
                        )
                    ) {
                        $customers[] = [
                            'operator_id' => $operator->id,

                            'nif' => $operator->nif,

                            'company_name' => $operator
                                ->display_name,
                        ];

                        continue;
                    }

                    $existingLead =
                        $existingByOperator
                            ->get(
                                $operator->id
                            )
                        ??
                        $existingByNif
                            ->get(
                                $operator->nif
                            );

                    if ($existingLead) {
                        $existing[] = [
                            'operator_id' => $operator->id,

                            'lead_id' => $existingLead->id,

                            'nif' => $operator->nif,

                            'company_name' => $existingLead
                                ->company_name,
                        ];

                        continue;
                    }

                    $registration =
                        $operator
                            ->registrations
                            ->first();

                    $enrichment =
                        $operator
                            ->nifEnrichment;

                    $contacts =
                        is_array(
                            $enrichment?->contacts
                        )
                            ? $enrichment
                                ->contacts
                            : [];

                    $lead = CrmLead::create([
                        'tvde_operator_id' => $operator->id,

                        'current_stage_id' => $stage->id,

                        'assigned_to_user_id' => $assignedToUserId,

                        'created_by_user_id' => $actor?->id,

                        'nif' => $operator->nif,

                        'company_name' => $enrichment?->title
                            ?: $operator
                                ->display_name,

                        'email' => $this->contactValue(
                            $contacts,
                            [
                                'email',
                                'emails',
                                'mail',
                            ]
                        ),

                        'phone' => $this->contactValue(
                            $contacts,
                            [
                                'phone',
                                'phones',
                                'telephone',
                                'telefone',
                            ]
                        ),

                        'website' => $this->contactValue(
                            $contacts,
                            [
                                'website',
                                'web',
                                'url',
                            ]
                        ),

                        'district' => $registration
                            ?->district,

                        'municipality' => $registration
                            ?->municipality,

                        'source' => CrmLead::SOURCE_TVDE,

                        'source_detail' => $registration
                            ?->source,

                        'priority' => $priority,

                        'metadata' => [
                            'tvde_source' => $registration
                                ?->source,

                            'tvde_registration_id' => $registration
                                ?->id,

                            'nif_enriched' => $enrichment !==
                                null,

                            'nif_lookup_status' => $enrichment
                                ?->lookup_status,
                        ],
                    ]);

                    $this->syncTags(
                        $lead,
                        $tagIds
                    );

                    $this->recordStageHistory(
                        lead: $lead,
                        fromStage: null,
                        toStage: $stage,
                        actor: $actor,
                        note: 'Lead criado a partir da Base TVDE.'
                    );

                    $created[] = [
                        'operator_id' => $operator->id,

                        'lead_id' => $lead->id,

                        'nif' => $lead->nif,

                        'company_name' => $lead
                            ->company_name,
                    ];

                    $existingByOperator
                        ->put(
                            $operator->id,
                            $lead
                        );

                    if ($operator->nif) {
                        $existingByNif->put(
                            $operator->nif,
                            $lead
                        );
                    }
                }

                return [
                    'created' => $created,

                    'existing' => $existing,

                    'customers' => $customers,

                    'counts' => [
                        'requested' => count(
                            $operatorIds
                        ),

                        'created' => count(
                            $created
                        ),

                        'existing' => count(
                            $existing
                        ),

                        'customers' => count(
                            $customers
                        ),
                    ],
                ];
            }
        );
    }

    public function moveStage(
        CrmLead $lead,
        CrmPipelineStage $stage,
        ?User $actor = null,
        ?string $note = null,
        ?string $lostReason = null,
        ?string $nextFollowUpAt = null,
        bool $allowCustomer = false
    ): CrmLead {
        return DB::transaction(
            function () use (
                $lead,
                $stage,
                $actor,
                $note,
                $lostReason,
                $nextFollowUpAt,
                $allowCustomer
            ): CrmLead {
                if (! $stage->is_active) {
                    throw ValidationException::withMessages([
                        'stage_id' => 'A etapa selecionada está inativa.',
                    ]);
                }

                if (
                    $stage->category ===
                        CrmPipelineStage::CATEGORY_WON &&
                    ! $allowCustomer
                ) {
                    throw ValidationException::withMessages([
                        'stage_id' => 'A etapa Cliente só pode ser alcançada através da conversão do lead.',
                    ]);
                }

                if (
                    $stage->category ===
                        CrmPipelineStage::CATEGORY_LOST &&
                    trim(
                        (string) $lostReason
                    ) === ''
                ) {
                    throw ValidationException::withMessages([
                        'lost_reason' => 'Indique o motivo pelo qual o lead foi encerrado.',
                    ]);
                }

                $fromStage = $lead
                    ->currentStage()
                    ->first();

                if (
                    $fromStage?->id ===
                    $stage->id
                ) {
                    if (
                        $nextFollowUpAt !==
                        null
                    ) {
                        $lead
                            ->next_follow_up_at =
                            $nextFollowUpAt;

                        $lead->save();
                    }

                    return $this->loadLead(
                        $lead
                    );
                }

                $lead->current_stage_id =
                    $stage->id;

                if (
                    $stage->category ===
                    CrmPipelineStage::CATEGORY_LOST
                ) {
                    $lead->lost_reason =
                        trim(
                            (string) $lostReason
                        );

                    $lead->next_follow_up_at =
                        null;
                } else {
                    $lead->lost_reason =
                        null;

                    if (
                        $nextFollowUpAt !==
                        null
                    ) {
                        $lead
                            ->next_follow_up_at =
                            $nextFollowUpAt;
                    }
                }

                $lead->save();

                $this->recordStageHistory(
                    lead: $lead,
                    fromStage: $fromStage,
                    toStage: $stage,
                    actor: $actor,
                    note: $note
                );

                return $this->loadLead(
                    $lead
                );
            }
        );
    }

    public function markContacted(
        CrmLead $lead,
        ?string $at = null
    ): CrmLead {
        $lead->last_contacted_at =
            $at
                ? $at
                : now();

        $lead->save();

        return $lead->refresh();
    }

    public function loadLead(
        CrmLead $lead
    ): CrmLead {
        return $lead
            ->refresh()
            ->load([
                'currentStage',

                'assignedTo:id,name,email',

                'createdBy:id,name,email',

                'convertedTenant:id,nome,slug,nif,email,telefone,ativo,saas_plan_id',

                'tvdeOperator:id,nif,display_name',

                'tags',

                'stageHistories' => function (
                    $query
                ): void {
                    $query
                        ->with([
                            'fromStage',
                            'toStage',
                            'changedBy:id,name,email',
                        ])
                        ->latest(
                            'changed_at'
                        );
                },

                'activities' => function (
                    $query
                ): void {
                    $query
                        ->with([
                            'assignedTo:id,name,email',
                            'createdBy:id,name,email',
                        ])
                        ->latest(
                            'created_at'
                        );
                },
            ]);
    }

    public function defaultStage(): CrmPipelineStage
    {
        $stage = CrmPipelineStage::query()
            ->where(
                'is_default',
                true
            )
            ->where(
                'is_active',
                true
            )
            ->orderBy(
                'position'
            )
            ->first();

        if (! $stage) {
            throw ValidationException::withMessages([
                'pipeline' => 'O pipeline CRM não possui uma etapa inicial ativa.',
            ]);
        }

        return $stage;
    }

    private function resolveInitialStage(
        ?string $stageId
    ): CrmPipelineStage {
        if (! $stageId) {
            return $this->defaultStage();
        }

        $stage = CrmPipelineStage::query()
            ->where(
                'id',
                $stageId
            )
            ->where(
                'is_active',
                true
            )
            ->first();

        if (! $stage) {
            throw ValidationException::withMessages([
                'current_stage_id' => 'A etapa inicial selecionada não está disponível.',
            ]);
        }

        if ($stage->is_terminal) {
            throw ValidationException::withMessages([
                'current_stage_id' => 'Um novo lead não pode ser criado diretamente numa etapa terminal.',
            ]);
        }

        return $stage;
    }

    private function recordStageHistory(
        CrmLead $lead,
        ?CrmPipelineStage $fromStage,
        CrmPipelineStage $toStage,
        ?User $actor,
        ?string $note
    ): CrmLeadStageHistory {
        return CrmLeadStageHistory::create([
            'crm_lead_id' => $lead->id,

            'from_stage_id' => $fromStage?->id,

            'to_stage_id' => $toStage->id,

            'changed_by_user_id' => $actor?->id,

            'note' => $note,

            'changed_at' => now(),
        ]);
    }

    private function syncTags(
        CrmLead $lead,
        array $tagIds
    ): void {
        $syncData = [];

        foreach (
            array_values(
                array_unique(
                    $tagIds
                )
            ) as $tagId
        ) {
            $syncData[$tagId] = [
                'id' => (string) str()->uuid(),
            ];
        }

        $lead
            ->tags()
            ->sync(
                $syncData
            );
    }

    private function contactValue(
        array $contacts,
        array $keys
    ): ?string {
        foreach (
            $keys as $key
        ) {
            if (
                ! array_key_exists(
                    $key,
                    $contacts
                )
            ) {
                continue;
            }

            $value = $contacts[
                $key
            ];

            if (is_array($value)) {
                $value = collect(
                    $value
                )
                    ->flatten()
                    ->first(
                        fn ($item) => is_scalar(
                            $item
                        ) &&
                            trim(
                                (string) $item
                            ) !== ''
                    );
            }

            if (
                is_scalar(
                    $value
                ) &&
                trim(
                    (string) $value
                ) !== ''
            ) {
                return trim(
                    (string) $value
                );
            }
        }

        return null;
    }
}
