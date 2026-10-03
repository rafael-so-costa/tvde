<?php

namespace App\Services;

use App\Models\NifEnrichment;
use App\Models\NifEnrichmentBatch;
use App\Models\NifEnrichmentBatchItem;
use App\Models\NifLookupAttempt;
use App\Models\TvdeOperator;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class NifEnrichmentBatchService
{
    public function __construct(
        private readonly NifPtService $nifPtService
    ) {}

    public function create(
        array $operatorIds,
        bool $forceRefresh = false,
        ?string $name = null,
        ?User $actor = null
    ): NifEnrichmentBatch {
        return DB::transaction(
            function () use (
                $operatorIds,
                $forceRefresh,
                $name,
                $actor
            ): NifEnrichmentBatch {
                $operatorIds =
                    array_values(
                        array_unique(
                            $operatorIds
                        )
                    );

                $operators =
                    TvdeOperator::query()
                        ->whereIn(
                            'id',
                            $operatorIds
                        )
                        ->orderBy(
                            'display_name'
                        )
                        ->get();

                if (
                    $operators->count() !==
                    count(
                        $operatorIds
                    )
                ) {
                    throw ValidationException::withMessages([
                        'operator_ids' => 'Um ou mais operadores selecionados já não estão disponíveis.',
                    ]);
                }

                $enrichments =
                    NifEnrichment::query()
                        ->whereIn(
                            'nif',
                            $operators
                                ->pluck('nif')
                        )
                        ->get()
                        ->keyBy(
                            'nif'
                        );

                $batch =
                    NifEnrichmentBatch::create([
                        'created_by_user_id' => $actor?->id,

                        'name' => $name
                            ?: 'Enriquecimento NIF.PT '.now()
                                ->format(
                                    'd/m/Y H:i'
                                ),

                        'status' => NifEnrichmentBatch::STATUS_PENDING,

                        'force_refresh' => $forceRefresh,

                        'total_items' => $operators->count(),

                        'pending_items' => $operators->count(),

                        'processing_items' => 0,

                        'success_items' => 0,

                        'error_items' => 0,

                        'skipped_items' => 0,

                        'cache_hits' => 0,

                        'external_lookups' => 0,

                        'metadata' => [
                            'provider' => NifEnrichment::PROVIDER_NIF_PT,

                            'operator_count' => $operators
                                ->count(),
                        ],
                    ]);

                foreach (
                    $operators as $operator
                ) {
                    $enrichment =
                        $enrichments->get(
                            $operator->nif
                        );

                    NifEnrichmentBatchItem::create([
                        'nif_enrichment_batch_id' => $batch->id,

                        'tvde_operator_id' => $operator->id,

                        'nif_enrichment_id' => $enrichment?->id,

                        'nif' => $operator->nif,

                        'status' => NifEnrichmentBatchItem::STATUS_PENDING,

                        'used_cache' => false,

                        'external_lookup' => false,

                        'attempt_count' => 0,
                    ]);
                }

                return $this->loadBatch(
                    $batch
                );
            }
        );
    }

    public function cancel(
        NifEnrichmentBatch $batch
    ): NifEnrichmentBatch {
        if (
            in_array(
                $batch->status,
                [
                    NifEnrichmentBatch::STATUS_COMPLETED,
                    NifEnrichmentBatch::STATUS_PARTIAL,
                    NifEnrichmentBatch::STATUS_ERROR,
                    NifEnrichmentBatch::STATUS_CANCELED,
                ],
                true
            )
        ) {
            return $this->loadBatch(
                $batch
            );
        }

        DB::transaction(
            function () use (
                $batch
            ): void {
                NifEnrichmentBatchItem::query()
                    ->where(
                        'nif_enrichment_batch_id',
                        $batch->id
                    )
                    ->whereIn(
                        'status',
                        [
                            NifEnrichmentBatchItem::STATUS_PENDING,
                            NifEnrichmentBatchItem::STATUS_PROCESSING,
                        ]
                    )
                    ->update([
                        'status' => NifEnrichmentBatchItem::STATUS_SKIPPED,

                        'error_message' => 'Lote cancelado.',

                        'processed_at' => now(),
                    ]);

                $batch->status =
                    NifEnrichmentBatch::STATUS_CANCELED;

                $batch->canceled_at =
                    now();

                $batch->completed_at =
                    now();

                $batch->save();
            }
        );

        $this->refreshCounters(
            $batch
        );

        return $this->loadBatch(
            $batch
        );
    }

    public function processNextBatch(): ?NifEnrichmentBatch
    {
        $batch =
            NifEnrichmentBatch::query()
                ->whereIn(
                    'status',
                    [
                        NifEnrichmentBatch::STATUS_PENDING,
                        NifEnrichmentBatch::STATUS_PROCESSING,
                    ]
                )
                ->orderBy(
                    'created_at'
                )
                ->first();

        if (! $batch) {
            return null;
        }

        return $this->processBatch(
            $batch
        );
    }

    public function processBatch(
        NifEnrichmentBatch $batch
    ): NifEnrichmentBatch {
        if (
            ! in_array(
                $batch->status,
                [
                    NifEnrichmentBatch::STATUS_PENDING,
                    NifEnrichmentBatch::STATUS_PROCESSING,
                ],
                true
            )
        ) {
            return $this->loadBatch(
                $batch
            );
        }

        $this->recoverStaleItems(
            $batch
        );

        if (
            $batch->status ===
            NifEnrichmentBatch::STATUS_PENDING
        ) {
            $batch->status =
                NifEnrichmentBatch::STATUS_PROCESSING;

            $batch->started_at =
                $batch->started_at
                ?? now();

            $batch->save();
        }

        /*
         * Regra operacional:
         *
         * uma execução pode resolver vários cache hits / NIFs
         * inválidos localmente, mas termina assim que ocorrer
         * uma tentativa externa ao NIF.PT.
         */
        $externalLookupPerformed =
            false;

        $safetyCounter = 0;

        while (
            ! $externalLookupPerformed &&
            $safetyCounter < 100
        ) {
            $safetyCounter++;

            $item =
                $this->claimNextItem(
                    $batch
                );

            if (! $item) {
                break;
            }

            $externalLookupPerformed =
                $this->processItem(
                    $batch,
                    $item
                );
        }

        $batch->last_processed_at =
            now();

        $batch->save();

        $this->refreshCounters(
            $batch
        );

        $this->finalizeIfFinished(
            $batch
        );

        return $this->loadBatch(
            $batch
        );
    }

    public function loadBatch(
        NifEnrichmentBatch $batch
    ): NifEnrichmentBatch {
        return $batch
            ->refresh()
            ->load([
                'createdBy:id,name,email',

                'items' => function (
                    $query
                ): void {
                    $query
                        ->with([
                            'tvdeOperator:id,nif,display_name',

                            'enrichment',

                            'lookupAttempt',
                        ])
                        ->orderBy(
                            'created_at'
                        );
                },
            ]);
    }

    private function claimNextItem(
        NifEnrichmentBatch $batch
    ): ?NifEnrichmentBatchItem {
        return DB::transaction(
            function () use (
                $batch
            ): ?NifEnrichmentBatchItem {
                $item =
                    NifEnrichmentBatchItem::query()
                        ->where(
                            'nif_enrichment_batch_id',
                            $batch->id
                        )
                        ->where(
                            'status',
                            NifEnrichmentBatchItem::STATUS_PENDING
                        )
                        ->orderBy(
                            'created_at'
                        )
                        ->lockForUpdate()
                        ->first();

                if (! $item) {
                    return null;
                }

                $item->status =
                    NifEnrichmentBatchItem::STATUS_PROCESSING;

                $item->started_at =
                    now();

                $item->attempt_count =
                    ((int) $item
                        ->attempt_count) + 1;

                $item->error_message =
                    null;

                $item->save();

                return $item->refresh();
            }
        );
    }

    private function processItem(
        NifEnrichmentBatch $batch,
        NifEnrichmentBatchItem $item
    ): bool {
        $willRequireExternalLookup =
            $this->willRequireExternalLookup(
                $item,
                $batch
                    ->force_refresh
            );

        $beforeAttemptId =
            NifLookupAttempt::query()
                ->where(
                    'nif',
                    $item->nif
                )
                ->latest(
                    'requested_at'
                )
                ->latest(
                    'created_at'
                )
                ->value(
                    'id'
                );

        try {
            $enrichment =
                $this
                    ->nifPtService
                    ->lookup(
                        $item->nif,
                        $batch
                            ->force_refresh
                    );

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

            $newAttempt =
                $attempt &&
                $attempt->id !==
                    $beforeAttemptId;

            $externalLookup =
                $willRequireExternalLookup &&
                $newAttempt;

            $usedCache =
                $attempt?->status ===
                NifLookupAttempt::STATUS_CACHE_HIT;

            $status =
                match (
                    $attempt?->status
                ) {
                    NifLookupAttempt::STATUS_SUCCESS,
                    NifLookupAttempt::STATUS_CACHE_HIT => NifEnrichmentBatchItem::STATUS_SUCCESS,

                    NifLookupAttempt::STATUS_NOT_FOUND,
                    NifLookupAttempt::STATUS_INVALID => NifEnrichmentBatchItem::STATUS_SKIPPED,

                    NifLookupAttempt::STATUS_ERROR => NifEnrichmentBatchItem::STATUS_ERROR,

                    default => $enrichment
                        ->lookup_status ===
                            NifEnrichment::STATUS_SUCCESS
                                ? NifEnrichmentBatchItem::STATUS_SUCCESS
                                : NifEnrichmentBatchItem::STATUS_ERROR,
                };

            $item->fill([
                'nif_enrichment_id' => $enrichment->id,

                'nif_lookup_attempt_id' => $attempt?->id,

                'status' => $status,

                'used_cache' => $usedCache,

                'external_lookup' => $externalLookup,

                'error_message' => $status ===
                    NifEnrichmentBatchItem::STATUS_ERROR
                        ? (
                            $attempt
                                ?->error_message
                            ?: $enrichment
                                ->last_error
                            ?: 'Não foi possível enriquecer este NIF.'
                        )
                        : null,

                'processed_at' => now(),
            ]);

            $item->save();

            return $externalLookup;
        } catch (Throwable $exception) {
            $afterAttempt =
                NifLookupAttempt::query()
                    ->where(
                        'nif',
                        $item->nif
                    )
                    ->latest(
                        'requested_at'
                    )
                    ->latest(
                        'created_at'
                    )
                    ->first();

            $newAttempt =
                $afterAttempt &&
                $afterAttempt->id !==
                    $beforeAttemptId;

            $externalLookup =
                $willRequireExternalLookup &&
                $newAttempt;

            $item->fill([
                'nif_lookup_attempt_id' => $newAttempt
                        ? $afterAttempt->id
                        : null,

                'status' => NifEnrichmentBatchItem::STATUS_ERROR,

                'used_cache' => false,

                'external_lookup' => $externalLookup,

                'error_message' => $exception
                    ->getMessage(),

                'processed_at' => now(),
            ]);

            $item->save();

            return $willRequireExternalLookup;
        }
    }

    private function willRequireExternalLookup(
        NifEnrichmentBatchItem $item,
        bool $forceRefresh
    ): bool {
        if (
            ! $this
                ->nifPtService
                ->isValidNif(
                    $item->nif
                )
        ) {
            return false;
        }

        if ($forceRefresh) {
            return true;
        }

        $enrichment =
            NifEnrichment::query()
                ->where(
                    'nif',
                    $item->nif
                )
                ->first();

        if (
            ! $enrichment ||
            $enrichment
                ->lookup_status !==
                NifEnrichment::STATUS_SUCCESS ||
            ! $enrichment
                ->last_success_at
        ) {
            return true;
        }

        $cacheDays = max(
            0,
            (int) config(
                'services.nif_pt.cache_days',
                30
            )
        );

        if ($cacheDays === 0) {
            return true;
        }

        return $enrichment
            ->last_success_at
            ->lt(
                now()->subDays(
                    $cacheDays
                )
            );
    }

    private function refreshCounters(
        NifEnrichmentBatch $batch
    ): void {
        $counts =
            NifEnrichmentBatchItem::query()
                ->where(
                    'nif_enrichment_batch_id',
                    $batch->id
                )
                ->selectRaw(
                    'status, COUNT(*) as total'
                )
                ->groupBy(
                    'status'
                )
                ->pluck(
                    'total',
                    'status'
                );

        $cacheHits =
            NifEnrichmentBatchItem::query()
                ->where(
                    'nif_enrichment_batch_id',
                    $batch->id
                )
                ->where(
                    'used_cache',
                    true
                )
                ->count();

        $externalLookups =
            NifEnrichmentBatchItem::query()
                ->where(
                    'nif_enrichment_batch_id',
                    $batch->id
                )
                ->where(
                    'external_lookup',
                    true
                )
                ->count();

        $totalItems =
            NifEnrichmentBatchItem::query()
                ->where(
                    'nif_enrichment_batch_id',
                    $batch->id
                )
                ->count();

        $batch->fill([
            'total_items' => $totalItems,

            'pending_items' => (int) (
                $counts[
                    NifEnrichmentBatchItem::STATUS_PENDING
                ]
                ?? 0
            ),

            'processing_items' => (int) (
                $counts[
                    NifEnrichmentBatchItem::STATUS_PROCESSING
                ]
                ?? 0
            ),

            'success_items' => (int) (
                $counts[
                    NifEnrichmentBatchItem::STATUS_SUCCESS
                ]
                ?? 0
            ),

            'error_items' => (int) (
                $counts[
                    NifEnrichmentBatchItem::STATUS_ERROR
                ]
                ?? 0
            ),

            'skipped_items' => (int) (
                $counts[
                    NifEnrichmentBatchItem::STATUS_SKIPPED
                ]
                ?? 0
            ),

            'cache_hits' => $cacheHits,

            'external_lookups' => $externalLookups,
        ]);

        $batch->save();
    }

    private function finalizeIfFinished(
        NifEnrichmentBatch $batch
    ): void {
        $batch->refresh();

        if (
            $batch->pending_items > 0 ||
            $batch->processing_items > 0
        ) {
            if (
                $batch->status !==
                NifEnrichmentBatch::STATUS_CANCELED
            ) {
                $batch->status =
                    NifEnrichmentBatch::STATUS_PROCESSING;

                $batch->save();
            }

            return;
        }

        if (
            $batch->status ===
            NifEnrichmentBatch::STATUS_CANCELED
        ) {
            return;
        }

        if (
            $batch->error_items === 0
        ) {
            $status =
                NifEnrichmentBatch::STATUS_COMPLETED;
        } elseif (
            $batch->success_items > 0 ||
            $batch->skipped_items > 0
        ) {
            $status =
                NifEnrichmentBatch::STATUS_PARTIAL;
        } else {
            $status =
                NifEnrichmentBatch::STATUS_ERROR;
        }

        $batch->status =
            $status;

        $batch->completed_at =
            now();

        $batch->save();
    }

    private function recoverStaleItems(
        NifEnrichmentBatch $batch
    ): void {
        NifEnrichmentBatchItem::query()
            ->where(
                'nif_enrichment_batch_id',
                $batch->id
            )
            ->where(
                'status',
                NifEnrichmentBatchItem::STATUS_PROCESSING
            )
            ->where(
                'started_at',
                '<',
                now()->subMinutes(
                    10
                )
            )
            ->update([
                'status' => NifEnrichmentBatchItem::STATUS_PENDING,

                'started_at' => null,

                'error_message' => 'Processamento anterior interrompido; item devolvido à fila.',
            ]);
    }
}
