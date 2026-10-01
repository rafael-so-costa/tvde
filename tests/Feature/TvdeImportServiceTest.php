<?php

use App\Models\TvdeImport;
use App\Models\TvdeImportChange;
use App\Models\TvdeOperator;
use App\Models\TvdeOperatorRegistration;
use App\Services\TvdeImportService;
use App\Services\TvdePdfParserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

function tvdeImportTestFile(
    string $content
): string {
    $path =
        tempnam(
            sys_get_temp_dir(),
            'tvde_'
        );

    file_put_contents(
        $path,
        $content
    );

    return $path;
}

function tvdeImportTestRecord(
    string $nif,
    string $name,
    string $municipality = 'Lisboa'
): array {
    return [
        'source' => TvdeImport::SOURCE_IMT,

        'jurisdiction' => TvdeOperatorRegistration::JURISDICTION_CONTINENTAL,

        'source_key' => TvdeImport::SOURCE_IMT
            .':'
            .$nif,

        'nif' => $nif,

        'denomination' => $name,

        'license_number' => null,

        'district' => 'Lisboa',

        'municipality' => $municipality,

        'postal_locality' => $municipality,

        'raw_data' => [
            'nif' => $nif,

            'denomination' => $name,

            'district' => 'Lisboa',

            'municipality' => $municipality,

            'postal_locality' => $municipality,
        ],
    ];
}

function tvdeImportTestParsed(
    string $date,
    array $records
): array {
    return [
        'source' => TvdeImport::SOURCE_IMT,

        'reference_date' => $date,

        'total_pages' => 1,

        'parsed_pages' => 1,

        'skipped_pages' => 0,

        'records' => $records,
    ];
}

test(
    'importa primeiro snapshot e cria operadores',
    function () {
        $file =
            tvdeImportTestFile(
                'snapshot-1'
            );

        $parser =
            Mockery::mock(
                TvdePdfParserService::class
            );

        $parser
            ->shouldReceive(
                'parse'
            )
            ->once()
            ->with(
                $file,
                'imt'
            )
            ->andReturn(
                tvdeImportTestParsed(
                    '2024-12-27',
                    [
                        tvdeImportTestRecord(
                            '515696544',
                            '100 Rotas, Lda.',
                            'Albergaria-A-Velha'
                        ),

                        tvdeImportTestRecord(
                            '515653780',
                            '309business, Unipessoal Lda',
                            'Espinho'
                        ),
                    ]
                )
            );

        $service =
            new TvdeImportService(
                $parser
            );

        $import =
            $service->import(
                $file,
                'imt'
            );

        expect(
            $import->status
        )->toBe(
            TvdeImport::STATUS_COMPLETED
        )
            ->and(
                $import->total_records
            )->toBe(2)
            ->and(
                $import->new_records
            )->toBe(2)
            ->and(
                $import->changed_records
            )->toBe(0)
            ->and(
                $import->removed_records
            )->toBe(0)
            ->and(
                TvdeOperator::query()
                    ->count()
            )->toBe(2)
            ->and(
                TvdeOperatorRegistration::query()
                    ->count()
            )->toBe(2)
            ->and(
                TvdeImportChange::query()
                    ->where(
                        'change_type',
                        TvdeImportChange::TYPE_CREATED
                    )
                    ->count()
            )->toBe(2);

        @unlink(
            $file
        );
    }
);

test(
    'snapshot seguinte deteta novos alterados e removidos',
    function () {
        $firstFile =
            tvdeImportTestFile(
                'snapshot-first'
            );

        $secondFile =
            tvdeImportTestFile(
                'snapshot-second'
            );

        $parser =
            Mockery::mock(
                TvdePdfParserService::class
            );

        $parser
            ->shouldReceive(
                'parse'
            )
            ->twice()
            ->andReturn(
                tvdeImportTestParsed(
                    '2024-12-27',
                    [
                        tvdeImportTestRecord(
                            '515696544',
                            '100 Rotas, Lda.',
                            'Albergaria-A-Velha'
                        ),

                        tvdeImportTestRecord(
                            '515653780',
                            '309business, Unipessoal Lda',
                            'Espinho'
                        ),
                    ]
                ),
                tvdeImportTestParsed(
                    '2026-08-05',
                    [
                        tvdeImportTestRecord(
                            '515696544',
                            '100 Rotas, Lda.',
                            'Aveiro'
                        ),

                        tvdeImportTestRecord(
                            '519029828',
                            '3sc2t, Unipessoal Lda',
                            'Águeda'
                        ),
                    ]
                )
            );

        $service =
            new TvdeImportService(
                $parser
            );

        $service->import(
            $firstFile,
            'imt'
        );

        $second =
            $service->import(
                $secondFile,
                'imt'
            );

        expect(
            $second->new_records
        )->toBe(1)
            ->and(
                $second->changed_records
            )->toBe(1)
            ->and(
                $second->removed_records
            )->toBe(1)
            ->and(
                $second->restored_records
            )->toBe(0)
            ->and(
                $second->unchanged_records
            )->toBe(0)
            ->and(
                TvdeOperator::query()
                    ->count()
            )->toBe(3);

        $removed =
            TvdeOperatorRegistration::query()
                ->where(
                    'source_key',
                    TvdeImport::SOURCE_IMT
                    .':515653780'
                )
                ->firstOrFail();

        expect(
            $removed->active
        )->toBeFalse()
            ->and(
                $removed
                    ->removed_in_import_id
            )->toBe(
                $second->id
            );

        @unlink(
            $firstFile
        );

        @unlink(
            $secondFile
        );
    }
);

