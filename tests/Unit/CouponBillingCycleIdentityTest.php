<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\AdOrder;
use App\Models\BillingCharge;
use App\Models\SaasSubscription;
use App\Services\Billing\CouponBillingCycleIdentityService;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

final class CouponBillingCycleIdentityTest extends TestCase
{
    private CouponBillingCycleIdentityService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new CouponBillingCycleIdentityService();
    }

    private function subscriptionFixture(
        string $start = '2026-11-01 00:00:00',
        string $end = '2026-12-01 00:00:00'
    ): array {
        $subscriptionId = (string) Str::uuid();
        $tenantId = (string) Str::uuid();

        $subscription = new SaasSubscription([
            'tenant_id' => $tenantId,
            'status' => SaasSubscription::STATUS_ACTIVE,
            'price_amount' => '50.00',
            'currency' => 'EUR',
        ]);

        $subscription->id = $subscriptionId;

        $charge = new BillingCharge([
            'tenant_id' => $tenantId,
            'source_type' =>
                BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
            'source_id' => $subscriptionId,
            'status' => BillingCharge::STATUS_PENDING,
            'period_start' => $start,
            'period_end' => $end,
            'subtotal' => '50.00',
            'discount' => '0.00',
            'total' => '50.00',
            'currency' => 'EUR',
            'idempotency_key' =>
                'saas_subscription:' .
                $subscriptionId . ':' .
                date('YmdHis', strtotime($start)) . ':' .
                date('YmdHis', strtotime($end)),
        ]);

        $charge->id = (string) Str::uuid();

        return [$subscription, $charge];
    }

    private function adFixture(): array
    {
        $orderId = (string) Str::uuid();
        $tenantId = (string) Str::uuid();

        $order = new AdOrder([
            'tenant_id' => $tenantId,
            'advertiser_id' => (string) Str::uuid(),
            'status' => AdOrder::STATUS_PENDING,
            'subtotal' => '50.00',
            'discount' => '0.00',
            'total' => '50.00',
            'currency' => 'EUR',
        ]);

        $order->id = $orderId;

        $charge = new BillingCharge([
            'tenant_id' => $tenantId,
            'source_type' => BillingCharge::SOURCE_AD_ORDER,
            'source_id' => $orderId,
            'status' => BillingCharge::STATUS_PENDING,
            'subtotal' => '50.00',
            'discount' => '0.00',
            'total' => '50.00',
            'currency' => 'EUR',
            'idempotency_key' => 'ad_order:' . $orderId,
        ]);

        $charge->id = (string) Str::uuid();

        return [$order, $charge];
    }

    public function test_subscription_identity_uses_charge_not_subscription_only(): void
    {
        [$subscription, $charge] =
            $this->subscriptionFixture();

        $identity = $this->service->subscription(
            $charge,
            $subscription
        );

        self::assertSame(
            'charge:' . $charge->id,
            $identity['purchase_key']
        );

        self::assertSame(
            $charge->id,
            $identity['billing_charge_id']
        );

        self::assertSame(
            $subscription->id,
            $identity['source_id']
        );
    }

    public function test_repeated_identification_is_stable(): void
    {
        [$subscription, $charge] =
            $this->subscriptionFixture();

        self::assertSame(
            $this->service->subscription(
                $charge,
                $subscription
            ),
            $this->service->subscription(
                $charge,
                $subscription
            )
        );
    }

    public function test_two_cycles_have_distinct_purchase_keys(): void
    {
        [$subscription, $first] =
            $this->subscriptionFixture();

        $second = clone $first;
        $second->id = (string) Str::uuid();
        $second->period_start = '2026-12-01 00:00:00';
        $second->period_end = '2027-01-01 00:00:00';

        $second->idempotency_key = implode(':', [
            'saas_subscription',
            $subscription->id,
            '20261201000000',
            '20270101000000',
        ]);

        $one = $this->service->subscription(
            $first,
            $subscription
        );

        $two = $this->service->subscription(
            $second,
            $subscription
        );

        self::assertSame(
            $one['source_id'],
            $two['source_id']
        );

        self::assertNotSame(
            $one['purchase_key'],
            $two['purchase_key']
        );

        self::assertNotSame(
            $one['period_start'],
            $two['period_start']
        );
    }

    public function test_rejects_wrong_period_idempotency_key(): void
    {
        [$subscription, $charge] =
            $this->subscriptionFixture();

        $charge->idempotency_key = 'outro-periodo';

        $this->expectException(
            ValidationException::class
        );

        $this->service->subscription(
            $charge,
            $subscription
        );
    }

    public function test_rejects_missing_period(): void
    {
        [$subscription, $charge] =
            $this->subscriptionFixture();

        $charge->period_start = null;

        $this->expectException(
            ValidationException::class
        );

        $this->service->subscription(
            $charge,
            $subscription
        );
    }

    public function test_rejects_inverted_period(): void
    {
        [$subscription, $charge] =
            $this->subscriptionFixture();

        $charge->period_end = '2026-10-01 00:00:00';

        $this->expectException(
            ValidationException::class
        );

        $this->service->subscription(
            $charge,
            $subscription
        );
    }

    public function test_rejects_wrong_tenant(): void
    {
        [$subscription, $charge] =
            $this->subscriptionFixture();

        $charge->tenant_id = (string) Str::uuid();

        $this->expectException(
            ValidationException::class
        );

        $this->service->subscription(
            $charge,
            $subscription
        );
    }

    public function test_rejects_changed_price(): void
    {
        [$subscription, $charge] =
            $this->subscriptionFixture();

        $subscription->price_amount = '60.00';

        $this->expectException(
            ValidationException::class
        );

        $this->service->subscription(
            $charge,
            $subscription
        );
    }

    public function test_rejects_existing_discount(): void
    {
        [$subscription, $charge] =
            $this->subscriptionFixture();

        $charge->discount = '5.00';

        $this->expectException(
            ValidationException::class
        );

        $this->service->subscription(
            $charge,
            $subscription
        );
    }

    public function test_rejects_paid_charge(): void
    {
        [$subscription, $charge] =
            $this->subscriptionFixture();

        $charge->status = BillingCharge::STATUS_PAID;

        $this->expectException(
            ValidationException::class
        );

        $this->service->subscription(
            $charge,
            $subscription
        );
    }

    public function test_rejects_different_currency(): void
    {
        [$subscription, $charge] =
            $this->subscriptionFixture();

        $charge->currency = 'USD';

        $this->expectException(
            ValidationException::class
        );

        $this->service->subscription(
            $charge,
            $subscription
        );
    }

    public function test_ad_order_identity_has_no_billing_period(): void
    {
        [$order, $charge] = $this->adFixture();

        $identity = $this->service->adOrder(
            $charge,
            $order
        );

        self::assertSame(
            'charge:' . $charge->id,
            $identity['purchase_key']
        );

        self::assertSame(
            'advertiser',
            $identity['customer_type']
        );

        self::assertNull($identity['period_start']);
        self::assertNull($identity['period_end']);
    }

    public function test_rejects_discounted_ad_order(): void
    {
        [$order, $charge] = $this->adFixture();

        $order->discount = '5.00';
        $order->total = '45.00';

        $this->expectException(
            ValidationException::class
        );

        $this->service->adOrder(
            $charge,
            $order
        );
    }

    public function test_rejects_incorrect_ad_order_source(): void
    {
        [$order, $charge] = $this->adFixture();

        $charge->source_id = (string) Str::uuid();

        $this->expectException(
            ValidationException::class
        );

        $this->service->adOrder(
            $charge,
            $order
        );
    }
}