<?php

declare(strict_types=1);

namespace App\Support;

/** Normalizacao sintatica E.164, com regra especifica para numeros PT. */
final class PhoneNormalizer
{
    public static function toE164(mixed $input): ?string
    {
        if (!is_string($input) && !is_int($input)) {
            return null;
        }

        $value = trim((string) $input);
        if ($value === '') {
            return null;
        }

        $compact = preg_replace('/[\s().-]+/u', '', $value);
        if (!is_string($compact) || $compact === '') {
            return null;
        }

        if (preg_match('/^[2-9]\d{8}$/D', $compact)) {
            $compact = '+351' . $compact;
        } elseif (str_starts_with($compact, '00')) {
            $compact = '+' . substr($compact, 2);
        }

        // Nao adivinhar o indicativo de sequencias numericas estrangeiras.
        if (!preg_match('/^\+[1-9]\d{7,14}$/D', $compact)) {
            return null;
        }

        // Comprimento e inicio de numeracao de Portugal (indicativo +351).
        if (str_starts_with($compact, '+351') &&
            !preg_match('/^\+351[2-9]\d{8}$/D', $compact)) {
            return null;
        }

        return $compact;
    }
}