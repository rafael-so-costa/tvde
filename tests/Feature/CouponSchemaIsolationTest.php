<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\SaasCoupon;
use App\Models\SaasCouponRedemption;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

final class CouponSchemaIsolationTest extends TestCase
{
    private ?string $originalConnection = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->originalConnection =
            (string) config('database.default');

        config()->set(
            'database.connections.coupon_sqlite_test',
            [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ]
        );

        DB::setDefaultConnection('coupon_sqlite_test');

        $connection = DB::connection(
            'coupon_sqlite_test'
        );

        // Nunca continuar numa base de dados real.
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

        // Tabela minima apenas para resolver
        // a FK da migration de cupoes.
        Schema::create(
            'billing_charges',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();
            }
        );

        $migration = require database_path(
            'migrations/2026_11_02_230000_create_saas_coupons_and_redemptions_tables.php'
        );

        $migration->up();
    }

    protected function tearDown(): void
    {
        try {
            DB::purge('coupon_sqlite_test');

            if ($this->originalConnection !== null) {
                DB::setDefaultConnection(
                    $this->originalConnection
                );
            }
        } finally {
            parent::tearDown();
        }
    }

    private function coupon(): SaasCoupon
    {
        return SaasCoupon::create([
            'code' => ' teste10 ',
            'name' => 'Cupao de teste',
            'discount_type' => SaasCoupon::TYPE_PERCENTAGE,
            'discount_value' => '10.00',
        ]);
    }

    private function redemption(
        string $couponId,
        ?string $chargeId,
        string $key
    ): SaasCouponRedemption {
        return SaasCouponRedemption::create([
            'saas_coupon_id' => $couponId,
            'customer_type' => 'tenant',
            'customer_id' => (string) Str::uuid(),
            'source_type' => 'saas_subscription',
            'source_id' => (string) Str::uuid(),
            'billing_charge_id' => $chargeId,
            'subtotal_amount' => '50.00',
            'discount_amount' => '5.00',
            'currency' => 'EUR',
            'idempotency_key' => $key,
            'reserved_until' => now()->addMinutes(30),
        ]);
    }

    public function test_creates_required_tables_and_columns(): void
    {
        self::assertTrue(
            Schema::hasTable('saas_coupons')
        );

        self::assertTrue(
            Schema::hasTable('saas_coupon_redemptions')
        );

        foreach ([
            'code',
            'discount_type',
            'discount_value',
            'enabled',
            'max_redemptions',
            'max_per_customer',
        ] as $column) {
            self::assertTrue(
                Schema::hasColumn(
                    'saas_coupons',
                    $column
                )
            );
        }

        foreach ([
            'saas_coupon_id',
            'billing_charge_id',
            'idempotency_key',
            'reserved_until',
            'redeemed_at',
        ] as $column) {
            self::assertTrue(
                Schema::hasColumn(
                    'saas_coupon_redemptions',
                    $column
                )
            );
        }
    }

    public function test_coupon_defaults_are_safe(): void
    {
        $coupon = $this->coupon()->fresh();

        self::assertSame(
            'TESTE10',
            $coupon->code
        );

        self::assertFalse($coupon->enabled);
        self::assertTrue($coupon->first_payment_only);
        self::assertSame('both', $coupon->applies_to);
    }

    public function test_coupon_code_is_unique(): void
    {
        $this->coupon();

        $this->expectException(
            QueryException::class
        );

        SaasCoupon::create([
            'code' => 'TESTE10',
            'name' => 'Duplicado',
            'discount_type' => SaasCoupon::TYPE_FIXED,
            'discount_value' => '5.00',
        ]);
    }

    public function test_redemption_has_unique_idempotency_key(): void
    {
        $coupon = $this->coupon();

        $this->redemption(
            $coupon->id,
            null,
            'same-key'
        );

        $this->expectException(
            QueryException::class
        );

        $this->redemption(
            $coupon->id,
            null,
            'same-key'
        );
    }

    public function test_charge_cannot_have_two_redemptions(): void
    {
        $coupon = $this->coupon();
        $chargeId = (string) Str::uuid();

        DB::table('billing_charges')->insert([
            'id' => $chargeId,
        ]);

        $this->redemption(
            $coupon->id,
            $chargeId,
            'key-one'
        );

        $this->expectException(
            QueryException::class
        );

        $this->redemption(
            $coupon->id,
            $chargeId,
            'key-two'
        );
    }

    public function test_rejects_nonexistent_coupon(): void
    {
        $this->expectException(
            QueryException::class
        );

        $this->redemption(
            (string) Str::uuid(),
            null,
            'unknown-coupon'
        );
    }

    public function test_rejects_nonexistent_charge(): void
    {
        $coupon = $this->coupon();

        $this->expectException(
            QueryException::class
        );

        $this->redemption(
            $coupon->id,
            (string) Str::uuid(),
            'unknown-charge'
        );
    }

    public function test_rollback_affects_only_isolated_tables(): void
    {
        $migration = require database_path(
            'migrations/2026_11_02_230000_create_saas_coupons_and_redemptions_tables.php'
        );

        $migration->down();

        self::assertFalse(
            Schema::hasTable('saas_coupons')
        );

        self::assertFalse(
            Schema::hasTable('saas_coupon_redemptions')
        );

        self::assertTrue(
            Schema::hasTable('billing_charges')
        );
    }
}