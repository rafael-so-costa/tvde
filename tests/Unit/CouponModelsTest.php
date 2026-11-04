<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\SaasCoupon;
use App\Models\SaasCouponRedemption;
use PHPUnit\Framework\TestCase;

final class CouponModelsTest extends TestCase
{
    public function test_coupon_defaults_to_expected_table(): void
    {
        $coupon = new SaasCoupon();

        self::assertSame(
            'saas_coupons',
            $coupon->getTable()
        );

        self::assertContains(
            'discount_value',
            $coupon->getFillable()
        );
    }

    public function test_coupon_normalizes_code(): void
    {
        $coupon = new SaasCoupon();

        $coupon->code = '  oferta10  ';

        self::assertSame(
            'OFERTA10',
            $coupon->code
        );
    }

    public function test_redemption_is_separate_from_payment(): void
    {
        $redemption = new SaasCouponRedemption();

        self::assertSame(
            'saas_coupon_redemptions',
            $redemption->getTable()
        );

        self::assertContains(
            'billing_charge_id',
            $redemption->getFillable()
        );

        self::assertContains(
            'idempotency_key',
            $redemption->getFillable()
        );
    }

    public function test_statuses_have_explicit_names(): void
    {
        self::assertSame(
            'reserved',
            SaasCouponRedemption::STATUS_RESERVED
        );

        self::assertSame(
            'redeemed',
            SaasCouponRedemption::STATUS_REDEEMED
        );

        self::assertSame(
            'released',
            SaasCouponRedemption::STATUS_RELEASED
        );

        self::assertSame(
            'expired',
            SaasCouponRedemption::STATUS_EXPIRED
        );
    }
}