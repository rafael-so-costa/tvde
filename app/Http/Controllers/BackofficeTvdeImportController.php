<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListBackofficeTvdeImportsRequest;
use App\Http\Requests\ShowBackofficeTvdeImportRequest;
use App\Models\TvdeImport;
use App\Models\TvdeImportChange;
use Illuminate\Http\JsonResponse;

class BackofficeTvdeImportController extends Controller
{
    public function index(
        ListBackofficeTvdeImportsRequest $request
    ): JsonResponse {
        $data =
            $request->validated();

        $source =
            $data['source']
            ?? null;

        $status =
            $data['status']
            ?? null;

        $perPage =
            $data['per_page']
            ?? 20;

        $query =
            TvdeImport::query()
                ->with([
                    'user:id,name,email',
                ]);

        if ($source) {
            $query->where(
                'source',
                $source
            );
        }

        if ($status) {
            $query->where(
                'status',
                $status
            );
        }

        $paginator =
            $query
                ->orderByDesc(
                    'reference_date'
                )
                ->orderByDesc(
                    'created_at'
                )
                ->paginate(
                    $perPage
                );

        $items =
            collect(
                $paginator->items()
            )
                ->map(
                    fn (
                        TvdeImport $import
                    ): array => $this
                        ->summary(
                            $import
                        )
                )
                ->values();

        return response()->json([
            'data' => $items,

            'meta' => [
                'current_page' => $paginator->currentPage(),

                'last_page' => $paginator->lastPage(),

                'per_page' => $paginator->perPage(),

                'total' => $paginator->total(),

                'from' => $paginator->firstItem(),

                'to' => $paginator->lastItem(),
            ],
        ]);
    }

    public function show(
        ShowBackofficeTvdeImportRequest $request,
        string $id
    ): JsonResponse {
        $data =
            $request->validated();

        $changeType =
            $data['change_type']
            ?? null;

        $perPage =
            $data['per_page']
            ?? 50;

        $import =
            TvdeImport::query()
                ->with([
                    'user:id,name,email',
                ])
                ->findOrFail(
                    $id
                );

        $changesQuery =
            TvdeImportChange::query()
                ->where(
                    'tvde_import_id',
                    $import->id
                )
                ->with([
                    'operator:id,nif,display_name',

                    'registration:id,source,jurisdiction,license_number,district,municipality,postal_locality',
                ]);

        if ($changeType) {
            $changesQuery->where(
                'change_type',
                $changeType
            );
        }

        $changes =
            $changesQuery
                ->latest(
                    'created_at'
                )
                ->paginate(
                    $perPage
                );

        $changeCounts =
            TvdeImportChange::query()
                ->where(
                    'tvde_import_id',
                    $import->id
                )
                ->selectRaw(
                    'change_type, COUNT(*) as total'
                )
                ->groupBy(
                    'change_type'
                )
                ->pluck(
                    'total',
                    'change_type'
                );

        $items =
            collect(
                $changes->items()
            )
                ->map(
                    fn (
                        TvdeImportChange $change
                    ): array => [
                        'id' => $change->id,

                        'change_type' => $change->change_type,

                        'changed_fields' => $change->changed_fields,

                        'before_data' => $change->before_data,

                        'after_data' => $change->after_data,

                        'operator' => $change->operator
                            ? [
                                'id' => $change
                                    ->operator
                                    ->id,

                                'nif' => $change
                                    ->operator
                                    ->nif,

                                'display_name' => $change
                                    ->operator
                                    ->display_name,
                            ]
                            : null,

                        'registration' => $change->registration
                            ? [
                                'id' => $change
                                    ->registration
                                    ->id,

                                'source' => $change
                                    ->registration
                                    ->source,

                                'jurisdiction' => $change
                                    ->registration
                                    ->jurisdiction,

                                'license_number' => $change
                                    ->registration
                                    ->license_number,

                                'district' => $change
                                    ->registration
                                    ->district,

                                'municipality' => $change
                                    ->registration
                                    ->municipality,

                                'postal_locality' => $change
                                    ->registration
                                    ->postal_locality,
                            ]
                            : null,

                        'created_at' => $change->created_at,
                    ]
                )
                ->values();

        return response()->json([
            'data' => [
                ...$this->summary(
                    $import
                ),

                'metadata' => $import->metadata,

                'file_hash' => $import->file_hash,

                'error_message' => $import->error_message,

                'started_at' => $import->started_at,

                'completed_at' => $import->completed_at,

                'change_counts' => [
                    'created' => (int) (
                        $changeCounts[TvdeImportChange::TYPE_CREATED]
                        ?? 0
                    ),

                    'updated' => (int) (
                        $changeCounts[TvdeImportChange::TYPE_UPDATED]
                        ?? 0
                    ),

                    'removed' => (int) (
                        $changeCounts[TvdeImportChange::TYPE_REMOVED]
                        ?? 0
                    ),

                    'restored' => (int) (
                        $changeCounts[TvdeImportChange::TYPE_RESTORED]
                        ?? 0
                    ),
                ],

                'changes' => [
                    'data' => $items,

                    'meta' => [
                        'current_page' => $changes
                            ->currentPage(),

                        'last_page' => $changes
                            ->lastPage(),

                        'per_page' => $changes
                            ->perPage(),

                        'total' => $changes
                            ->total(),

                        'from' => $changes
                            ->firstItem(),

                        'to' => $changes
                            ->lastItem(),
                    ],
                ],
            ],
        ]);
    }

    private function summary(
        TvdeImport $import
    ): array {
        return [
            'id' => $import->id,

            'source' => $import->source,

            'reference_date' => $import
                ->reference_date
                ?->format(
                    'Y-m-d'
                ),

            'original_filename' => $import->original_filename,

            'status' => $import->status,

            'total_records' => $import->total_records,

            'new_records' => $import->new_records,

            'changed_records' => $import->changed_records,

            'removed_records' => $import->removed_records,

            'restored_records' => $import->restored_records,

            'unchanged_records' => $import->unchanged_records,

            'imported_by' => $import->user
                ? [
                    'id' => $import
                        ->user
                        ->id,

                    'name' => $import
                        ->user
                        ->name,

                    'email' => $import
                        ->user
                        ->email,
                ]
                : null,

            'created_at' => $import->created_at,
        ];
    }
}
