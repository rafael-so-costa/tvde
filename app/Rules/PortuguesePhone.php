<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PortuguesePhone implements ValidationRule
{
    public function validate(
        string $attribute,
        mixed $value,
        Closure $fail
    ): void {
        $phone = $this->normalize($value);

        if (
            $phone === null ||
            ! preg_match(
                '/^[2-9]\d{8}$/',
                $phone
            )
        ) {
            $fail('O número de telefone português informado não é válido.');
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

        $phone = trim(
            (string) $value
        );

        $phone = preg_replace(
            '/[\s().\-]+/u',
            '',
            $phone
        );

        if ($phone === null) {
            return null;
        }

        if (
            str_starts_with(
                $phone,
                '+351'
            )
        ) {
            $phone = substr(
                $phone,
                4
            );
        } elseif (
            str_starts_with(
                $phone,
                '00351'
            )
        ) {
            $phone = substr(
                $phone,
                5
            );
        }

        return $phone;
    }
}
