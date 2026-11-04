<?php

declare(strict_types=1);

use App\Models\AdOrder;
use App\Models\AdAdvertiser;
use App\Models\AdCampaign;
use App\Models\BillingCharge;
use App\Models\BillingPayment;
use App\Models\Role;
use App\Models\SaasCoupon;
use App\Models\SaasPlan;
use App\Models\SaasSubscription;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed(RoleSeeder::class);

    $this->withHeaders([
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ]);

    config()->set('billing.coupons.enabled', false);
    config()->set('billing.default_provider', 'ifthenpay');
    config()->set('billing.providers.ifthenpay.enabled', true);
    config()->set('billing.providers.ifthenpay.sandbox', true);
    config()->set(
        'billing.providers.ifthenpay.mb_key',
        'TESTE-FICTICIO'
    );

    Http::preventStrayRequests();
});

function couponCheckoutLogin($test, bool $admin = true): void
{
    $user = User::factory()->create([
        'email' => 'checkout-' .
            Str::random(8) .
            '@frotapro.test',

        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);

    if ($admin) {
        $role = Role::query()
            ->where('codigo', 'super_admin')
            ->firstOrFail();

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'tenant_id' => null,
        ]);
    }

    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function couponCheckoutSubscription(): SaasSubscription
{
    $tenant = Tenant::create([
        'nome' => 'Cliente de checkout',
        'slug' => 'cliente-checkout-' .
            Str::lower(Str::random(8)),
        'ativo' => true,
    ]);

    $plan = SaasPlan::create([
        'codigo' => 'checkout-' .
            Str::lower(Str::random(8)),
        'nome' => 'Plano de checkout',
        'ativo' => true,
        'ordem' => 10,
    ]);

    return SaasSubscription::create([
        'tenant_id' => $tenant->id,
        'saas_plan_id' => $plan->id,
        'status' => SaasSubscription::STATUS_ACTIVE,
        'billing_cycle' => SaasSubscription::BILLING_MONTHLY,
        'price_amount' => '50.00',
        'currency' => 'EUR',
        'starts_at' => now()->subDay(),
        'current_period_starts_at' => now()->startOfMonth(),
        'current_period_ends_at' =>
            now()->startOfMonth()->addMonth(),
    ]);
}

function couponCheckoutAdOrder(): AdOrder
{
    $advertiser = AdAdvertiser::create([
        'type' => AdAdvertiser::TYPE_EXTERNAL,
        'name' => 'Anunciante de testes',
        'status' => AdAdvertiser::STATUS_ACTIVE,
    ]);

    $campaign = AdCampaign::create([
        'advertiser_id' => $advertiser->id,
        'source' => AdCampaign::SOURCE_EXTERNAL,
        'kind' => AdCampaign::KIND_COMMERCIAL,
        'name' => 'Campanha teste cupões',
        'title' => 'Campanha checkout',
        'status' => AdCampaign::STATUS_AWAITING_PAYMENT,
        'quoted_price' => '50.00',
        'currency' => 'EUR',
        'payment_required' => true,
        'payment_status' => AdCampaign::PAYMENT_PENDING,
    ]);

    return AdOrder::create([
        'campaign_id' => $campaign->id,
        'advertiser_id' => $advertiser->id,
        'number' => 'ADSTEST-' .
            Str::upper(Str::random(8)),
        'status' => AdOrder::STATUS_PENDING,
        'subtotal' => '50.00',
        'discount' => '0.00',
        'total' => '50.00',
        'currency' => 'EUR',
        'due_at' => now()->addDays(7),
    ]);
}

function couponCheckoutCoupon(array $data = []): SaasCoupon
{
    return SaasCoupon::create(array_merge([
        'code' => 'CHECKOUT10',
        'name' => 'Cupão de checkout',
        'discount_type' => SaasCoupon::TYPE_PERCENTAGE,
        'discount_value' => '10.00',
        'applies_to' => SaasCoupon::SCOPE_BOTH,
        'enabled' => true,
        'first_payment_only' => false,
    ], $data));
}

