<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\BillingCharge;
use App\Models\BillingPayment;
use App\Models\SaasCouponRedemption;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/**
 * Finaliza um cupao apos pagamento confirmado.
 *
 * Nao confirma pagamentos nem altera cobrancas.
 * Destinado a integracao interna no BillingService.
 */
final class CouponRedemptionSettlementService
{
    public function settle(
        string $paymentId
    ): ?SaasCouponRedemption {
        if (! Str::isUuid($paymentId)) {
            throw new InvalidArgumentException(
                'Pagamento invalido.'
            );
        }

        return DB::transaction(
            function () use ($paymentId): ?SaasCouponRedemption {

                // Mesma ordem inicial de bloqueios
                // do BillingService::confirmPaid.
                $payment = BillingPayment::query()
                    ->lockForUpdate()
                    ->findOrFail($paymentId);

                $charge = BillingCharge::query()
                    ->lockForUpdate()
                    ->findOrFail(
                        $payment->billing_charge_id
                    );

                $record = SaasCouponRedemption::query()
                    ->where(
                        'billing_charge_id',
                        $charge->id
                    )
                    ->lockForUpdate()
                    ->first();

                // Pagamentos normais sem cupao.
                if ($record === null) {
                    return null;
                }

                if (
                    $payment->status !==
                        BillingPayment::STATUS_PAID ||
                    $charge->status !==
                        BillingCharge::STATUS_PAID ||
                    $payment->paid_at === null ||
                    $charge->paid_at === null
                ) {
                    $this->reject(
                        'Pagamento e cobranca ainda nao confirmados.'
                    );
                }

                if (
                    $payment->billing_charge_id !== $charge->id ||
                    $record->source_type !== $charge->source_type ||
                    $record->source_id !== $charge->source_id ||
                    $record->currency !== $charge->currency ||
                    $payment->currency !== $charge->currency
                ) {
                    $this->reject(
                        'Dados financeiros incompativeis com a reserva.'
                    );
                }

                if (
                    $record->customer_type === 'tenant' &&
                    $record->customer_id !== $charge->tenant_id
                ) {
                    $this->reject(
                        'Empresa diferente da reserva.'
                    );
                }

                $subtotal = $this->cents(
                    (string) $charge->subtotal
                );

                $discount = $this->cents(
                    (string) $charge->discount
                );

                $total = $this->cents(
                    (string) $charge->total
                );

                $paymentAmount = $this->cents(
                    (string) $payment->amount
                );

                if (
                    $subtotal <= 0 ||
                    $discount <= 0 ||
                    $discount >= $subtotal ||
                    $total !== $subtotal - $discount ||
                    $paymentAmount !== $total ||
                    $this->cents(
                        (string) $record->subtotal_amount
                    ) !== $subtotal ||
                    $this->cents(
                        (string) $record->discount_amount
                    ) !== $discount
                ) {
                    $this->reject(
                        'Montantes do cupao, cobranca e pagamento nao coincidem.'
                    );
                }

                // Duplicidade de pagamentos pagos
                // requer revisao financeira.
                $paidCount = BillingPayment::query()
                    ->where(
                        'billing_charge_id',
                        $charge->id
                    )
                    ->where(
                        'status',
                        BillingPayment::STATUS_PAID
                    )
                    ->count();

                if ($paidCount !== 1) {
                    $this->reject(
                        'Cobranca com multiplos pagamentos confirmados.'
                    );
                }

                // Callback repetido.
                if (
                    $record->status ===
                    SaasCouponRedemption::STATUS_REDEEMED
                ) {
                    if (
                        data_get(
                            $record->metadata,
                            'settlement_payment_id'
                        ) !== $payment->id
                    ) {
                        $this->reject(
                            'Cupao ja liquidado por outro pagamento.'
                        );
                    }

                    return $record;
                }

                if (
                    $record->status !==
                    SaasCouponRedemption::STATUS_RESERVED
                ) {
                    $this->reject(
                        'Reserva nao pode ser liquidada neste estado.'
                    );
                }

                // Uma reserva vinculada pode ser
                // liquidada apos os 30 minutos.
                $record->status =
                    SaasCouponRedemption::STATUS_REDEEMED;

                $record->redeemed_at =
                    $payment->paid_at;

                $record->metadata = array_merge(
                    $record->metadata ?? [],
                    [
                        'settlement_payment_id' =>
                            $payment->id,

                        'settlement_confirmed_at' =>
                            now('UTC')->toIso8601String(),
                    ]
                );

                $record->save();

                return $record->refresh();
            },
            3
        );
    }

    private function cents(
        string $amount
    ): int {
        if (! preg_match(
            '/\A(0|[1-9][0-9]{0,9})(?:\.([0-9]{1,2}))?\z/',
            $amount,
            $parts
        )) {
            $this->reject(
                'Montante monetario invalido.'
            );
        }

        return (int) $parts[1] * 100 +
            (int) str_pad(
                $parts[2] ?? '',
                2,
                '0'
            );
    }

    private function reject(
        string $message
    ): never {
        throw ValidationException::withMessages([
            'coupon' => $message,
        ]);
    }
}