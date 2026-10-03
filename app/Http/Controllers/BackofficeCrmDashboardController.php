<?php

namespace App\Http\Controllers;

use App\Models\CrmActivity;
use App\Models\CrmLead;
use App\Models\CrmPipelineStage;
use App\Models\NifEnrichment;
use App\Models\NifEnrichmentBatch;
use App\Models\TvdeImport;
use App\Models\TvdeOperator;
use App\Models\TvdeOperatorRegistration;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\JsonResponse;

class BackofficeCrmDashboardController extends Controller
{
    public function show(): JsonResponse
    {
        $operatorsHistorical =
            TvdeOperator::query()
                ->count();

        $operatorsActive =
            TvdeOperator::query()
                ->whereHas(
                    'registrations',
                    fn ($query) => $query->where(
                        'active',
                        true
                    )
                )
                ->count();

        $registrationsActive =
            TvdeOperatorRegistration::query()
                ->where(
                    'active',
                    true
                )
                ->count();

        $imtActive =
            TvdeOperatorRegistration::query()
                ->where(
                    'source',
                    TvdeImport::SOURCE_IMT
                )
                ->where(
                    'active',
                    true
                )
                ->count();

        $ramActive =
            TvdeOperatorRegistration::query()
                ->where(
                    'source',
                    TvdeImport::SOURCE_RAM
                )
                ->where(
                    'active',
                    true
                )
                ->count();

        $bothSources =
            TvdeOperator::query()
                ->whereHas(
                    'registrations',
                    function ($query): void {
                        $query
                            ->where(
                                'source',
                                TvdeImport::SOURCE_IMT
                            )
                            ->where(
                                'active',
                                true
                            );
                    }
                )
                ->whereHas(
                    'registrations',
                    function ($query): void {
                        $query
                            ->where(
                                'source',
                                TvdeImport::SOURCE_RAM
                            )
                            ->where(
                                'active',
                                true
                            );
                    }
                )
                ->count();

        $customers =
            TvdeOperator::query()
                ->whereHas(
                    'registrations',
                    fn ($query) => $query->where(
                        'active',
                        true
                    )
                )
                ->whereExists(
                    function (
                        QueryBuilder $query
                    ): void {
                        $query
                            ->selectRaw('1')
                            ->from('tenants')
                            ->whereColumn(
                                'tenants.nif',
                                'tvde_operators.nif'
                            );
                    }
                )
                ->count();

        $latestImport =
            TvdeImport::query()
                ->where(
                    'status',
                    TvdeImport::STATUS_COMPLETED
                )
                ->latest(
                    'reference_date'
                )
                ->first();

        $latestImt =
            TvdeImport::query()
                ->where(
                    'source',
                    TvdeImport::SOURCE_IMT
                )
                ->where(
                    'status',
                    TvdeImport::STATUS_COMPLETED
                )
                ->latest(
                    'reference_date'
                )
                ->first();

        $latestRam =
            TvdeImport::query()
                ->where(
                    'source',
                    TvdeImport::SOURCE_RAM
                )
                ->where(
                    'status',
                    TvdeImport::STATUS_COMPLETED
                )
                ->latest(
                    'reference_date'
                )
                ->first();

        $recentImports =
            TvdeImport::query()
                ->latest(
                    'reference_date'
                )
                ->limit(10)
                ->get()
                ->map(
                    fn (
                        TvdeImport $import
                    ): array => $this
                        ->importSummary(
                            $import
                        )
                )
                ->values();

        $leadsTotal =
            CrmLead::query()
                ->count();

        $openLeads =
            CrmLead::query()
                ->whereHas(
                    'currentStage',
                    fn ($query) => $query->where(
                        'category',
                        CrmPipelineStage::CATEGORY_PIPELINE
                    )
                )
                ->count();

        $wonLeads =
            CrmLead::query()
                ->whereHas(
                    'currentStage',
                    fn ($query) => $query->where(
                        'category',
                        CrmPipelineStage::CATEGORY_WON
                    )
                )
                ->count();

        $lostLeads =
            CrmLead::query()
                ->whereHas(
                    'currentStage',
                    fn ($query) => $query->where(
                        'category',
                        CrmPipelineStage::CATEGORY_LOST
                    )
                )
                ->count();

        $resolvedLeads =
            $wonLeads +
            $lostLeads;

        $conversionRate =
            $resolvedLeads > 0
            ? round(
                (
                    $wonLeads /
                    $resolvedLeads
                ) * 100,
                2
            )
            : 0.0;

        $newLeads30Days =
            CrmLead::query()
                ->where(
                    'created_at',
                    '>=',
                    now()->subDays(
                        30
                    )
                )
                ->count();

        $converted30Days =
            CrmLead::query()
                ->whereNotNull(
                    'converted_at'
                )
                ->where(
                    'converted_at',
                    '>=',
                    now()->subDays(
                        30
                    )
                )
                ->count();

        $overdueFollowUps =
            CrmLead::query()
                ->whereNotNull(
                    'next_follow_up_at'
                )
                ->where(
                    'next_follow_up_at',
                    '<',
                    now()
                )
                ->whereHas(
                    'currentStage',
                    fn ($query) => $query->where(
                        'is_terminal',
                        false
                    )
                )
                ->count();

        $plannedActivitiesToday =
            CrmActivity::query()
                ->where(
                    'status',
                    CrmActivity::STATUS_PLANNED
                )
                ->whereBetween(
                    'scheduled_at',
                    [
                        now()->startOfDay(),
                        now()->endOfDay(),
                    ]
                )
                ->count();

        $overdueActivities =
            CrmActivity::query()
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
                )
                ->count();