function couponCheckoutPayload(
    string $id,
    string $scope = 'saas_subscription'
): array {
    return [
        'scope' => $scope,
        'source_id' => $id,
        'coupon_code' => 'CHECKOUT10',
    ];
}

test('estado de cupoes exige login', function (): void {
    $this->getJson(
        '/api/backoffice/faturacao/cupoes/estado'
    )->assertUnauthorized();
});

test(
    'utilizador comum nao ve cotacao nem emite referencia',
    function (): void {
        couponCheckoutLogin($this, false);

        $payload = couponCheckoutPayload((string) Str::uuid());

        $this->postJson(
            '/api/backoffice/faturacao/cupoes/cotacao',
            $payload
        )->assertForbidden();

        $this->postJson(
            '/api/backoffice/faturacao/cupoes/emitir',
            $payload
        )->assertForbidden();
    }
);

test(
    'flag desligada bloqueia checkout sem emitir referencias',
    function (): void {
        couponCheckoutLogin($this);

        $this->getJson(
            '/api/backoffice/faturacao/cupoes/estado'
        )
            ->assertOk()
            ->assertJsonPath('data.enabled', false);

        $subscription = couponCheckoutSubscription();
        couponCheckoutCoupon();

        $this->postJson(
            '/api/backoffice/faturacao/cupoes/cotacao',
            couponCheckoutPayload($subscription->id)
        )->assertUnprocessable();

        $this->postJson(
            '/api/backoffice/faturacao/cupoes/emitir',
            couponCheckoutPayload($subscription->id)
        )->assertUnprocessable();

        expect(BillingPayment::count())->toBe(0);
        expect(BillingCharge::count())->toBe(0);

        Http::assertNothingSent();
    }
);

test(
    'entrada invalida falha sem criar cobranca',
    function (): void {
        couponCheckoutLogin($this);

        $this->postJson(
            '/api/backoffice/faturacao/cupoes/emitir',
            [
                'scope' => 'qualquer',
                'source_id' => 'invalido',
                'coupon_code' => 'BAD CODE',
            ]
        )->assertUnprocessable()
            ->assertJsonValidationErrors([
                'scope',
                'source_id',
                'coupon_code',
            ]);

        expect(BillingCharge::count())->toBe(0);
    }
);

test(
    'cotacao valida calcula no servidor sem criar reserva ou cobranca',
    function (): void {
        couponCheckoutLogin($this);

        config()->set('billing.coupons.enabled', true);

        $subscription = couponCheckoutSubscription();
        couponCheckoutCoupon();

        $this->postJson(
            '/api/backoffice/faturacao/cupoes/cotacao',
            couponCheckoutPayload($subscription->id)
        )
            ->assertOk()
            ->assertJsonPath('data.subtotal', '50.00')
            ->assertJsonPath('data.discount', '5.00')
            ->assertJsonPath('data.total', '45.00');

        expect(BillingCharge::count())->toBe(0);

        expect(
            \App\Models\SaasCouponRedemption::count()
        )->toBe(0);

        Http::assertNothingSent();
    }
);

test(
    'cupao de desconto integral nao cria referencia multibanco',
    function (): void {
        couponCheckoutLogin($this);

        config()->set('billing.coupons.enabled', true);

        $subscription = couponCheckoutSubscription();

        couponCheckoutCoupon([
            'discount_value' => '100.00',
        ]);

        $this->postJson(
            '/api/backoffice/faturacao/cupoes/cotacao',
            couponCheckoutPayload($subscription->id)
        )->assertUnprocessable();

        $this->postJson(
            '/api/backoffice/faturacao/cupoes/emitir',
            couponCheckoutPayload($subscription->id)
        )->assertUnprocessable();

        expect(BillingPayment::count())->toBe(0);

        Http::assertNothingSent();
    }
);

