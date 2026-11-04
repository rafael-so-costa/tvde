<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BillingCharge;
use App\Models\BillingPayment;
use App\Models\SaasCoupon;
use App\Models\SaasCouponRedemption;
use App\Services\Billing\CouponRedemptionSettlementService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

final class CouponRedemptionSettlementTest extends TestCase
{
    private string $originalConnection;
    private CouponRedemptionSettlementService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->originalConnection =
            (string) config('database.default');

        config()->set(
            'database.connections.coupon_settlement_test',
            [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ]
        );

        DB::setDefaultConnection(
            'coupon_settlement_test'
        );

        self::assertSame(
            ':memory:',
            DB::connection()->getDatabaseName()
        );

        DB::statement(
            'PRAGMA foreign_keys = ON'
        );

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
                $table->string('status');
                $table->decimal('subtotal', 12, 2);
                $table->decimal('discount', 12, 2);
                $table->decimal('total', 12, 2);
                $table->string('currency', 3);
                $table->timestamp('paid_at')->nullable();
                $table->timestamps();
            }
        );

        Schema::create(
            'billing_payments',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('billing_charge_id');
                $table->string('status');
                $table->decimal('amount', 12, 2);
                $table->string('currency', 3);
                $table->timestamp('paid_at')->nullable();
                $table->timestamps();
            }
        );

        $migration = require database_path(
            'migrations/2026_11_02_230000_create_saas_coupons_and_redemptions_tables.php'
        );

        $migration->up();

        $this->service = app(
            CouponRedemptionSettlementService::class
        );
    }

    protected function tearDown(): void
    {
        try {
            DB::purge('coupon_settlement_test');

            DB::setDefaultConnection(
                $this->originalConnection
            );
        } finally {
            parent::tearDown();
        }
    }

    /**
     * @return array{
     *   payment:string,
     *   charge:string,
     *   redemption:?string
     * }
     */
    private function fixture(
        array $chargeOverrides = [],
        array $paymentOverrides = [],
        array $redemptionOverrides = [],
        bool $withCoupon = true
    ): array {
        $chargeId = (string) Str::uuid();
        $paymentId = (string) Str::uuid();
        $sourceId = (string) Str::uuid();
        $tenantId = (string) Str::uuid();

        $paidAt = '2026-11-03 10:00:00';

        $timestamps = [
            'created_at' => now(),
            'updated_at' => now(),
        ];

        DB::table('billing_charges')->insert(
            array_merge(
                [
                    'id' => $chargeId,
                    'tenant_id' => $tenantId,
                    'source_type' =>
                        BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
                    'source_id' => $sourceId,
                    'status' => BillingCharge::STATUS_PAID,
                    'subtotal' => '50.00',
                    'discount' => '5.00',
                    'total' => '45.00',
                    'currency' => 'EUR',
                    'paid_at' => $paidAt,
                ],
                $timestamps,
                $chargeOverrides
            )
        );

        DB::table('billing_payments')->insert(
            array_merge(
                [
                    'id' => $paymentId,
                    'billing_charge_id' => $chargeId,
                    'status' => BillingPayment::STATUS_PAID,
                    'amount' => '45.00',
                    'currency' => 'EUR',
                    'paid_at' => $paidAt,
                ],
                $timestamps,
                $paymentOverrides
            )
        );

        $redemptionId = null;

        if ($withCoupon) {
            $coupon = SaasCoupon::create([
                'code' => 'SALE10',
                'name' => 'Teste',
                'discount_type' =>
                    SaasCoupon::TYPE_PERCENTAGE,
                'discount_value' => '10.00',
                'applies_to' => SaasCoupon::SCOPE_SAAS,
                'enabled' => true,
            ]);

            $record = SaasCouponRedemption::create(
                array_merge(
                    [
                        'saas_coupon_id' => $coupon->id,
                        'customer_type' => 'tenant',
                        'customer_id' => $tenantId,
                        'source_type' =>
                            SaasCoupon::SCOPE_SAAS,
                        'source_id' => $sourceId,
                        'billing_charge_id' => $chargeId,
                        'status' =>
                            SaasCouponRedemption::STATUS_RESERVED,
                        'subtotal_amount' => '50.00',
                        'discount_amount' => '5.00',
                        'currency' => 'EUR',
                        'idempotency_key' =>
                            'coupon-fixture-' . $chargeId,
                        'reserved_until' =>
                            now()->addMinutes(30),
                        'metadata' => [
                            'bound' => true,
                        ],
                    ],
                    $redemptionOverrides
                )
            );

            $redemptionId = $record->id;
        }

        return [
            'payment' => $paymentId,
            'charge' => $chargeId,
            'redemption' => $redemptionId,
        ];
    }

    public function test_paid_reservation_is_redeemed_once(): void
    {
        $ids = $this->fixture();

        $record = $this->service->settle(
            $ids['payment']
        );

        self::assertNotNull($record);
        self::assertSame('redeemed', $record->status);

        self::assertSame(
            $ids['payment'],
            data_get(
                $record->metadata,
                'settlement_payment_id'
            )
        );

        self::assertSame(
            '2026-11-03 10:00:00',
            $record->redeemed_at->format(
                'Y-m-d H:i:s'
            )
        );

        self::assertSame(
            '45.00',
            (string) BillingCharge::findOrFail(
                $ids['charge']
            )->total
        );

        self::assertSame(
            1,
            SaasCouponRedemption::count()
        );
    }

    public function test_repeating_paid_callback_is_idempotent(): void
    {
        $ids = $this->fixture();

        $one = $this->service->settle(
            $ids['payment']
        );

        $originalMetadata = $one->metadata;

        $two = $this->service->settle(
            $ids['payment']
        );

        self::assertSame($one->id, $two->id);

        self::assertSame(
            $originalMetadata,
            $two->metadata
        );

        self::assertSame(
            1,
            SaasCouponRedemption::count()
        );
    }

    public function test_payment_without_coupon_is_untouched(): void
    {
        $ids = $this->fixture(
            withCoupon: false
        );

        self::assertNull(
            $this->service->settle(
                $ids['payment']
            )
        );

        self::assertSame(
            0,
            SaasCouponRedemption::count()
        );
    }

    public function test_pending_payment_is_rejected(): void
    {
        $ids = $this->fixture(
            paymentOverrides: [
                'status' => 'pending',
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->service->settle(
            $ids['payment']
        );
    }

    public function test_pending_charge_is_rejected(): void
    {
        $ids = $this->fixture(
            chargeOverrides: [
                'status' => 'pending',
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->service->settle(
            $ids['payment']
        );
    }

    public function test_missing_paid_timestamp_is_rejected(): void
    {
        $ids = $this->fixture(
            paymentOverrides: [
                'paid_at' => null,
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->service->settle(
            $ids['payment']
        );
    }

    public function test_different_paid_amount_is_rejected(): void
    {
        $ids = $this->fixture(
            paymentOverrides: [
                'amount' => '50.00',
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->service->settle(
            $ids['payment']
        );
    }

    public function test_different_currency_is_rejected(): void
    {
        $ids = $this->fixture(
            paymentOverrides: [
                'currency' => 'USD',
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->service->settle(
            $ids['payment']
        );
    }

    public function test_changed_discount_is_rejected(): void
    {
        $ids = $this->fixture(
            chargeOverrides: [
                'discount' => '6.00',
                'total' => '44.00',
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->service->settle(
            $ids['payment']
        );
    }

    public function test_wrong_source_is_rejected(): void
    {
        $ids = $this->fixture(
            chargeOverrides: [
                'source_id' =>
                    (string) Str::uuid(),
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->service->settle(
            $ids['payment']
        );
    }

    public function test_released_reservation_is_rejected(): void
    {
        $ids = $this->fixture(
            redemptionOverrides: [
                'status' => 'released',
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->service->settle(
            $ids['payment']
        );
    }

    public function test_two_paid_payments_are_rejected(): void
    {
        $ids = $this->fixture();

        DB::table('billing_payments')->insert([
            'id' => (string) Str::uuid(),
            'billing_charge_id' => $ids['charge'],
            'status' => BillingPayment::STATUS_PAID,
            'amount' => '45.00',
            'currency' => 'EUR',
            'paid_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(
            ValidationException::class
        );

        $this->service->settle(
            $ids['payment']
        );
    }

    public function test_full_discount_cannot_pass_paid_settlement(): void
    {
        $ids = $this->fixture(
            chargeOverrides: [
                'discount' => '50.00',
                'total' => '0.00',
            ],
            paymentOverrides: [
                'amount' => '0.00',
            ],
            redemptionOverrides: [
                'discount_amount' => '50.00',
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->service->settle(
            $ids['payment']
        );
    }

    public function test_bound_expired_reservation_can_be_settled(): void
    {
        $ids = $this->fixture(
            redemptionOverrides: [
                'reserved_until' =>
                    now()->subDay(),
            ]
        );

        self::assertSame(
            'redeemed',
            $this->service->settle(
                $ids['payment']
            )->status
        );
    }

    public function test_other_tenant_is_rejected(): void
    {
        $ids = $this->fixture(
            chargeOverrides: [
                'tenant_id' =>
                    (string) Str::uuid(),
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->service->settle(
            $ids['payment']
        );
    }

    public function test_already_redeemed_by_different_payment_is_rejected(): void
    {
        $ids = $this->fixture(
            redemptionOverrides: [
                'status' =>
                    SaasCouponRedemption::STATUS_REDEEMED,

                'metadata' => [
                    'settlement_payment_id' =>
                        (string) Str::uuid(),
                ],

                'redeemed_at' => now(),
            ]
        );

        $this->expectException(
            ValidationException::class
        );

        $this->service->settle(
            $ids['payment']
        );
    }
}