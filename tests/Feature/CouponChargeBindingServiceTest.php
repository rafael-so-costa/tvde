<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AdOrder;
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
use Tests\TestCase;

final class CouponChargeBindingServiceTest extends TestCase
{
    private string $originalConnection;
    private CarbonImmutable $at;
    private CouponReservationService $reservations;
    private CouponChargeBindingService $binder;

    protected function setUp(): void
    {
        parent::setUp();

        $this->originalConnection =
            (string) config('database.default');

        config()->set(
            'database.connections.coupon_binding_test',
            [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ]
        );

        DB::setDefaultConnection('coupon_binding_test');

        self::assertSame(
            ':memory:',
            DB::connection()->getDatabaseName()
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
                $table->uuid('source_id');
                $table->string('status');
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

                $table->decimal(
                    'price_amount',
                    12,
                    2
                );

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

        $this->at = CarbonImmutable::parse(
            '2026-11-03 10:00:00',
            'UTC'
        );

        $this->reservations = app(
            CouponReservationService::class
        );

        $this->binder = app(
            CouponChargeBindingService::class
        );
    }

    protected function tearDown(): void
    {
        try {
            DB::purge('coupon_binding_test');

            DB::setDefaultConnection(
                $this->originalConnection
            );
        } finally {
            parent::tearDown();
        }
    }

    private function coupon(
        string $value = '10.00',
        string $type = 'percentage'
    ): void {
        SaasCoupon::create([
            'code' => 'SAVE10',
            'name' => 'Teste',
            'discount_type' => $type,
            'discount_value' => $value,
            'applies_to' => 'both',
            'enabled' => true,
            'first_payment_only' => true,
        ]);
    }

    private function source(
        string $scope = 'saas_subscription'
    ): array {
        $id = (string) Str::uuid();
        $tenant = (string) Str::uuid();

        if ($scope === 'saas_subscription') {
            DB::table('saas_subscriptions')->insert([
                'id' => $id,
                'tenant_id' => $tenant,
                'status' => 'active',
                'price_amount' => '50.00',
                'currency' => 'EUR',
            ]);
        } else {
            DB::table('ad_orders')->insert([
                'id' => $id,
                'tenant_id' => $tenant,
                'advertiser_id' => (string) Str::uuid(),
                'status' => 'pending',
                'subtotal' => '50.00',
                'discount' => '0.00',
                'total' => '50.00',
                'currency' => 'EUR',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return [$id, $tenant];
    }

    private function charge(
        string $scope,
        string $sourceId,
        ?string $tenantId,
        array $overrides = []
    ): string {
        $id = (string) Str::uuid();

        DB::table('billing_charges')->insert(
            array_merge(
                [
                    'id' => $id,
                    'tenant_id' => $tenantId,
                    'source_type' => $scope,
                    'source_id' => $sourceId,
                    'status' => 'pending',
                    'subtotal' => '50.00',
                    'discount' => '0.00',
                    'total' => '50.00',
                    'currency' => 'EUR',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                $overrides
            )
        );

        return $id;
    }

    private function prepare(
        string $scope = 'saas_subscription',
        string $value = '10.00',
        string $type = 'percentage',
        array $chargeOverrides = []
    ): array {
        $this->coupon($value, $type);

        [$sourceId, $tenantId] =
            $this->source($scope);

        $record = $this->reservations->reserve(
            'SAVE10',
            $scope,
            $sourceId,
            'purchase-1',
            $this->at
        );

        $chargeId = $this->charge(
            $scope,
            $sourceId,
            $tenantId,
            $chargeOverrides
        );

        return [
            $record,
            $chargeId,
            $sourceId,
            $tenantId,
        ];
    }

    public function test_saas_binding_updates_charge_without_payment(): void
    {
        [$record, $charge] = $this->prepare();

        $linked = $this->binder->bind(
            $record->id,
            $charge,
            $this->at
        );

        self::assertSame(
            $charge,
            $linked->billing_charge_id
        );

        self::assertSame(
            'reserved',
            $linked->status
        );

        self::assertSame(
            '5.00',
            (string) BillingCharge::findOrFail($charge)
                ->discount
        );

        self::assertSame(
            '45.00',
            (string) BillingCharge::findOrFail($charge)
                ->total
        );

        self::assertSame(
            0,
            DB::table('billing_payments')->count()
        );
    }

    public function test_ad_binding_updates_order_and_charge_together(): void
    {
        [$record, $charge, $source] =
            $this->prepare('ad_order');

        $this->binder->bind(
            $record->id,
            $charge,
            $this->at
        );

        self::assertSame(
            '45.00',
            (string) BillingCharge::findOrFail($charge)
                ->total
        );

        self::assertSame(
            '5.00',
            (string) AdOrder::findOrFail($source)
                ->discount
        );

        self::assertSame(
            '45.00',
            (string) AdOrder::findOrFail($source)
                ->total
        );
    }

    public function test_repeated_binding_is_idempotent(): void
    {
        [$record, $charge] = $this->prepare();

        $first = $this->binder->bind(
            $record->id,
            $charge,
            $this->at
        );

        $again = $this->binder->bind(
            $record->id,
            $charge,
            $this->at->addMinutes(40)
        );

        self::assertSame(
            $first->id,
            $again->id
        );

        self::assertSame(
            '45.00',
            (string) BillingCharge::findOrFail($charge)
                ->total
        );

        self::assertSame(
            1,
            SaasCouponRedemption::count()
        );
    }

    public function test_rejects_charge_with_existing_payment(): void
    {
        [$record, $charge] = $this->prepare();

        DB::table('billing_payments')->insert([
            'id' => (string) Str::uuid(),
            'billing_charge_id' => $charge,
            'status' => 'pending',
        ]);

        $this->expectException(
            ValidationException::class
        );

        $this->binder->bind(
            $record->id,
            $charge,
            $this->at
        );
    }

    public function test_rejects_expired_unbound_reservation(): void
    {
        [$record, $charge] = $this->prepare();

        $this->expectException(
            ValidationException::class
        );

        $this->binder->bind(
            $record->id,
            $charge,
            $this->at->addMinutes(31)
        );
    }

    public function test_rejects_charge_for_another_source(): void
    {
        [$record, $charge] = $this->prepare();

        [$differentSource] = $this->source();

        DB::table('billing_charges')
            ->where('id', $charge)
            ->update([
                'source_id' => $differentSource,
            ]);

        $this->expectException(
            ValidationException::class
        );

        $this->binder->bind(
            $record->id,
            $charge,
            $this->at
        );
    }

    public function test_rejects_paid_charge(): void
    {
        [$record, $charge] = $this->prepare(
            chargeOverrides: [
                'status' => 'paid',
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->binder->bind(
            $record->id,
            $charge,
            $this->at
        );
    }

    public function test_rejects_changed_charge_subtotal(): void
    {
        [$record, $charge] = $this->prepare(
            chargeOverrides: [
                'subtotal' => '60.00',
                'total' => '60.00',
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->binder->bind(
            $record->id,
            $charge,
            $this->at
        );
    }

    public function test_rejects_free_checkout_until_special_flow_exists(): void
    {
        [$record, $charge] = $this->prepare(
            'saas_subscription',
            '100.00'
        );

        $this->expectException(
            ValidationException::class
        );

        $this->binder->bind(
            $record->id,
            $charge,
            $this->at
        );
    }

    public function test_rejects_different_tenant(): void
    {
        [$record, $charge] = $this->prepare(
            chargeOverrides: [
                'tenant_id' => (string) Str::uuid(),
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->binder->bind(
            $record->id,
            $charge,
            $this->at
        );
    }

    public function test_cannot_rebind_to_different_charge(): void
    {
        [$record, $charge, $source, $tenant] =
            $this->prepare();

        $this->binder->bind(
            $record->id,
            $charge,
            $this->at
        );

        $otherCharge = $this->charge(
            'saas_subscription',
            $source,
            $tenant
        );

        $this->expectException(
            ValidationException::class
        );

        $this->binder->bind(
            $record->id,
            $otherCharge,
            $this->at
        );
    }

    public function test_cannot_apply_first_purchase_coupon_after_another_payment(): void
    {
        [$record, $charge, $source, $tenant] =
            $this->prepare();

        $this->charge(
            'saas_subscription',
            $source,
            $tenant,
            [
                'status' => 'paid',
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->binder->bind(
            $record->id,
            $charge,
            $this->at
        );
    }
}