test(
    'referencia Ifthenpay usa valor final e pedido repetido e idempotente',
    function (): void {
        couponCheckoutLogin($this);

        config()->set('billing.coupons.enabled', true);

        $subscription = couponCheckoutSubscription();
        couponCheckoutCoupon();

        Http::fake(function ($request) {
            return Http::response([
                'Amount' => (string) $request['amount'],
                'Entity' => '12345',
                'ExpiryDate' => now()
                    ->addDays(7)
                    ->format('d-m-Y'),
                'Message' => 'Success',
                'OrderId' => (string) $request['orderId'],
                'Reference' => '123456789',
                'RequestId' => 'REQ-' . Str::random(12),
                'Status' => '0',
            ], 200);
        });

        $url = '/api/backoffice/faturacao/cupoes/emitir';
        $payload = couponCheckoutPayload($subscription->id);

        $first = $this->postJson($url, $payload)
            ->assertCreated()
            ->assertJsonPath('data.amount', 45)
            ->assertJsonPath('data.coupon.discount', 5);

        $paymentId = $first->json('data.id');

        $this->postJson($url, $payload)
            ->assertCreated()
            ->assertJsonPath('data.id', $paymentId);

        expect(BillingPayment::count())->toBe(1);

        expect(
            \App\Models\SaasCouponRedemption::count()
        )->toBe(1);

        Http::assertSentCount(1);

        Http::assertSent(
            fn ($request) =>
                (string) $request['amount'] === '45.00'
        );
    }
);

test(
    'pedido Ads aplica desconto ao pedido e a cobranca antes da referencia',
    function (): void {
        couponCheckoutLogin($this);

        config()->set('billing.coupons.enabled', true);

        $order = couponCheckoutAdOrder();
        couponCheckoutCoupon();

        Http::fake(function ($request) {
            return Http::response([
                'Amount' => (string) $request['amount'],
                'Entity' => '12345',
                'ExpiryDate' => now()
                    ->addDays(7)
                    ->format('d-m-Y'),
                'Message' => 'Success',
                'OrderId' => (string) $request['orderId'],
                'Reference' => '123456789',
                'RequestId' => 'ADS-' . Str::random(12),
                'Status' => '0',
            ], 200);
        });

        $payload = couponCheckoutPayload(
            $order->id,
            'ad_order'
        );

        $this->postJson(
            '/api/backoffice/faturacao/cupoes/cotacao',
            $payload
        )
            ->assertOk()
            ->assertJsonPath('data.total', '45.00');

        $this->postJson(
            '/api/backoffice/faturacao/cupoes/emitir',
            $payload
        )
            ->assertCreated()
            ->assertJsonPath('data.amount', 45);

        expect(
            (string) $order->fresh()->discount
        )->toBe('5.00');

        expect(
            (string) $order->fresh()->total
        )->toBe('45.00');

        expect(
            (string) BillingCharge::firstOrFail()->discount
        )->toBe('5.00');

        Http::assertSentCount(1);
    }
);

test(
    'referencia anterior impede desconto retroativo',
    function (): void {
        couponCheckoutLogin($this);

        config()->set('billing.coupons.enabled', true);

        $subscription = couponCheckoutSubscription();
        couponCheckoutCoupon();

        $charge = app(
            \App\Services\Billing\BillingService::class
        )->subscriptionCharge($subscription);

        BillingPayment::create([
            'billing_charge_id' => $charge->id,
            'provider' => 'ifthenpay',
            'method' => BillingPayment::METHOD_MULTIBANCO,
            'status' => BillingPayment::STATUS_PENDING,
            'amount' => '50.00',
            'currency' => 'EUR',
            'reference' => '123456789',
        ]);

        $this->postJson(
            '/api/backoffice/faturacao/cupoes/emitir',
            couponCheckoutPayload($subscription->id)
        )->assertUnprocessable();

        expect(
            (string) $charge->fresh()->total
        )->toBe('50.00');

        Http::assertNothingSent();
    }
);

