<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListBackofficeClientsRequest;
use App\Http\Requests\UpdateBackofficeClientMultiCompanyRequest;
use App\Http\Requests\UpdateBackofficeClientStatusRequest;
use App\Models\Tenant;
use App\Models\UserRole;
use App\Services\SaasEntitlementService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class BackofficeClientController extends Controller
{
    public function __construct(
        private SaasEntitlementService $entitlements
    ) {}

    public function index(
        ListBackofficeClientsRequest $request
    ): JsonResponse {
        $data = $request->validated();

        $search = $data['search']
            ?? null;

        $status = $data['status']
            ?? null;

        $onboarding = $data['onboarding']
            ?? null;

        $perPage = $data['per_page']
            ?? 20;

        $query = Tenant::query()
            ->select([
                'id',
                'saas_plan_id',
                'nome',
                'slug',
                'nif',
                'email',
                'telefone',
                'ativo',
                'settings',
                'created_at',
                'updated_at',
            ])
            ->with([
                'saasPlan:id,codigo,nome,descricao,ativo,limits,features',
            ])
            ->withCount([
                'users',
                'empresas',
                'proprietarios',
                'veiculos',
                'motoristas',
                'funcionarios',
            ]);

        if ($search) {
            $query->where(
                function (
                    Builder $query
                ) use ($search): void {
                    $query
                        ->where(
                            'nome',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'slug',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'nif',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'email',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'telefone',
                            'like',
                            "%{$search}%"
                        );
                }
            );
        }

        if ($status === 'ativo') {
            $query->where(
                'ativo',
                true
            );
        }

        if ($status === 'inativo') {
            $query->where(
                'ativo',
                false
            );
        }

        if ($onboarding === 'pendente') {
            $query->where(
                'settings->onboarding->required',
                true
            );
        }

        if ($onboarding === 'concluido') {
            $query->where(
                function (
                    Builder $query
                ): void {
                    $query
                        ->whereNull(
                            'settings->onboarding->required'
                        )
                        ->orWhere(
                            'settings->onboarding->required',
                            false
                        );
                }
            );
        }

        $paginator = $query
            ->latest(
                'created_at'
            )
            ->paginate(
                $perPage
            );

        $items = collect(
            $paginator->items()
        )
            ->map(
                fn (
                    Tenant $tenant
                ): array => $this
                    ->summary(
                        $tenant
                    )
            )
            ->values();

        return response()->json([
            'data' => $items,

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

    public function show(
        string $id
    ): JsonResponse {
        $tenant = Tenant::query()
            ->withCount([
                'users',
                'empresas',
                'proprietarios',
                'veiculos',
                'motoristas',
                'funcionarios',
            ])
            ->with([
                'saasPlan:id,codigo,nome,descricao,ativo,limits,features',

                'empresas' => function ($query): void {
                    $query
                        ->select([
                            'id',
                            'tenant_id',
                            'nome_empresa',
                            'nif',
                            'email',
                            'telemovel',
                            'nome_gerente',
                            'endereco_cidade',
                            'ativo',
                            'status_cadastro',
                            'created_at',
                        ])
                        ->latest(
                            'created_at'
                        );
                },

                'tenantUsers' => function ($query): void {
                    $query
                        ->with([
                            'user:id,name,email,ativo,last_login_at,created_at',
                        ])
                        ->orderByDesc(
                            'principal'
                        )
                        ->latest(
                            'created_at'
                        );
                },
            ])
            ->findOrFail(
                $id
            );

        $roles = UserRole::query()
            ->where(
                'tenant_id',
                $tenant->id
            )
            ->with([
                'role:id,codigo,nome',
            ])
            ->get()
            ->groupBy(
                'user_id'
            );

        $users = $tenant
            ->tenantUsers
            ->map(
                function (
                    $membership
                ) use ($roles): array {
                    $userRoles =
                        $roles
                            ->get(
                                $membership->user_id,
                                collect()
                            )
                            ->map(
                                fn (
                                    UserRole $userRole
                                ): array => [
                                    'codigo' => $userRole
                                        ->role
                                        ->codigo,

                                    'nome' => $userRole
                                        ->role
                                        ->nome,
                                ]
                            )
                            ->values();

                    return [
                        'id' => $membership
                            ->user
                            ->id,

                        'name' => $membership
                            ->user
                            ->name,

                        'email' => $membership
                            ->user
                            ->email,

                        'ativo' => $membership
                            ->user
                            ->ativo,

                        'membership_status' => $membership
                            ->status,

                        'principal' => $membership
                            ->principal,

                        'last_login_at' => $membership
                            ->user
                            ->last_login_at,

                        'created_at' => $membership
                            ->user
                            ->created_at,

                        'roles' => $userRoles,
                    ];
                }
            )
            ->values();

        return response()->json([
            'data' => [
                ...$this->summary(
                    $tenant
                ),

                'settings' => $tenant->settings
                    ?? [],

                'plan' => $tenant->saasPlan
                    ? [
                        'id' => $tenant
                            ->saasPlan
                            ->id,

                        'codigo' => $tenant
                            ->saasPlan
                            ->codigo,

                        'nome' => $tenant
                            ->saasPlan
                            ->nome,

                        'descricao' => $tenant
                            ->saasPlan
                            ->descricao,

                        'ativo' => $tenant
                            ->saasPlan
                            ->ativo,
                    ]
                    : null,

                'usage' => [
                    'empresas' => $this
                        ->resourceUsage(
                            $tenant,
                            'empresas'
                        ),

                    'veiculos' => $this
                        ->resourceUsage(
                            $tenant,
                            'veiculos'
                        ),

                    'motoristas' => $this
                        ->resourceUsage(
                            $tenant,
                            'motoristas'
                        ),

                    'utilizadores' => $this
                        ->resourceUsage(
                            $tenant,
                            'utilizadores'
                        ),
                ],

                'features' => [
                    'multi_company' => $this
                        ->entitlements
                        ->feature(
                            $tenant,
                            'multi_company'
                        ),

                    'integracoes' => $this
                        ->entitlements
                        ->feature(
                            $tenant,
                            'integracoes'
                        ),

                    'relatorios_avancados' => $this
                        ->entitlements
                        ->feature(
                            $tenant,
                            'relatorios_avancados'
                        ),
                ],

                'feature_overrides' => [
                    'multi_company' => $this
                        ->entitlements
                        ->featureOverride(
                            $tenant,
                            'multi_company'
                        ),
                ],

                'companies' => $tenant
                    ->empresas,

                'users' => $users,
            ],
        ]);
    }

    public function status(
        UpdateBackofficeClientStatusRequest $request,
        string $id
    ): JsonResponse {
        $tenant = Tenant::query()
            ->findOrFail(
                $id
            );

        $tenant->ativo =
            $request->boolean(
                'ativo'
            );

        $tenant->save();

        return response()->json([
            'message' => $tenant->ativo
                ? 'Cliente ativado com sucesso.'
                : 'Cliente inativado com sucesso.',

            'data' => [
                'id' => $tenant->id,

                'ativo' => $tenant->ativo,
            ],
        ]);
    }

    public function multiCompany(
        UpdateBackofficeClientMultiCompanyRequest $request,
        string $id
    ): JsonResponse {
        $tenant = Tenant::query()
            ->with(
                'saasPlan'
            )
            ->findOrFail(
                $id
            );

        $settings =
            $tenant->settings
            ?? [];

        $enabled =
            $request->validated(
                'enabled'
            );

        if ($enabled === null) {
            data_forget(
                $settings,
                'saas_overrides.features.multi_company'
            );

            if (
                empty(
                    data_get(
                        $settings,
                        'saas_overrides.features',
                        []
                    )
                )
            ) {
                data_forget(
                    $settings,
                    'saas_overrides.features'
                );
            }

            if (
                empty(
                    data_get(
                        $settings,
                        'saas_overrides',
                        []
                    )
                )
            ) {
                data_forget(
                    $settings,
                    'saas_overrides'
                );
            }
        } else {
            data_set(
                $settings,
                'saas_overrides.features.multi_company',
                $enabled
            );
        }

        $tenant->settings =
            $settings;

        $tenant->save();

        $tenant->refresh()
            ->load(
                'saasPlan'
            );

        $effective =
            $this
                ->entitlements
                ->multiCompanyEnabled(
                    $tenant
                );

        $override =
            $this
                ->entitlements
                ->featureOverride(
                    $tenant,
                    'multi_company'
                );

        return response()->json([
            'message' => $override === null
                ? 'Multiempresa voltou a utilizar a configuração do plano.'
                : (
                    $override
                        ? 'Override de multiempresa ativado.'
                        : 'Override de multiempresa desativado.'
                ),

            'data' => [
                'id' => $tenant->id,

                'multi_company_enabled' => $effective,

                'multi_company_override' => $override,
            ],
        ]);
    }

    private function resourceUsage(
        Tenant $tenant,
        string $resource
    ): array {
        $limit = $this
            ->entitlements
            ->limit(
                $tenant,
                $resource
            );

        $used = $this
            ->entitlements
            ->usage(
                $tenant,
                $resource
            );

        return [
            'used' => $used,

            'limit' => $limit,

            'remaining' => $limit === null
                ? null
                : max(
                    0,
                    $limit - $used
                ),

            'can_create' => $this
                ->entitlements
                ->canCreate(
                    $tenant,
                    $resource
                ),
        ];
    }

    private function summary(
        Tenant $tenant
    ): array {
        $settings =
            $tenant->settings
            ?? [];

        return [
            'id' => $tenant->id,

            'nome' => $tenant->nome,

            'slug' => $tenant->slug,

            'nif' => $tenant->nif,

            'email' => $tenant->email,

            'telefone' => $tenant->telefone,

            'ativo' => $tenant->ativo,

            'created_at' => $tenant
                ->created_at,

            'updated_at' => $tenant
                ->updated_at,

            'onboarding_required' => (bool) data_get(
                $settings,
                'onboarding.required',
                false
            ),

            'onboarding_completed_at' => data_get(
                $settings,
                'onboarding.completed_at'
            ),

            'multi_company_enabled' => $this
                ->entitlements
                ->multiCompanyEnabled(
                    $tenant
                ),

            'users_count' => $tenant
                ->users_count
                ?? 0,

            'empresas_count' => $tenant
                ->empresas_count
                ?? 0,

            'proprietarios_count' => $tenant
                ->proprietarios_count
                ?? 0,

            'veiculos_count' => $tenant
                ->veiculos_count
                ?? 0,

            'motoristas_count' => $tenant
                ->motoristas_count
                ?? 0,

            'funcionarios_count' => $tenant
                ->funcionarios_count
                ?? 0,
        ];
    }
}
