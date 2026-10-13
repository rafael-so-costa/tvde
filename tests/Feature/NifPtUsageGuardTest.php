<?php

use App\Models\NifEnrichment;
use App\Models\NifLookupAttempt;
use App\Services\NifPtUsageGuard;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createNifExternalAttempt(
    \Carbon\CarbonInterface $requestedAt
): NifLookupAttempt {
    $enrichment = NifEnrichment::create([
        'nif' => '509442013',
        'provider' => NifEnrichment::PROVIDER_NIF_PT,
        'lookup_status' => NifEnrichment::STATUS_SUCCESS,
    ]);

    return NifLookupAttempt::create([
        'nif_enrichment_id' => $enrichment->id,
        'nif' => $enrichment->nif,
        'provider' => NifEnrichment::PROVIDER_NIF_PT,
        'status' => NifLookupAttempt::STATUS_SUCCESS,
        'http_status' => 200,
        'requested_at' => $requestedAt,
    ]);
}

test(
    'permite consulta quando não existem tentativas externas',
    function () {
        expect(
            app(
                NifPtUsageGuard::class
            )->blockReason()
        )->toBeNull();
    }
);

test(
    'bloqueia consulta antes do intervalo mínimo',
    function () {
        createNifExternalAttempt(
            now()->subMinutes(42)
        );

        $reason =
            app(
                NifPtUsageGuard::class
            )->blockReason();

        expect(
            $reason
        )->not->toBeNull();

        expect(
            $reason
        )->toContain(
            'Próxima consulta NIF.PT'
        );
    }
);

test(
    'permite nova consulta depois do intervalo máximo',
    function () {
        createNifExternalAttempt(
            now()->subMinutes(49)
        );

        expect(
            app(
                NifPtUsageGuard::class
            )->blockReason()
        )->toBeNull();
    }
);