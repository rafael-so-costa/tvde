<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\SaasCoupon;
use App\Services\Billing\CouponDiscountCalculator;
use App\Services\Billing\CouponEligibilityService;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use InvalidArgumentException;
use Tests\TestCase;

final class CouponEligibilityServiceTest extends TestCase
{
    private CouponEligibilityService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new CouponEligibilityService(
            new CouponDiscountCalculator()
        );
    }

    private function coupon(array $overrides = []): SaasCoupon
    {
        return new SaasCoupon(array_merge([
            'code' => ' oferta10 ',
            'name' => 'Promocao',
            'discount_type' => SaasCoupon::TYPE_PERCENTAGE,
            'discount_value' => '10.00',
            'applies_to' => SaasCoupon::SCOPE_BOTH,
            'enabled' => true,
            'first_payment_only' => true,
        ], $overrides));
    }

    private function quote(
        SaasCoupon $coupon,
        string $scope = SaasCoupon::SCOPE_SAAS,
        string $subtotal = '50.00',
        string $currency = 'EUR',
        int $globalUsageCount = 0,
        int $customerUsageCount = 0,
        int $previousPaidPurchases = 0,
        ?CarbonInterface $at = null
    ): array {
        return $this->service->quote(
            $coupon,
            $scope,
            $subtotal,
            $currency,
            $globalUsageCount,
            $customerUsageCount,
            $previousPaidPurchases,
            $at ?? CarbonImmutable::parse(
                '2026-11-02 12:00:00',
                'UTC'
            )
        );
    }

    public function test_returns_server_side_quote(): void
    {
        self::assertSame([
            'code' => 'OFERTA10',
            'scope' => SaasCoupon::SCOPE_SAAS,
            'currency' => 'EUR',
            'subtotal' => '50.00',
            'discount' => '5.00',
            'total' => '45.00',
        ], $this->quote($this->coupon()));
    }

    public function test_rejects_disabled_coupon(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->quote(
            $this->coupon(['enabled' => false])
        );
    }

    public function test_rejects_wrong_scope(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->quote(
            $this->coupon([
                'applies_to' => SaasCoupon::SCOPE_ADS,
            ])
        );
    }

    public function test_rejects_unsupported_scope(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->quote(
            $this->coupon(),
            'invalid'
        );
    }

    public function test_rejects_unsupported_currency(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->quote(
            $this->coupon(),
            currency: 'USD'
        );
    }

    public function test_accepts_start_inclusive(): void
    {
        $time = CarbonImmutable::parse(
            '2026-11-02 12:00:00',
            'UTC'
        );

        self::assertSame(
            '45.00',
            $this->quote(
                $this->coupon(['starts_at' => $time]),
                at: $time
            )['total']
        );
    }

    public function test_rejects_before_start(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->quote(
            $this->coupon([
                'starts_at' => '2026-11-03 12:00:00',
            ])
        );
    }

    public function test_rejects_expiry_boundary(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->quote(
            $this->coupon([
                'expires_at' => '2026-11-02 12:00:00',
            ])
        );
    }

    public function test_rejects_bad_date_window(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->quote(
            $this->coupon([
                'starts_at' => '2026-11-04 12:00:00',
                'expires_at' => '2026-11-03 12:00:00',
            ])
        );
    }

    public function test_rejects_global_limit_including_active_reservations(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->quote(
            $this->coupon(['max_redemptions' => 2]),
            globalUsageCount: 2
        );
    }

    public function test_rejects_customer_limit_including_active_reservations(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->quote(
            $this->coupon(['max_per_customer' => 1]),
            customerUsageCount: 1
        );
    }

    public function test_rejects_invalid_zero_limit(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->quote(
            $this->coupon(['max_redemptions' => 0])
        );
    }

    public function test_rejects_prior_paid_purchase_for_first_only(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->quote(
            $this->coupon(),
            previousPaidPurchases: 1
        );
    }

    public function test_allows_prior_purchase_when_not_first_only(): void
    {
        self::assertSame(
            '45.00',
            $this->quote(
                $this->coupon([
                    'first_payment_only' => false,
                ]),
                previousPaidPurchases: 5
            )['total']
        );
    }

    public function test_rejects_subtotal_below_minimum(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->quote(
            $this->coupon([
                'min_subtotal' => '50.01',
            ])
        );
    }

    public function test_accepts_exact_minimum(): void
    {
        self::assertSame(
            '45.00',
            $this->quote(
                $this->coupon([
                    'min_subtotal' => '50.00',
                ])
            )['total']
        );
    }

    public function test_rejects_negative_usage_count(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->quote(
            $this->coupon(),
            customerUsageCount: -1
        );
    }

    public function test_calculates_full_discount_without_payment(): void
    {
        $quote = $this->quote(
            $this->coupon([
                'discount_type' => SaasCoupon::TYPE_FIXED,
                'discount_value' => '100.00',
            ])
        );

        self::assertSame(
            '50.00',
            $quote['discount']
        );

        self::assertSame(
            '0.00',
            $quote['total']
        );
    }
}