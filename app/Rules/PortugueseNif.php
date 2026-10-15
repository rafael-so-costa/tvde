<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PortugueseNif implements ValidationRule
{
    public function validate(
        string $attribute,
        mixed $value,
        Closure $fail
    ): void {
        $nif = $this->normalize($value);

        if (
            $nif === null ||
            ! $this->hasValidChecksum($nif)
        ) {
            $fail('O NIF/NIPC informado não é válido.');
        }
    }

    private function normalize(mixed $value): ?string
    {
        if (
            ! is_string($value) &&
            ! is_int($value)
        ) {
            return null;
        }

        $value = mb_strtoupper(
            trim((string) $value)
        );

        if (
            str_starts_with(
                $value,
                'PT'
            )
        ) {
            $value = substr(
                $value,
                2
            );
        }

        $value = preg_replace(
            '/[\s.\-]+/u',
            '',
            $value
        );

        if (
            $value === null ||
            ! preg_match(
                '/^\d{9}$/',
                $value
            )
        ) {
            return null;
        }

        return $value;
    }

    private function hasValidChecksum(
        string $nif
    ): bool {
        if (
            count(
                array_unique(
                    str_split($nif)
                )
            ) === 1
        ) {
            return false;
        }

        $sum = 0;

        for (
            $index = 0;
            $index < 8;
            $index++
        ) {
            $sum +=
                (int) $nif[$index] *
                (9 - $index);
        }

        $checkDigit =
            11 -
            ($sum % 11);

        if (
            $checkDigit >= 10
        ) {
            $checkDigit = 0;
        }

        return
            (int) $nif[8] ===
            $checkDigit;
    }
}
