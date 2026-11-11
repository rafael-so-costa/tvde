<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Str;

/**
 * FROTAPRO_4R14B4W
 *
 * Identificadores RGPD 1.1 aceites:
 *
 * - v1-1: identificador do catalogo documental
 * - v11: identificador legado de integracao
 *
 * Aceitar o slug NAO autoriza publicacao.
 * Revisao juridica, integridade e publicacao
 * continuam a ser validadas separadamente.
 */
final class FrotaProRgpdV11ModelSlug
{
    public const CATALOG =
        'informacao-tratamento-dados-rgpd-v1-1';

    public const LEGACY =
        'informacao-tratamento-dados-rgpd-v11';

    public static function matches(
        ?string $slug
    ): bool {
        return in_array(
            Str::slug((string) $slug),
            [
                self::CATALOG,
                self::LEGACY,
            ],
            true
        );
    }
}