<?php

use App\Models\Role;
use App\Models\SaasPlan;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
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

function backofficePlanHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function backofficePlanUser(
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

function backofficePlanLogin(
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

function backofficePlanPayload(
    array $overrides = []
): array {
    return array_replace_recursive([
        'codigo' => 'pro',

        'nome' => 'Pro',

        'descricao' => 'Plano profissional do FrotaPRO.',

        'ativo' => true,

        'ordem' => 20,

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
    ], $overrides);
}

test(
    'planos do backoffice exigem autenticação',
    function () {
        $this
            ->withHeaders(
                backofficePlanHeaders()
            )
            ->getJson(
                '/api/backoffice/planos'
            )
            ->assertUnauthorized();
    }
);

test(
    'utilizador comum não consulta planos do backoffice',
    function () {
        $user =
            backofficePlanUser(
                'normal.planos@frotapro.test'
            );

        backofficePlanLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                backofficePlanHeaders()
            )
            ->getJson(
                '/api/backoffice/planos'
            )
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'Acesso restrito ao backoffice FrotaPRO.'
            );
    }
);

test(
    'super admin lista planos por ordem',
    function () {
        SaasPlan::create(
            backofficePlanPayload([
                'codigo' => 'enterprise',
                'nome' => 'Enterprise',
                'ordem' => 30,
            ])
        );

        SaasPlan::create(
            backofficePlanPayload([
                'codigo' => 'starter-teste',
                'nome' => 'Starter Teste',
                'ordem' => 10,
            ])
        );

        $superAdmin =
            backofficePlanUser(
                'super.lista.planos@frotapro.test',
                true
            );

        backofficePlanLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficePlanHeaders()
            )
            ->getJson(
                '/api/backoffice/planos'
            )
            ->assertOk()
            ->assertJsonCount(
                2,
                'data'
            )
            ->assertJsonPath(
                'data.0.codigo',
                'starter-teste'
            )
            ->assertJsonPath(
                'data.1.codigo',
                'enterprise'
            )
            ->assertJsonPath(
                'data.0.tenants_count',
                0
            );
    }
);

test(
    'super admin cria plano saas',
    function () {
        $superAdmin =
            backofficePlanUser(
                'super.cria.plano@frotapro.test',
                true
            );

        backofficePlanLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficePlanHeaders()
            )
            ->postJson(
                '/api/backoffice/planos',
                backofficePlanPayload()
            )
            ->assertCreated()
            ->assertJsonPath(
                'message',
                'Plano criado com sucesso.'
            )
            ->assertJsonPath(
                'data.codigo',
                'pro'
            )
            ->assertJsonPath(
                'data.nome',
                'Pro'
            )
            ->assertJsonPath(
                'data.limits.empresas',
                3
            )
            ->assertJsonPath(
                'data.limits.veiculos',
                50
            )
            ->assertJsonPath(
                'data.features.multi_company',
                true
            )
            ->assertJsonPath(
                'data.features.integracoes',
                true
            )
            ->assertJsonPath(
                'data.tenants_count',
                0
            );

        $this->assertDatabaseHas(
            'saas_plans',
            [
                'codigo' => 'pro',
                'nome' => 'Pro',
                'ativo' => true,
                'ordem' => 20,
            ]
        );
    }
);

test(
    'código do plano deve ser único',
    function () {
        SaasPlan::create(
            backofficePlanPayload()
        );

        $superAdmin =
            backofficePlanUser(
                'super.duplicado.plano@frotapro.test',
                true
            );

        backofficePlanLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficePlanHeaders()
            )
            ->postJson(
                '/api/backoffice/planos',
                backofficePlanPayload([
                    'nome' => 'Outro Pro',
                ])
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'codigo'
            );
    }
);

test(
    'limites e funcionalidades do plano são validados',
    function () {
        $superAdmin =
            backofficePlanUser(
                'super.validacao.plano@frotapro.test',
                true
            );

        backofficePlanLogin(
            $this,
            $superAdmin
        );

        $payload =
            backofficePlanPayload();

        $payload['limits']['empresas'] =
            -1;

        $payload['features']['integracoes'] =
            'talvez';

        $this
            ->withHeaders(
                backofficePlanHeaders()
            )
            ->postJson(
                '/api/backoffice/planos',
                $payload
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'limits.empresas',
                'features.integracoes',
            ]);
    }
);

