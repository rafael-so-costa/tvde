<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateBackofficeNifEnrichmentBatchRequest;
use App\Models\NifEnrichmentBatch;
use App\Models\NifEnrichmentBatchItem;
use App\Services\NifEnrichmentBatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BackofficeNifEnrichmentBatchController extends Controller
{
    public function __construct(
        private readonly NifEnrichmentBatchService $batches
    ) {}

    public function index(
        Request $request
    ): JsonResponse {
        $data =
            $request->validate([
                'status' => [
                    'nullable',
                    Rule::in(
                        NifEnrichmentBatch::statuses()
                    ),
                ],

                'per_page' => [
                    'nullable',
                    'integer',
                    'min:10',
                    'max:100',
                ],
            ]);

        $query =
            NifEnrichmentBatch::query()
                ->with(
                    'createdBy:id,name,email'
                );

        if (
            $status =
                $data['status']
                ?? null
        ) {
            $query->where(
                'status',
                $status
            );
        }

        $paginator =
            $query
                ->latest(
                    'created_at'
                )
                ->paginate(
                    $data[
                        'per_page'
                    ] ?? 20
                );

        return response()->json([
            'data' => collect(
                $paginator->items()
            )
                ->map(
                    fn (
                        NifEnrichmentBatch $batch
                    ): array => $this
                        ->summary(
                            $batch
                        )
                )
                ->values(),

            'meta' => [
                'current_page' => $paginator
                    ->currentPage(),

                'last_page' => $paginator
                    ->lastPage(),

                'per_page' => $paginator
                    ->perPage(),

                'total' => $paginator
                    ->total(),

                'from' => $paginator
                    ->firstItem(),

                'to' => $paginator
                    ->lastItem(),
            ],
        ]);
    }

    public function store(
        CreateBackofficeNifEnrichmentBatchRequest $request
    ): JsonResponse {
        $data =
            $request->validated();

        $batch =
            $this
                ->batches
                ->create(
                    operatorIds: $data[
                            'operator_ids'
                        ],

                    forceRefresh: $data[
                            'force_refresh'
                        ],

                    name: $data[
                            'name'
                        ] ?? null,

                    actor: $request->user()
                );

        return response()->json([
            'message' => 'Lote de enriquecimento criado com sucesso.',

            'data' => $this->detail(
                $batch
            ),
        ], 201);
    }

    public function show(
        string $id
    ): JsonResponse {
        $batch =
            NifEnrichmentBatch::query()
                ->findOrFail(
                    $id
                );

        $batch =
            $this
                ->batches
                ->loadBatch(
                    $batch
                );

        return response()->json([
            'data' => $this->detail(
                $batch
            ),
        ]);
    }

    public function process(
        string $id
    ): JsonResponse {
        $batch =
            NifEnrichmentBatch::query()
                ->findOrFail(
                    $id
                );

        $batch =
            $this
                ->batches
                ->processBatch(
                    $batch
                );

        return response()->json([
            'message' => 'Ciclo de processamento executado.',

            'data' => $this->detail(
                $batch
            ),
        ]);
    }

    public function cancel(
        string $id
    ): JsonResponse {
        $batch =
            NifEnrichmentBatch::query()
                ->findOrFail(
                    $id
                );

        $batch =
            $this
                ->batches
                ->cancel(
                    $batch
                );

        return response()->json([
            'message' => 'Lote cancelado.',

            'data' => $this->detail(
                $batch
            ),
        ]);
    }

    private function summary(
        NifEnrichmentBatch $batch
    ): array {
        return [
            'id' => $batch->id,

            'name' => $batch->name,

            'status' => $batch->status,

            'force_refresh' => $batch
                ->force_refresh,

            'total_items' => $batch
                ->total_items,

            'pending_items' => $batch
                ->pending_items,

            'processing_items' => $batch
                ->processing_items,

            'success_items' => $batch
                ->success_items,

            'error_items' => $batch
                ->error_items,

            'skipped_items' => $batch
                ->skipped_items,

            'cache_hits' => $batch
                ->cache_hits,

            'external_lookups' => $batch
                ->external_lookups,

            'started_at' => $batch
                ->started_at,

            'last_processed_at' => $batch
                ->last_processed_at,

            'completed_at' => $batch
                ->completed_at,

            'canceled_at' => $batch
                ->canceled_at,

            'created_at' => $batch
                ->created_at,

            'created_by' => $batch->createdBy
                    ? [
                        'id' => $batch
                            ->createdBy
                            ->id,

                        'name' => $batch
                            ->createdBy
                            ->name,

                        'email' => $batch
                            ->createdBy
                            ->email,
                    ]
                    : null,
        ];
    }

    private function detail(
        NifEnrichmentBatch $batch
    ): array {
        $batch =
            $this
                ->batches
                ->loadBatch(
                    $batch
                );

        return [
            ...$this->summary(
                $batch
            ),

            'metadata' => $batch->metadata,

            'error_message' => $batch
                ->error_message,

            'items' => $batch
                ->items
                ->map(
                    fn (
                        NifEnrichmentBatchItem $item
                    ): array => [
                        'id' => $item->id,

                        'nif' => $item->nif,

                        'status' => $item->status,

                        'used_cache' => $item
                            ->used_cache,

                        'external_lookup' => $item
                            ->external_lookup,

                        'attempt_count' => $item
                            ->attempt_count,

                        'error_message' => $item
                            ->error_message,

                        'started_at' => $item
                            ->started_at,

                        'processed_at' => $item
                            ->processed_at,

                        'operator' => $item
                            ->tvdeOperator
                                ? [
                                    'id' => $item
                                        ->tvdeOperator
                                        ->id,

                                    'nif' => $item
                                        ->tvdeOperator
                                        ->nif,

                                    'display_name' => $item
                                        ->tvdeOperator
                                        ->display_name,
                                ]
                                : null,

                        'enrichment' => $item
                            ->enrichment
                                ? [
                                    'id' => $item
                                        ->enrichment
                                        ->id,

                                    'lookup_status' => $item
                                        ->enrichment
                                        ->lookup_status,

                                    'title' => $item
                                        ->enrichment
                                        ->title,

                                    'city' => $item
                                        ->enrichment
                                        ->city,

                                    'cae' => $item
                                        ->enrichment
                                        ->cae,

                                    'last_success_at' => $item
                                        ->enrichment
                                        ->last_success_at,
                                ]
                                : null,

                        'lookup_attempt' => $item
                            ->lookupAttempt
                                ? [
                                    'id' => $item
                                        ->lookupAttempt
                                        ->id,

                                    'status' => $item
                                        ->lookupAttempt
                                        ->status,

                                    'http_status' => $item
                                        ->lookupAttempt
                                        ->http_status,

                                    'duration_ms' => $item
                                        ->lookupAttempt
                                        ->duration_ms,

                                    'error_message' => $item
                                        ->lookupAttempt
                                        ->error_message,

                                    'requested_at' => $item
                                        ->lookupAttempt
                                        ->requested_at,
                                ]
                                : null,
                    ]
                )
                ->values(),
        ];
    }
}
