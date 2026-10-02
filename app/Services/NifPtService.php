<?php

namespace App\Services;

use App\Models\NifEnrichment;
use App\Models\NifLookupAttempt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class NifPtService
{
    public function lookup(
        string $nif,
        bool $force = false
    ): NifEnrichment {
        $nif = $this->normalizeNif(
            $nif
        );

        if (strlen($nif) !== 9) {
            throw new InvalidArgumentException(
                'O NIF deve conter exatamente 9 dígitos.'
            );
        }

        $enrichment =
            NifEnrichment::query()
                ->firstOrCreate(
                    [
                        'nif' => $nif,
                    ],
                    [
                        'provider' => NifEnrichment::PROVIDER_NIF_PT,

                        'lookup_status' => NifEnrichment::STATUS_PENDING,
                    ]
                );

        if (! $this->isValidNif($nif)) {
            return $this->recordLocalInvalid(
                $enrichment
            );
        }

        if (
            ! $force &&
            $this->isFresh(
                $enrichment
            )
        ) {
            return $this->recordCacheHit(
                $enrichment
            );
        }

        $key = trim(
            (string) config(
                'services.nif_pt.key'
            )
        );

        if ($key === '') {
            throw new RuntimeException(
                'NIF_PT_KEY não está configurada.'
            );
        }

        $baseUrl = rtrim(
            (string) config(
                'services.nif_pt.base_url',
                'https://www.nif.pt/'
            ),
            '/'
        );

        $timeout = max(
            1,
            (int) config(
                'services.nif_pt.timeout',
                15
            )
        );

        $requestedAt =
            now();

        $startedAt =
            hrtime(true);

        try {
            $response =
                Http::acceptJson()
                    ->timeout(
                        $timeout
                    )
                    ->get(
                        $baseUrl.'/',
                        [
                            'json' => 1,
                            'q' => $nif,
                            'key' => $key,
                        ]
                    );

            $durationMs =
                $this->durationMs(
                    $startedAt
                );

            $payload =
                $response->json();

            if (! is_array($payload)) {
                $payload = [];
            }

            if (! $response->successful()) {
                return $this->recordProviderError(
                    enrichment: $enrichment,
                    requestedAt: $requestedAt,
                    durationMs: $durationMs,
                    httpStatus: $response->status(),
                    payload: $payload,
                    errorMessage: $this->providerErrorMessage(
                        $payload,
                        "NIF.PT respondeu com HTTP {$response->status()}."
                    )
                );
            }

            $record =
                $this->extractRecord(
                    $payload,
                    $nif
                );

            if (
                ($payload['nif_validation'] ?? null) === false ||
                ($payload['is_nif'] ?? null) === false
            ) {
                return $this->recordProviderOutcome(
                    enrichment: $enrichment,
                    status: NifEnrichment::STATUS_INVALID,
                    requestedAt: $requestedAt,
                    durationMs: $durationMs,
                    httpStatus: $response->status(),
                    payload: $payload
                );
            }

            if ($record !== null) {
                return $this->recordSuccess(
                    enrichment: $enrichment,
                    requestedAt: $requestedAt,
                    durationMs: $durationMs,
                    httpStatus: $response->status(),
                    payload: $payload,
                    record: $record
                );
            }

            if (
                ($payload['result'] ?? null) ===
                'success'
            ) {
                return $this->recordProviderOutcome(
                    enrichment: $enrichment,
                    status: NifEnrichment::STATUS_NOT_FOUND,
                    requestedAt: $requestedAt,
                    durationMs: $durationMs,
                    httpStatus: $response->status(),
                    payload: $payload
                );
            }

            return $this->recordProviderError(
                enrichment: $enrichment,
                requestedAt: $requestedAt,
                durationMs: $durationMs,
                httpStatus: $response->status(),
                payload: $payload,
                errorMessage: $this->providerErrorMessage(
                    $payload,
                    'Resposta inesperada recebida do NIF.PT.'
                )
            );
        } catch (Throwable $exception) {
            return $this->recordProviderError(
                enrichment: $enrichment,
                requestedAt: $requestedAt,
                durationMs: $this->durationMs(
                    $startedAt
                ),
                httpStatus: null,
                payload: [],
                errorMessage: $exception->getMessage()
            );
        }
    }

    public function isValidNif(
        string $nif
    ): bool {
        $nif =
            $this->normalizeNif(
                $nif
            );

        if (
            strlen($nif) !== 9 ||
            ! ctype_digit($nif)
        ) {
            return false;
        }

        $sum = 0;

        for (
            $index = 0;
            $index < 8;
            $index++
        ) {
            $sum +=
                ((int) $nif[$index]) *
                (9 - $index);
        }

        $remainder =
            $sum % 11;

        $checkDigit =
            $remainder < 2
                ? 0
                : 11 - $remainder;

        return $checkDigit ===
            (int) $nif[8];
    }

    public function normalizeNif(
        string $nif
    ): string {
        return preg_replace(
            '/\D+/',
            '',
            trim($nif)
        ) ?? '';
    }

    private function isFresh(
        NifEnrichment $enrichment
    ): bool {
        if (
            $enrichment->lookup_status !==
            NifEnrichment::STATUS_SUCCESS
        ) {
            return false;
        }

        if (
            ! $enrichment->last_success_at
        ) {
            return false;
        }

        $cacheDays = max(
            0,
            (int) config(
                'services.nif_pt.cache_days',
                30
            )
        );

        if ($cacheDays === 0) {
            return false;
        }

        return $enrichment
            ->last_success_at
            ->greaterThanOrEqualTo(
                now()->subDays(
                    $cacheDays
                )
            );
    }

    private function recordLocalInvalid(
        NifEnrichment $enrichment
    ): NifEnrichment {
        DB::transaction(
            function () use (
                $enrichment
            ): void {
                $enrichment->fill([
                    'lookup_status' => NifEnrichment::STATUS_INVALID,

                    'last_error' => 'NIF inválido segundo o algoritmo local de validação.',
                ]);

                $enrichment->save();

                NifLookupAttempt::create([
                    'nif_enrichment_id' => $enrichment->id,

                    'nif' => $enrichment->nif,

                    'provider' => NifEnrichment::PROVIDER_NIF_PT,

                    'status' => NifLookupAttempt::STATUS_INVALID,

                    'requested_at' => now(),
                ]);
            }
        );

        return $enrichment->refresh();
    }

    private function recordCacheHit(
        NifEnrichment $enrichment
    ): NifEnrichment {
        NifLookupAttempt::create([
            'nif_enrichment_id' => $enrichment->id,

            'nif' => $enrichment->nif,

            'provider' => NifEnrichment::PROVIDER_NIF_PT,

            'status' => NifLookupAttempt::STATUS_CACHE_HIT,

            'requested_at' => now(),
        ]);

        return $enrichment->refresh();
    }

    private function recordSuccess(
        NifEnrichment $enrichment,
        $requestedAt,
        int $durationMs,
        int $httpStatus,
        array $payload,
        array $record
    ): NifEnrichment {
        DB::transaction(
            function () use (
                $enrichment,
                $requestedAt,
                $durationMs,
                $httpStatus,
                $payload,
                $record
            ): void {
                $credits =
                    $this->credits(
                        $payload
                    );

                $enrichment->fill([
                    'lookup_status' => NifEnrichment::STATUS_SUCCESS,

                    'title' => $this->stringValue(
                        $record['title'] ?? null
                    ),

                    'seo_url' => $this->stringValue(
                        $record['seo_url'] ?? null
                    ),

                    'address' => $this->stringValue(
                        $record['address'] ?? null
                    ),

                    'pc4' => $this->stringValue(
                        $record['pc4'] ?? null
                    ),

                    'pc3' => $this->stringValue(
                        $record['pc3'] ?? null
                    ),

                    'city' => $this->stringValue(
                        $record['city'] ?? null
                    ),

                    'activity' => $this->stringValue(
                        $record['activity'] ?? null
                    ),

                    'company_status' => $this->stringValue(
                        $record['status'] ?? null
                    ),

                    'cae' => $this->stringValue(
                        $record['cae'] ?? null
                    ),

                    'contacts' => $this->arrayValue(
                        $record['contacts'] ?? null
                    ),

                    'structure' => $this->arrayValue(
                        $record['structure'] ?? null
                    ),

                    'geo' => $this->arrayValue(
                        $record['geo'] ?? null
                    ),

                    'place' => $this->arrayValue(
                        $record['place'] ?? null
                    ),

                    'alias' => $this->stringValue(
                        $record['alias'] ?? null
                    ),

                    'racius_url' => $this->stringValue(
                        $record['racius'] ?? null
                    ),

                    'portugalio_url' => $this->stringValue(
                        $record['portugalio'] ?? null
                    ),

                    'nif_validation' => $this->booleanValue(
                        $payload[
                            'nif_validation'
                        ] ?? null
                    ),

                    'is_nif' => $this->booleanValue(
                        $payload[
                            'is_nif'
                        ] ?? null
                    ),

                    'provider_credits' => $credits,

                    'raw_data' => $payload,

                    'last_error' => null,

                    'lookup_count' => ((int) $enrichment
                    ->lookup_count) + 1,

                    'last_looked_up_at' => $requestedAt,

                    'last_success_at' => $requestedAt,
                ]);

                $enrichment->save();

                $this->createAttempt(
                    enrichment: $enrichment,
                    status: NifLookupAttempt::STATUS_SUCCESS,
                    requestedAt: $requestedAt,
                    durationMs: $durationMs,
                    httpStatus: $httpStatus,
                    payload: $payload
                );
            }
        );

        return $enrichment->refresh();
    }

    private function recordProviderOutcome(
        NifEnrichment $enrichment,
        string $status,
        $requestedAt,
        int $durationMs,
        int $httpStatus,
        array $payload
    ): NifEnrichment {
        DB::transaction(
            function () use (
                $enrichment,
                $status,
                $requestedAt,
                $durationMs,
                $httpStatus,
                $payload
            ): void {
                $enrichment->fill([
                    'lookup_status' => $status,

                    'nif_validation' => $this->booleanValue(
                        $payload[
                            'nif_validation'
                        ] ?? null
                    ),

                    'is_nif' => $this->booleanValue(
                        $payload[
                            'is_nif'
                        ] ?? null
                    ),

                    'provider_credits' => $this->credits(
                        $payload
                    ) ??
                        $enrichment
                            ->provider_credits,

                    'raw_data' => $payload,

                    'last_error' => null,

                    'lookup_count' => ((int) $enrichment
                    ->lookup_count) + 1,

                    'last_looked_up_at' => $requestedAt,
                ]);

                $enrichment->save();

                $this->createAttempt(
                    enrichment: $enrichment,
                    status: $status,
                    requestedAt: $requestedAt,
                    durationMs: $durationMs,
                    httpStatus: $httpStatus,
                    payload: $payload
                );
            }
        );

        return $enrichment->refresh();
    }

    private function recordProviderError(
        NifEnrichment $enrichment,
        $requestedAt,
        int $durationMs,
        ?int $httpStatus,
        array $payload,
        string $errorMessage
    ): NifEnrichment {
        DB::transaction(
            function () use (
                $enrichment,
                $requestedAt,
                $durationMs,
                $httpStatus,
                $payload,
                $errorMessage
            ): void {
                $hasSuccessfulCache =
                    $enrichment
                        ->last_success_at !==
                    null;

                $enrichment->fill([
                    'lookup_status' => $hasSuccessfulCache
                            ? NifEnrichment::STATUS_SUCCESS
                            : NifEnrichment::STATUS_ERROR,

                    'provider_credits' => $this->credits(
                        $payload
                    ) ??
                        $enrichment
                            ->provider_credits,

                    'last_error' => $errorMessage,

                    'lookup_count' => ((int) $enrichment
                    ->lookup_count) + 1,

                    'last_looked_up_at' => $requestedAt,
                ]);

                $enrichment->save();

                $this->createAttempt(
                    enrichment: $enrichment,
                    status: NifLookupAttempt::STATUS_ERROR,
                    requestedAt: $requestedAt,
                    durationMs: $durationMs,
                    httpStatus: $httpStatus,
                    payload: $payload,
                    errorMessage: $errorMessage
                );
            }
        );

        return $enrichment->refresh();
    }

    private function createAttempt(
        NifEnrichment $enrichment,
        string $status,
        $requestedAt,
        int $durationMs,
        ?int $httpStatus,
        array $payload,
        ?string $errorMessage = null
    ): void {
        $credits =
            $this->credits(
                $payload
            );

        NifLookupAttempt::create([
            'nif_enrichment_id' => $enrichment->id,

            'nif' => $enrichment->nif,

            'provider' => NifEnrichment::PROVIDER_NIF_PT,

            'status' => $status,

            'http_status' => $httpStatus,

            'provider_result' => $this->stringValue(
                $payload['result'] ?? null
            ),

            'credit_type' => $this->stringValue(
                $credits['used'] ?? null
            ),

            'credits' => $credits,

            'duration_ms' => $durationMs,

            'error_message' => $errorMessage,

            'requested_at' => $requestedAt,
        ]);
    }

    private function extractRecord(
        array $payload,
        string $nif
    ): ?array {
        $records =
            $payload['records']
            ?? null;

        if (! is_array($records)) {
            return null;
        }

        $record =
            $records[$nif]
            ?? null;

        return is_array($record)
            ? $record
            : null;
    }

    private function credits(
        array $payload
    ): ?array {
        $credits =
            $payload['credits']
            ?? null;

        return is_array($credits)
            ? $credits
            : null;
    }

    private function providerErrorMessage(
        array $payload,
        string $fallback
    ): string {
        foreach (
            [
                'message',
                'error',
                'msg',
            ] as $key
        ) {
            $value =
                $this->stringValue(
                    $payload[$key]
                    ?? null
                );

            if ($value !== null) {
                return $value;
            }
        }

        return $fallback;
    }

    private function stringValue(
        mixed $value
    ): ?string {
        if (! is_scalar($value)) {
            return null;
        }

        $value =
            trim(
                (string) $value
            );

        return $value !== ''
            ? $value
            : null;
    }

    private function arrayValue(
        mixed $value
    ): ?array {
        return is_array($value)
            ? $value
            : null;
    }

    private function booleanValue(
        mixed $value
    ): ?bool {
        if ($value === null) {
            return null;
        }

        return filter_var(
            $value,
            FILTER_VALIDATE_BOOLEAN,
            FILTER_NULL_ON_FAILURE
        );
    }

    private function durationMs(
        int $startedAt
    ): int {
        return max(
            0,
            (int) round(
                (
                    hrtime(true) -
                    $startedAt
                ) /
                1_000_000
            )
        );
    }
}
