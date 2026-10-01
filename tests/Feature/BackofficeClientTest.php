<?php

use App\Models\Empresa;
use App\Models\Motorista;
use App\Models\Role;
use App\Models\SaasPlan;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(
        RoleSeeder::class
    );
});

function backofficeClientHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function backofficeClientUser(
    string $email,
    bool $superAdmin = false
): User {
    $user = User::factory()
        ->create([
            'email' => $email,

            'password' => Hash::make(
                'SenhaTeste123!'
            ),

            'ativo' => true,
        ]);

    if ($superAdmin) {
        $role = Role::query()
            ->where(
                'codigo',
                'super_admin'
            )
            ->firstOrFail();

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'tenant_id' => null,
        ]);
    }

    return $user;
}

function backofficeClientLogin(
    $test,
    User $user
): void {
    $test
        ->postJson(
            '/login',
            [
                'email' => $user->email,
                'password' => 'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

function backofficeClientTenant(
    string $nome,
    string $slug,
    bool $ativo = true,
    bool $onboardingRequired = false
): Tenant {
    return Tenant::create([
        'nome' => $nome,

        'slug' => $slug,

        'nif' => (string) random_int(
            500000000,
            599999999
        ),

        'email' => "{$slug}@cliente.test",

        'telefone' => '910000000',

        'ativo' => $ativo,

        'settings' => [
            'onboarding' => [
                'required' => $onboardingRequired,

                'completed_at' => $onboardingRequired
                    ? null
                    : now()
                        ->toISOString(),
            ],

            'features' => [
                'multi_company' => false,
            ],
        ],
    ]);
}

test(
    'clientes do backoffice exigem autenticação',
    function () {
        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->getJson(
                '/api/backoffice/clientes'
            )
            ->assertUnauthorized();
    }
);

test(
    'utilizador comum não consulta clientes do backoffice',
    function () {
        $user =
            backofficeClientUser(
                'normal.backoffice@frotapro.test'
            );

        backofficeClientLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->getJson(
                '/api/backoffice/clientes'
            )
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'Acesso restrito ao backoffice FrotaPRO.'
            );
    }
);

test(
    'super admin lista clientes com contadores',
    function () {
        $tenant =
            backofficeClientTenant(
                'Cliente Alpha',
                'cliente-alpha'
            );

        $empresa = new Empresa([
            'nome_empresa' => 'Cliente Alpha Lda',

            'nif' => '501100001',

            'ativo' => true,

            'status_cadastro' => 'ativo',
        ]);

        $empresa->tenant_id =
            $tenant->id;

        $empresa->save();

        $veiculo =
            new Veiculo([
                'matricula' => 'AA-10-BB',

                'marca' => 'Tesla',

                'modelo' => 'Model 3',
            ]);

        $veiculo->tenant_id =
            $tenant->id;

        $veiculo->save();

        $motorista =
            new Motorista([
                'nome_completo' => 'Motorista Alpha',

                'email' => 'motorista.alpha@test.pt',
            ]);

        $motorista->tenant_id =
            $tenant->id;

        $motorista->save();

        $admin =
            backofficeClientUser(
                'admin.alpha@test.pt'
            );

        TenantUser::create([
            'tenant_id' => $tenant->id,

            'user_id' => $admin->id,

            'status' => 'ativo',

            'principal' => true,
        ]);

        $superAdmin =
            backofficeClientUser(
                'super.lista@frotapro.test',
                true
            );

        backofficeClientLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->getJson(
                '/api/backoffice/clientes'
            )
            ->assertOk()
            ->assertJsonPath(
                'meta.total',
                1
            )
            ->assertJsonPath(
                'data.0.nome',
                'Cliente Alpha'
            )
            ->assertJsonPath(
                'data.0.empresas_count',
                1
            )
            ->assertJsonPath(
                'data.0.users_count',
                1
            )
            ->assertJsonPath(
                'data.0.veiculos_count',
                1
            )
            ->assertJsonPath(
                'data.0.motoristas_count',
                1
            );
    }
);

test(
    'listagem permite pesquisar e filtrar clientes',
    function () {
        backofficeClientTenant(
            'Alpha Mobilidade',
            'alpha-mobilidade',
            true,
            true
        );

        backofficeClientTenant(
            'Beta Transportes',
            'beta-transportes',
            false,
            false
        );

        backofficeClientTenant(
            'Gamma Frota',
            'gamma-frota',
            true,
            false
        );

        $superAdmin =
            backofficeClientUser(
                'super.filtros@frotapro.test',
                true
            );

        backofficeClientLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->getJson(
                '/api/backoffice/clientes?search=Alpha&status=ativo&onboarding=pendente'
            )
            ->assertOk()
            ->assertJsonPath(
                'meta.total',
                1
            )
            ->assertJsonCount(
                1,
                'data'
            )
            ->assertJsonPath(
                'data.0.nome',
                'Alpha Mobilidade'
            );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->getJson(
                '/api/backoffice/clientes?status=inativo'
            )
            ->assertOk()
            ->assertJsonPath(
                'meta.total',
                1
            )
            ->assertJsonPath(
                'data.0.nome',
                'Beta Transportes'
            );
    }
);

test(
    'super admin consulta ficha completa do cliente',
    function () {
        $plan = SaasPlan::create([
            'codigo' => 'teste-backoffice',

            'nome' => 'Plano Teste',

            'descricao' => 'Plano utilizado nos testes do backoffice.',

            'ativo' => true,

            'limits' => [
                'empresas' => 3,
                'veiculos' => 20,
                'motoristas' => 25,
                'utilizadores' => 5,
            ],

            'features' => [
                'multi_company' => false,
                'integracoes' => true,
                'relatorios_avancados' => false,
            ],

            'ordem' => 10,
        ]);

        $tenant =
            backofficeClientTenant(
                'Cliente Detalhe',
                'cliente-detalhe'
            );

        $tenant->saas_plan_id =
            $plan->id;

        $tenant->save();

        $empresa = new Empresa([
            'nome_empresa' => 'Cliente Detalhe Lda',

            'nif' => '501200001',

            'email' => 'empresa@detalhe.test',

            'ativo' => true,

            'status_cadastro' => 'ativo',
        ]);

        $empresa->tenant_id =
            $tenant->id;

        $empresa->save();

        $admin =
            backofficeClientUser(
                'gestor.detalhe@test.pt'
            );

        TenantUser::create([
            'tenant_id' => $tenant->id,

            'user_id' => $admin->id,

            'status' => 'ativo',

            'principal' => true,
        ]);

        $role = Role::query()
            ->where(
                'codigo',
                'admin_empresa'
            )
            ->firstOrFail();

        UserRole::create([
            'user_id' => $admin->id,

            'role_id' => $role->id,

            'tenant_id' => $tenant->id,
        ]);

        $superAdmin =
            backofficeClientUser(
                'super.detalhe@frotapro.test',
                true
            );

        backofficeClientLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->getJson(
                "/api/backoffice/clientes/{$tenant->id}"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.nome',
                'Cliente Detalhe'
            )
            ->assertJsonPath(
                'data.ativo',
                true
            )
            ->assertJsonPath(
                'data.multi_company_enabled',
                false
            )
            ->assertJsonPath(
                'data.plan.codigo',
                'teste-backoffice'
            )
            ->assertJsonPath(
                'data.plan.nome',
                'Plano Teste'
            )
            ->assertJsonPath(
                'data.plan.descricao',
                'Plano utilizado nos testes do backoffice.'
            )
            ->assertJsonPath(
                'data.plan.ativo',
                true
            )
            ->assertJsonPath(
                'data.usage.empresas.used',
                1
            )
            ->assertJsonPath(
                'data.usage.empresas.limit',
                3
            )
            ->assertJsonPath(
                'data.usage.empresas.remaining',
                2
            )
            ->assertJsonPath(
                'data.usage.empresas.can_create',
                true
            )
            ->assertJsonPath(
                'data.usage.veiculos.used',
                0
            )
            ->assertJsonPath(
                'data.usage.veiculos.limit',
                20
            )
            ->assertJsonPath(
                'data.usage.motoristas.used',
                0
            )
            ->assertJsonPath(
                'data.usage.motoristas.limit',
                25
            )
            ->assertJsonPath(
                'data.usage.utilizadores.used',
                1
            )
            ->assertJsonPath(
                'data.usage.utilizadores.limit',
                5
            )
            ->assertJsonPath(
                'data.features.multi_company',
                false
            )
            ->assertJsonPath(
                'data.features.integracoes',
                true
            )
            ->assertJsonPath(
                'data.features.relatorios_avancados',
                false
            )
            ->assertJsonCount(
                1,
                'data.companies'
            )
            ->assertJsonCount(
                1,
                'data.users'
            )
            ->assertJsonPath(
                'data.companies.0.nome_empresa',
                'Cliente Detalhe Lda'
            )
            ->assertJsonPath(
                'data.users.0.email',
                'gestor.detalhe@test.pt'
            )
            ->assertJsonPath(
                'data.users.0.principal',
                true
            )
            ->assertJsonPath(
                'data.users.0.roles.0.codigo',
                'admin_empresa'
            );
    }
);

test(
    'ficha de cliente inexistente retorna 404',
    function () {
        $superAdmin =
            backofficeClientUser(
                'super.404@frotapro.test',
                true
            );

        backofficeClientLogin(
            $this,
            $superAdmin
        );

        $id =
            Str::uuid()
                ->toString();

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->getJson(
                "/api/backoffice/clientes/{$id}"
            )
            ->assertNotFound();
    }
);

test(
    'super admin pode inativar e reativar cliente',
    function () {
        $tenant =
            backofficeClientTenant(
                'Cliente Estado',
                'cliente-estado'
            );

        $superAdmin =
            backofficeClientUser(
                'super.estado@frotapro.test',
                true
            );

        backofficeClientLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->patchJson(
                "/api/backoffice/clientes/{$tenant->id}/estado",
                [
                    'ativo' => false,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.ativo',
                false
            );

        $this->assertDatabaseHas(
            'tenants',
            [
                'id' => $tenant->id,

                'ativo' => false,
            ]
        );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->patchJson(
                "/api/backoffice/clientes/{$tenant->id}/estado",
                [
                    'ativo' => true,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.ativo',
                true
            );

        $this->assertDatabaseHas(
            'tenants',
            [
                'id' => $tenant->id,

                'ativo' => true,
            ]
        );
    }
);

test(
    'estado do cliente exige booleano válido',
    function () {
        $tenant =
            backofficeClientTenant(
                'Cliente Validação',
                'cliente-validacao'
            );

        $superAdmin =
            backofficeClientUser(
                'super.validacao@frotapro.test',
                true
            );

        backofficeClientLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->patchJson(
                "/api/backoffice/clientes/{$tenant->id}/estado",
                [
                    'ativo' => 'qualquer-coisa',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'ativo'
            );
    }
);

test(
    'super admin pode configurar e remover override de multiempresa',
    function () {
        $plan = SaasPlan::create([
            'codigo' => 'multiempresa-plano',

            'nome' => 'Plano Multiempresa',

            'ativo' => true,

            'features' => [
                'multi_company' => true,
            ],

            'ordem' => 20,
        ]);

        $tenant =
            backofficeClientTenant(
                'Cliente Multiempresa',
                'cliente-multiempresa'
            );

        $tenant->saas_plan_id =
            $plan->id;

        $tenant->save();

        $superAdmin =
            backofficeClientUser(
                'super.multiempresa@frotapro.test',
                true
            );

        backofficeClientLogin(
            $this,
            $superAdmin
        );

        /*
         * O plano permite multiempresa e ainda
         * não existe override administrativo.
         */
        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->getJson(
                "/api/backoffice/clientes/{$tenant->id}"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.multi_company_enabled',
                true
            )
            ->assertJsonPath(
                'data.features.multi_company',
                true
            )
            ->assertJsonPath(
                'data.feature_overrides.multi_company',
                null
            );

        /*
         * Super admin força a feature para false.
         */
        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->patchJson(
                "/api/backoffice/clientes/{$tenant->id}/multiempresa",
                [
                    'enabled' => false,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.multi_company_enabled',
                false
            )
            ->assertJsonPath(
                'data.multi_company_override',
                false
            )
            ->assertJsonPath(
                'message',
                'Override de multiempresa desativado.'
            );

        $tenant->refresh();

        expect(
            data_get(
                $tenant->settings,
                'saas_overrides.features.multi_company'
            )
        )->toBeFalse();

        /*
         * Super admin força novamente a feature
         * para true.
         */
        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->patchJson(
                "/api/backoffice/clientes/{$tenant->id}/multiempresa",
                [
                    'enabled' => true,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.multi_company_enabled',
                true
            )
            ->assertJsonPath(
                'data.multi_company_override',
                true
            )
            ->assertJsonPath(
                'message',
                'Override de multiempresa ativado.'
            );

        $tenant->refresh();

        expect(
            data_get(
                $tenant->settings,
                'saas_overrides.features.multi_company'
            )
        )->toBeTrue();

        /*
         * null remove o override.
         * O valor efetivo volta a ser o do plano.
         */
        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->patchJson(
                "/api/backoffice/clientes/{$tenant->id}/multiempresa",
                [
                    'enabled' => null,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.multi_company_enabled',
                true
            )
            ->assertJsonPath(
                'data.multi_company_override',
                null
            )
            ->assertJsonPath(
                'message',
                'Multiempresa voltou a utilizar a configuração do plano.'
            );

        $tenant->refresh();

        expect(
            data_get(
                $tenant->settings,
                'saas_overrides.features.multi_company'
            )
        )->toBeNull();

        expect(
            data_get(
                $tenant->settings,
                'saas_overrides'
            )
        )->toBeNull();
    }
);

test(
    'configuração multiempresa exige booleano válido',
    function () {
        $tenant =
            backofficeClientTenant(
                'Cliente Multiempresa Validação',
                'cliente-multiempresa-validacao'
            );

        $superAdmin =
            backofficeClientUser(
                'super.multiempresa.validacao@frotapro.test',
                true
            );

        backofficeClientLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->patchJson(
                "/api/backoffice/clientes/{$tenant->id}/multiempresa",
                [
                    'enabled' => 'invalido',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'enabled'
            );
    }
);

test(
    'super admin consulta impacto de alteração de plano',
    function () {
        $currentPlan =
            SaasPlan::create([
                'codigo' => 'plano-atual',

                'nome' => 'Plano Atual',

                'ativo' => true,

                'limits' => [
                    'empresas' => 5,
                    'veiculos' => 10,
                    'motoristas' => 10,
                    'utilizadores' => 10,
                ],

                'features' => [
                    'multi_company' => false,
                    'integracoes' => false,
                    'relatorios_avancados' => false,
                ],

                'ordem' => 10,
            ]);

        $newPlan =
            SaasPlan::create([
                'codigo' => 'plano-novo',

                'nome' => 'Plano Novo',

                'ativo' => true,

                'limits' => [
                    'empresas' => 1,
                    'veiculos' => 1,
                    'motoristas' => 1,
                    'utilizadores' => 1,
                ],

                'features' => [
                    'multi_company' => true,
                    'integracoes' => true,
                    'relatorios_avancados' => true,
                ],

                'ordem' => 20,
            ]);

        $tenant =
            backofficeClientTenant(
                'Cliente Preview Plano',
                'cliente-preview-plano'
            );

        $tenant->saas_plan_id =
            $currentPlan->id;

        $tenant->save();

        foreach (
            [
                'AA-11-AA',
                'BB-22-BB',
            ] as $matricula
        ) {
            $veiculo =
                new Veiculo([
                    'matricula' => $matricula,

                    'marca' => 'Tesla',

                    'modelo' => 'Model 3',
                ]);

            $veiculo->tenant_id =
                $tenant->id;

            $veiculo->save();
        }

        $superAdmin =
            backofficeClientUser(
                'super.preview.plano@frotapro.test',
                true
            );

        backofficeClientLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->getJson(
                "/api/backoffice/clientes/{$tenant->id}/plano-preview?plan_id={$newPlan->id}"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.current_plan.codigo',
                'plano-atual'
            )
            ->assertJsonPath(
                'data.selected_plan.codigo',
                'plano-novo'
            )
            ->assertJsonPath(
                'data.impact.usage.veiculos.used',
                2
            )
            ->assertJsonPath(
                'data.impact.usage.veiculos.limit',
                1
            )
            ->assertJsonPath(
                'data.impact.usage.veiculos.can_create',
                false
            )
            ->assertJsonPath(
                'data.impact.features.multi_company',
                true
            )
            ->assertJsonPath(
                'data.impact.features.integracoes',
                true
            )
            ->assertJsonPath(
                'data.impact.warnings.0.resource',
                'veiculos'
            )
            ->assertJsonPath(
                'data.impact.warnings.0.excess',
                1
            );

        expect(
            $tenant
                ->refresh()
                ->saas_plan_id
        )->toBe(
            $currentPlan->id
        );
    }
);

test(
    'super admin altera plano do cliente',
    function () {
        $starter =
            SaasPlan::create([
                'codigo' => 'starter-troca',
                'nome' => 'Starter Troca',
                'ativo' => true,

                'limits' => [
                    'empresas' => 1,
                    'veiculos' => 5,
                    'motoristas' => 5,
                    'utilizadores' => 2,
                ],

                'features' => [
                    'multi_company' => false,
                    'integracoes' => false,
                    'relatorios_avancados' => false,
                ],

                'ordem' => 10,
            ]);

        $pro =
            SaasPlan::create([
                'codigo' => 'pro-troca',
                'nome' => 'Pro Troca',
                'ativo' => true,

                'limits' => [
                    'empresas' => 3,
                    'veiculos' => 50,
                    'motoristas' => 60,
                    'utilizadores' => 10,
                ],

                'features' => [
                    'multi_company' => true,
                    'integracoes' => true,
                    'relatorios_avancados' => true,
                ],

                'ordem' => 20,
            ]);

        $tenant =
            backofficeClientTenant(
                'Cliente Troca Plano',
                'cliente-troca-plano'
            );

        $tenant->saas_plan_id =
            $starter->id;

        $tenant->save();

        $superAdmin =
            backofficeClientUser(
                'super.troca.plano@frotapro.test',
                true
            );

        backofficeClientLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->patchJson(
                "/api/backoffice/clientes/{$tenant->id}/plano",
                [
                    'plan_id' => $pro->id,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'message',
                'Plano do cliente alterado com sucesso.'
            )
            ->assertJsonPath(
                'data.previous_plan.codigo',
                'starter-troca'
            )
            ->assertJsonPath(
                'data.plan.codigo',
                'pro-troca'
            )
            ->assertJsonPath(
                'data.impact.features.multi_company',
                true
            )
            ->assertJsonPath(
                'data.impact.features.integracoes',
                true
            );

        expect(
            $tenant
                ->refresh()
                ->saas_plan_id
        )->toBe(
            $pro->id
        );
    }
);

test(
    'plano inativo não pode ser atribuído ao cliente',
    function () {
        $inactivePlan =
            SaasPlan::create([
                'codigo' => 'plano-inativo',

                'nome' => 'Plano Inativo',

                'ativo' => false,

                'limits' => [
                    'empresas' => 1,
                ],

                'features' => [
                    'multi_company' => false,
                ],

                'ordem' => 90,
            ]);

        $tenant =
            backofficeClientTenant(
                'Cliente Plano Inativo',
                'cliente-plano-inativo'
            );

        $superAdmin =
            backofficeClientUser(
                'super.plano.inativo@frotapro.test',
                true
            );

        backofficeClientLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->patchJson(
                "/api/backoffice/clientes/{$tenant->id}/plano",
                [
                    'plan_id' => $inactivePlan->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'plan_id'
            );

        expect(
            $tenant
                ->refresh()
                ->saas_plan_id
        )->toBeNull();
    }
);

test(
    'downgrade acima do limite não apaga dados existentes',
    function () {
        $largePlan =
            SaasPlan::create([
                'codigo' => 'plano-grande',

                'nome' => 'Plano Grande',

                'ativo' => true,

                'limits' => [
                    'empresas' => 5,
                    'veiculos' => 10,
                    'motoristas' => 10,
                    'utilizadores' => 10,
                ],

                'features' => [
                    'multi_company' => true,
                    'integracoes' => true,
                    'relatorios_avancados' => true,
                ],

                'ordem' => 20,
            ]);

        $smallPlan =
            SaasPlan::create([
                'codigo' => 'plano-pequeno',

                'nome' => 'Plano Pequeno',

                'ativo' => true,

                'limits' => [
                    'empresas' => 1,
                    'veiculos' => 1,
                    'motoristas' => 1,
                    'utilizadores' => 1,
                ],

                'features' => [
                    'multi_company' => false,
                    'integracoes' => false,
                    'relatorios_avancados' => false,
                ],

                'ordem' => 10,
            ]);

        $tenant =
            backofficeClientTenant(
                'Cliente Downgrade',
                'cliente-downgrade'
            );

        $tenant->saas_plan_id =
            $largePlan->id;

        $tenant->save();

        foreach (
            [
                'CC-11-CC',
                'DD-22-DD',
            ] as $matricula
        ) {
            $veiculo =
                new Veiculo([
                    'matricula' => $matricula,

                    'marca' => 'Tesla',

                    'modelo' => 'Model Y',
                ]);

            $veiculo->tenant_id =
                $tenant->id;

            $veiculo->save();
        }

        $superAdmin =
            backofficeClientUser(
                'super.downgrade@frotapro.test',
                true
            );

        backofficeClientLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->patchJson(
                "/api/backoffice/clientes/{$tenant->id}/plano",
                [
                    'plan_id' => $smallPlan->id,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.plan.codigo',
                'plano-pequeno'
            )
            ->assertJsonPath(
                'data.impact.usage.veiculos.used',
                2
            )
            ->assertJsonPath(
                'data.impact.usage.veiculos.limit',
                1
            )
            ->assertJsonPath(
                'data.impact.usage.veiculos.can_create',
                false
            )
            ->assertJsonPath(
                'data.impact.warnings.0.resource',
                'veiculos'
            );

        expect(
            Veiculo::query()
                ->where(
                    'tenant_id',
                    $tenant->id
                )
                ->count()
        )->toBe(2);
    }
);

test(
    'alteração de plano preserva overrides saas do cliente',
    function () {
        $plan =
            SaasPlan::create([
                'codigo' => 'plano-sem-multi',

                'nome' => 'Plano Sem Multi',

                'ativo' => true,

                'limits' => [
                    'empresas' => 1,
                    'veiculos' => 10,
                    'motoristas' => 10,
                    'utilizadores' => 5,
                ],

                'features' => [
                    'multi_company' => false,
                    'integracoes' => false,
                    'relatorios_avancados' => false,
                ],

                'ordem' => 30,
            ]);

        $tenant =
            backofficeClientTenant(
                'Cliente Override Plano',
                'cliente-override-plano'
            );

        $settings =
            $tenant->settings
            ?? [];

        data_set(
            $settings,
            'saas_overrides.features.multi_company',
            true
        );

        $tenant->settings =
            $settings;

        $tenant->save();

        $superAdmin =
            backofficeClientUser(
                'super.override.plano@frotapro.test',
                true
            );

        backofficeClientLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeClientHeaders()
            )
            ->patchJson(
                "/api/backoffice/clientes/{$tenant->id}/plano",
                [
                    'plan_id' => $plan->id,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.impact.features.multi_company',
                true
            );

        $tenant->refresh();

        expect(
            data_get(
                $tenant->settings,
                'saas_overrides.features.multi_company'
            )
        )->toBeTrue();

        expect(
            $tenant->saas_plan_id
        )->toBe(
            $plan->id
        );
    }
);
