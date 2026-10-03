<?php

namespace App\Console\Commands;

use App\Models\NifEnrichmentBatch;
use App\Models\NifLookupAttempt;
use App\Services\NifEnrichmentBatchService;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;

class ProcessNifEnrichmentBatches extends Command
{
    private const MAX_EXTERNAL_PER_MINUTE = 1;

    private const MAX_EXTERNAL_PER_HOUR = 8;

    private const MAX_EXTERNAL_PER_DAY = 90;

    private const MAX_EXTERNAL_PER_30_DAYS = 900;

    protected $signature = 'nif:batches:process
                            {--batch= : UUID de um lote específico}';

    protected $description = 'Processa de forma controlada os lotes pendentes de enriquecimento NIF.PT';

    public function handle(
        NifEnrichmentBatchService $batches
    ): int {
        $lock = Cache::lock(
            'nif-pt-batch-processor',
            300
        );

        if (! $lock->get()) {
            $this->info(
                'Já existe um processamento de lote NIF.PT em execução.'
            );

            return self::SUCCESS;
        }

        try {
            $limit = $this->limitReached();

            if ($limit !== null) {
                $this->info(
                    "Processamento adiado: {$limit}"
                );

                return self::SUCCESS;
            }

            $batchId = $this->option(
                'batch'
            );

            if ($batchId) {
                $batch =
                    NifEnrichmentBatch::query()
                        ->find(
                            $batchId
                        );

                if (! $batch) {
                    $this->error(
                        'Lote de enriquecimento não encontrado.'
                    );

                    return self::FAILURE;
                }

                $batch =
                    $batches->processBatch(
                        $batch
                    );
            } else {
                $batch =
                    $batches->processNextBatch();
            }

            if (! $batch) {
                $this->info(
                    'Não existem lotes NIF.PT pendentes.'
                );

                return self::SUCCESS;
            }

            $this->info(
                sprintf(
                    'Lote %s: %s | %d/%d concluídos | %d cache | %d externos | %d erros | %d ignorados.',
                    $batch->id,
                    $batch->status,
                    $batch->success_items,
                    $batch->total_items,
                    $batch->cache_hits,
                    $batch->external_lookups,
                    $batch->error_items,
                    $batch->skipped_items
                )
            );

            return self::SUCCESS;
        } finally {
            $lock->release();
        }
    }

    private function limitReached(): ?string
    {
        $minute =
            $this->externalAttemptsSince(
                now()->subMinute()
            );

        if (
            $minute >=
            self::MAX_EXTERNAL_PER_MINUTE
        ) {
            return 'já ocorreu uma consulta externa no último minuto.';
        }

        $hour =
            $this->externalAttemptsSince(
                now()->subHour()
            );

        if (
            $hour >=
            self::MAX_EXTERNAL_PER_HOUR
        ) {
            return sprintf(
                'limite operacional horário atingido (%d/%d).',
                $hour,
                self::MAX_EXTERNAL_PER_HOUR
            );
        }

        $day =
            $this->externalAttemptsSince(
                now()->subDay()
            );

        if (
            $day >=
            self::MAX_EXTERNAL_PER_DAY
        ) {
            return sprintf(
                'limite operacional de 24 horas atingido (%d/%d).',
                $day,
                self::MAX_EXTERNAL_PER_DAY
            );
        }

        $month =
            $this->externalAttemptsSince(
                now()->subDays(
                    30
                )
            );

        if (
            $month >=
            self::MAX_EXTERNAL_PER_30_DAYS
        ) {
            return sprintf(
                'limite operacional de 30 dias atingido (%d/%d).',
                $month,
                self::MAX_EXTERNAL_PER_30_DAYS
            );
        }

        return null;
    }

    private function externalAttemptsSince(
        $since
    ): int {
        return NifLookupAttempt::query()
            ->where(
                'requested_at',
                '>=',
                $since
            )
            ->where(
                function (
                    Builder $query
                ): void {
                    /*
                     * Um http_status indica uma resposta do fornecedor.
                     *
                     * Erros sem http_status também contam porque podem
                     * representar uma tentativa de rede que falhou antes
                     * de existir resposta HTTP.
                     *
                     * NIF inválido apenas localmente não entra nesta conta.
                     */
                    $query
                        ->whereNotNull(
                            'http_status'
                        )
                        ->orWhere(
                            'status',
                            NifLookupAttempt::STATUS_ERROR
                        );
                }
            )
            ->count();
    }
}
