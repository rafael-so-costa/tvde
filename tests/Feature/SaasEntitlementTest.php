<?php

use App\Models\Empresa;
use App\Models\SaasPlan;
use App\Models\Tenant;
use App\Services\SaasEntitlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function entitlementTenant(
    array $overrides = []
): Tenant {
    return Tenant::create(
        array_merge([
            'nome' => 'Tenant Entitlement',

            'slug' => 'tenant-entitlement',

            'ativo' => true,

            'settings' => [
                'onboarding' => [
                    'required' => false,

                    'completed_at' => now()
                        ->toISOString(),
                ],
            ],
        ], $overrides)
    );
}

test(
    'feature usa configuração do plano',
    function () {
        $plan = SaasPlan::create([
            'codigo' => 'teste',

            'nome' => 'Teste',

            'ativo' => true,

            'features' => [
                'multi_company' => true,
            ],
        ]);

        $tenant = entitlementTenant([
            'saas_plan_id' => $plan->id,
        ]);

        $service = app(
            SaasEntitlementService::class
        );

        expect(
            $service
                ->multiCompanyEnabled(
                    $tenant
                )
        )->toBeTrue();
    }
);

test(
    'override saas do tenant tem prioridade sobre o plano',
    function () {
        $plan = SaasPlan::create([
            'codigo' => 'teste-override',

            'nome' => 'Teste Override',

            'ativo' => true,

            'features' => [
                'multi_company' => true,
            ],
        ]);

        $tenant = entitlementTenant([
            'saas_plan_id' => $plan->id,

            'settings' => [
                'onboarding' => [
                    'required' => false,
                ],

                'saas_overrides' => [
                    'features' => [
                        'multi_company' => false,
                    ],
                ],
            ],
        ]);

        $service = app(
            SaasEntitlementService::class
        );

        expect(
            $service
                ->featureOverride(
                    $tenant,
                    'multi_company'
                )
        )->toBeFalse();

        expect(
            $service
                ->multiCompanyEnabled(
                    $tenant
                )
        )->toBeFalse();
    }
);

test(
    'configuração legacy não sobrepõe plano saas',
    function () {
        $plan = SaasPlan::create([
            'codigo' => 'teste-legacy-plan',

            'nome' => 'Teste Legacy Plan',

            'ativo' => true,

            'features' => [
                'multi_company' => true,
            ],
        ]);

        $tenant = entitlementTenant([
            'saas_plan_id' => $plan->id,

            'settings' => [
                'onboarding' => [
                    'required' => false,
                ],

                'features' => [
                    'multi_company' => false,
                ],
            ],
        ]);

        $service = app(
            SaasEntitlementService::class
        );

        expect(
            $service
                ->multiCompanyEnabled(
                    $tenant
                )
        )->toBeTrue();
    }
);

test(
    'tenant legado sem plano respeita configuração antiga',
    function () {
        $tenant = entitlementTenant([
            'settings' => [
                'onboarding' => [
                    'required' => false,
                ],

                'features' => [
                    'multi_company' => true,
                ],
            ],
        ]);

        $service = app(
            SaasEntitlementService::class
        );

        expect(
            $service
                ->multiCompanyEnabled(
                    $tenant
                )
        )->toBeTrue();
    }
);

test(
    'tenant legado sem configuração mantém multiempresa',
    function () {
        $tenant = entitlementTenant([
            'settings' => [],
        ]);

        $service = app(
            SaasEntitlementService::class
        );

        expect(
            $service
                ->multiCompanyEnabled(
                    $tenant
                )
        )->toBeTrue();
    }
);

test(
    'limite usa override saas antes do plano',
    function () {
        $plan = SaasPlan::create([
            'codigo' => 'limite-override',

            'nome' => 'Limite Override',

            'ativo' => true,

            'limits' => [
                'empresas' => 2,
            ],
        ]);

        $tenant = entitlementTenant([
            'saas_plan_id' => $plan->id,

            'settings' => [
                'onboarding' => [
                    'required' => false,
                ],

                'saas_overrides' => [
                    'limits' => [
                        'empresas' => 5,
                    ],
                ],
            ],
        ]);

        $service = app(
            SaasEntitlementService::class
        );

        expect(
            $service->limit(
                $tenant,
                'empresas'
            )
        )->toBe(5);
    }
);

test(
    'limite nulo significa recurso sem limite definido',
    function () {
        $plan = SaasPlan::create([
            'codigo' => 'sem-limite',

            'nome' => 'Sem Limite',

            'ativo' => true,

            'limits' => [
                'empresas' => null,
            ],
        ]);

        $tenant = entitlementTenant([
            'saas_plan_id' => $plan->id,
        ]);

        $service = app(
            SaasEntitlementService::class
        );

        expect(
            $service->limit(
                $tenant,
                'empresas'
            )
        )->toBeNull();

        expect(
            $service->canCreate(
                $tenant,
                'empresas'
            )
        )->toBeTrue();
    }
);

test(
    'serviço bloqueia criação quando limite é atingido',
    function () {
        $plan = SaasPlan::create([
            'codigo' => 'limitado',

            'nome' => 'Limitado',

            'ativo' => true,

            'limits' => [
                'empresas' => 1,
            ],
        ]);

        $tenant = entitlementTenant([
            'saas_plan_id' => $plan->id,
        ]);

        $empresa = new Empresa([
            'nome_empresa' => 'Empresa Limite',

            'nif' => '501999999',

            'ativo' => true,

            'status_cadastro' => 'ativo',
        ]);

        $empresa->tenant_id =
            $tenant->id;

        $empresa->save();

        $service = app(
            SaasEntitlementService::class
        );

        expect(
            $service->usage(
                $tenant,
                'empresas'
            )
        )->toBe(1);

        expect(
            $service->canCreate(
                $tenant,
                'empresas'
            )
        )->toBeFalse();
    }
);
