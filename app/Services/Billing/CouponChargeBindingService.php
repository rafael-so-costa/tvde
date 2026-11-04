<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\AdOrder;
use App\Models\BillingCharge;
use App\Models\SaasCoupon;
use App\Models\SaasCouponRedemption;
use App\Models\SaasSubscription;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/**
 * Liga uma reserva existente a uma cobranca
 * ainda sem pagamentos.
 *
 * Nunca invoca o prestador de pagamentos.
 */
final class CouponChargeBindingService
{
    public function bind(
        string $redemptionId,
        string $chargeId,
        ?CarbonInterface $at = null
    ): SaasCouponRedemption {
        if (
            ! Str::isUuid($redemptionId) ||
            ! Str::isUuid($chargeId)
        ) {
            throw new InvalidArgumentException(
                'Identificadores invalidos.'
            );
        }

        $at = $at
            ? CarbonImmutable::instance($at)
            : CarbonImmutable::now('UTC');

        return DB::transaction(function () use (
            $redemptionId,
            $chargeId,
            $at
        ): SaasCouponRedemption {

            // Leitura preliminar para determinar
            // a ordem dos bloqueios.
            $initial = SaasCouponRedemption::query()
                ->findOrFail($redemptionId);

            $coupon = SaasCoupon::query()
                ->lockForUpdate()
                ->findOrFail($initial->saas_coupon_id);

            if (
                $initial->source_type ===
                SaasCoupon::SCOPE_SAAS
            ) {
                $source = SaasSubscription::query()
                    ->lockForUpdate()
                    ->findOrFail($initial->source_id);
            } elseif (
                $initial->source_type ===
                SaasCoupon::SCOPE_ADS
            ) {
                $source = AdOrder::query()
                    ->lockForUpdate()
                    ->findOrFail($initial->source_id);
            } else {
                $this->reject(
                    'Origem da reserva desconhecida.'
                );
            }

            $record = SaasCouponRedemption::query()
                ->lockForUpdate()
                ->findOrFail($redemptionId);

            if (
                $record->saas_coupon_id !== $coupon->id ||
                $record->source_type !== $initial->source_type ||
                $record->source_id !== $initial->source_id
            ) {
                $this->reject(
                    'Reserva alterada durante a operacao.'
                );
            }

            $charge = BillingCharge::query()
                ->lockForUpdate()
                ->findOrFail($chargeId);

            $purchaseKey = data_get(
                $record->metadata,
                'purchase_key'
            );

            if (
                is_string($purchaseKey) &&
                str_starts_with($purchaseKey, 'charge:')
            ) {
                if ($purchaseKey !== 'charge:' . $charge->id) {
                    $this->reject(
                        'Reserva pertence a outro periodo de cobranca.'
                    );
                }

                // Identidade completa antes da primeira
                // aplicacao do desconto financeiro.
                //
                // Em reenvios de uma cobranca ja vinculada,
                // a validacao monetaria e efetuada pela
                // rotina idempotente existente.
                if ($record->billing_charge_id === null) {
                    $identityService = app(
                        CouponBillingCycleIdentityService::class
                    );

                    $identity = $record->source_type ===
                        SaasCoupon::SCOPE_SAAS
                        ? $identityService->subscription(
                            $charge,
                            $source
                        )
                        : $identityService->adOrder(
                            $charge,
                            $source
                        );

                    if (
                        $identity['purchase_key'] !== $purchaseKey
                    ) {
                        $this->reject(
                            'Identidade de cobranca divergente.'
                        );
                    }
                }
            }

            if (
                $charge->source_type !== $record->source_type ||
                $charge->source_id !== $record->source_id ||
                $record->currency !== $charge->currency
            ) {
                $this->reject(
                    'Cobranca incompativel com a reserva.'
                );
            }

            // Validar o titular real.
            if (
                $record->source_type ===
                SaasCoupon::SCOPE_SAAS
            ) {
                if (
                    $record->customer_type !== 'tenant' ||
                    $record->customer_id !== $source->tenant_id ||
                    $charge->tenant_id !== $source->tenant_id ||
                    $source->status ===
                        SaasSubscription::STATUS_CANCELED
                ) {
                    $this->reject(
                        'Titular ou subscricao incompativel.'
                    );
                }

                $currentSubtotal =
                    (string) $source->price_amount;
            } else {
                if (
                    $record->customer_type !== 'advertiser' ||
                    $record->customer_id !== $source->advertiser_id ||
                    (string) ($charge->tenant_id ?? '') !==
                        (string) ($source->tenant_id ?? '')
                ) {
                    $this->reject(
                        'Anunciante ou empresa incompativel.'
                    );
                }

                $currentSubtotal =
                    (string) $source->subtotal;
            }

            $subtotalCents = $this->cents(
                (string) $record->subtotal_amount
            );

            $discountCents = $this->cents(
                (string) $record->discount_amount
            );

            $totalCents = $subtotalCents - $discountCents;

            if (
                $subtotalCents <= 0 ||
                $discountCents <= 0 ||
                $totalCents < 0 ||
                $this->cents($currentSubtotal) !==
                    $subtotalCents
            ) {
                $this->reject(
                    'Valores da reserva invalidos ou alterados.'
                );
            }

            // Repetir uma ligacao existente nao
            // deve recalcular ou alterar os valores.
            if ($record->billing_charge_id !== null) {
                if (
                    $record->billing_charge_id === $charge->id &&
                    in_array(
                        $record->status,
                        [
                            SaasCouponRedemption::STATUS_RESERVED,
                            SaasCouponRedemption::STATUS_REDEEMED,
                        ],
                        true
                    ) &&
                    $this->cents(
                        (string) $charge->subtotal
                    ) === $subtotalCents &&
                    $this->cents(
                        (string) $charge->discount
                    ) === $discountCents &&
                    $this->cents(
                        (string) $charge->total
                    ) === $totalCents
                ) {
                    return $record;
                }

                $this->reject(
                    'Reserva ja vinculada a outra cobranca.'
                );
            }

            if (
                $record->status !==
                    SaasCouponRedemption::STATUS_RESERVED ||
                $record->reserved_until->lessThanOrEqualTo($at)
            ) {
                $this->reject(
                    'Reserva nao esta ativa.'
                );
            }

            if (
                $charge->status !==
                BillingCharge::STATUS_PENDING
            ) {
                $this->reject(
                    'Cobranca nao esta pendente.'
                );
            }

            // Mesmo pagamentos falhados ou cancelados
            // impedem mudar o preco da cobranca.
            if (
                $charge->payments()->exists() ||
                SaasCouponRedemption::query()
                    ->where(
                        'billing_charge_id',
                        $charge->id
                    )
                    ->exists()
            ) {
                $this->reject(
                    'Cobranca ja utilizada ou com pagamentos emitidos.'
                );
            }

            if (
                $this->cents(
                    (string) $charge->subtotal
                ) !== $subtotalCents ||
                $this->cents(
                    (string) $charge->discount
                ) !== 0 ||
                $this->cents(
                    (string) $charge->total
                ) !== $subtotalCents
            ) {
                $this->reject(
                    'Cobranca ja alterada ou com preco divergente.'
                );
            }

            if ($totalCents === 0) {
                $this->reject(
                    'Desconto integral requer fluxo sem pagamento.'
                );
            }

            if (
                $record->source_type ===
                SaasCoupon::SCOPE_ADS
            ) {
                if (
                    $source->status !== AdOrder::STATUS_PENDING ||
                    $this->cents(
                        (string) $source->discount
                    ) !== 0 ||
                    $this->cents(
                        (string) $source->total
                    ) !== $subtotalCents
                ) {
                    $this->reject(
                        'Pedido publicitario ja alterado.'
                    );
                }
            }

            // Revalidar primeira compra antes de
            // gravar o desconto financeiro.
            if ($coupon->first_payment_only) {
                if (
                    $record->source_type ===
                    SaasCoupon::SCOPE_SAAS
                ) {
                    $previous = BillingCharge::query()
                        ->where(
                            'tenant_id',
                            $record->customer_id
                        )
                        ->where(
                            'source_type',
                            BillingCharge::SOURCE_SAAS_SUBSCRIPTION
                        )
                        ->where(
                            'status',
                            BillingCharge::STATUS_PAID
                        )
                        ->exists();
                } else {
                    $previous = AdOrder::query()
                        ->where(
                            'advertiser_id',
                            $record->customer_id
                        )
                        ->where(
                            'status',
                            AdOrder::STATUS_PAID
                        )
                        ->exists();
                }

                if ($previous) {
                    $this->reject(
                        'Cupao exclusivo da primeira compra.'
                    );
                }
            }

            $discount = $this->money($discountCents);
            $total = $this->money($totalCents);

            // Atualizar a cobranca.
            $charge->discount = $discount;
            $charge->total = $total;
            $charge->save();

            // Manter publicidade sincronizada.
            if (
                $record->source_type ===
                SaasCoupon::SCOPE_ADS
            ) {
                $source->discount = $discount;
                $source->total = $total;
                $source->save();
            }

            // Snapshot da aplicacao do cupao.
            $record->billing_charge_id = $charge->id;

            $record->metadata = array_merge(
                $record->metadata ?? [],
                [
                    'bound_at' =>
                        $at->toIso8601String(),

                    'coupon_code_snapshot' =>
                        $coupon->code,

                    'discount_type_snapshot' =>
                        $coupon->discount_type,

                    'discount_value_snapshot' =>
                        (string) $coupon->discount_value,
                ]
            );

            $record->save();

            return $record->refresh();
        }, 3);
    }

    private function cents(string $amount): int
    {
        if (! preg_match(
            '/\A(0|[1-9][0-9]{0,9})(?:\.([0-9]{1,2}))?\z/',
            $amount,
            $parts
        )) {
            $this->reject(
                'Formato monetario invalido.'
            );
        }

        return (int) $parts[1] * 100 +
            (int) str_pad(
                $parts[2] ?? '',
                2,
                '0'
            );
    }

    private function money(int $cents): string
    {
        return intdiv($cents, 100) . '.' . str_pad(
            (string) ($cents % 100),
            2,
            '0',
            STR_PAD_LEFT
        );
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages([
            'coupon' => $message,
        ]);
    }
}