test(
    'operador removido pode ser restaurado em snapshot posterior',
    function () {
        $firstFile =
            tvdeImportTestFile(
                'restore-first'
            );

        $secondFile =
            tvdeImportTestFile(
                'restore-second'
            );

        $thirdFile =
            tvdeImportTestFile(
                'restore-third'
            );

        $record =
            tvdeImportTestRecord(
                '515696544',
                '100 Rotas, Lda.',
                'Albergaria-A-Velha'
            );

        $parser =
            Mockery::mock(
                TvdePdfParserService::class
            );

        $parser
            ->shouldReceive(
                'parse'
            )
            ->times(3)
            ->andReturn(
                tvdeImportTestParsed(
                    '2024-12-27',
                    [
                        $record,
                    ]
                ),
                tvdeImportTestParsed(
                    '2025-01-01',
                    []
                ),
                tvdeImportTestParsed(
                    '2026-08-05',
                    [
                        $record,
                    ]
                )
            );

        $service =
            new TvdeImportService(
                $parser
            );

        $service->import(
            $firstFile,
            'imt'
        );

        $second =
            $service->import(
                $secondFile,
                'imt'
            );

        expect(
            $second->removed_records
        )->toBe(1);

        $third =
            $service->import(
                $thirdFile,
                'imt'
            );

        expect(
            $third->restored_records
        )->toBe(1)
            ->and(
                TvdeOperatorRegistration::query()
                    ->where(
                        'source_key',
                        TvdeImport::SOURCE_IMT
                        .':515696544'
                    )
                    ->value(
                        'active'
                    )
            )->toBeTruthy()
            ->and(
                TvdeImportChange::query()
                    ->where(
                        'tvde_import_id',
                        $third->id
                    )
                    ->where(
                        'change_type',
                        TvdeImportChange::TYPE_RESTORED
                    )
                    ->count()
            )->toBe(1);

        @unlink(
            $firstFile
        );

        @unlink(
            $secondFile
        );

        @unlink(
            $thirdFile
        );
    }
);

test(
    'não permite importar o mesmo ficheiro duas vezes',
    function () {
        $file =
            tvdeImportTestFile(
                'duplicate-file'
            );

        $parser =
            Mockery::mock(
                TvdePdfParserService::class
            );

        $parser
            ->shouldReceive(
                'parse'
            )
            ->once()
            ->andReturn(
                tvdeImportTestParsed(
                    '2024-12-27',
                    [
                        tvdeImportTestRecord(
                            '515696544',
                            '100 Rotas, Lda.'
                        ),
                    ]
                )
            );

        $service =
            new TvdeImportService(
                $parser
            );

        $service->import(
            $file,
            'imt'
        );

        expect(
            fn () => $service->import(
                $file,
                'imt'
            )
        )->toThrow(
            ValidationException::class
        );

        expect(
            TvdeImport::query()
                ->count()
        )->toBe(1);

        @unlink(
            $file
        );
    }
);

test(
    'não permite importar snapshot antigo depois de snapshot recente',
    function () {
        $recentFile =
            tvdeImportTestFile(
                'recent-snapshot'
            );

        $oldFile =
            tvdeImportTestFile(
                'old-snapshot'
            );

        $parser =
            Mockery::mock(
                TvdePdfParserService::class
            );

        $parser
            ->shouldReceive(
                'parse'
            )
            ->twice()
            ->andReturn(
                tvdeImportTestParsed(
                    '2026-08-05',
                    [
                        tvdeImportTestRecord(
                            '515696544',
                            '100 Rotas, Lda.'
                        ),
                    ]
                ),
                tvdeImportTestParsed(
                    '2024-12-27',
                    [
                        tvdeImportTestRecord(
                            '515696544',
                            '100 Rotas, Lda.'
                        ),
                    ]
                )
            );

        $service =
            new TvdeImportService(
                $parser
            );

        $service->import(
            $recentFile,
            'imt'
        );

        expect(
            fn () => $service->import(
                $oldFile,
                'imt'
            )
        )->toThrow(
            ValidationException::class
        );

        expect(
            TvdeImport::query()
                ->count()
        )->toBe(1);

        @unlink(
            $recentFile
        );

        @unlink(
            $oldFile
        );
    }
);
