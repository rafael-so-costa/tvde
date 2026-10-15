<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PortugueseIban implements ValidationRule
{
    public function validate(
        string $attribute,
        mixed $value,
        Closure $fail
    ): void {
        $iban = $this->normalize($value);

        if (
            $iban === null ||
            ! $this->hasValidChecksum($iban)
        ) {
            $fail('O IBAN português informado não é válido.');
        }
    }

    private function normalize(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $iban = mb_strtoupper(
            trim($value)
        );

        $iban = preg_replace(
            '/\s+/u',
            '',
            $iban
        );

        if (
            $iban === null ||
            ! preg_match(
                '/^PT50\d{21}$/',
                $iban
            )
        ) {
            return null;
        }

        return $iban;
    }

    private function hasValidChecksum(
        string $iban
    ): bool {
        $rearranged =
            substr($iban, 4).
            substr($iban, 0, 4);

        $numeric = '';

        foreach (
            str_split($rearranged) as $character
        ) {
            if (
                ctype_alpha(
                    $character
                )
            ) {
                $numeric .= (string) (
                    ord($character) - 55
                );

                continue;
            }

            $numeric .= $character;
        }

        $remainder = 0;

        foreach (
            str_split($numeric) as $digit
        ) {
            $remainder =
                (
                    $remainder * 10 +
                    (int) $digit
                ) % 97;
        }

        return $remainder === 1;
    }
}
