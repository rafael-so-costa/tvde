<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\BillingCharge;
use App\Models\BillingPayment;
use App\Models\SaasCouponRedemption;
use Carbon\CarbonInterface;
use InvalidArgumentException;

/**
 * Classificacao conservadora, SOMENTE LEITURA.
 *
 * O estado CANDIDATE nunca autoriza, por si so,
 * cancelar ou expirar uma cobranca.
 */
final class CouponBillingClosurePolicy
{
    public const CHARGE_PAID = 'charge_paid';
    public const CHARGE_CLOSED = 'charge_terminal';
    public const CHARGE_UNKNOWN = 'charge_unknown';
    public const PAID_TIMESTAMP = 'paid_timestamp_present';
    public const PAYMENT_MISMATCH = 'payment_charge_mismatch';
    public const PAYMENT_PAID = 'payment_paid';
    public const REFERENCE_ISSUED = 'payment_reference_issued';
    public const PAYMENT_HISTORY = 'payment_history_present';
    public const COUPON_MISMATCH = 'coupon_charge_mismatch';
    public const COUPON_REDEEMED = 'coupon_redeemed';
    public const COUPON_OTHER_STATUS = 'coupon_not_reserved';
    public const MISSING_DUE_DATE = 'missing_due_date';
    public const NOT_DUE = 'not_due';
    public const BOUND_COUPON = 'bound_coupon_requires_atomic_reversal';
    public const CANDIDATE = 'candidate_needs_transactional_closure';

    /**
     * @param iterable<BillingPayment> $payments
     */
    public function classify(
        BillingCharge $charge,
        iterable $payments,
        ?SaasCouponRedemption $redemption,
        CarbonInterface $at
    ): string {
        if ($charge->status === BillingCharge::STATUS_PAID) {
            return self::CHARGE_PAID;
        }

        if (in_array($charge->status, [
            BillingCharge::STATUS_CANCELED,
            BillingCharge::STATUS_EXPIRED,
            BillingCharge::STATUS_REFUNDED,
        ], true)) {
            return self::CHARGE_CLOSED;
        }

        if ($charge->status !== BillingCharge::STATUS_PENDING) {
            return self::CHARGE_UNKNOWN;
        }

        if ($charge->paid_at !== null) {
            return self::PAID_TIMESTAMP;
        }

        if ($redemption !== null) {
            if (
                (string) $redemption->billing_charge_id !==
                (string) $charge->id
            ) {
                return self::COUPON_MISMATCH;
            }

            if (
                $redemption->status ===
                SaasCouponRedemption::STATUS_REDEEMED
            ) {
                return self::COUPON_REDEEMED;
            }

            if (
                $redemption->status !==
                SaasCouponRedemption::STATUS_RESERVED
            ) {
                return self::COUPON_OTHER_STATUS;
            }
        }

        $hasHistory = false;
        $hasReference = false;

        foreach ($payments as $payment) {
            if (! $payment instanceof BillingPayment) {
                throw new InvalidArgumentException(
                    'Historico de pagamentos invalido.'
                );
            }

            if (
                (string) $payment->billing_charge_id !==
                (string) $charge->id
            ) {
                return self::PAYMENT_MISMATCH;
            }

            $hasHistory = true;

            if (
                $payment->status === BillingPayment::STATUS_PAID ||
                $payment->paid_at !== null
            ) {
                return self::PAYMENT_PAID;
            }

            if (
                filled($payment->external_id) ||
                filled($payment->provider_reference) ||
                filled($payment->entity) ||
                filled($payment->reference)
            ) {
                $hasReference = true;
            }
        }

        if ($hasReference) {
            return self::REFERENCE_ISSUED;
        }

        // Mesmo uma tentativa MOCK, cancelada ou falhada
        // exige verificacao antes de libertar um cupao.
        if ($hasHistory) {
            return self::PAYMENT_HISTORY;
        }

        if ($charge->due_at === null) {
            return self::MISSING_DUE_DATE;
        }

        if ($charge->due_at->greaterThan($at)) {
            return self::NOT_DUE;
        }

        if ($redemption !== null) {
            return self::BOUND_COUPON;
        }

        // Apenas candidata a analise posterior.
        // Nao executar alteracoes de estado aqui.
        return self::CANDIDATE;
    }
}