        $pipeline =
            CrmPipelineStage::query()
                ->where(
                    'is_active',
                    true
                )
                ->withCount(
                    'leads'
                )
                ->orderBy(
                    'position'
                )
                ->get()
                ->map(
                    fn (
                        CrmPipelineStage $stage
                    ): array => [
                        'id' => $stage->id,

                        'code' => $stage->code,

                        'name' => $stage->name,

                        'category' => $stage->category,

                        'color' => $stage->color,

                        'position' => $stage->position,

                        'is_terminal' => $stage->is_terminal,

                        'leads_count' => $stage
                            ->leads_count,
                    ]
                )
                ->values();

        $recentActivities =
            CrmActivity::query()
                ->with([
                    'lead:id,company_name,nif',
                    'createdBy:id,name',
                ])
                ->latest(
                    'created_at'
                )
                ->limit(10)
                ->get()
                ->map(
                    fn (
                        CrmActivity $activity
                    ): array => [
                        'id' => $activity->id,

                        'type' => $activity->type,

                        'status' => $activity->status,

                        'subject' => $activity->subject,

                        'scheduled_at' => $activity
                            ->scheduled_at,

                        'completed_at' => $activity
                            ->completed_at,

                        'created_at' => $activity
                            ->created_at,

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
                            ]
                            : null,

                        'created_by' => $activity
                            ->createdBy
                            ? [
                                'id' => $activity
                                    ->createdBy
                                    ->id,

                                'name' => $activity
                                    ->createdBy
                                    ->name,
                            ]
                            : null,
                    ]
                )
                ->values();

        $enrichedNifs =
            NifEnrichment::query()
                ->where(
                    'lookup_status',
                    NifEnrichment::STATUS_SUCCESS
                )
                ->count();

        $enrichmentErrors =
            NifEnrichment::query()
                ->where(
                    'lookup_status',
                    NifEnrichment::STATUS_ERROR
                )
                ->count();

        $activeBatches =
            NifEnrichmentBatch::query()
                ->whereIn(
                    'status',
                    [
                        NifEnrichmentBatch::STATUS_PENDING,
                        NifEnrichmentBatch::STATUS_PROCESSING,
                    ]
                )
                ->count();

        $notQueriedNifs =
            TvdeOperator::query()
                ->whereHas(
                    'registrations',
                    fn ($query) => $query->where(
                        'active',
                        true
                    )
                )
                ->whereDoesntHave(
                    'nifEnrichment'
                )
                ->count();

        return response()->json([
            'data' => [
                'metrics' => [
                    'operators_historical' => $operatorsHistorical,

                    'operators_active' => $operatorsActive,

                    'operators_inactive' => $operatorsHistorical -
                        $operatorsActive,

                    'registrations_active' => $registrationsActive,

                    'imt_active' => $imtActive,

                    'ram_active' => $ramActive,

                    'both_sources' => $bothSources,

                    'customers' => $customers,

                    'prospects' => max(
                        0,
                        $operatorsActive -
                            $customers
                    ),
                ],

                'commercial' => [
                    'leads_total' => $leadsTotal,

                    'open_leads' => $openLeads,

                    'won_leads' => $wonLeads,

                    'lost_leads' => $lostLeads,

                    'conversion_rate' => $conversionRate,

                    'new_leads_30d' => $newLeads30Days,

                    'converted_30d' => $converted30Days,

                    'overdue_follow_ups' => $overdueFollowUps,

                    'planned_activities_today' => $plannedActivitiesToday,

                    'overdue_activities' => $overdueActivities,
                ],

                'enrichment' => [
                    'successful' => $enrichedNifs,

                    'errors' => $enrichmentErrors,

                    'active_batches' => $activeBatches,

                    'not_queried' => $notQueriedNifs,
                ],

                'pipeline' => $pipeline,

                'recent_activities' => $recentActivities,

                'latest_import' => $latestImport
                    ? $this
                        ->importSummary(
                            $latestImport
                        )
                    : null,

                'latest_sources' => [
                    'imt' => $latestImt
                        ? $this
                            ->importSummary(
                                $latestImt
                            )
                        : null,

                    'ram' => $latestRam
                        ? $this
                            ->importSummary(
                                $latestRam
                            )
                        : null,
                ],

                'recent_imports' => $recentImports,
            ],
        ]);
    }

    private function importSummary(
        TvdeImport $import
    ): array {
        return [
            'id' => $import->id,

            'source' => $import->source,

            'reference_date' => $import
                ->reference_date
                ?->format(
                    'Y-m-d'
                ),

            'status' => $import->status,

            'total_records' => $import
                ->total_records,

            'new_records' => $import
                ->new_records,

            'changed_records' => $import
                ->changed_records,

            'removed_records' => $import
                ->removed_records,

            'restored_records' => $import
                ->restored_records,

            'unchanged_records' => $import
                ->unchanged_records,

            'created_at' => $import
                ->created_at,
        ];
    }
}
