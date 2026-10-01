<?php

use App\Models\TvdeImport;
use App\Models\TvdeOperator;
use App\Models\TvdeOperatorRegistration;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('mesmo nif pode possuir registos tvde em jurisdições diferentes', function () {
    $operator = TvdeOperator::create([
        'nif' => '515853062',
        'display_name' => 'Jornada Conveniente - Unipessoal Lda',
    ]);

    $imtImport = TvdeImport::create([
        'source' => TvdeImport::SOURCE_IMT,
        'reference_date' => '2026-08-05',
        'original_filename' => 'imt.pdf',
        'file_hash' => str_repeat('a', 64),
        'status' => TvdeImport::STATUS_COMPLETED,
    ]);

    $ramImport = TvdeImport::create([
        'source' => TvdeImport::SOURCE_RAM,
        'reference_date' => '2025-10-06',
        'original_filename' => 'ram.pdf',
        'file_hash' => str_repeat('b', 64),
        'status' => TvdeImport::STATUS_COMPLETED,
    ]);

    TvdeOperatorRegistration::create([
        'tvde_operator_id' => $operator->id,
        'source' => TvdeImport::SOURCE_IMT,
        'jurisdiction' => TvdeOperatorRegistration::JURISDICTION_CONTINENTAL,
        'source_key' => 'imt_continental:515853062',
        'denomination' => $operator->display_name,
        'district' => 'Lisboa',
        'municipality' => 'Lisboa',
        'active' => true,
        'record_hash' => hash('sha256', 'imt'),
        'first_seen_import_id' => $imtImport->id,
        'last_seen_import_id' => $imtImport->id,
    ]);

    TvdeOperatorRegistration::create([
        'tvde_operator_id' => $operator->id,
        'source' => TvdeImport::SOURCE_RAM,
        'jurisdiction' => TvdeOperatorRegistration::JURISDICTION_MADEIRA,
        'source_key' => 'ram:8112',
        'denomination' => $operator->display_name,
        'license_number' => '8112',
        'district' => 'Madeira',
        'municipality' => 'Funchal',
        'active' => true,
        'record_hash' => hash('sha256', 'ram'),
        'first_seen_import_id' => $ramImport->id,
        'last_seen_import_id' => $ramImport->id,
    ]);

    expect(
        TvdeOperator::query()->count()
    )->toBe(1)
        ->and(
            TvdeOperatorRegistration::query()->count()
        )->toBe(2)
        ->and(
            $operator
                ->registrations()
                ->pluck('source')
                ->sort()
                ->values()
                ->all()
        )->toBe([
            TvdeImport::SOURCE_IMT,
            TvdeImport::SOURCE_RAM,
        ]);
});
