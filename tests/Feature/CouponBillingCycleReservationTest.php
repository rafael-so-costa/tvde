<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BillingCharge;
use App\Models\SaasCoupon;
use App\Models\SaasCouponRedemption;
use App\Services\Billing\CouponChargeBindingService;
use App\Services\Billing\CouponReservationService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Tests\TestCase;

final class CouponBillingCycleReservationTest extends TestCase
{
    private string $oldConnection;
    private CouponReservationService $reservations;
    private CouponChargeBindingService $binding;
    private CarbonImmutable $at;

    protected function setUp(): void
    {
        parent::setUp();

        $this->oldConnection =
            (string) config('database.default');

        config()->set(
            'database.connections.coupon_cycles_test',
            [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ]
        );

        DB::setDefaultConnection('coupon_cycles_test');

        self::assertSame(
            ':memory:',
            DB::connection()->getDatabaseName()
        );

        DB::statement('PRAGMA foreign_keys = ON');

        self::assertSame(
            1,
            (int) DB::selectOne(
                'PRAGMA foreign_keys'
            )->foreign_keys
        );

        Schema::create(
            'billing_charges',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->nullable();
                $table->string('source_type');
                $table->uuid('source_id');
                $table->string('idempotency_key')->unique();
                $table->string('status');
                $table->timestamp('period_start')->nullable();
                $table->timestamp('period_end')->nullable();
                $table->decimal('subtotal', 12, 2);
                $table->decimal('discount', 12, 2);
                $table->decimal('total', 12, 2);
                $table->string('currency', 3);
                $table->timestamps();
            }
        );

