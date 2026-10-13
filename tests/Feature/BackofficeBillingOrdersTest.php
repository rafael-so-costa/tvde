<?php

use App\Models\BillingCharge;
use App\Models\BillingPayment;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(
        RoleSeeder::class
    );
});

function billingOrdersHeaders(): array
{
    return [
        'Origin' =>
            'http://localhost:8000',

        'Referer' =>
            'http://localhost:8000/',

        'Accept' =>
            'application/json',
    ];
}

function billingOrdersAdmin(): User
{
    $user =
        User::factory()
            ->create([
                'email' =>
                    'billing.orders@frotapro.test',

                'password' =>
                    Hash::make(
                        'SenhaTeste123!'
                    ),

                'ativo' =>
                    true,
            ]);

    $role =
        Role::query()
            ->where(
                'codigo',
                'super_admin'
            )
            ->firstOrFail();

    UserRole::create([
        'user_id' =>
            $user->id,

        'role_id' =>
            $role->id,

        'tenant_id' =>
            null,
    ]);

    return $user;
}

function billingOrdersLogin(
    $test,
    User $user
): void {
    $test
        ->postJson(
            '/login',
            [
                'email' =>
                    $user->email,

                'password' =>
                    'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

function billingOrdersCharge(
    Tenant $tenant,
    string $sourceType,
    string $number,
    string $status =
        BillingCharge::STATUS_PENDING
): BillingCharge {
    return BillingCharge::create([
        'tenant_id' =>
            $tenant->id,

        'source_type' =>
            $sourceType,

        'source_id' =>
            (string) Str::uuid(),

        'number' =>
            $number,

        'status' =>
            $status,

        'description' =>
            $sourceType ===
                BillingCharge::SOURCE_SAAS_SUBSCRIPTION
                ? 'Plano FrotaPRO mensal'
                : 'FrotaPRO Ads — campanha teste',

        'subtotal' =>
            19.90,

        'discount' =>
            0,

        'total' =>
            19.90,

        'currency' =>
            'EUR',

        'due_at' =>
            now()->addDays(7),

        'idempotency_key' =>
            'billing-orders-' .
            Str::uuid(),
    ]);
}

test(
    'pedidos de faturação exigem autenticação',
    function () {
        $this
            ->withHeaders(
                billingOrdersHeaders()
            )
            ->getJson(
                '/api/backoffice/faturacao/pedidos'
            )
            ->assertUnauthorized();
    }
);

test(
    'super admin lista cobranças saas e ads',
    function () {
        $tenant =
            Tenant::create([
                'nome' =>
                    'Cliente Billing',

                'slug' =>
                    'cliente-billing',

                'nif' =>
                    '509999999',

                'email' =>
                    'billing@cliente.test',

                'ativo' =>
                    true,
            ]);

        billingOrdersCharge(
            $tenant,
            BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
            'SAAS-202610-LISTA'
        );

        billingOrdersCharge(
            $tenant,
            BillingCharge::SOURCE_AD_ORDER,
            'ADS-202610-LISTA'
        );

        $admin =
            billingOrdersAdmin();

        billingOrdersLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                billingOrdersHeaders()
            )
            ->getJson(
                '/api/backoffice/faturacao/pedidos'
            )
            ->assertOk()
            ->assertJsonPath(
                'meta.total',
                2
            );
    }
);

test(
    'listagem usa pagamento mais recente da cobrança',
    function () {
        $tenant =
            Tenant::create([
                'nome' =>
                    'Cliente Pagamento',

                'slug' =>
                    'cliente-pagamento',

                'ativo' =>
                    true,
            ]);

        $charge =
            billingOrdersCharge(
                $tenant,
                BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
                'SAAS-202610-PAYMENT'
            );

        $mock =
            BillingPayment::create([
                'billing_charge_id' =>
                    $charge->id,

                'provider' =>
                    'ifthenpay',

                'method' =>
                    BillingPayment::METHOD_MULTIBANCO,

                'status' =>
                    BillingPayment::STATUS_CANCELED,

                'amount' =>
                    19.90,

                'currency' =>
                    'EUR',

                'external_id' =>
                    'mock-old',

                'provider_reference' =>
                    'mock:SAAS-202610-PAYMENT',

                'entity' =>
                    '99999',

                'reference' =>
                    '111111111',

                'metadata' => [
                    'mock' =>
                        true,
                ],
            ]);

        DB::table(
            'billing_payments'
        )
            ->where(
                'id',
                $mock->id
            )
            ->update([
                'created_at' =>
                    now()->subMinute(),

                'updated_at' =>
                    now()->subMinute(),
            ]);

        BillingPayment::create([
            'billing_charge_id' =>
                $charge->id,

            'provider' =>
                'ifthenpay',

            'method' =>
                BillingPayment::METHOD_MULTIBANCO,

            'status' =>
                BillingPayment::STATUS_PENDING,

            'amount' =>
                19.90,

            'currency' =>
                'EUR',

            'external_id' =>
                'REAL-REQUEST',

            'provider_reference' =>
                'SAAS-202610-PAYMENT',

            'entity' =>
                '11990',

            'reference' =>
                '987654321',

            'metadata' => [
                'mock' =>
                    false,
            ],
        ]);

        $admin =
            billingOrdersAdmin();

        billingOrdersLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                billingOrdersHeaders()
            )
            ->getJson(
                '/api/backoffice/faturacao/pedidos?source_type=saas_subscription'
            )
            ->assertOk()
            ->assertJsonCount(
                1,
                'data'
            )
            ->assertJsonPath(
                'data.0.number',
                'SAAS-202610-PAYMENT'
            )
            ->assertJsonPath(
                'data.0.payment.status',
                'pending'
            )
            ->assertJsonPath(
                'data.0.payment.reference',
                '987654321'
            )
            ->assertJsonPath(
                'data.0.payment.mock',
                false
            );
    }
);

test(
    'pedidos podem ser filtrados por origem estado pagamento e pesquisa',
    function () {
        $tenant =
            Tenant::create([
                'nome' =>
                    'Empresa Pesquisa TVDE',

                'slug' =>
                    'empresa-pesquisa-tvde',

                'nif' =>
                    '507777777',

                'ativo' =>
                    true,
            ]);

        $saas =
            billingOrdersCharge(
                $tenant,
                BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
                'SAAS-202610-FILTRO'
            );

        BillingPayment::create([
            'billing_charge_id' =>
                $saas->id,

            'provider' =>
                'ifthenpay',

            'method' =>
                BillingPayment::METHOD_MULTIBANCO,

            'status' =>
                BillingPayment::STATUS_PENDING,

            'amount' =>
                19.90,

            'currency' =>
                'EUR',

            'external_id' =>
                'REQ-FILTRO',

            'provider_reference' =>
                'SAAS-202610-FILTRO',

            'entity' =>
                '11990',

            'reference' =>
                '123123123',
        ]);

        billingOrdersCharge(
            $tenant,
            BillingCharge::SOURCE_AD_ORDER,
            'ADS-202610-FILTRO'
        );

        $admin =
            billingOrdersAdmin();

        billingOrdersLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                billingOrdersHeaders()
            )
            ->getJson(
                '/api/backoffice/faturacao/pedidos?source_type=saas_subscription&payment_status=pending&q=507777777'
            )
            ->assertOk()
            ->assertJsonCount(
                1,
                'data'
            )
            ->assertJsonPath(
                'data.0.number',
                'SAAS-202610-FILTRO'
            );

        $this
            ->withHeaders(
                billingOrdersHeaders()
            )
            ->getJson(
                '/api/backoffice/faturacao/pedidos?source_type=ad_order&payment_status=none'
            )
            ->assertOk()
            ->assertJsonCount(
                1,
                'data'
            )
            ->assertJsonPath(
                'data.0.number',
                'ADS-202610-FILTRO'
            );
    }
);