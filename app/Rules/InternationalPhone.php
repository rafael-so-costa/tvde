<?php

declare(strict_types=1);

namespace App\Rules;

use App\Support\PhoneNormalizer;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class InternationalPhone implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (PhoneNormalizer::toE164($value) === null) {
            $fail('Introduza um numero valido com indicativo internacional (ex.: +351912345678).');
        }
    }
}