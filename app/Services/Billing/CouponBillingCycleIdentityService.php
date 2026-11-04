<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\AdOrder;
use App\Models\BillingCharge;
use App\Models\SaasCoupon;
use App\Models\SaasSubscription;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Identidade canonica de uma compra com cupao.
 *
 * A identidade corresponde a uma cobranca concreta,
 * nao apenas a subscricao a que pertence.
 *
 * O chamador deve carregar os modelos diretamente
 * da BD. Nunca confiar em modelos enviados pelo cliente.
 */
final class CouponBillingCycleIdentityService
{
    public function subscription(
        BillingCharge $charge,
        SaasSubscription $subscription
    ): array {
        $this->validateCharge(
            $charge,
            SaasCoupon::SCOPE_SAAS,
            (string) $subscription->id
        );

        if (
            ! Str::isUuid((string) $subscription->tenant_id) ||
            (string) $charge->tenant_id !==
                (string) $subscription->tenant_id ||
            $subscription->status ===
                SaasSubscription::STATUS_CANCELED
        ) {
            $this->reject(
                'Empresa ou subscricao incompativel.'
            );
        }

        $start = $charge->period_start;
        $end = $charge->period_end;

        if (
            $start === null ||
            $end === null ||
            ! $start->lessThan($end)
        ) {
            $this->reject(
                'Periodo de cobranca invalido.'
            );
        }

        $expectedKey = implode(':', [
            BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
            $subscription->id,
            $start->format('YmdHis'),
            $end->format('YmdHis'),
        ]);

        if (
            (string) $charge->idempotency_key !==
            $expectedKey
        ) {
            $this->reject(
                'Chave do periodo nao corresponde a cobranca.'
            );
        }

        $this->validateMoney(
            $charge,
            (string) $subscription->price_amount,
            (string) ($subscription->currency ?: 'EUR')
        );

        return [
            'scope' => SaasCoupon::SCOPE_SAAS,
            'source_id' => (string) $subscription->id,
            'billing_charge_id' => (string) $charge->id,
            'purchase_key' => 'charge:' . $charge->id,
            'customer_type' => 'tenant',
            'customer_id' =>
                (string) $subscription->tenant_id,
            'period_start' => $start->toDateTimeString(),
            'period_end' => $end->toDateTimeString(),
        ];
    }

    public function adOrder(
        BillingCharge $charge,
        AdOrder $order
    ): array {
        $this->validateCharge(
            $charge,
            SaasCoupon::SCOPE_ADS,
            (string) $order->id
        );

        if (
            ! Str::isUuid((string) $order->advertiser_id) ||
            (string) ($charge->tenant_id ?? '') !==
                (string) ($order->tenant_id ?? '') ||
            $order->status !== AdOrder::STATUS_PENDING
        ) {
            $this->reject(
                'Anunciante ou encomenda incompativel.'
            );
        }

        if (
            $charge->period_start !== null ||
            $charge->period_end !== null
        ) {
            $this->reject(
                'Encomenda publicitaria nao deve possuir ciclo SaaS.'
            );
        }

        $expectedKey =
            BillingCharge::SOURCE_AD_ORDER .
            ':' .
            $order->id;

        if (
            (string) $charge->idempotency_key !==
            $expectedKey
        ) {
            $this->reject(
                'Chave da encomenda invalida.'
            );
        }

        $this->validateMoney(
            $charge,
            (string) $order->subtotal,
            (string) ($order->currency ?: 'EUR')
        );

        if (
            $this->cents((string) $order->discount) !== 0 ||
            $this->cents((string) $order->total) !==
                $this->cents((string) $order->subtotal)
        ) {
            $this->reject(
                'Encomenda publicitaria ja possui desconto.'
            );
        }

        return [
            'scope' => SaasCoupon::SCOPE_ADS,
            'source_id' => (string) $order->id,
            'billing_charge_id' => (string) $charge->id,
            'purchase_key' => 'charge:' . $charge->id,
            'customer_type' => 'advertiser',
            'customer_id' => (string) $order->advertiser_id,
            'period_start' => null,
            'period_end' => null,
        ];
    }

    private function validateCharge(
        BillingCharge $charge,
        string $scope,
        string $sourceId
    ): void {
        if (
            ! Str::isUuid((string) $charge->id) ||
            ! Str::isUuid($sourceId) ||
            $charge->source_type !== $scope ||
            (string) $charge->source_id !== $sourceId ||
            $charge->status !== BillingCharge::STATUS_PENDING
        ) {
            $this->reject(
                'Cobranca nao elegivel ou origem incompativel.'
            );
        }
    }

    private function validateMoney(
        BillingCharge $charge,
        string $sourceSubtotal,
        string $sourceCurrency
    ): void {
        $subtotal = $this->cents(
            (string) $charge->subtotal
        );

        if (
            $subtotal <= 0 ||
            $this->cents((string) $charge->discount) !== 0 ||
            $this->cents((string) $charge->total) !== $subtotal ||
            $this->cents($sourceSubtotal) !== $subtotal ||
            $charge->currency !== 'EUR' ||
            $sourceCurrency !== 'EUR'
        ) {
            $this->reject(
                'Valores ou moeda da cobranca incompativeis.'
            );
        }
    }

    private function cents(string $value): int
    {
        if (! preg_match(
            '/\A(0|[1-9][0-9]{0,9})(?:\.([0-9]{1,2}))?\z/',
            $value,
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

    private function reject(string $message): never
    {
        throw ValidationException::withMessages([
            'coupon' => $message,
        ]);
    }
}