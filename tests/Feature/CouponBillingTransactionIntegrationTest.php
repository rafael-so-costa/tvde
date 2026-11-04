<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BillingCharge;
use App\Models\BillingPayment;
use App\Models\SaasCoupon;
use App\Models\SaasCouponRedemption;
use App\Services\Billing\BillingService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

final class CouponBillingTransactionIntegrationTest extends TestCase
{
    private string $originalConnection;
    private BillingService $billing;

    protected function setUp(): void
    {
        parent::setUp();

        $this->originalConnection =
            (string) config('database.default');

        config()->set(
            'database.connections.coupon_billing_tx_test',
            [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ]
        );

        DB::setDefaultConnection('coupon_billing_tx_test');

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
                $table->timestamp('paid_at')->nullable();
                $table->timestamps();
            }
        );

        Schema::create(
            'billing_payments',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('billing_charge_id');
                $table->string('provider');
                $table->string('method');
                $table->string('status');
                $table->decimal('amount', 12, 2);
                $table->string('currency', 3);
                $table->timestamp('paid_at')->nullable();
                $table->text('metadata')->nullable();
                $table->timestamps();
            }
        );

        Schema::create(
            'saas_subscriptions',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->string('status');
                $table->timestamps();
            }
        );

        $migration = require database_path(
            'migrations/2026_11_02_230000_create_saas_coupons_and_redemptions_tables.php'
        );

        $migration->up();

        config()->set('billing.coupons.enabled', true);
        config()->set(
            'billing.providers.ifthenpay.sandbox',
            true
        );

        $this->billing = app(BillingService::class);
    }

    protected function tearDown(): void
    {
        try {
            DB::purge('coupon_billing_tx_test');

            DB::setDefaultConnection(
                $this->originalConnection
            );
        } finally {
            parent::tearDown();
        }
    }

    private function fixture(
        bool $withCoupon = true,
        bool $mock = true
    ): array {
        $tenant = (string) Str::uuid();
        $source = (string) Str::uuid();
        $charge = (string) Str::uuid();
        $payment = (string) Str::uuid();
        $now = now();

        DB::table('saas_subscriptions')->insert([
            'id' => $source,
            'tenant_id' => $tenant,
            'status' => 'pending',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('billing_charges')->insert([
            'id' => $charge,
            'tenant_id' => $tenant,
            'source_type' =>
                BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
            'source_id' => $source,
            'status' => BillingCharge::STATUS_PENDING,
            'subtotal' => '50.00',
            'discount' => $withCoupon ? '5.00' : '0.00',
            'total' => $withCoupon ? '45.00' : '50.00',
            'currency' => 'EUR',
            'paid_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('billing_payments')->insert([
            'id' => $payment,
            'billing_charge_id' => $charge,
            'provider' => 'ifthenpay',
            'method' => 'mbway',
            'status' => BillingPayment::STATUS_PENDING,
            'amount' => $withCoupon ? '45.00' : '50.00',
            'currency' => 'EUR',
            'paid_at' => null,
            'metadata' => json_encode(
                ['mock' => $mock],
                JSON_THROW_ON_ERROR
            ),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $redemption = null;

        if ($withCoupon) {
            $coupon = SaasCoupon::create([
                'code' => 'TX10',
                'name' => 'Transacao de teste',
                'discount_type' =>
                    SaasCoupon::TYPE_PERCENTAGE,
                'discount_value' => '10.00',
                'applies_to' => SaasCoupon::SCOPE_SAAS,
                'enabled' => true,
            ]);

            $redemption = SaasCouponRedemption::create([
                'saas_coupon_id' => $coupon->id,
                'customer_type' => 'tenant',
                'customer_id' => $tenant,
                'source_type' => SaasCoupon::SCOPE_SAAS,
                'source_id' => $source,
                'billing_charge_id' => $charge,
                'status' =>
                    SaasCouponRedemption::STATUS_RESERVED,
                'subtotal_amount' => '50.00',
                'discount_amount' => '5.00',
                'currency' => 'EUR',
                'idempotency_key' => hash(
                    'sha256',
                    'billing-test:' . $charge
                ),
                'reserved_until' => now()->addHour(),
                'metadata' => ['bound' => true],
            ])->id;
        }

        return compact(
            'tenant',
            'source',
            'charge',
            'payment',
            'redemption'
        );
    }

    public function test_paid_coupon_is_settled_atomically(): void
    {
        $ids = $this->fixture();

        $paid = $this->billing->confirmPaid(
            BillingPayment::findOrFail($ids['payment'])
        );

        self::assertSame(
            BillingPayment::STATUS_PAID,
            $paid->status
        );

        self::assertSame(
            BillingCharge::STATUS_PAID,
            BillingCharge::findOrFail($ids['charge'])->status
        );

        self::assertSame(
            'active',
            DB::table('saas_subscriptions')
                ->where('id', $ids['source'])
                ->value('status')
        );

        $redemption = SaasCouponRedemption::findOrFail(
            $ids['redemption']
        );

        self::assertSame(
            SaasCouponRedemption::STATUS_REDEEMED,
            $redemption->status
        );

        self::assertSame(
            $ids['payment'],
            data_get(
                $redemption->metadata,
                'settlement_payment_id'
            )
        );
    }

    public function test_repeated_callback_does_not_redeem_again(): void
    {
        $ids = $this->fixture();

        $this->billing->confirmPaid(
            BillingPayment::findOrFail($ids['payment'])
        );

        $redemption = SaasCouponRedemption::findOrFail(
            $ids['redemption']
        );

        $firstMetadata = $redemption->metadata;
        $firstRedeemedAt =
            $redemption->redeemed_at->toDateTimeString();

        $this->billing->confirmPaid(
            BillingPayment::findOrFail($ids['payment'])
        );

        $redemption->refresh();

        self::assertSame(
            $firstMetadata,
            $redemption->metadata
        );

        self::assertSame(
            $firstRedeemedAt,
            $redemption->redeemed_at->toDateTimeString()
        );

        self::assertSame(
            1,
            SaasCouponRedemption::count()
        );
    }

    public function test_payment_without_coupon_still_works_with_feature_enabled(): void
    {
        $ids = $this->fixture(withCoupon: false);

        $this->billing->confirmPaid(
            BillingPayment::findOrFail($ids['payment'])
        );

        self::assertSame(
            BillingCharge::STATUS_PAID,
            BillingCharge::findOrFail($ids['charge'])->status
        );

        self::assertSame(
            'active',
            DB::table('saas_subscriptions')
                ->where('id', $ids['source'])
                ->value('status')
        );

        self::assertSame(
            0,
            SaasCouponRedemption::count()
        );
    }

    public function test_coupon_amount_mismatch_rolls_back_all_status_changes(): void
    {
        $ids = $this->fixture();

        DB::table('billing_payments')
            ->where('id', $ids['payment'])
            ->update(['amount' => '50.00']);

        try {
            $this->billing->confirmPaid(
                BillingPayment::findOrFail($ids['payment'])
            );

            self::fail(
                'Montante incorreto deveria ser rejeitado.'
            );
        } catch (ValidationException $exception) {
            self::assertSame(
                BillingPayment::STATUS_PENDING,
                BillingPayment::findOrFail(
                    $ids['payment']
                )->status
            );

            self::assertSame(
                BillingCharge::STATUS_PENDING,
                BillingCharge::findOrFail(
                    $ids['charge']
                )->status
            );

            self::assertSame(
                'pending',
                DB::table('saas_subscriptions')
                    ->where('id', $ids['source'])
                    ->value('status')
            );

            self::assertSame(
                SaasCouponRedemption::STATUS_RESERVED,
                SaasCouponRedemption::findOrFail(
                    $ids['redemption']
                )->status
            );
        }
    }

    public function test_mock_payment_uses_same_atomic_settlement(): void
    {
        $ids = $this->fixture();

        $paid = $this->billing->simulatePaid(
            BillingPayment::findOrFail($ids['payment'])
        );

        self::assertSame(
            BillingPayment::STATUS_PAID,
            $paid->status
        );

        self::assertSame(
            SaasCouponRedemption::STATUS_REDEEMED,
            SaasCouponRedemption::findOrFail(
                $ids['redemption']
            )->status
        );

        self::assertSame(
            'active',
            DB::table('saas_subscriptions')
                ->where('id', $ids['source'])
                ->value('status')
        );
    }

    public function test_repeating_mock_confirmation_is_idempotent(): void
    {
        $ids = $this->fixture();

        $this->billing->simulatePaid(
            BillingPayment::findOrFail($ids['payment'])
        );

        $first = SaasCouponRedemption::findOrFail(
            $ids['redemption']
        )->metadata;

        $this->billing->simulatePaid(
            BillingPayment::findOrFail($ids['payment'])
        );

        self::assertSame(
            $first,
            SaasCouponRedemption::findOrFail(
                $ids['redemption']
            )->metadata
        );
    }

    public function test_non_mock_simulation_is_still_forbidden(): void
    {
        $ids = $this->fixture(mock: false);

        $this->expectException(
            ValidationException::class
        );

        $this->billing->simulatePaid(
            BillingPayment::findOrFail($ids['payment'])
        );
    }

    public function test_disabled_feature_keeps_legacy_payment_behavior(): void
    {
        config()->set('billing.coupons.enabled', false);

        $ids = $this->fixture();

        $this->billing->confirmPaid(
            BillingPayment::findOrFail($ids['payment'])
        );

        self::assertSame(
            BillingCharge::STATUS_PAID,
            BillingCharge::findOrFail($ids['charge'])->status
        );

        self::assertSame(
            SaasCouponRedemption::STATUS_RESERVED,
            SaasCouponRedemption::findOrFail(
                $ids['redemption']
            )->status
        );
    }

    public function test_already_paid_callback_can_recover_a_pending_redemption(): void
    {
        $ids = $this->fixture();
        $now = now();

        DB::table('billing_payments')
            ->where('id', $ids['payment'])
            ->update([
                'status' => BillingPayment::STATUS_PAID,
                'paid_at' => $now,
            ]);

        DB::table('billing_charges')
            ->where('id', $ids['charge'])
            ->update([
                'status' => BillingCharge::STATUS_PAID,
                'paid_at' => $now,
            ]);

        $this->billing->confirmPaid(
            BillingPayment::findOrFail($ids['payment'])
        );

        self::assertSame(
            SaasCouponRedemption::STATUS_REDEEMED,
            SaasCouponRedemption::findOrFail(
                $ids['redemption']
            )->status
        );
    }

    public function test_multiple_paid_payments_roll_back_new_confirmation(): void
    {
        $ids = $this->fixture();

        DB::table('billing_payments')->insert([
            'id' => (string) Str::uuid(),
            'billing_charge_id' => $ids['charge'],
            'provider' => 'ifthenpay',
            'method' => 'mbway',
            'status' => BillingPayment::STATUS_PAID,
            'amount' => '45.00',
            'currency' => 'EUR',
            'paid_at' => now(),
            'metadata' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            $this->billing->confirmPaid(
                BillingPayment::findOrFail($ids['payment'])
            );

            self::fail(
                'Pagamentos pagos duplicados deveriam ser rejeitados.'
            );
        } catch (ValidationException $exception) {
            self::assertSame(
                BillingPayment::STATUS_PENDING,
                BillingPayment::findOrFail(
                    $ids['payment']
                )->status
            );

            self::assertSame(
                BillingCharge::STATUS_PENDING,
                BillingCharge::findOrFail(
                    $ids['charge']
                )->status
            );

            self::assertSame(
                SaasCouponRedemption::STATUS_RESERVED,
                SaasCouponRedemption::findOrFail(
                    $ids['redemption']
                )->status
            );
        }
    }

    public function test_wrong_reservation_source_rolls_back(): void
    {
        $ids = $this->fixture();

        DB::table('saas_coupon_redemptions')
            ->where('id', $ids['redemption'])
            ->update([
                'source_id' => (string) Str::uuid(),
            ]);

        try {
            $this->billing->confirmPaid(
                BillingPayment::findOrFail($ids['payment'])
            );

            self::fail(
                'Origem da reserva deveria ser validada.'
            );
        } catch (ValidationException $exception) {
            self::assertSame(
                BillingPayment::STATUS_PENDING,
                BillingPayment::findOrFail(
                    $ids['payment']
                )->status
            );

            self::assertSame(
                BillingCharge::STATUS_PENDING,
                BillingCharge::findOrFail(
                    $ids['charge']
                )->status
            );
        }
    }
}