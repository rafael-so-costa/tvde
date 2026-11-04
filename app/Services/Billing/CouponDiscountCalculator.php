<?php

declare(strict_types=1);

namespace App\Services\Billing;

use InvalidArgumentException;

/**
 * Calcula descontos em centimos inteiros.
 *
 * Nao altera cobrancas, pagamentos ou BD.
 */
final class CouponDiscountCalculator
{
    /**
     * @return array{
     *     subtotal: string,
     *     discount: string,
     *     total: string
     * }
     */
    public function calculate(
        string $subtotal,
        string $type,
        string $value
    ): array {
        $subtotalCents = $this->parseDecimal(
            $subtotal,
            'subtotal'
        );

        if ($subtotalCents <= 0) {
            throw new InvalidArgumentException(
                'O subtotal deve ser superior a zero.'
            );
        }

        if ($type === 'fixed') {
            $discountCents = $this->parseDecimal(
                $value,
                'value'
            );

            if ($discountCents <= 0) {
                throw new InvalidArgumentException(
                    'O desconto fixo deve ser superior a zero.'
                );
            }
        } elseif ($type === 'percentage') {
            $basisPoints = $this->parseDecimal(
                $value,
                'value'
            );

            if (
                $basisPoints <= 0 ||
                $basisPoints > 10000
            ) {
                throw new InvalidArgumentException(
                    'A percentagem deve estar entre 0,01 e 100,00.'
                );
            }

            // Arredondamento half-up para centimos.
            $discountCents = intdiv(
                $subtotalCents * $basisPoints + 5000,
                10000
            );
        } else {
            throw new InvalidArgumentException(
                'Tipo de desconto desconhecido.'
            );
        }

        // Impede totais negativos.
        $discountCents = min(
            $subtotalCents,
            $discountCents
        );

        return [
            'subtotal' => $this->formatCents(
                $subtotalCents
            ),
            'discount' => $this->formatCents(
                $discountCents
            ),
            'total' => $this->formatCents(
                $subtotalCents - $discountCents
            ),
        ];
    }

    private function parseDecimal(
        string $value,
        string $field
    ): int {
        if (
            ! preg_match(
                '/\A(0|[1-9][0-9]{0,9})(?:\.([0-9]{1,2}))?\z/',
                $value,
                $matches
            )
        ) {
            throw new InvalidArgumentException(
                "Valor decimal invalido: {$field}."
            );
        }

        return (
            (int) $matches[1] * 100
        ) + (int) str_pad(
            $matches[2] ?? '',
            2,
            '0'
        );
    }

    private function formatCents(
        int $cents
    ): string {
        return intdiv(
            $cents,
            100
        ) . '.' . str_pad(
            (string) ($cents % 100),
            2,
            '0',
            STR_PAD_LEFT
        );
    }
}