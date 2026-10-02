<?php

namespace App\Console\Commands;

use App\Models\NifEnrichment;
use App\Models\NifLookupAttempt;
use App\Services\NifPtService;
use Illuminate\Console\Command;
use Throwable;

class LookupNifPt extends Command
{
    protected $signature =
        'nif:lookup
        {nif : NIF português com 9 dígitos}
        {--force : Ignora o cache e força nova consulta ao NIF.PT}';

    protected $description =
        'Consulta e guarda dados de um NIF através do NIF.PT';

    public function handle(
        NifPtService $service
    ): int {
        try {
            $enrichment =
                $service->lookup(
                    (string) $this->argument(
                        'nif'
                    ),
                    (bool) $this->option(
                        'force'
                    )
                );
        } catch (Throwable $exception) {
            $this->error(
                $exception->getMessage()
            );

            return self::FAILURE;
        }

        $attempt =
            $enrichment
                ->attempts()
                ->latest(
                    'requested_at'
                )
                ->latest(
                    'created_at'
                )
                ->first();

        $this->table(
            [
                'Campo',
                'Resultado',
            ],
            [
                [
                    'NIF',
                    $enrichment->nif,
                ],
                [
                    'Estado',
                    $this->statusLabel(
                        $enrichment
                            ->lookup_status
                    ),
                ],
                [
                    'Origem',
                    $attempt?->status ===
                        NifLookupAttempt::STATUS_CACHE_HIT
                        ? 'Cache local'
                        : 'NIF.PT',
                ],
                [
                    'Nome',
                    $enrichment->title
                        ?? '—',
                ],
                [
                    'Morada',
                    $enrichment->address
                        ?? '—',
                ],
                [
                    'Código postal',
                    $this->postalCode(
                        $enrichment
                    ),
                ],
                [
                    'Localidade',
                    $enrichment->city
                        ?? '—',
                ],
                [
                    'CAE',
                    $enrichment->cae
                        ?? '—',
                ],
                [
                    'Estado empresa',
                    $enrichment
                        ->company_status
                        ?? '—',
                ],
                [
                    'Consultas externas',
                    (string) $enrichment
                        ->lookup_count,
                ],
                [
                    'Última consulta',
                    $enrichment
                        ->last_looked_up_at
                        ?->format(
                            'd/m/Y H:i:s'
                        )
                        ?? '—',
                ],
                [
                    'Último sucesso',
                    $enrichment
                        ->last_success_at
                        ?->format(
                            'd/m/Y H:i:s'
                        )
                        ?? '—',
                ],
            ]
        );

        if (
            $enrichment->last_error
        ) {
            $this->warn(
                $enrichment->last_error
            );
        }

        if (
            $enrichment->lookup_status ===
            NifEnrichment::STATUS_INVALID
        ) {
            return self::FAILURE;
        }

        if (
            $enrichment->lookup_status ===
            NifEnrichment::STATUS_ERROR
        ) {
            return self::FAILURE;
        }

        $this->info(
            $attempt?->status ===
                NifLookupAttempt::STATUS_CACHE_HIT
                ? 'Dados obtidos do cache local.'
                : 'Consulta concluída.'
        );

        return self::SUCCESS;
    }

    private function statusLabel(
        string $status
    ): string {
        return match ($status) {
            NifEnrichment::STATUS_SUCCESS => 'Sucesso',

            NifEnrichment::STATUS_NOT_FOUND => 'Não encontrado',

            NifEnrichment::STATUS_INVALID => 'NIF inválido',

            NifEnrichment::STATUS_ERROR => 'Erro',

            default => $status,
        };
    }

    private function postalCode(
        NifEnrichment $enrichment
    ): string {
        if (
            ! $enrichment->pc4 &&
            ! $enrichment->pc3
        ) {
            return '—';
        }

        return implode(
            '-',
            array_filter([
                $enrichment->pc4,
                $enrichment->pc3,
            ])
        );
    }
}
