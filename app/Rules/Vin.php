<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class Vin implements ValidationRule
{
    public function validate(
        string $attribute,
        mixed $value,
        Closure $fail
    ): void {
        $vin = $this->normalize($value);

        if (
            $vin === null ||
            ! preg_match(
                '/^[A-HJ-NPR-Z0-9]{17}$/',
                $vin
            )
        ) {
            $fail('O VIN/chassis informado não é válido.');
        }
    }

    private function normalize(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $vin = mb_strtoupper(
            trim($value)
        );

        $vin = preg_replace(
            '/\s+/u',
            '',
            $vin
        );

        if (
            $vin === null ||
            strlen($vin) !== 17
        ) {
            return null;
        }

        return $vin;
    }
}
