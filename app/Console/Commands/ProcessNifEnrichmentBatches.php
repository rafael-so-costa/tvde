<?php

namespace App\Console\Commands;

use App\Models\NifEnrichmentBatch;
use App\Services\NifEnrichmentBatchService;
use App\Services\NifPtUsageGuard;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ProcessNifEnrichmentBatches extends Command
{
    protected $signature = 'nif:batches:process
                            {--batch= : UUID de um lote específico}';

    protected $description = 'Processa de forma controlada os lotes pendentes de enriquecimento NIF.PT';

    public function handle(
        NifEnrichmentBatchService $batches,
        NifPtUsageGuard $guard
    ): int {
        $lock = $guard->lock();

        if (! $lock->get()) {
            $this->info(
                'Já existe um processamento NIF.PT em execução.'
            );

            return self::SUCCESS;
        }

        try {
            $limit = $guard->blockReason();

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
                $batch = NifEnrichmentBatch::query()
                    ->find(
                        $batchId
                    );

                if (! $batch) {
                    $this->error(
                        'Lote de enriquecimento não encontrado.'
                    );

                    return self::FAILURE;
                }

                $batch = $batches->processBatch(
                    $batch
                );
            } else {
                $batch = $batches
                    ->processNextBatch();
            }

            if (! $batch) {
                $this->info(
                    'Não existem lotes NIF.PT pendentes.'
                );

                return self::SUCCESS;
            }

            $message = sprintf(
                'Lote %s: %s | %d/%d concluídos | %d cache | %d externos | %d erros | %d ignorados.',
                $batch->id,
                $batch->status,
                $batch->success_items,
                $batch->total_items,
                $batch->cache_hits,
                $batch->external_lookups,
                $batch->error_items,
                $batch->skipped_items
            );

            $this->info(
                $message
            );

            Log::info(
                'Ciclo automático de enriquecimento NIF.PT executado.',
                [
                    'batch_id' => $batch->id,
                    'status' => $batch->status,
                    'total_items' => $batch->total_items,
                    'success_items' => $batch->success_items,
                    'pending_items' => $batch->pending_items,
                    'cache_hits' => $batch->cache_hits,
                    'external_lookups' => $batch->external_lookups,
                    'error_items' => $batch->error_items,
                    'skipped_items' => $batch->skipped_items,
                ]
            );

            return self::SUCCESS;
        } finally {
            $lock->release();
        }
    }
}
