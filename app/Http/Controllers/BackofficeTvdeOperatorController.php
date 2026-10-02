<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListBackofficeTvdeOperatorsRequest;
use App\Models\NifEnrichment;
use App\Models\Tenant;
use App\Models\TvdeImport;
use App\Models\TvdeOperator;
use App\Models\TvdeOperatorRegistration;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\JsonResponse;

class BackofficeTvdeOperatorController extends Controller
{
    public function index(
        ListBackofficeTvdeOperatorsRequest $request
    ): JsonResponse {
        $data = $request->validated();

        $search = $data['search'] ?? null;
        $source = $data['source'] ?? null;
        $status = $data['status'] ?? null;
        $customer = $data['customer'] ?? null;
        $enrichment = $data['enrichment'] ?? null;
        $district = $data['district'] ?? null;
        $municipality = $data['municipality'] ?? null;
        $perPage = $data['per_page'] ?? 20;

        $query = TvdeOperator::query()
            ->select([
                'id',
                'nif',
                'display_name',
                'created_at',
                'updated_at',
            ]);

        if ($search) {
            $query->where(
                function (
                    Builder $query
                ) use ($search): void {
                    $query
                        ->where(
                            'display_name',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'nif',
                            'like',
                            "%{$search}%"
                        );
                }
            );
        }

        if ($status === 'active') {
            $query->whereHas(
                'registrations',
                fn (
                    Builder $query
                ) => $query->where(
                    'active',
                    true
                )
            );
        }

        if ($status === 'inactive') {
            $query->whereDoesntHave(
                'registrations',
                fn (
                    Builder $query
                ) => $query->where(
                    'active',
                    true
                )
            );
        }

        /*
         * Fonte, distrito e concelho têm de pertencer ao mesmo
         * registo TVDE ativo.
         */
        if (
            $source ||
            $district ||
            $municipality
        ) {
            $query->whereHas(
                'registrations',
                function (
                    Builder $query
                ) use (
                    $source,
                    $district,
                    $municipality
                ): void {
                    $query->where(
                        'active',
                        true
                    );

                    if ($source) {
                        $query->where(
                            'source',
                            $source
                        );
                    }

                    if ($district) {
                        $query->where(
                            'district',
                            $district
                        );
                    }

                    if ($municipality) {
                        $query->where(
                            'municipality',
                            $municipality
                        );
                    }
                }
            );
        }

        if ($customer === 'yes') {
            $query->whereExists(
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
            );
        }

        if ($customer === 'no') {
            $query->whereNotExists(
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
            );
        }

        $this->applyEnrichmentFilter(
            $query,
            $enrichment
        );

        $paginator = $query
            ->orderBy(
                'display_name'
            )
            ->paginate(
                $perPage
            );

        $operators = collect(
            $paginator->items()
        );

        $operatorIds = $operators
            ->pluck('id')
            ->all();

        $nifs = $operators
            ->pluck('nif')
            ->all();

        $registrations = TvdeOperatorRegistration::query()
            ->whereIn(
                'tvde_operator_id',
                $operatorIds
            )
            ->where(
                'active',
                true
            )
            ->orderBy(
                'source'
            )
            ->get()
            ->groupBy(
                'tvde_operator_id'
            );

        $customers = Tenant::query()
            ->select([
                'id',
                'nif',
                'nome',
                'slug',
                'ativo',
            ])
            ->whereIn(
                'nif',
                $nifs
            )
            ->get()
            ->groupBy(
                'nif'
            );

        $enrichments = NifEnrichment::query()
            ->whereIn(
                'nif',
                $nifs
            )
            ->get()
            ->keyBy(
                'nif'
            );

        $items = $operators
            ->map(
                function (
                    TvdeOperator $operator
                ) use (
                    $registrations,
                    $customers,
                    $enrichments
                ): array {
                    $operatorRegistrations =
                        $registrations->get(
                            $operator->id,
                            collect()
                        );

                    $operatorCustomers =
                        $customers->get(
                            $operator->nif,
                            collect()
                        );

                    $operatorEnrichment =
                        $enrichments->get(
                            $operator->nif
                        );

                    return [
                        'id' => $operator->id,

                        'nif' => $operator->nif,

                        'display_name' => $operator->display_name,

                        'active' => $operatorRegistrations
                            ->isNotEmpty(),

                        'is_customer' => $operatorCustomers
                            ->isNotEmpty(),

                        'customers' => $operatorCustomers
                            ->map(
                                fn (
                                    Tenant $tenant
                                ): array => [
                                    'id' => $tenant->id,

                                    'nome' => $tenant->nome,

                                    'slug' => $tenant->slug,

                                    'ativo' => $tenant->ativo,
                                ]
                            )
                            ->values(),

                        'sources' => $operatorRegistrations
                            ->pluck(
                                'source'
                            )
                            ->unique()
                            ->values(),

                        'registrations' => $operatorRegistrations
                            ->map(
                                fn (
                                    TvdeOperatorRegistration $registration
                                ): array => $this
                                    ->registrationSummary(
                                        $registration
                                    )
                            )
                            ->values(),

                        'nif_enrichment' => $operatorEnrichment
                                ? $this->enrichmentSummary(
                                    $operatorEnrichment
                                )
                                : null,

                        'created_at' => $operator->created_at,

                        'updated_at' => $operator->updated_at,
                    ];
                }
            )
            ->values();

        return response()->json([
            'data' => $items,

            'meta' => [
                'current_page' => $paginator->currentPage(),

                'last_page' => $paginator->lastPage(),

                'per_page' => $paginator->perPage(),

                'total' => $paginator->total(),

                'from' => $paginator->firstItem(),

                'to' => $paginator->lastItem(),
            ],
        ]);
    }