test(
    'limite nulo permite recurso ilimitado',
    function () {
        $superAdmin =
            backofficePlanUser(
                'super.ilimitado.plano@frotapro.test',
                true
            );

        backofficePlanLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficePlanHeaders()
            )
            ->postJson(
                '/api/backoffice/planos',
                backofficePlanPayload([
                    'codigo' => 'ilimitado',
                    'nome' => 'Ilimitado',

                    'limits' => [
                        'empresas' => null,
                        'veiculos' => null,
                        'motoristas' => null,
                        'utilizadores' => null,
                    ],
                ])
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.limits.empresas',
                null
            )
            ->assertJsonPath(
                'data.limits.veiculos',
                null
            );
    }
);

test(
    'super admin consulta plano e total de clientes',
    function () {
        $plan = SaasPlan::create(
            backofficePlanPayload()
        );

        Tenant::create([
            'saas_plan_id' => $plan->id,
            'nome' => 'Cliente Plano',
            'slug' => 'cliente-plano',
            'nif' => '509000001',
            'ativo' => true,
        ]);

        $superAdmin =
            backofficePlanUser(
                'super.detalhe.plano@frotapro.test',
                true
            );

        backofficePlanLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficePlanHeaders()
            )
            ->getJson(
                "/api/backoffice/planos/{$plan->id}"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.id',
                $plan->id
            )
            ->assertJsonPath(
                'data.codigo',
                'pro'
            )
            ->assertJsonPath(
                'data.tenants_count',
                1
            );
    }
);

test(
    'super admin atualiza plano saas',
    function () {
        $plan = SaasPlan::create(
            backofficePlanPayload()
        );

        $superAdmin =
            backofficePlanUser(
                'super.edita.plano@frotapro.test',
                true
            );

        backofficePlanLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficePlanHeaders()
            )
            ->patchJson(
                "/api/backoffice/planos/{$plan->id}",
                backofficePlanPayload([
                    'nome' => 'Pro Plus',

                    'descricao' => 'Plano Pro atualizado.',

                    'ordem' => 25,

                    'limits' => [
                        'empresas' => 5,
                        'veiculos' => 100,
                        'motoristas' => 120,
                        'utilizadores' => 20,
                    ],

                    'features' => [
                        'multi_company' => true,
                        'integracoes' => true,
                        'relatorios_avancados' => false,
                    ],
                ])
            )
            ->assertOk()
            ->assertJsonPath(
                'message',
                'Plano atualizado com sucesso.'
            )
            ->assertJsonPath(
                'data.nome',
                'Pro Plus'
            )
            ->assertJsonPath(
                'data.ordem',
                25
            )
            ->assertJsonPath(
                'data.limits.empresas',
                5
            )
            ->assertJsonPath(
                'data.features.relatorios_avancados',
                false
            );

        $this->assertDatabaseHas(
            'saas_plans',
            [
                'id' => $plan->id,
                'nome' => 'Pro Plus',
                'ordem' => 25,
            ]
        );
    }
);

test(
    'plano starter não pode ser inativado',
    function () {
        $starter = SaasPlan::create(
            backofficePlanPayload([
                'codigo' => 'starter',
                'nome' => 'Starter',
                'ordem' => 10,
            ])
        );

        $superAdmin =
            backofficePlanUser(
                'super.starter.ativo@frotapro.test',
                true
            );

        backofficePlanLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficePlanHeaders()
            )
            ->patchJson(
                "/api/backoffice/planos/{$starter->id}",
                backofficePlanPayload([
                    'codigo' => 'starter',
                    'nome' => 'Starter',
                    'ativo' => false,
                    'ordem' => 10,
                ])
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'ativo'
            );

        expect(
            $starter
                ->refresh()
                ->ativo
        )->toBeTrue();
    }
);

test(
    'código do plano starter não pode ser alterado',
    function () {
        $starter = SaasPlan::create(
            backofficePlanPayload([
                'codigo' => 'starter',
                'nome' => 'Starter',
                'ordem' => 10,
            ])
        );

        $superAdmin =
            backofficePlanUser(
                'super.starter.codigo@frotapro.test',
                true
            );

        backofficePlanLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficePlanHeaders()
            )
            ->patchJson(
                "/api/backoffice/planos/{$starter->id}",
                backofficePlanPayload([
                    'codigo' => 'starter-renomeado',
                    'nome' => 'Starter',
                    'ordem' => 10,
                ])
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'codigo'
            );

        expect(
            $starter
                ->refresh()
                ->codigo
        )->toBe(
            'starter'
        );
    }
);

test(
    'plano inexistente retorna 404',
    function () {
        $superAdmin =
            backofficePlanUser(
                'super.plano.404@frotapro.test',
                true
            );

        backofficePlanLogin(
            $this,
            $superAdmin
        );

        $id = Str::uuid()
            ->toString();

        $this
            ->withHeaders(
                backofficePlanHeaders()
            )
            ->getJson(
                "/api/backoffice/planos/{$id}"
            )
            ->assertNotFound();
    }
);
