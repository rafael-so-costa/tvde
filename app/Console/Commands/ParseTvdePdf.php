<?php

namespace App\Console\Commands;

use App\Services\TvdePdfParserService;
use Illuminate\Console\Command;
use Throwable;

class ParseTvdePdf extends Command
{
    protected $signature = 'tvde:parse
        {file : Caminho completo do PDF}
        {--source= : Fonte da listagem: imt ou ram}
        {--show=5 : Quantidade de registos de exemplo}';

    protected $description =
        'Analisa um PDF oficial de operadores TVDE sem gravar dados';

    public function handle(
        TvdePdfParserService $parser
    ): int {
        $file =
            (string) $this->argument(
                'file'
            );

        $source =
            (string) $this->option(
                'source'
            );

        if (
            trim(
                $source
            ) === ''
        ) {
            $this->error(
                'Indique --source=imt ou --source=ram.'
            );

            return self::FAILURE;
        }

        $show =
            max(
                0,
                (int) $this->option(
                    'show'
                )
            );

        $this->info(
            'A analisar o PDF TVDE...'
        );

        try {
            $result =
                $parser->parse(
                    $file,
                    $source
                );
        } catch (Throwable $exception) {
            $this->error(
                $exception->getMessage()
            );

            return self::FAILURE;
        }

        $records =
            $result['records'];

        $this->newLine();

        $this->table(
            [
                'Campo',
                'Resultado',
            ],
            [
                [
                    'Fonte',
                    $result['source'],
                ],
                [
                    'Data de referência',
                    $result['reference_date'],
                ],
                [
                    'Páginas do PDF',
                    $result['total_pages'],
                ],
                [
                    'Páginas processadas',
                    $result['parsed_pages'],
                ],
                [
                    'Páginas ignoradas',
                    $result['skipped_pages'],
                ],
                [
                    'Registos extraídos',
                    count(
                        $records
                    ),
                ],
            ]
        );

        if (
            $result['source'] ===
            'imt_continental'
        ) {
            $this->showDistrictSummary(
                $records
            );
        } else {
            $this->showMunicipalitySummary(
                $records
            );
        }

        if (
            $show > 0 &&
            $records !== []
        ) {
            $this->newLine();

            $this->info(
                'Amostra de registos:'
            );

            $rows = [];

            foreach (
                array_slice(
                    $records,
                    0,
                    $show
                ) as $record
            ) {
                $rows[] = [
                    $record['nif'],
                    $record['denomination'],
                    $record['license_number']
                        ?? '—',
                    $record['district']
                        ?? '—',
                    $record['municipality']
                        ?? '—',
                    $record['postal_locality']
                        ?? '—',
                ];
            }

            $this->table(
                [
                    'NIF',
                    'Denominação',
                    'Licença',
                    'Distrito',
                    'Concelho',
                    'Localidade',
                ],
                $rows
            );
        }

        return self::SUCCESS;
    }

    private function showDistrictSummary(
        array $records
    ): void {
        $counts = [];

        foreach (
            $records as $record
        ) {
            $district =
                $record['district']
                ?? 'Sem distrito';

            $counts[
                $district
            ] =
                (
                    $counts[
                        $district
                    ]
                    ?? 0
                ) + 1;
        }

        arsort(
            $counts
        );

        $rows = [];

        foreach (
            $counts as $district => $count
        ) {
            $rows[] = [
                $district,
                $count,
            ];
        }

        $this->newLine();

        $this->info(
            'Distribuição por distrito:'
        );

        $this->table(
            [
                'Distrito',
                'Operadores',
            ],
            $rows
        );
    }

    private function showMunicipalitySummary(
        array $records
    ): void {
        $counts = [];

        foreach (
            $records as $record
        ) {
            $municipality =
                $record['municipality']
                ?? 'Sem concelho';

            $counts[
                $municipality
            ] =
                (
                    $counts[
                        $municipality
                    ]
                    ?? 0
                ) + 1;
        }

        arsort(
            $counts
        );

        $rows = [];

        foreach (
            array_slice(
                $counts,
                0,
                15,
                true
            ) as $municipality => $count
        ) {
            $rows[] = [
                $municipality,
                $count,
            ];
        }

        $this->newLine();

        $this->info(
            'Principais concelhos RAM:'
        );

        $this->table(
            [
                'Concelho',
                'Operadores',
            ],
            $rows
        );
    }
}
