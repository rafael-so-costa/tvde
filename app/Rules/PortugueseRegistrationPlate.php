<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PortugueseRegistrationPlate implements ValidationRule
{
    public function validate(
        string $attribute,
        mixed $value,
        Closure $fail
    ): void {
        $plate = $this->normalize($value);

        if (
            $plate === null ||
            ! preg_match(
                '/^(?:[A-Z]{2}\d{4}|\d{4}[A-Z]{2}|\d{2}[A-Z]{2}\d{2}|[A-Z]{2}\d{2}[A-Z]{2})$/',
                $plate
            )
        ) {
            $fail('A matrícula portuguesa informada não é válida.');
        }
    }

    private function normalize(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $plate = mb_strtoupper(
            trim($value)
        );

        $plate = preg_replace(
            '/[\s\-]+/u',
            '',
            $plate
        );

        if (
            $plate === null ||
            strlen($plate) !== 6
        ) {
            return null;
        }

        return $plate;
    }
}
