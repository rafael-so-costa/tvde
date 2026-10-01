<?php

use App\Models\Role;
use App\Models\SaasPlan;
use App\Models\SaasSubscription;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use App\Services\SaasSubscriptionService;
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

function backofficeSubscriptionHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function backofficeSubscriptionUser(
    string $email,
    bool $superAdmin = false
): User {
    $user =
        User::factory()
            ->create([
                'email' => $email,

                'password' => Hash::make(
                    'SenhaTeste123!'
                ),

                'ativo' => true,
            ]);

    if ($superAdmin) {
        $role =
            Role::query()
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

function backofficeSubscriptionLogin(
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

function backofficeSubscriptionPlan(): SaasPlan
{
    return SaasPlan::query()
        ->firstOrCreate(
            [
                'codigo' => 'pro-assinaturas',
            ],
            [
                'nome' => 'Pro Assinaturas',

                'descricao' => 'Plano para testes de assinaturas.',

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
            ]
        );
}

function backofficeSubscriptionCreate(
    string $suffix = 'principal'
): SaasSubscription {
    $plan =
        backofficeSubscriptionPlan();

    $tenant =
        Tenant::create([
            'saas_plan_id' => $plan->id,

            'nome' => "Cliente Assinatura {$suffix}",

            'slug' => "cliente-assinatura-{$suffix}",

            'nif' => (string) random_int(
                500000000,
                599999999
            ),

            'email' => "{$suffix}@assinatura.test",

            'ativo' => true,
        ]);

    return app(
        SaasSubscriptionService::class
    )->ensureForTenant(
        $tenant,
        $plan
    );
}

test(
    'assinaturas do backoffice exigem autenticação',
    function () {
        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->getJson(
                '/api/backoffice/assinaturas'
            )
            ->assertUnauthorized();
    }
);

test(
    'utilizador comum não consulta assinaturas',
    function () {
        $user =
            backofficeSubscriptionUser(
                'normal.assinaturas@frotapro.test'
            );

        backofficeSubscriptionLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->getJson(
                '/api/backoffice/assinaturas'
            )
            ->assertForbidden();
    }
);

test(
    'super admin lista assinaturas',
    function () {
        $subscription =
            backofficeSubscriptionCreate();

        $superAdmin =
            backofficeSubscriptionUser(
                'super.lista.assinaturas@frotapro.test',
                true
            );

        backofficeSubscriptionLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->getJson(
                '/api/backoffice/assinaturas'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.0.id',
                $subscription->id
            )
            ->assertJsonPath(
                'data.0.status',
                'active'
            )
            ->assertJsonPath(
                'data.0.billing_cycle',
                'monthly'
            )
            ->assertJsonPath(
                'data.0.tenant.nome',
                'Cliente Assinatura principal'
            )
            ->assertJsonPath(
                'data.0.plan.codigo',
                'pro-assinaturas'
            );
    }
);

test(
    'listagem filtra assinaturas por estado',
    function () {
        $active =
            backofficeSubscriptionCreate(
                'ativa'
            );

        $suspended =
            backofficeSubscriptionCreate(
                'suspensa'
            );

        $suspended->status =
            SaasSubscription::STATUS_SUSPENDED;

        $suspended->save();

        $superAdmin =
            backofficeSubscriptionUser(
                'super.filtro.assinaturas@frotapro.test',
                true
            );

        backofficeSubscriptionLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->getJson(
                '/api/backoffice/assinaturas?status=suspended'
            )
            ->assertOk()
            ->assertJsonCount(
                1,
                'data'
            )
            ->assertJsonPath(
                'data.0.id',
                $suspended->id
            );

        expect(
            $active->id
        )->not->toBe(
            $suspended->id
        );
    }
);

test(
    'super admin consulta assinatura',
    function () {
        $subscription =
            backofficeSubscriptionCreate(
                'detalhe'
            );

        $superAdmin =
            backofficeSubscriptionUser(
                'super.detalhe.assinatura@frotapro.test',
                true
            );

        backofficeSubscriptionLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->getJson(
                "/api/backoffice/assinaturas/{$subscription->id}"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.id',
                $subscription->id
            )
            ->assertJsonPath(
                'data.currency',
                'EUR'
            );
    }
);

test(
    'super admin atualiza condições comerciais',
    function () {
        $subscription =
            backofficeSubscriptionCreate(
                'condicoes'
            );

        $superAdmin =
            backofficeSubscriptionUser(
                'super.condicoes.assinatura@frotapro.test',
                true
            );

        backofficeSubscriptionLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->patchJson(
                "/api/backoffice/assinaturas/{$subscription->id}",
                [
                    'billing_cycle' => 'yearly',

                    'price_amount' => 499.90,

                    'currency' => 'eur',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.billing_cycle',
                'yearly'
            )
            ->assertJsonPath(
                'data.price_amount',
                499.9
            )
            ->assertJsonPath(
                'data.currency',
                'EUR'
            );

        $subscription->refresh();

        expect(
            $subscription->billing_cycle
        )->toBe(
            'yearly'
        );

        expect(
            $subscription->currency
        )->toBe(
            'EUR'
        );
    }
);

test(
    'super admin inicia e encerra trial',
    function () {
        $subscription =
            backofficeSubscriptionCreate(
                'trial'
            );

        $superAdmin =
            backofficeSubscriptionUser(
                'super.trial.assinatura@frotapro.test',
                true
            );

        backofficeSubscriptionLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->postJson(
                "/api/backoffice/assinaturas/{$subscription->id}/acao",
                [
                    'action' => 'start_trial',

                    'trial_days' => 14,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'trialing'
            );

        expect(
            $subscription
                ->refresh()
                ->trial_ends_at
        )->not->toBeNull();

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->postJson(
                "/api/backoffice/assinaturas/{$subscription->id}/acao",
                [
                    'action' => 'end_trial',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'active'
            )
            ->assertJsonPath(
                'data.trial_ends_at',
                null
            );
    }
);

test(
    'super admin suspende e reativa assinatura',
    function () {
        $subscription =
            backofficeSubscriptionCreate(
                'suspender'
            );

        $superAdmin =
            backofficeSubscriptionUser(
                'super.suspende.assinatura@frotapro.test',
                true
            );

        backofficeSubscriptionLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->postJson(
                "/api/backoffice/assinaturas/{$subscription->id}/acao",
                [
                    'action' => 'suspend',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'suspended'
            );

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->postJson(
                "/api/backoffice/assinaturas/{$subscription->id}/acao",
                [
                    'action' => 'reactivate',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'active'
            );
    }
);

test(
    'super admin agenda e remove cancelamento',
    function () {
        $subscription =
            backofficeSubscriptionCreate(
                'cancelamento'
            );

        $superAdmin =
            backofficeSubscriptionUser(
                'super.cancela.agenda@frotapro.test',
                true
            );

        backofficeSubscriptionLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->postJson(
                "/api/backoffice/assinaturas/{$subscription->id}/acao",
                [
                    'action' => 'schedule_cancel',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.cancel_scheduled',
                true
            );

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->postJson(
                "/api/backoffice/assinaturas/{$subscription->id}/acao",
                [
                    'action' => 'clear_cancel',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.cancel_scheduled',
                false
            );
    }
);

test(
    'super admin cancela assinatura imediatamente e pode reativar',
    function () {
        $subscription =
            backofficeSubscriptionCreate(
                'cancelar-agora'
            );

        $superAdmin =
            backofficeSubscriptionUser(
                'super.cancela.agora@frotapro.test',
                true
            );

        backofficeSubscriptionLogin(
            $this,
            $superAdmin
        );

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->postJson(
                "/api/backoffice/assinaturas/{$subscription->id}/acao",
                [
                    'action' => 'cancel_now',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'canceled'
            );

        expect(
            $subscription
                ->refresh()
                ->canceled_at
        )->not->toBeNull();

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->postJson(
                "/api/backoffice/assinaturas/{$subscription->id}/acao",
                [
                    'action' => 'reactivate',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'active'
            )
            ->assertJsonPath(
                'data.canceled_at',
                null
            );
    }
);

test(
    'assinatura inexistente retorna 404',
    function () {
        $superAdmin =
            backofficeSubscriptionUser(
                'super.assinatura.404@frotapro.test',
                true
            );

        backofficeSubscriptionLogin(
            $this,
            $superAdmin
        );

        $id =
            Str::uuid()
                ->toString();

        $this
            ->withHeaders(
                backofficeSubscriptionHeaders()
            )
            ->getJson(
                "/api/backoffice/assinaturas/{$id}"
            )
            ->assertNotFound();
    }
);
