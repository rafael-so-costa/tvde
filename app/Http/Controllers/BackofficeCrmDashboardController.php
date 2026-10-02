<?php

namespace App\Http\Controllers;

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

                'latest_import' => $latestImport
                        ? $this->importSummary(
                            $latestImport
                        )
                        : null,

                'latest_sources' => [
                    'imt' => $latestImt
                            ? $this->importSummary(
                                $latestImt
                            )
                            : null,

                    'ram' => $latestRam
                            ? $this->importSummary(
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

            'reference_date' => $import->reference_date,

            'status' => $import->status,

            'total_records' => $import->total_records,

            'new_records' => $import->new_records,

            'changed_records' => $import->changed_records,

            'removed_records' => $import->removed_records,

            'restored_records' => $import->restored_records,

            'unchanged_records' => $import->unchanged_records,

            'created_at' => $import->created_at,
        ];
    }
}
