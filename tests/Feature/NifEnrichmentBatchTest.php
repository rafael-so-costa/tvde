<?php

use App\Models\NifEnrichment;
use App\Models\NifEnrichmentBatch;
use App\Models\NifEnrichmentBatchItem;
use App\Models\TvdeOperator;
use App\Services\NifEnrichmentBatchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    config()->set(
        'services.nif_pt.key',
        'fake-batch-key'
    );

    config()->set(
        'services.nif_pt.base_url',
        'https://www.nif.pt/'
    );

    config()->set(
        'services.nif_pt.cache_days',
        30
    );
});

function nifBatchPayload(
    string $nif,
    string $title
): array {
    return [
        'result' => 'success',

        'records' => [
            $nif => [
                'nif' => (int) $nif,
                'title' => $title,
                'city' => 'Lisboa',
                'cae' => '49320',
                'status' => 'active',
            ],
        ],

        'nif_validation' => true,
        'is_nif' => true,

        'credits' => [
            'used' => 'free',
        ],
    ];
}

test('serviço cria lote com um item por operador', function () {
    $first = TvdeOperator::create([
        'nif' => '509442013',
        'display_name' => 'Operador A',
    ]);

    $second = TvdeOperator::create([
        'nif' => '515696544',
        'display_name' => 'Operador B',
    ]);

    $batch = app(
        NifEnrichmentBatchService::class
    )->create([
        $first->id,
        $second->id,
    ]);

    expect(
        $batch->total_items
    )->toBe(2);

    expect(
        $batch->pending_items
    )->toBe(2);

    expect(
        $batch->items
    )->toHaveCount(2);
});

test('processamento usa cache e executa no máximo uma consulta externa por ciclo', function () {
    Http::fake([
        '*' => Http::response(
            nifBatchPayload(
                '515696544',
                'Operador Externo'
            ),
            200
        ),
    ]);

    $cached = TvdeOperator::create([
        'nif' => '509442013',
        'display_name' => 'A Operador Cached',
    ]);

    $external = TvdeOperator::create([
        'nif' => '515696544',
        'display_name' => 'B Operador Externo',
    ]);

    NifEnrichment::create([
        'nif' => $cached->nif,
        'provider' => NifEnrichment::PROVIDER_NIF_PT,
        'lookup_status' => NifEnrichment::STATUS_SUCCESS,
        'title' => 'Operador Cached',
        'lookup_count' => 1,
        'last_looked_up_at' => now(),
        'last_success_at' => now(),
    ]);

    $service = app(
        NifEnrichmentBatchService::class
    );

    $batch = $service->create([
        $cached->id,
        $external->id,
    ]);

    $batch = $service->processBatch(
        $batch
    );

    expect(
        $batch->status
    )->toBe(
        NifEnrichmentBatch::STATUS_COMPLETED
    );

    expect(
        $batch->success_items
    )->toBe(2);

    expect(
        $batch->cache_hits
    )->toBe(1);

    expect(
        $batch->external_lookups
    )->toBe(1);

    Http::assertSentCount(1);
});

test('nif inválido é ignorado sem chamada externa', function () {
    Http::fake();

    $operator = TvdeOperator::create([
        'nif' => '123456780',
        'display_name' => 'NIF Inválido',
    ]);

    $service = app(
        NifEnrichmentBatchService::class
    );

    $batch = $service->create([
        $operator->id,
    ]);

    $batch = $service->processBatch(
        $batch
    );

    expect(
        $batch->status
    )->toBe(
        NifEnrichmentBatch::STATUS_COMPLETED
    );

    expect(
        $batch->skipped_items
    )->toBe(1);

    expect(
        $batch->external_lookups
    )->toBe(0);

    expect(
        $batch->items
            ->first()
            ->status
    )->toBe(
        NifEnrichmentBatchItem::STATUS_SKIPPED
    );

    Http::assertNothingSent();
});
