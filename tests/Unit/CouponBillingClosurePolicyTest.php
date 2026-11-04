<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\BillingCharge;
use App\Models\BillingPayment;
use App\Models\SaasCouponRedemption;
use App\Services\Billing\CouponBillingClosurePolicy as Policy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use Tests\TestCase;

final class CouponBillingClosurePolicyTest extends TestCase
{
    private Policy $policy;
    private CarbonImmutable $at;

    protected function setUp(): void
    {
        parent::setUp();

        $this->policy = new Policy();

        $this->at = CarbonImmutable::parse(
            '2026-11-03 12:00:00',
            'UTC'
        );
    }

    private function charge(array $overrides = []): BillingCharge
    {
        $charge = new BillingCharge(array_merge([
            'status' => BillingCharge::STATUS_PENDING,
            'due_at' => '2026-11-02 12:00:00',
            'paid_at' => null,
        ], $overrides));

        $charge->id = (string) Str::uuid();

        return $charge;
    }

    private function payment(
        BillingCharge $charge,
        array $overrides = []
    ): BillingPayment {
        $payment = new BillingPayment(array_merge([
            'billing_charge_id' => $charge->id,
            'status' => BillingPayment::STATUS_PENDING,
        ], $overrides));

        $payment->id = (string) Str::uuid();

        return $payment;
    }

    private function coupon(
        BillingCharge $charge,
        array $overrides = []
    ): SaasCouponRedemption {
        $record = new SaasCouponRedemption(array_merge([
            'billing_charge_id' => $charge->id,
            'status' => SaasCouponRedemption::STATUS_RESERVED,
        ], $overrides));

        $record->id = (string) Str::uuid();

        return $record;
    }

    public function test_no_payment_is_only_candidate_not_authorized_closure(): void
    {
        $charge = $this->charge();

        self::assertSame(
            Policy::CANDIDATE,
            $this->policy->classify($charge, [], null, $this->at)
        );

        self::assertSame(
            BillingCharge::STATUS_PENDING,
            $charge->status
        );
    }

    public function test_future_due_date_blocks_review(): void
    {
        $charge = $this->charge([
            'due_at' => '2026-11-05 00:00:00',
        ]);

        self::assertSame(
            Policy::NOT_DUE,
            $this->policy->classify($charge, [], null, $this->at)
        );
    }

    public function test_missing_due_date_blocks_review(): void
    {
        $charge = $this->charge(['due_at' => null]);

        self::assertSame(
            Policy::MISSING_DUE_DATE,
            $this->policy->classify($charge, [], null, $this->at)
        );
    }

    public function test_paid_charge_is_not_candidate(): void
    {
        $charge = $this->charge([
            'status' => BillingCharge::STATUS_PAID,
        ]);

        self::assertSame(
            Policy::CHARGE_PAID,
            $this->policy->classify($charge, [], null, $this->at)
        );
    }

    public function test_canceled_charge_is_not_candidate(): void
    {
        $charge = $this->charge([
            'status' => BillingCharge::STATUS_CANCELED,
        ]);

        self::assertSame(
            Policy::CHARGE_CLOSED,
            $this->policy->classify($charge, [], null, $this->at)
        );
    }

    public function test_expired_charge_is_not_candidate(): void
    {
        $charge = $this->charge([
            'status' => BillingCharge::STATUS_EXPIRED,
        ]);

        self::assertSame(
            Policy::CHARGE_CLOSED,
            $this->policy->classify($charge, [], null, $this->at)
        );
    }

    public function test_refunded_charge_is_not_candidate(): void
    {
        $charge = $this->charge([
            'status' => BillingCharge::STATUS_REFUNDED,
        ]);

        self::assertSame(
            Policy::CHARGE_CLOSED,
            $this->policy->classify($charge, [], null, $this->at)
        );
    }

    public function test_unknown_status_is_not_candidate(): void
    {
        $charge = $this->charge([
            'status' => 'unexpected',
        ]);

        self::assertSame(
            Policy::CHARGE_UNKNOWN,
            $this->policy->classify($charge, [], null, $this->at)
        );
    }

    public function test_inconsistent_paid_timestamp_is_not_candidate(): void
    {
        $charge = $this->charge([
            'paid_at' => '2026-11-03 11:00:00',
        ]);

        self::assertSame(
            Policy::PAID_TIMESTAMP,
            $this->policy->classify($charge, [], null, $this->at)
        );
    }

    public function test_issued_reference_is_protected_even_when_expired(): void
    {
        $charge = $this->charge();

        $payment = $this->payment($charge, [
            'status' => BillingPayment::STATUS_EXPIRED,
            'reference' => '123456789',
        ]);

        self::assertSame(
            Policy::REFERENCE_ISSUED,
            $this->policy->classify(
                $charge,
                [$payment],
                null,
                $this->at
            )
        );
    }

    public function test_canceled_payment_without_reference_still_blocks(): void
    {
        $charge = $this->charge();

        $payment = $this->payment($charge, [
            'status' => BillingPayment::STATUS_CANCELED,
        ]);

        self::assertSame(
            Policy::PAYMENT_HISTORY,
            $this->policy->classify(
                $charge,
                [$payment],
                null,
                $this->at
            )
        );
    }

    public function test_paid_payment_blocks_inconsistent_pending_charge(): void
    {
        $charge = $this->charge();

        $payment = $this->payment($charge, [
            'status' => BillingPayment::STATUS_PAID,
        ]);

        self::assertSame(
            Policy::PAYMENT_PAID,
            $this->policy->classify(
                $charge,
                [$payment],
                null,
                $this->at
            )
        );
    }

    public function test_payment_for_another_charge_is_rejected(): void
    {
        $charge = $this->charge();

        $payment = $this->payment($charge, [
            'billing_charge_id' => (string) Str::uuid(),
        ]);

        self::assertSame(
            Policy::PAYMENT_MISMATCH,
            $this->policy->classify(
                $charge,
                [$payment],
                null,
                $this->at
            )
        );
    }

    public function test_bound_coupon_requires_separate_atomic_reversal(): void
    {
        $charge = $this->charge();
        $record = $this->coupon($charge);

        self::assertSame(
            Policy::BOUND_COUPON,
            $this->policy->classify(
                $charge,
                [],
                $record,
                $this->at
            )
        );

        self::assertSame(
            SaasCouponRedemption::STATUS_RESERVED,
            $record->status
        );
    }

    public function test_redeemed_coupon_is_never_released(): void
    {
        $charge = $this->charge();

        $record = $this->coupon($charge, [
            'status' => SaasCouponRedemption::STATUS_REDEEMED,
        ]);

        self::assertSame(
            Policy::COUPON_REDEEMED,
            $this->policy->classify(
                $charge,
                [],
                $record,
                $this->at
            )
        );
    }

    public function test_coupon_for_another_charge_is_rejected(): void
    {
        $charge = $this->charge();

        $record = $this->coupon($charge, [
            'billing_charge_id' => (string) Str::uuid(),
        ]);

        self::assertSame(
            Policy::COUPON_MISMATCH,
            $this->policy->classify(
                $charge,
                [],
                $record,
                $this->at
            )
        );
    }
}