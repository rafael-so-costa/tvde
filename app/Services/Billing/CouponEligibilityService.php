<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\SaasCoupon;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use InvalidArgumentException;

/**
 * Cotacao de cupoes sem efeitos colaterais.
 *
 * Os contadores sao fornecidos pelo chamador.
 * Este servico nao consulta a base de dados.
 */
final class CouponEligibilityService
{
    public function __construct(
        private readonly CouponDiscountCalculator $calculator
    ) {}

    /**
     * @return array{
     *   code: string,
     *   scope: string,
     *   currency: string,
     *   subtotal: string,
     *   discount: string,
     *   total: string
     * }
     */
    public function quote(
        SaasCoupon $coupon,
        string $scope,
        string $subtotal,
        string $currency,
        int $globalUsageCount,
        int $customerUsageCount,
        int $previousPaidPurchases,
        ?CarbonInterface $at = null
    ): array {
        $at ??= CarbonImmutable::now('UTC');

        if (! in_array(
            $scope,
            [
                SaasCoupon::SCOPE_SAAS,
                SaasCoupon::SCOPE_ADS,
            ],
            true
        )) {
            throw new InvalidArgumentException(
                'Ambito de compra invalido.'
            );
        }

        // A integracao atual esta limitada a EUR.
        if ($currency !== 'EUR') {
            throw new InvalidArgumentException(
                'Apenas EUR e suportado nesta etapa.'
            );
        }

        foreach (
            [
                $globalUsageCount,
                $customerUsageCount,
                $previousPaidPurchases,
            ] as $count
        ) {
            if ($count < 0) {
                throw new InvalidArgumentException(
                    'Contagens de utilizacao invalidas.'
                );
            }
        }

        if (! $coupon->enabled) {
            throw new InvalidArgumentException(
                'Cupao inativo.'
            );
        }

        if (! in_array(
            $coupon->applies_to,
            [
                $scope,
                SaasCoupon::SCOPE_BOTH,
            ],
            true
        )) {
            throw new InvalidArgumentException(
                'Cupao nao aplicavel a este produto.'
            );
        }

        if (
            $coupon->starts_at !== null &&
            $coupon->expires_at !== null &&
            $coupon->starts_at->greaterThanOrEqualTo(
                $coupon->expires_at
            )
        ) {
            throw new InvalidArgumentException(
                'Periodo de validade mal configurado.'
            );
        }

        if (
            $coupon->starts_at !== null &&
            $at->lessThan($coupon->starts_at)
        ) {
            throw new InvalidArgumentException(
                'Cupao ainda nao iniciado.'
            );
        }

        // O instante de expiracao e exclusivo.
        if (
            $coupon->expires_at !== null &&
            $at->greaterThanOrEqualTo(
                $coupon->expires_at
            )
        ) {
            throw new InvalidArgumentException(
                'Cupao expirado.'
            );
        }

        if (
            $coupon->max_redemptions !== null &&
            (
                $coupon->max_redemptions < 1 ||
                $globalUsageCount >=
                    $coupon->max_redemptions
            )
        ) {
            throw new InvalidArgumentException(
                'Limite global do cupao atingido ou invalido.'
            );
        }

        if (
            $coupon->max_per_customer !== null &&
            (
                $coupon->max_per_customer < 1 ||
                $customerUsageCount >=
                    $coupon->max_per_customer
            )
        ) {
            throw new InvalidArgumentException(
                'Limite do cliente atingido ou invalido.'
            );
        }

        if (
            $coupon->first_payment_only &&
            $previousPaidPurchases > 0
        ) {
            throw new InvalidArgumentException(
                'Cupao exclusivo da primeira compra.'
            );
        }

        $subtotalCents = $this->moneyToCents(
            $subtotal
        );

        if ($subtotalCents < 1) {
            throw new InvalidArgumentException(
                'Subtotal deve ser positivo.'
            );
        }

        if (
            $coupon->min_subtotal !== null &&
            $subtotalCents < $this->moneyToCents(
                (string) $coupon->min_subtotal
            )
        ) {
            throw new InvalidArgumentException(
                'Subtotal inferior ao minimo do cupao.'
            );
        }

        $amounts = $this->calculator->calculate(
            $subtotal,
            (string) $coupon->discount_type,
            (string) $coupon->discount_value
        );

        return [
            'code' => (string) $coupon->code,
            'scope' => $scope,
            'currency' => $currency,
            ...$amounts,
        ];
    }

    private function moneyToCents(
        string $money
    ): int {
        if (! preg_match(
            '/\A(0|[1-9][0-9]{0,9})(?:\.([0-9]{1,2}))?\z/',
            $money,
            $matches
        )) {
            throw new InvalidArgumentException(
                'Montante monetario invalido.'
            );
        }

        return (int) $matches[1] * 100 +
            (int) str_pad(
                $matches[2] ?? '',
                2,
                '0'
            );
    }
}