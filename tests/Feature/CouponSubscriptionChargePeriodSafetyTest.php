<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BillingCharge;
use App\Models\SaasSubscription;
use App\Services\Billing\BillingService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

final class CouponSubscriptionChargePeriodSafetyTest extends TestCase
{
    private string $originalConnection;
    private BillingService $billing;

    protected function setUp(): void
    {
        parent::setUp();

        $this->originalConnection =
            (string) config('database.default');

        config()->set(
            'database.connections.coupon_period_safety',
            [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ]
        );

        DB::setDefaultConnection('coupon_period_safety');

        self::assertSame(
            ':memory:',
            DB::connection()->getDatabaseName()
        );

        Schema::create(
            'billing_charges',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->nullable();
                $table->string('source_type');
                $table->uuid('source_id');
                $table->string('number')->unique();
                $table->string('status');
                $table->string('description')->nullable();
                $table->timestamp('period_start')->nullable();
                $table->timestamp('period_end')->nullable();
                $table->decimal('subtotal', 12, 2);
                $table->decimal('discount', 12, 2);
                $table->decimal('total', 12, 2);
                $table->string('currency', 3);
                $table->timestamp('due_at')->nullable();
                $table->timestamp('paid_at')->nullable();
                $table->string('idempotency_key')->unique();
                $table->text('metadata')->nullable();
                $table->timestamps();
            }
        );

