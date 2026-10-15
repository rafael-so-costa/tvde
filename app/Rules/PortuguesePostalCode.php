<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PortuguesePostalCode implements ValidationRule
{
    public function validate(
        string $attribute,
        mixed $value,
        Closure $fail
    ): void {
        if (! is_string($value)) {
            $fail('O código postal português informado não é válido.');

            return;
        }

        $postalCode = trim(
            $value
        );

        $valid =
            preg_match(
                '/^[1-9]\d{3}-\d{3}$/',
                $postalCode
            ) === 1 ||
            preg_match(
                '/^[1-9]\d{3}\s+\d{3}$/',
                $postalCode
            ) === 1 ||
            preg_match(
                '/^[1-9]\d{6}$/',
                $postalCode
            ) === 1;

        if (! $valid) {
            $fail('O código postal português informado não é válido.');
        }
    }
}
