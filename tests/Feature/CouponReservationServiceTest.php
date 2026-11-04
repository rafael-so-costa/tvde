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
use Tests\TestCase;

final class CouponReservationServiceTest extends TestCase
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
            'database.connections.coupon_reservation_test',
            [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ]
        );

        DB::setDefaultConnection('coupon_reservation_test');

        $connection = DB::connection(
            'coupon_reservation_test'
        );

        self::assertSame(
            ':memory:',
            $connection->getDatabaseName()
        );

        $connection->statement(
            'PRAGMA foreign_keys = ON'
        );

        self::assertSame(
            1,
            (int) $connection
                ->selectOne('PRAGMA foreign_keys')
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
            '2026-11-02 12:00:00',
            'UTC'
        );
    }

    protected function tearDown(): void
    {
        try {
            DB::purge('coupon_reservation_test');

            DB::setDefaultConnection(
                $this->originalConnection
            );
        } finally {
            parent::tearDown();
        }
    }

    private function coupon(
        array $overrides = []
    ): SaasCoupon {
        return SaasCoupon::create(array_merge([
            'code' => 'PROMO10',
            'name' => 'Promocao',
            'discount_type' => SaasCoupon::TYPE_PERCENTAGE,
            'discount_value' => '10.00',
            'applies_to' => SaasCoupon::SCOPE_BOTH,
            'enabled' => true,
            'first_payment_only' => true,
        ], $overrides));
    }

    private function subscription(
        ?string $tenantId = null
    ): array {
        $id = (string) Str::uuid();
        $tenant = $tenantId ?? (string) Str::uuid();

        DB::table('saas_subscriptions')->insert([
            'id' => $id,
            'tenant_id' => $tenant,
            'status' => 'active',
            'price_amount' => '50.00',
            'currency' => 'EUR',
        ]);

        return [$id, $tenant];
    }

    private function order(
        ?string $advertiserId = null,
        string $discount = '0.00'
    ): array {
        $id = (string) Str::uuid();
        $advertiser = $advertiserId
            ?? (string) Str::uuid();

        DB::table('ad_orders')->insert([
            'id' => $id,
            'advertiser_id' => $advertiser,
            'status' => 'pending',
            'subtotal' => '50.00',
            'discount' => $discount,
            'total' => $discount === '0.00'
                ? '50.00'
                : '45.00',
            'currency' => 'EUR',
        ]);

        return [$id, $advertiser];
    }

    private function reserve(
        string $id,
        string $key = 'period1',
        ?CarbonImmutable $at = null
    ): SaasCouponRedemption {
        return $this->reservations->reserve(
            ' promo10 ',
            SaasCoupon::SCOPE_SAAS,
            $id,
            $key,
            $at ?? $this->at
        );
    }

    public function test_reserves_server_derived_amount_without_modifying_payments(): void
    {
        $this->coupon();

        [$id, $tenant] = $this->subscription();

        $reservation = $this->reserve($id);

        self::assertSame(
            'tenant',
            $reservation->customer_type
        );

        self::assertSame(
            $tenant,
            $reservation->customer_id
        );

        self::assertSame(
            '50.00',
            $reservation->subtotal_amount
        );

        self::assertSame(
            '5.00',
            $reservation->discount_amount
        );

        self::assertNull(
            $reservation->billing_charge_id
        );

        self::assertSame(
            0,
            DB::table('billing_charges')->count()
        );

        self::assertSame(
            'reserved',
            $reservation->status
        );
    }

    public function test_repeated_request_is_idempotent(): void
    {
        $this->coupon([
            'max_redemptions' => 1,
        ]);

        [$id] = $this->subscription();

        $one = $this->reserve($id);
        $two = $this->reserve($id);

        self::assertSame(
            $one->id,
            $two->id
        );

        self::assertSame(
            1,
            SaasCouponRedemption::count()
        );
    }

    public function test_global_limit_counts_active_reservations(): void
    {
        $this->coupon([
            'max_redemptions' => 1,
        ]);

        [$first] = $this->subscription();
        [$second] = $this->subscription();

        $this->reserve($first);

        $this->expectException(
            \InvalidArgumentException::class
        );

        $this->reserve($second);
    }

    public function test_customer_limit_counts_active_reservations(): void
    {
        $this->coupon([
            'max_per_customer' => 1,
        ]);

        [$first, $tenant] = $this->subscription();
        [$second] = $this->subscription($tenant);

        $this->reserve($first);

        $this->expectException(
            \InvalidArgumentException::class
        );

        $this->reserve($second);
    }

    public function test_expired_reservation_does_not_block_other_purchase(): void
    {
        $this->coupon([
            'max_redemptions' => 1,
        ]);

        [$first] = $this->subscription();
        [$second] = $this->subscription();

        $this->reserve($first);

        $new = $this->reserve(
            $second,
            'period2',
            $this->at->addMinutes(31)
        );

        self::assertSame(
            'reserved',
            $new->status
        );

        self::assertSame(
            2,
            SaasCouponRedemption::count()
        );
    }

    public function test_existing_expired_idempotency_key_is_not_reused(): void
    {
        $this->coupon();

        [$id] = $this->subscription();

        $this->reserve($id);

        $this->expectException(
            ValidationException::class
        );

        $this->reserve(
            $id,
            'period1',
            $this->at->addMinutes(31)
        );
    }

    public function test_paid_subscription_prevents_first_payment_coupon(): void
    {
        $this->coupon();

        [$id, $tenant] = $this->subscription();

        DB::table('billing_charges')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant,
            'source_type' =>
                BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
            'status' =>
                BillingCharge::STATUS_PAID,
        ]);

        $this->expectException(
            \InvalidArgumentException::class
        );

        $this->reserve($id);
    }

    public function test_ads_derive_advertiser_and_reject_existing_discount(): void
    {
        $this->coupon();

        [$id, $advertiser] = $this->order();

        $record = $this->reservations->reserve(
            'PROMO10',
            SaasCoupon::SCOPE_ADS,
            $id,
            'order1',
            $this->at
        );

        self::assertSame(
            'advertiser',
            $record->customer_type
        );

        self::assertSame(
            $advertiser,
            $record->customer_id
        );

        [$discounted] = $this->order(
            null,
            '5.00'
        );

        $this->expectException(
            ValidationException::class
        );

        $this->reservations->reserve(
            'PROMO10',
            SaasCoupon::SCOPE_ADS,
            $discounted,
            'order2',
            $this->at
        );
    }

    public function test_release_is_idempotent_and_restores_capacity(): void
    {
        $this->coupon([
            'max_redemptions' => 1,
        ]);

        [$first] = $this->subscription();
        [$second] = $this->subscription();

        $old = $this->reserve($first);

        $released = $this->reservations->release(
            $old->id
        );

        self::assertSame(
            'released',
            $released->status
        );

        self::assertSame(
            'released',
            $this->reservations
                ->release($old->id)
                ->status
        );

        self::assertSame(
            'reserved',
            $this->reserve(
                $second,
                'period2'
            )->status
        );
    }

    public function test_expire_rejects_early_expiration_and_expires_when_due(): void
    {
        $this->coupon();

        [$id] = $this->subscription();

        $record = $this->reserve($id);

        try {
            $this->reservations->expire(
                $record->id,
                $this->at->addMinutes(29)
            );

            self::fail(
                'Deveria rejeitar expiracao antecipada.'
            );
        } catch (ValidationException $exception) {
            self::assertSame(
                'reserved',
                $record->fresh()->status
            );
        }

        self::assertSame(
            'expired',
            $this->reservations
                ->expire(
                    $record->id,
                    $this->at->addMinutes(30)
                )->status
        );
    }

    public function test_reservation_cannot_be_released_after_binding_to_charge(): void
    {
        $this->coupon();

        [$id, $tenant] = $this->subscription();

        $record = $this->reserve($id);
        $charge = (string) Str::uuid();

        DB::table('billing_charges')->insert([
            'id' => $charge,
            'tenant_id' => $tenant,
            'source_type' =>
                BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
            'status' => 'pending',
        ]);

        $record->billing_charge_id = $charge;
        $record->save();

        $this->expectException(
            ValidationException::class
        );

        $this->reservations->release(
            $record->id
        );
    }

    public function test_inactive_coupon_fails_closed(): void
    {
        $this->coupon([
            'enabled' => false,
        ]);

        [$id] = $this->subscription();

        $this->expectException(
            \InvalidArgumentException::class
        );

        $this->reserve($id);
    }
}