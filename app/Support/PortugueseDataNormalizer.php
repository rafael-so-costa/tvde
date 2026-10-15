<?php

namespace App\Support;

class PortugueseDataNormalizer
{
    public static function nif(mixed $value): ?string
    {
        if (! is_string($value) && ! is_int($value)) {
            return null;
        }

        $value = mb_strtoupper(
            trim((string) $value)
        );

        if ($value === '') {
            return null;
        }

        if (str_starts_with($value, 'PT')) {
            $value = substr($value, 2);
        }

        return preg_replace(
            '/[\s.\-]+/u',
            '',
            $value
        );
    }

    public static function iban(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = mb_strtoupper(
            trim($value)
        );

        if ($value === '') {
            return null;
        }

        return preg_replace(
            '/\s+/u',
            '',
            $value
        );
    }

    public static function phone(mixed $value): ?string
    {
        if (! is_string($value) && ! is_int($value)) {
            return null;
        }

        $value = trim(
            (string) $value
        );

        if ($value === '') {
            return null;
        }

        $value = preg_replace(
            '/[\s().\-]+/u',
            '',
            $value
        );

        if ($value === null) {
            return null;
        }

        if (str_starts_with($value, '+351')) {
            return substr($value, 4);
        }

        if (str_starts_with($value, '00351')) {
            return substr($value, 5);
        }

        return $value;
    }

    public static function postalCode(mixed $value): ?string
    {
        if (! is_string($value) && ! is_int($value)) {
            return null;
        }

        $value = trim(
            (string) $value
        );

        if ($value === '') {
            return null;
        }

        $compact = preg_replace(
            '/[\s\-]+/u',
            '',
            $value
        );

        if (
            $compact !== null &&
            preg_match('/^\d{7}$/', $compact)
        ) {
            return substr($compact, 0, 4).
                '-'.
                substr($compact, 4, 3);
        }

        return $value;
    }

    public static function email(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = mb_strtolower(
            trim($value)
        );

        return $value !== ''
            ? $value
            : null;
    }
}
