<?php

namespace App\Http\Controllers;

use App\Http\Requests\LookupBackofficeTvdeOperatorNifRequest;
use App\Models\NifEnrichment;
use App\Models\NifLookupAttempt;
use App\Models\TvdeOperator;
use App\Services\NifPtService;
use App\Services\NifPtUsageGuard;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;
use RuntimeException;

class BackofficeTvdeOperatorEnrichmentController extends Controller
{
    public function show(
        string $id
    ): JsonResponse {
        $operator =
            TvdeOperator::query()
                ->findOrFail(
                    $id
                );

        $enrichment =
            NifEnrichment::query()
                ->where(
                    'nif',
                    $operator->nif
                )
                ->first();

        return response()->json([
            'data' => [
                'configured' => $this->configured(),

                'enrichment' => $enrichment
                    ? $this->summary(
                        $enrichment
                    )
                    : null,
            ],
        ]);
    }

    public function store(
        LookupBackofficeTvdeOperatorNifRequest $request,
        string $id,
        NifPtService $service,
        NifPtUsageGuard $guard
    ): JsonResponse {
        $operator = TvdeOperator::query()
            ->findOrFail(
                $id
            );

        $force = $request->boolean(
            'force'
        );

        $lock = null;

        if (
            $service->requiresExternalLookup(
                $operator->nif,
                $force
            )
        ) {
            $lock = $guard->lock();

            if (! $lock->get()) {
                return response()->json([
                    'message' => 'Já existe uma consulta externa NIF.PT em execução.',
                ], 409);
            }

            $reason = $guard->blockReason();

            if ($reason !== null) {
                $lock->release();

                return response()->json([
                    'message' => $reason,
                ], 429);
            }
        }

        try {
            try {
                $enrichment = $service->lookup(
                    $operator->nif,
                    $force
                );
            } catch (
                InvalidArgumentException|
                RuntimeException $exception
            ) {
                return response()->json(
                    [
                        'message' => $exception
                            ->getMessage(),
                    ],
                    422
                );
            }
        } finally {
            $lock?->release();
        }

        $attempt = $this->latestAttempt(
            $enrichment
        );

        $statusCode = match ($enrichment->lookup_status) {
            NifEnrichment::STATUS_INVALID => 422,
            NifEnrichment::STATUS_ERROR => 502,
            default => 200,
        };

        $message = match ($attempt?->status) {
            NifLookupAttempt::STATUS_CACHE_HIT => 'Dados obtidos do cache local.',
            NifLookupAttempt::STATUS_SUCCESS => 'Dados NIF.PT atualizados com sucesso.',
            NifLookupAttempt::STATUS_NOT_FOUND => 'O NIF é válido, mas não foi encontrado no NIF.PT.',
            NifLookupAttempt::STATUS_INVALID => 'O NIF foi considerado inválido.',
            NifLookupAttempt::STATUS_ERROR => 'Não foi possível consultar o NIF.PT.',
            default => 'Consulta concluída.',
        };

        return response()->json(
            [
                'message' => $message,

                'data' => [
                    'configured' => $this->configured(),

                    'enrichment' => $this->summary(
                        $enrichment
                    ),
                ],
            ],
            $statusCode
        );
    }

    private function summary(
        NifEnrichment $enrichment
    ): array {
        $cacheDays =
            max(
                0,
                (int) config(
                    'services.nif_pt.cache_days',
                    30
                )
            );

        $cacheExpiresAt =
            $enrichment
                ->last_success_at &&
                $cacheDays > 0
                ? $enrichment
                    ->last_success_at
                    ->copy()
                    ->addDays(
                        $cacheDays
                    )
            : null;

        $cacheIsFresh =
            $enrichment
                ->lookup_status ===
                NifEnrichment::STATUS_SUCCESS &&
                $cacheExpiresAt !== null &&
                $cacheExpiresAt
                    ->isFuture();

        $attempt =
            $this->latestAttempt(
                $enrichment
            );

        return [
            'id' => $enrichment->id,

            'nif' => $enrichment->nif,

            'provider' => $enrichment->provider,

            'lookup_status' => $enrichment
                ->lookup_status,

            'title' => $enrichment->title,

            'seo_url' => $enrichment->seo_url,

            'address' => $enrichment->address,

            'pc4' => $enrichment->pc4,

            'pc3' => $enrichment->pc3,

            'city' => $enrichment->city,

            'activity' => $enrichment->activity,

            'company_status' => $enrichment
                ->company_status,

            'cae' => $enrichment->cae,

            'contacts' => $enrichment->contacts,

            'structure' => $enrichment->structure,

            'geo' => $enrichment->geo,

            'place' => $enrichment->place,

            'alias' => $enrichment->alias,

            'racius_url' => $enrichment->racius_url,

            'portugalio_url' => $enrichment
                ->portugalio_url,

            'nif_validation' => $enrichment
                ->nif_validation,

            'is_nif' => $enrichment->is_nif,

            'provider_credits' => $enrichment
                ->provider_credits,

            'last_error' => $enrichment
                ->last_error,

            'lookup_count' => $enrichment
                ->lookup_count,

            'last_looked_up_at' => $enrichment
                ->last_looked_up_at,

            'last_success_at' => $enrichment
                ->last_success_at,

            'cache_days' => $cacheDays,

            'cache_is_fresh' => $cacheIsFresh,

            'cache_expires_at' => $cacheExpiresAt,

            'last_attempt' => $attempt
                ? [
                    'id' => $attempt->id,

                    'status' => $attempt->status,

                    'http_status' => $attempt
                        ->http_status,

                    'credit_type' => $attempt
                        ->credit_type,

                    'duration_ms' => $attempt
                        ->duration_ms,

                    'error_message' => $attempt
                        ->error_message,

                    'requested_at' => $attempt
                        ->requested_at,
                ]
                : null,

            'created_at' => $enrichment
                ->created_at,

            'updated_at' => $enrichment
                ->updated_at,
        ];
    }

    private function latestAttempt(
        NifEnrichment $enrichment
    ): ?NifLookupAttempt {
        return $enrichment
            ->attempts()
            ->latest(
                'requested_at'
            )
            ->latest(
                'created_at'
            )
            ->first();
    }

    private function configured(): bool
    {
        return trim(
            (string) config(
                'services.nif_pt.key'
            )
        ) !== '';
    }
}
