<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * FROTAPRO_4R14B4X
 *
 * Evita que campos RGPD sejam enviados para
 * uma tabela empresas ainda sem a migration.
 *
 * Nunca descarta silenciosamente informacao
 * de privacidade preenchida.
 */
final class EmpresaRgpdSchemaGuard
{
    public const COLUMNS = [
        'privacidade_contacto_email',
        'privacidade_contacto_telefone',
        'privacidade_epd_nome',
        'privacidade_epd_email',
        'privacidade_destinatarios',
        'privacidade_subcontratantes',
        'privacidade_prazo_identificacao',
        'privacidade_prazo_contratos',
        'privacidade_prazo_fiscal',
        'privacidade_prazo_operacional',
        'privacidade_prazo_consentimentos',
        'privacidade_prazo_localizacao',
        'privacidade_transferencias_internacionais',
        'privacidade_decisoes_automatizadas',
        'privacidade_finalidade_localizacao',
        'privacidade_finalidade_dados_especiais',
        'privacidade_categorias_dados_especiais',
        'privacidade_condicao_artigo9',
    ];

    public function available(): bool
    {
        $columns = Schema::getColumnListing('empresas');

        return array_diff(
            self::COLUMNS,
            $columns
        ) === [];
    }

    public function filterPayload(array $payload): array
    {
        return $this->filterForAvailability(
            $payload,
            $this->available()
        );
    }

    public function filterForAvailability(
        array $payload,
        bool $available
    ): array {
        if ($available) {
            return $payload;
        }

        $errors = [];

        foreach (self::COLUMNS as $field) {
            if (
                array_key_exists($field, $payload) &&
                filled($payload[$field])
            ) {
                $errors[$field] =
                    'Os campos RGPD ainda nao estao ' .
                    'disponiveis nesta base de dados.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages(
                $errors
            );
        }

        return array_diff_key(
            $payload,
            array_fill_keys(
                self::COLUMNS,
                true
            )
        );
    }
}