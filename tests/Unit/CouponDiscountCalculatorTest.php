<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Billing\CouponDiscountCalculator;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class CouponDiscountCalculatorTest extends TestCase
{
    private CouponDiscountCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->calculator =
            new CouponDiscountCalculator();
    }

    public function test_fixed_discount(): void
    {
        self::assertSame(
            [
                'subtotal' => '50.00',
                'discount' => '10.00',
                'total' => '40.00',
            ],
            $this->calculator->calculate(
                '50.00',
                'fixed',
                '10.00'
            )
        );
    }

    public function test_percentage_discount(): void
    {
        self::assertSame(
            [
                'subtotal' => '50.00',
                'discount' => '7.75',
                'total' => '42.25',
            ],
            $this->calculator->calculate(
                '50.00',
                'percentage',
                '15.50'
            )
        );
    }

    public function test_percentage_rounds_half_up_to_nearest_cent(): void
    {
        self::assertSame(
            [
                'subtotal' => '0.05',
                'discount' => '0.03',
                'total' => '0.02',
            ],
            $this->calculator->calculate(
                '0.05',
                'percentage',
                '50'
            )
        );
    }

    public function test_percentage_can_round_to_zero_cents(): void
    {
        self::assertSame(
            [
                'subtotal' => '0.01',
                'discount' => '0.00',
                'total' => '0.01',
            ],
            $this->calculator->calculate(
                '0.01',
                'percentage',
                '0.01'
            )
        );
    }

    public function test_fixed_discount_never_makes_total_negative(): void
    {
        self::assertSame(
            [
                'subtotal' => '5.00',
                'discount' => '5.00',
                'total' => '0.00',
            ],
            $this->calculator->calculate(
                '5.00',
                'fixed',
                '500.00'
            )
        );
    }

    public function test_full_percentage_discount(): void
    {
        self::assertSame(
            [
                'subtotal' => '50.00',
                'discount' => '50.00',
                'total' => '0.00',
            ],
            $this->calculator->calculate(
                '50.00',
                'percentage',
                '100.00'
            )
        );
    }

    public function test_rejects_unknown_type(): void
    {
        $this->expectException(
            InvalidArgumentException::class
        );

        $this->calculator->calculate(
            '10.00',
            'unknown',
            '5.00'
        );
    }

    public function test_rejects_zero_subtotal(): void
    {
        $this->expectException(
            InvalidArgumentException::class
        );

        $this->calculator->calculate(
            '0',
            'fixed',
            '1'
        );
    }

    public function test_rejects_negative_fixed_discount(): void
    {
        $this->expectException(
            InvalidArgumentException::class
        );

        $this->calculator->calculate(
            '10.00',
            'fixed',
            '-1.00'
        );
    }

    public function test_rejects_percentage_above_100(): void
    {
        $this->expectException(
            InvalidArgumentException::class
        );

        $this->calculator->calculate(
            '10.00',
            'percentage',
            '100.01'
        );
    }

    public function test_rejects_comma_decimal_separator(): void
    {
        $this->expectException(
            InvalidArgumentException::class
        );

        $this->calculator->calculate(
            '10,00',
            'fixed',
            '1.00'
        );
    }

    public function test_rejects_more_than_two_decimal_places(): void
    {
        $this->expectException(
            InvalidArgumentException::class
        );

        $this->calculator->calculate(
            '10.00',
            'fixed',
            '0.001'
        );
    }

    public function test_uses_exact_large_integer_cents(): void
    {
        self::assertSame(
            [
                'subtotal' => '9999999999.99',
                'discount' => '100000000.00',
                'total' => '9899999999.99',
            ],
            $this->calculator->calculate(
                '9999999999.99',
                'percentage',
                '1.00'
            )
        );
    }
}