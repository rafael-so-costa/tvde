<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BillingCharge;
use App\Models\SaasCoupon;
use App\Models\SaasCouponRedemption;
use App\Services\Billing\CouponReservationService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Tests\TestCase;

final class CouponReservationSafetyTest extends TestCase
{
    private string $originalConnection;
    private CouponReservationService $reservations;
    private CarbonImmutable $at;

    protected function setUp(): void
    {
        parent::setUp();

        $this->originalConnection =
            (string) config('database.default');

        config()->set(
            'database.connections.coupon_safety_test',
            [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ]
        );

        DB::setDefaultConnection('coupon_safety_test');

        self::assertSame(
            ':memory:',
            DB::connection('coupon_safety_test')
                ->getDatabaseName()
        );

        DB::statement('PRAGMA foreign_keys = ON');

        self::assertSame(
            1,
            (int) DB::selectOne('PRAGMA foreign_keys')
                ->foreign_keys
        );

        Schema::create(
            'billing_charges',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->nullable();
                $table->string('source_type');
                $table->string('status');
            }
        );

        Schema::create(
            'saas_subscriptions',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->string('status');
                $table->decimal(
                    'price_amount',
                    12,
                    2
                )->nullable();
                $table->string('currency', 3);
            }
        );

        Schema::create(
            'ad_orders',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('advertiser_id');
                $table->string('status');
                $table->decimal('subtotal', 12, 2);
                $table->decimal('discount', 12, 2);
                $table->decimal('total', 12, 2);
                $table->string('currency', 3);
            }
        );

        $migration = require database_path(
            'migrations/2026_11_02_230000_create_saas_coupons_and_redemptions_tables.php'
        );

        $migration->up();

        $this->reservations = app(
            CouponReservationService::class
        );

        $this->at = CarbonImmutable::parse(
            '2026-11-03 10:00:00',
            'UTC'
        );
    }

    protected function tearDown(): void
    {
        try {
            DB::purge('coupon_safety_test');

            DB::setDefaultConnection(
                $this->originalConnection
            );
        } finally {
            parent::tearDown();
        }
    }

    private function coupon(
        string $code,
        ?int $limit = null
    ): SaasCoupon {
        return SaasCoupon::create([
            'code' => $code,
            'name' => 'Teste de seguranca',
            'discount_type' => SaasCoupon::TYPE_PERCENTAGE,
            'discount_value' => '10.00',
            'applies_to' => SaasCoupon::SCOPE_BOTH,
            'enabled' => true,
            'first_payment_only' => true,
            'max_redemptions' => $limit,
        ]);
    }

    private function subscription(): string
    {
        $id = (string) Str::uuid();

        DB::table('saas_subscriptions')->insert([
            'id' => $id,
            'tenant_id' => (string) Str::uuid(),
            'status' => 'active',
            'price_amount' => '50.00',
            'currency' => 'EUR',
        ]);

        return $id;
    }

    private function reserve(
        string $code,
        string $source,
        string $key,
        ?CarbonImmutable $at = null
    ): SaasCouponRedemption {
        return $this->reservations->reserve(
            $code,
            SaasCoupon::SCOPE_SAAS,
            $source,
            $key,
            $at ?? $this->at
        );
    }

    private function bindFakeCharge(
        SaasCouponRedemption $redemption
    ): void {
        $chargeId = (string) Str::uuid();

        DB::table('billing_charges')->insert([
            'id' => $chargeId,
            'tenant_id' => $redemption->customer_id,
            'source_type' =>
                BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
            'status' => BillingCharge::STATUS_PENDING,
        ]);

        // Vinculo simulado apenas nesta BD temporaria.
        $redemption->billing_charge_id = $chargeId;
        $redemption->save();
    }

    public function test_same_purchase_cannot_reserve_twice_with_different_keys(): void
    {
        $this->coupon('SAVE10');
        $source = $this->subscription();

        $this->reserve(
            'SAVE10',
            $source,
            'attempt-one'
        );

        $this->expectException(
            ValidationException::class
        );

        $this->reserve(
            'SAVE10',
            $source,
            'attempt-two'
        );
    }

    public function test_same_purchase_cannot_reserve_a_second_coupon(): void
    {
        $this->coupon('SAVE10');
        $this->coupon('SAVE20');

        $source = $this->subscription();

        $this->reserve(
            'SAVE10',
            $source,
            'attempt-one'
        );

        $this->expectException(
            ValidationException::class
        );

        $this->reserve(
            'SAVE20',
            $source,
            'attempt-two'
        );
    }

    public function test_expired_unbound_reservation_allows_new_attempt(): void
    {
        $this->coupon('SAVE10');
        $source = $this->subscription();

        $first = $this->reserve(
            'SAVE10',
            $source,
            'attempt-one'
        );

        $second = $this->reserve(
            'SAVE10',
            $source,
            'attempt-two',
            $this->at->addMinutes(31)
        );

        self::assertNotSame(
            $first->id,
            $second->id
        );

        self::assertSame(
            2,
            SaasCouponRedemption::count()
        );
    }

    public function test_bound_reservation_uses_global_capacity_after_time_limit(): void
    {
        $this->coupon('SAVE10', 1);

        $firstSource = $this->subscription();
        $secondSource = $this->subscription();

        $first = $this->reserve(
            'SAVE10',
            $firstSource,
            'attempt-one'
        );

        $this->bindFakeCharge($first);

        $this->expectException(
            InvalidArgumentException::class
        );

        $this->reserve(
            'SAVE10',
            $secondSource,
            'attempt-two',
            $this->at->addMinutes(31)
        );
    }

    public function test_bound_reservation_blocks_another_coupon_after_time_limit(): void
    {
        $this->coupon('SAVE10');
        $this->coupon('SAVE20');

        $source = $this->subscription();

        $first = $this->reserve(
            'SAVE10',
            $source,
            'attempt-one'
        );

        $this->bindFakeCharge($first);

        $this->expectException(
            ValidationException::class
        );

        $this->reserve(
            'SAVE20',
            $source,
            'attempt-two',
            $this->at->addMinutes(31)
        );
    }

    public function test_released_unbound_reservation_allows_new_attempt(): void
    {
        $this->coupon('SAVE10');

        $source = $this->subscription();

        $first = $this->reserve(
            'SAVE10',
            $source,
            'attempt-one'
        );

        $this->reservations->release(
            $first->id
        );

        $second = $this->reserve(
            'SAVE10',
            $source,
            'attempt-two'
        );

        self::assertSame(
            'released',
            $first->fresh()->status
        );

        self::assertSame(
            'reserved',
            $second->status
        );
    }
}