    public function show(
        string $id
    ): JsonResponse {
        $operator = TvdeOperator::query()
            ->with([
                'registrations' => function (
                    $query
                ): void {
                    $query
                        ->orderByDesc(
                            'active'
                        )
                        ->orderByDesc(
                            'last_seen_at'
                        );
                },

                'changes' => function (
                    $query
                ): void {
                    $query
                        ->with([
                            'import:id,source,reference_date',
                        ])
                        ->latest(
                            'created_at'
                        )
                        ->limit(
                            100
                        );
                },
            ])
            ->findOrFail(
                $id
            );

        $customers = Tenant::query()
            ->select([
                'id',
                'nome',
                'slug',
                'nif',
                'email',
                'telefone',
                'ativo',
                'created_at',
            ])
            ->where(
                'nif',
                $operator->nif
            )
            ->get();

        $activeRegistrations =
            $operator
                ->registrations
                ->where(
                    'active',
                    true
                );

        return response()->json([
            'data' => [
                'id' => $operator->id,

                'nif' => $operator->nif,

                'display_name' => $operator->display_name,

                'active' => $activeRegistrations
                    ->isNotEmpty(),

                'is_customer' => $customers
                    ->isNotEmpty(),

                'sources' => $activeRegistrations
                    ->pluck(
                        'source'
                    )
                    ->unique()
                    ->values(),

                'source_presence' => [
                    'imt' => $activeRegistrations
                        ->contains(
                            'source',
                            TvdeImport::SOURCE_IMT
                        ),

                    'ram' => $activeRegistrations
                        ->contains(
                            'source',
                            TvdeImport::SOURCE_RAM
                        ),
                ],

                'customers' => $customers
                    ->map(
                        fn (
                            Tenant $tenant
                        ): array => [
                            'id' => $tenant->id,

                            'nome' => $tenant->nome,

                            'slug' => $tenant->slug,

                            'nif' => $tenant->nif,

                            'email' => $tenant->email,

                            'telefone' => $tenant->telefone,

                            'ativo' => $tenant->ativo,

                            'created_at' => $tenant->created_at,
                        ]
                    )
                    ->values(),

                'registrations' => $operator
                    ->registrations
                    ->map(
                        fn (
                            TvdeOperatorRegistration $registration
                        ): array => [
                            ...$this
                                ->registrationSummary(
                                    $registration
                                ),

                            'first_seen_import_id' => $registration
                                ->first_seen_import_id,

                            'last_seen_import_id' => $registration
                                ->last_seen_import_id,

                            'removed_in_import_id' => $registration
                                ->removed_in_import_id,

                            'raw_data' => $registration
                                ->raw_data,
                        ]
                    )
                    ->values(),

                'changes' => $operator
                    ->changes
                    ->map(
                        fn (
                            $change
                        ): array => [
                            'id' => $change->id,

                            'change_type' => $change->change_type,

                            'changed_fields' => $change
                                ->changed_fields,

                            'before_data' => $change
                                ->before_data,

                            'after_data' => $change
                                ->after_data,

                            'created_at' => $change
                                ->created_at,

                            'import' => $change->import
                                    ? [
                                        'id' => $change
                                            ->import
                                            ->id,

                                        'source' => $change
                                            ->import
                                            ->source,

                                        'reference_date' => $change
                                            ->import
                                            ->reference_date
                                            ?->format(
                                                'Y-m-d'
                                            ),
                                    ]
                                    : null,
                        ]
                    )
                    ->values(),

                'created_at' => $operator->created_at,

                'updated_at' => $operator->updated_at,
            ],
        ]);
    }