        $this->billing = app(BillingService::class);
    }

    protected function tearDown(): void
    {
        try {
            DB::purge('coupon_period_safety');
            DB::setDefaultConnection(
                $this->originalConnection
            );
        } finally {
            parent::tearDown();
        }
    }

    private function subscription(
        ?string $start,
        ?string $end,
        string $price = '50.00'
    ): SaasSubscription {
        $subscription = new SaasSubscription([
            'tenant_id' => (string) Str::uuid(),
            'status' => SaasSubscription::STATUS_ACTIVE,
            'billing_cycle' =>
                SaasSubscription::BILLING_MONTHLY,
            'price_amount' => $price,
            'currency' => 'EUR',
            'starts_at' => '2026-11-01 00:00:00',
            'current_period_starts_at' => $start,
            'current_period_ends_at' => $end,
        ]);

        $subscription->id = (string) Str::uuid();

        // Evitar consultas a tabelas de dominio:
        // este teste isola apenas a geracao da cobranca.
        $subscription->setRelation('tenant', null);
        $subscription->setRelation('plan', null);

        return $subscription;
    }

    private function validSubscription(): SaasSubscription
    {
        return $this->subscription(
            '2026-11-01 00:00:00',
            '2026-12-01 00:00:00'
        );
    }

    public function test_rejects_both_missing_period_dates(): void
    {
        $subscription = $this->subscription(null, null);

        $this->expectException(
            ValidationException::class
        );

        $this->billing->subscriptionCharge(
            $subscription
        );
    }

    public function test_rejects_missing_period_start(): void
    {
        $subscription = $this->subscription(
            null,
            '2026-12-01 00:00:00'
        );

        $this->expectException(
            ValidationException::class
        );

        $this->billing->subscriptionCharge(
            $subscription
        );
    }

    public function test_rejects_missing_period_end(): void
    {
        $subscription = $this->subscription(
            '2026-11-01 00:00:00',
            null
        );

        $this->expectException(
            ValidationException::class
        );

        $this->billing->subscriptionCharge(
            $subscription
        );
    }

    public function test_does_not_use_starts_at_as_implicit_cycle(): void
    {
        $subscription = $this->subscription(null, null);

        self::assertNotNull(
            $subscription->starts_at
        );

        try {
            $this->billing->subscriptionCharge(
                $subscription
            );

            self::fail(
                'O ciclo em falta deveria ser rejeitado.'
            );
        } catch (ValidationException $exception) {
            self::assertNull(
                $subscription->current_period_starts_at
            );

            self::assertNull(
                $subscription->current_period_ends_at
            );

            self::assertSame(
                0,
                BillingCharge::count()
            );
        }
    }

    public function test_rejects_equal_period_dates(): void
    {
        $subscription = $this->subscription(
            '2026-11-01 00:00:00',
            '2026-11-01 00:00:00'
        );

        $this->expectException(
            ValidationException::class
        );

        $this->billing->subscriptionCharge(
            $subscription
        );
    }

    public function test_rejects_inverted_period_dates(): void
    {
        $subscription = $this->subscription(
            '2026-12-01 00:00:00',
            '2026-11-01 00:00:00'
        );

        $this->expectException(
            ValidationException::class
        );

        $this->billing->subscriptionCharge(
            $subscription
        );
    }

    public function test_invalid_period_creates_no_charge(): void
    {
        $subscription = $this->subscription(
            '2026-12-01 00:00:00',
            null
        );

        try {
            $this->billing->subscriptionCharge(
                $subscription
            );

            self::fail('Deveria rejeitar o periodo.');
        } catch (ValidationException $exception) {
            self::assertSame(
                0,
                BillingCharge::count()
            );
        }
    }

    public function test_invalid_price_remains_rejected(): void
    {
        $subscription = $this->subscription(
            '2026-11-01 00:00:00',
            '2026-12-01 00:00:00',
            '0.00'
        );

        $this->expectException(
            ValidationException::class
        );

        $this->billing->subscriptionCharge(
            $subscription
        );
    }

    public function test_valid_monthly_period_is_preserved(): void
    {
        $subscription = $this->validSubscription();

        $charge = $this->billing->subscriptionCharge(
            $subscription
        );

        self::assertSame(
            '2026-11-01 00:00:00',
            $charge->period_start->format('Y-m-d H:i:s')
        );

        self::assertSame(
            '2026-12-01 00:00:00',
            $charge->period_end->format('Y-m-d H:i:s')
        );

        self::assertSame(
            implode(':', [
                'saas_subscription',
                $subscription->id,
                '20261101000000',
                '20261201000000',
            ]),
            $charge->idempotency_key
        );

        self::assertSame(1, BillingCharge::count());
    }

    public function test_repeated_checkout_reuses_same_charge(): void
    {
        $subscription = $this->validSubscription();

        $first = $this->billing->subscriptionCharge(
            $subscription
        );

        $this->travel(15)->minutes();

        $second = $this->billing->subscriptionCharge(
            $subscription
        );

        self::assertSame($first->id, $second->id);
        self::assertSame(1, BillingCharge::count());
    }

    public function test_renewal_creates_distinct_period_charge(): void
    {
        $subscription = $this->validSubscription();

        $first = $this->billing->subscriptionCharge(
            $subscription
        );

        $subscription->current_period_starts_at =
            '2026-12-01 00:00:00';

        $subscription->current_period_ends_at =
            '2027-01-01 00:00:00';

        $second = $this->billing->subscriptionCharge(
            $subscription
        );

        self::assertNotSame($first->id, $second->id);

        self::assertNotSame(
            $first->idempotency_key,
            $second->idempotency_key
        );

        self::assertSame(2, BillingCharge::count());
    }

    public function test_paid_cycle_does_not_create_new_charge(): void
    {
        $subscription = $this->validSubscription();

        $first = $this->billing->subscriptionCharge(
            $subscription
        );

        $first->status = BillingCharge::STATUS_PAID;
        $first->paid_at = now();
        $first->save();

        $second = $this->billing->subscriptionCharge(
            $subscription
        );

        self::assertSame($first->id, $second->id);
        self::assertSame(
            BillingCharge::STATUS_PAID,
            $second->status
        );

        self::assertSame(1, BillingCharge::count());
    }

    public function test_valid_yearly_period_is_supported(): void
    {
        $subscription = $this->subscription(
            '2026-11-01 00:00:00',
            '2027-11-01 00:00:00'
        );

        $subscription->billing_cycle =
            SaasSubscription::BILLING_YEARLY;

        $charge = $this->billing->subscriptionCharge(
            $subscription
        );

        self::assertSame(
            '2027-11-01 00:00:00',
            $charge->period_end->format('Y-m-d H:i:s')
        );

        self::assertSame(1, BillingCharge::count());
    }
}