        Schema::create(
            'billing_payments',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('billing_charge_id');
                $table->string('status');
            }
        );

        Schema::create(
            'saas_subscriptions',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->string('status');
                $table->decimal('price_amount', 12, 2);
                $table->string('currency', 3);
            }
        );

        Schema::create(
            'ad_orders',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->nullable();
                $table->uuid('advertiser_id');
                $table->string('status');
                $table->decimal('subtotal', 12, 2);
                $table->decimal('discount', 12, 2);
                $table->decimal('total', 12, 2);
                $table->string('currency', 3);
                $table->timestamps();
            }
        );

        $migration = require database_path(
            'migrations/2026_11_02_230000_create_saas_coupons_and_redemptions_tables.php'
        );

        $migration->up();

        $this->reservations = app(
            CouponReservationService::class
        );

        $this->binding = app(
            CouponChargeBindingService::class
        );

        $this->at = CarbonImmutable::parse(
            '2026-11-03 12:00:00',
            'UTC'
        );
    }

    protected function tearDown(): void
    {
        try {
            DB::purge('coupon_cycles_test');

            DB::setDefaultConnection(
                $this->oldConnection
            );
        } finally {
            parent::tearDown();
        }
    }

    private function coupon(
        string $code = 'PROMO10',
        array $overrides = []
    ): SaasCoupon {
        return SaasCoupon::create(array_merge([
            'code' => $code,
            'name' => 'Promocao de renovacao',
            'discount_type' =>
                SaasCoupon::TYPE_PERCENTAGE,
            'discount_value' => '10.00',
            'applies_to' => SaasCoupon::SCOPE_BOTH,
            'enabled' => true,
            'first_payment_only' => false,
        ], $overrides));
    }

    private function subscription(): array
    {
        $id = (string) Str::uuid();
        $tenant = (string) Str::uuid();

        DB::table('saas_subscriptions')->insert([
            'id' => $id,
            'tenant_id' => $tenant,
            'status' => 'active',
            'price_amount' => '50.00',
            'currency' => 'EUR',
        ]);

        return [$id, $tenant];
    }

    private function charge(
        string $sourceId,
        string $tenantId,
        string $start,
        string $end
    ): string {
        $id = (string) Str::uuid();

        $key = implode(':', [
            BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
            $sourceId,
            date('YmdHis', strtotime($start)),
            date('YmdHis', strtotime($end)),
        ]);

        DB::table('billing_charges')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'source_type' =>
                BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
            'source_id' => $sourceId,
            'idempotency_key' => $key,
            'status' => BillingCharge::STATUS_PENDING,
            'period_start' => $start,
            'period_end' => $end,
            'subtotal' => '50.00',
            'discount' => '0.00',
            'total' => '50.00',
            'currency' => 'EUR',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function twoCycles(): array
    {
        [$source, $tenant] = $this->subscription();

        $first = $this->charge(
            $source,
            $tenant,
            '2026-11-01 00:00:00',
            '2026-12-01 00:00:00'
        );

        $second = $this->charge(
            $source,
            $tenant,
            '2026-12-01 00:00:00',
            '2027-01-01 00:00:00'
        );

        return [$first, $second, $source, $tenant];
    }

    private function reserve(
        string $charge,
        string $code = 'PROMO10'
    ): SaasCouponRedemption {
        return $this->reservations->reserveForCharge(
            $code,
            $charge,
            $this->at
        );
    }

    public function test_two_billing_cycles_can_have_separate_coupons(): void
    {
        $this->coupon();

        [$first, $second] = $this->twoCycles();

        $one = $this->reserve($first);
        $two = $this->reserve($second);

        self::assertNotSame($one->id, $two->id);

        self::assertSame(
            $one->source_id,
            $two->source_id
        );

        self::assertSame(
            'charge:' . $first,
            data_get($one->metadata, 'purchase_key')
        );

        self::assertSame(
            'charge:' . $second,
            data_get($two->metadata, 'purchase_key')
        );
    }

    public function test_repeating_same_charge_is_idempotent(): void
    {
        $this->coupon();

        [$first] = $this->twoCycles();

        $one = $this->reserve($first);
        $two = $this->reserve($first);

        self::assertSame($one->id, $two->id);

        self::assertSame(
            1,
            SaasCouponRedemption::count()
        );
    }

    public function test_same_charge_cannot_receive_second_coupon(): void
    {
        $this->coupon('PROMO10');
        $this->coupon('PROMO20');

        [$first] = $this->twoCycles();

        $this->reserve($first, 'PROMO10');

        $this->expectException(
            ValidationException::class
        );

        $this->reserve($first, 'PROMO20');
    }

    public function test_paid_prior_cycle_allows_non_first_coupon(): void
    {
        $this->coupon();

        [$first, $second] = $this->twoCycles();

        $one = $this->reserve($first);

        DB::table('billing_charges')
            ->where('id', $first)
            ->update([
                'status' => BillingCharge::STATUS_PAID,
            ]);

        $one->status =
            SaasCouponRedemption::STATUS_REDEEMED;

        $one->billing_charge_id = $first;
        $one->redeemed_at = $this->at;
        $one->save();

        $two = $this->reserve($second);

        self::assertSame(
            SaasCouponRedemption::STATUS_RESERVED,
            $two->status
        );

        self::assertNotSame($one->id, $two->id);
    }

    public function test_first_payment_only_rejects_renewal_after_paid_charge(): void
    {
        $this->coupon(
            'PROMO10',
            ['first_payment_only' => true]
        );

        [$first, $second] = $this->twoCycles();

        DB::table('billing_charges')
            ->where('id', $first)
            ->update([
                'status' => BillingCharge::STATUS_PAID,
            ]);

        $this->expectException(
            InvalidArgumentException::class
        );

        $this->reserve($second);
    }

    public function test_global_limit_still_counts_other_cycles(): void
    {
        $this->coupon(
            'PROMO10',
            ['max_redemptions' => 1]
        );

        [$first, $second] = $this->twoCycles();

        $this->reserve($first);

        $this->expectException(
            InvalidArgumentException::class
        );

        $this->reserve($second);
    }

    public function test_customer_limit_still_counts_other_cycles(): void
    {
        $this->coupon(
            'PROMO10',
            ['max_per_customer' => 1]
        );

        [$first, $second] = $this->twoCycles();

        $this->reserve($first);

        $this->expectException(
            InvalidArgumentException::class
        );

        $this->reserve($second);
    }

    public function test_charge_with_different_tenant_is_rejected(): void
    {
        $this->coupon();

        [$first] = $this->twoCycles();

        DB::table('billing_charges')
            ->where('id', $first)
            ->update([
                'tenant_id' => (string) Str::uuid(),
            ]);

        $this->expectException(
            ValidationException::class
        );

        $this->reserve($first);
    }

    public function test_invalid_period_identity_is_rejected(): void
    {
        $this->coupon();

        [$first] = $this->twoCycles();

        DB::table('billing_charges')
            ->where('id', $first)
            ->update([
                'idempotency_key' => 'periodo-invalido',
            ]);

        $this->expectException(
            ValidationException::class
        );

        $this->reserve($first);
    }

    public function test_cannot_bind_reservation_to_another_cycle(): void
    {
        $this->coupon();

        [$first, $second] = $this->twoCycles();

        $record = $this->reserve($first);

        $this->expectException(
            ValidationException::class
        );

        $this->binding->bind(
            $record->id,
            $second,
            $this->at
        );
    }

    public function test_each_cycle_binds_to_its_own_charge(): void
    {
        $this->coupon();

        [$first, $second] = $this->twoCycles();

        $one = $this->reserve($first);
        $two = $this->reserve($second);

        $this->binding->bind(
            $one->id,
            $first,
            $this->at
        );

        $this->binding->bind(
            $two->id,
            $second,
            $this->at
        );

        self::assertSame(
            $first,
            $one->fresh()->billing_charge_id
        );

        self::assertSame(
            $second,
            $two->fresh()->billing_charge_id
        );

        self::assertSame(
            '45.00',
            (string) BillingCharge::findOrFail(
                $first
            )->total
        );

        self::assertSame(
            '45.00',
            (string) BillingCharge::findOrFail(
                $second
            )->total
        );
    }

    public function test_ad_order_can_reserve_by_charge_identity(): void
    {
        $this->coupon();

        $orderId = (string) Str::uuid();
        $chargeId = (string) Str::uuid();
        $tenantId = (string) Str::uuid();

        DB::table('ad_orders')->insert([
            'id' => $orderId,
            'tenant_id' => $tenantId,
            'advertiser_id' => (string) Str::uuid(),
            'status' => 'pending',
            'subtotal' => '50.00',
            'discount' => '0.00',
            'total' => '50.00',
            'currency' => 'EUR',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('billing_charges')->insert([
            'id' => $chargeId,
            'tenant_id' => $tenantId,
            'source_type' => BillingCharge::SOURCE_AD_ORDER,
            'source_id' => $orderId,
            'idempotency_key' => 'ad_order:' . $orderId,
            'status' => BillingCharge::STATUS_PENDING,
            'period_start' => null,
            'period_end' => null,
            'subtotal' => '50.00',
            'discount' => '0.00',
            'total' => '50.00',
            'currency' => 'EUR',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $record = $this->reserve($chargeId);

        self::assertSame(
            'charge:' . $chargeId,
            data_get($record->metadata, 'purchase_key')
        );

        $this->binding->bind(
            $record->id,
            $chargeId,
            $this->at
        );

        self::assertSame(
            '45.00',
            (string) BillingCharge::findOrFail(
                $chargeId
            )->total
        );
    }
}