    private function applyEnrichmentFilter(
        Builder $query,
        ?string $enrichment
    ): void {
        if (! $enrichment) {
            return;
        }

        if ($enrichment === 'not_queried') {
            $query->whereNotExists(
                function (
                    QueryBuilder $query
                ): void {
                    $query
                        ->selectRaw('1')
                        ->from(
                            'nif_enrichments'
                        )
                        ->whereColumn(
                            'nif_enrichments.nif',
                            'tvde_operators.nif'
                        );
                }
            );

            return;
        }

        $cacheDays = max(
            0,
            (int) config(
                'services.nif_pt.cache_days',
                30
            )
        );

        $query->whereExists(
            function (
                QueryBuilder $subquery
            ) use (
                $enrichment,
                $cacheDays
            ): void {
                $subquery
                    ->selectRaw('1')
                    ->from(
                        'nif_enrichments'
                    )
                    ->whereColumn(
                        'nif_enrichments.nif',
                        'tvde_operators.nif'
                    );

                if (
                    $enrichment ===
                    'expired'
                ) {
                    $subquery
                        ->where(
                            'lookup_status',
                            NifEnrichment::STATUS_SUCCESS
                        )
                        ->whereNotNull(
                            'last_success_at'
                        );

                    if ($cacheDays > 0) {
                        $subquery->where(
                            'last_success_at',
                            '<',
                            now()->subDays(
                                $cacheDays
                            )
                        );
                    }

                    return;
                }

                $subquery->where(
                    'lookup_status',
                    $enrichment
                );
            }
        );
    }

    private function enrichmentSummary(
        NifEnrichment $enrichment
    ): array {
        $cacheDays = max(
            0,
            (int) config(
                'services.nif_pt.cache_days',
                30
            )
        );

        $cacheExpiresAt =
            $enrichment
                ->last_success_at &&
            $cacheDays > 0
                ? $enrichment
                    ->last_success_at
                    ->copy()
                    ->addDays(
                        $cacheDays
                    )
                : null;

        return [
            'lookup_status' => $enrichment
                ->lookup_status,

            'title' => $enrichment
                ->title,

            'cae' => $enrichment
                ->cae,

            'lookup_count' => $enrichment
                ->lookup_count,

            'last_looked_up_at' => $enrichment
                ->last_looked_up_at,

            'last_success_at' => $enrichment
                ->last_success_at,

            'last_error' => $enrichment
                ->last_error,

            'cache_is_fresh' => $enrichment
                ->lookup_status ===
                NifEnrichment::STATUS_SUCCESS &&
                $cacheExpiresAt !== null &&
                $cacheExpiresAt
                    ->isFuture(),

            'cache_expires_at' => $cacheExpiresAt,
        ];
    }

    private function registrationSummary(
        TvdeOperatorRegistration $registration
    ): array {
        return [
            'id' => $registration->id,

            'source' => $registration->source,

            'jurisdiction' => $registration->jurisdiction,

            'source_key' => $registration->source_key,

            'denomination' => $registration->denomination,

            'license_number' => $registration->license_number,

            'district' => $registration->district,

            'municipality' => $registration->municipality,

            'postal_locality' => $registration->postal_locality,

            'active' => $registration->active,

            'first_seen_at' => $registration->first_seen_at,

            'last_seen_at' => $registration->last_seen_at,

            'removed_at' => $registration->removed_at,
        ];
    }
}