test(
    'checkout Ads repetido reutiliza pagamento e referencia',
    function (): void {
        couponCheckoutLogin($this);

        config()->set('billing.coupons.enabled', true);

        $order = couponCheckoutAdOrder();
        couponCheckoutCoupon();

        Http::fake(function ($request) {
            return Http::response([
                'Amount' => (string) $request['amount'],
                'Entity' => '12345',
                'ExpiryDate' => now()->addDays(7)->format('d-m-Y'),
                'Message' => 'Success',
                'OrderId' => (string) $request['orderId'],
                'Reference' => '123456789',
                'RequestId' => 'ADS-RETRY-' . Str::random(8),
                'Status' => '0',
            ], 200);
        });

        $payload = couponCheckoutPayload($order->id, 'ad_order');
        $url = '/api/backoffice/faturacao/cupoes/emitir';

        $first = $this->postJson($url, $payload)
            ->assertCreated();

        $firstId = $first->json('data.id');

        $this->postJson($url, $payload)
            ->assertCreated()
            ->assertJsonPath('data.id', $firstId);

        expect(BillingPayment::count())->toBe(1);

        expect(
            \App\Models\SaasCouponRedemption::count()
        )->toBe(1);

        Http::assertSentCount(1);
    }
);

test(
    'checkout Ads recusa trocar cupao depois da vinculacao',
    function (): void {
        couponCheckoutLogin($this);

        config()->set('billing.coupons.enabled', true);

        $order = couponCheckoutAdOrder();
        couponCheckoutCoupon();

        couponCheckoutCoupon([
            'code' => 'OUTRO20',
            'name' => 'Segundo cupao',
            'discount_value' => '20.00',
        ]);

        Http::fake(function ($request) {
            return Http::response([
                'Amount' => (string) $request['amount'],
                'Entity' => '12345',
                'ExpiryDate' => now()->addDays(7)->format('d-m-Y'),
                'Message' => 'Success',
                'OrderId' => (string) $request['orderId'],
                'Reference' => '123456789',
                'RequestId' => 'ADS-ONE-' . Str::random(8),
                'Status' => '0',
            ], 200);
        });

        $url = '/api/backoffice/faturacao/cupoes/emitir';

        $payload = couponCheckoutPayload($order->id, 'ad_order');

        $this->postJson($url, $payload)
            ->assertCreated();

        $payload['coupon_code'] = 'OUTRO20';

        $this->postJson($url, $payload)
            ->assertUnprocessable();

        expect(BillingPayment::count())->toBe(1);

        expect(
            \App\Models\SaasCouponRedemption::count()
        )->toBe(1);

        Http::assertSentCount(1);
    }
);

test(
    'falha da Ifthenpay preserva vinculacao para recuperar emissao',
    function (): void {
        couponCheckoutLogin($this);

        config()->set('billing.coupons.enabled', true);

        $order = couponCheckoutAdOrder();
        couponCheckoutCoupon();

        $attempts = 0;

        Http::fake(function ($request) use (&$attempts) {
            $attempts++;

            if ($attempts === 1) {
                return Http::response([
                    'Message' => 'Erro temporario',
                ], 503);
            }

            return Http::response([
                'Amount' => (string) $request['amount'],
                'Entity' => '12345',
                'ExpiryDate' => now()->addDays(7)->format('d-m-Y'),
                'Message' => 'Success',
                'OrderId' => (string) $request['orderId'],
                'Reference' => '123456789',
                'RequestId' => 'ADS-RECOVER-' . Str::random(8),
                'Status' => '0',
            ], 200);
        });

        $url = '/api/backoffice/faturacao/cupoes/emitir';

        $payload = couponCheckoutPayload($order->id, 'ad_order');

        $this->postJson($url, $payload)
            ->assertStatus(500);

        expect(BillingPayment::count())->toBe(0);

        expect(
            \App\Models\SaasCouponRedemption::count()
        )->toBe(1);

        $this->postJson($url, $payload)
            ->assertCreated()
            ->assertJsonPath('data.amount', 45);

        expect(BillingPayment::count())->toBe(1);

        expect(
            \App\Models\SaasCouponRedemption::count()
        )->toBe(1);

        Http::assertSentCount(2);
    }
);