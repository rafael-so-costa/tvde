<?php

namespace App\Services;

use App\Models\TvdeImport;
use App\Models\TvdeOperatorRegistration;
use RuntimeException;
use Smalot\PdfParser\Page;
use Smalot\PdfParser\Parser;

class TvdePdfParserService
{
    private const PORTUGUESE_MONTHS = [
        'JANEIRO' => 1,
        'FEVEREIRO' => 2,
        'MARÇO' => 3,
        'MARCO' => 3,
        'ABRIL' => 4,
        'MAIO' => 5,
        'JUNHO' => 6,
        'JULHO' => 7,
        'AGOSTO' => 8,
        'SETEMBRO' => 9,
        'OUTUBRO' => 10,
        'NOVEMBRO' => 11,
        'DEZEMBRO' => 12,
    ];

    public function parse(
        string $path,
        string $source
    ): array {
        if (! is_file($path)) {
            throw new RuntimeException(
                "Ficheiro não encontrado: {$path}"
            );
        }

        $source = $this->normalizeSource(
            $source
        );

        $pdf = (new Parser)
            ->parseFile(
                $path
            );

        $pages = $pdf->getPages();

        if ($pages === []) {
            throw new RuntimeException(
                'O PDF não contém páginas.'
            );
        }

        return match ($source) {
            TvdeImport::SOURCE_IMT => $this->parseImt(
                $pages
            ),

            TvdeImport::SOURCE_RAM => $this->parseRam(
                $pages
            ),

            default => throw new RuntimeException(
                'Fonte TVDE não suportada.'
            ),
        };
    }

    private function parseImt(
        array $pages
    ): array {
        $referenceDate =
            $this->extractImtDate(
                $pages
            );

        $records = [];
        $parsedPages = 0;

        foreach (
            $pages as $pageIndex => $page
        ) {
            $items =
                $this->pageItems(
                    $page
                );

            if ($items === []) {
                continue;
            }

            $pageRecords =
                $this->extractImtRows(
                    $items
                );

            foreach (
                $pageRecords as $row
            ) {
                $nif =
                    $this->normalizeNif(
                        $row['nif']
                            ?? ''
                    );

                if ($nif === null) {
                    continue;
                }

                $denomination =
                    $this->cleanText(
                        $row['denomination']
                            ?? ''
                    );

                $district =
                    $this->cleanText(
                        $row['district']
                            ?? ''
                    );

                $municipality =
                    $this->cleanText(
                        $row['municipality']
                            ?? ''
                    );

                $postalLocality =
                    $this->cleanText(
                        $row['postal_locality']
                            ?? ''
                    );

                if (
                    $denomination === '' ||
                    $district === ''
                ) {
                    throw new RuntimeException(
                        sprintf(
                            'Registo IMT incompleto na página %d para o NIF %s. Denominação="%s", Distrito="%s", Concelho="%s", Localidade="%s".',
                            $pageIndex + 1,
                            $nif,
                            $denomination,
                            $district,
                            $municipality,
                            $postalLocality
                        )
                    );
                }

                $sourceKey =
                    TvdeImport::SOURCE_IMT
                    .':'
                    .$nif;

                if (
                    isset(
                        $records[$sourceKey]
                    )
                ) {
                    throw new RuntimeException(
                        "Registo IMT duplicado: {$sourceKey}"
                    );
                }

                $records[$sourceKey] = [
                    'source' => TvdeImport::SOURCE_IMT,

                    'jurisdiction' => TvdeOperatorRegistration::JURISDICTION_CONTINENTAL,

                    'source_key' => $sourceKey,

                    'nif' => $nif,

                    'denomination' => $denomination,

                    'license_number' => null,

                    'district' => $district,

                    'municipality' => $municipality !== ''
                        ? $municipality
                        : null,

                    'postal_locality' => $postalLocality !== ''
                        ? $postalLocality
                        : null,

                    'raw_data' => [
                        'page' => $pageIndex + 1,

                        'denomination' => $denomination,

                        'nif' => $nif,

                        'district' => $district,

                        'municipality' => $municipality !== ''
                            ? $municipality
                            : null,

                        'postal_locality' => $postalLocality !== ''
                            ? $postalLocality
                            : null,
                    ],
                ];
            }

            $parsedPages++;
        }

        return [
            'source' => TvdeImport::SOURCE_IMT,

            'reference_date' => $referenceDate,

            'total_pages' => count(
                $pages
            ),

            'parsed_pages' => $parsedPages,

            'skipped_pages' => 0,

            'records' => array_values(
                $records
            ),
        ];
    }

    private function parseRam(
        array $pages
    ): array {
        $referenceDate =
            $this->extractRamDate(
                $pages
            );

        $columns = null;
        $records = [];

        $parsedPages = 0;
        $skippedPages = 0;

        foreach (
            $pages as $pageIndex => $page
        ) {
            $pageText =
                $this->cleanText(
                    $page->getText()
                );

            if (
                $this->isRamPlatformPage(
                    $pageText
                )
            ) {
                $skippedPages++;

                continue;
            }

            $items =
                $this->pageItems(
                    $page
                );

            if ($items === []) {
                continue;
            }

            if ($columns === null) {
                $columns =
                    $this->locateColumns(
                        $items,
                        [
                            'denomination' => [
                                'denominação social',
                                'denominacao social',
                            ],

                            'nif' => [
                                'nif',
                            ],

                            'license_number' => [
                                'licença',
                                'licenca',
                            ],

                            'municipality' => [
                                'concelho',
                            ],
                        ]
                    );
            }

            $pageRecords =
                $this->extractRows(
                    $items,
                    $columns,
                    'nif'
                );

            foreach (
                $pageRecords as $row
            ) {
                $nif =
                    $this->normalizeNif(
                        $row['nif']
                            ?? ''
                    );

                if ($nif === null) {
                    continue;
                }

                $denomination =
                    $this->cleanText(
                        $row['denomination']
                            ?? ''
                    );

                $license =
                    preg_replace(
                        '/\D+/',
                        '',
                        $row['license_number']
                            ?? ''
                    );

                $municipality =
                    $this->cleanText(
                        $row['municipality']
                            ?? ''
                    );

                if (
                    $denomination === '' ||
                    $license === '' ||
                    $municipality === ''
                ) {
                    throw new RuntimeException(
                        sprintf(
                            'Registo RAM incompleto na página %d para o NIF %s.',
                            $pageIndex + 1,
                            $nif
                        )
                    );
                }

                $sourceKey =
                    TvdeImport::SOURCE_RAM
                    .':'
                    .$license;

                if (
                    isset(
                        $records[$sourceKey]
                    )
                ) {
                    throw new RuntimeException(
                        "Licença RAM duplicada: {$sourceKey}"
                    );
                }

                $records[$sourceKey] = [
                    'source' => TvdeImport::SOURCE_RAM,

                    'jurisdiction' => TvdeOperatorRegistration::JURISDICTION_MADEIRA,

                    'source_key' => $sourceKey,

                    'nif' => $nif,

                    'denomination' => $denomination,

                    'license_number' => $license,

                    'district' => 'Madeira',

                    'municipality' => $municipality,

                    'postal_locality' => null,

                    'raw_data' => [
                        'page' => $pageIndex + 1,

                        'denomination' => $denomination,

                        'nif' => $nif,

                        'license_number' => $license,

                        'municipality' => $municipality,
                    ],
                ];
            }

            $parsedPages++;
        }

        return [
            'source' => TvdeImport::SOURCE_RAM,

            'reference_date' => $referenceDate,

            'total_pages' => count(
                $pages
            ),

            'parsed_pages' => $parsedPages,

            'skipped_pages' => $skippedPages,

            'records' => array_values(
                $records
            ),
        ];
    }

    private function pageItems(
        Page $page
    ): array {
        $items = [];

        foreach (
            $page->getDataTm() as $entry
        ) {
            $matrix =
                $entry[0]
                ?? null;

            $text =
                $this->cleanText(
                    (string) (
                        $entry[1]
                        ?? ''
                    )
                );

            if (
                ! is_array(
                    $matrix
                ) ||
                count(
                    $matrix
                ) < 6 ||
                $text === ''
            ) {
                continue;
            }

            $items[] = [
                'x' => (float) $matrix[4],

                'y' => (float) $matrix[5],

                'text' => $text,
            ];
        }

        return $items;
    }

    private function locateColumns(
        array $items,
        array $headers
    ): array {
        $positions = [];

        foreach (
            $headers as $column => $needles
        ) {
            foreach (
                $items as $item
            ) {
                $text =
                    $this->lower(
                        $item['text']
                    );

                foreach (
                    $needles as $needle
                ) {
                    $needle =
                        $this->lower(
                            $needle
                        );

                    $matched =
                        $column === 'nif'
                        ? $text === $needle
                        : str_contains(
                            $text,
                            $needle
                        );

                    if (! $matched) {
                        continue;
                    }

                    $positions[$column] = $item['x'];

                    break 2;
                }
            }

            if (
                ! array_key_exists(
                    $column,
                    $positions
                )
            ) {
                throw new RuntimeException(
                    "Não foi possível localizar a coluna {$column} no PDF."
                );
            }
        }

        asort(
            $positions,
            SORT_NUMERIC
        );

        return $positions;
    }

    private function extractImtRows(
        array $items
    ): array {
        $anchors = [];

        foreach (
            $items as $item
        ) {
            if (
                $item['x'] < 205 ||
                $item['x'] > 290
            ) {
                continue;
            }

            $nif =
                $this->normalizeNif(
                    $item['text']
                );

            if ($nif === null) {
                continue;
            }

            $anchors[] = [
                'x' => $item['x'],

                'y' => $item['y'],

                'text' => $item['text'],

                'nif' => $nif,
            ];
        }

        if ($anchors === []) {
            return [];
        }

        $buckets = [];

        foreach (
            $anchors as $index => $anchor
        ) {
            $buckets[$index] = [
                'denomination' => [],
                'nif' => [],
                'district' => [],
                'municipality' => [],
                'postal_locality' => [],
            ];
        }

        foreach (
            $items as $item
        ) {
            if (
                $this->isNoise(
                    $item['text']
                )
            ) {
                continue;
            }

            $nearestIndex = null;
            $nearestDistance = INF;

            foreach (
                $anchors as $index => $anchor
            ) {
                $distance =
                    abs(
                        $item['y'] -
                            $anchor['y']
                    );

                if (
                    $distance <
                    $nearestDistance
                ) {
                    $nearestDistance =
                        $distance;

                    $nearestIndex =
                        $index;
                }
            }

            if (
                $nearestIndex === null ||
                $nearestDistance > 24
            ) {
                continue;
            }

            $column =
                $this->imtColumnForX(
                    $item['x']
                );

            $buckets[$nearestIndex][$column][] = $item;
        }

        $rows = [];

        foreach (
            $anchors as $index => $anchor
        ) {
            $rows[] = [
                'denomination' => $this->joinItems(
                    $buckets[$index]['denomination']
                ),

                'nif' => $anchor['nif'],

                'district' => $this->joinItems(
                    $buckets[$index]['district']
                ),

                'municipality' => $this->joinItems(
                    $buckets[$index]['municipality']
                ),

                'postal_locality' => $this->joinItems(
                    $buckets[$index]['postal_locality']
                ),
            ];
        }

        return $rows;
    }

    private function imtColumnForX(
        float $x
    ): string {
        if ($x < 210) {
            return 'denomination';
        }

        if ($x < 280) {
            return 'nif';
        }

        if ($x < 350) {
            return 'district';
        }

        if ($x < 465) {
            return 'municipality';
        }

        return 'postal_locality';
    }

    private function extractRows(
        array $items,
        array $columns,
        string $anchorColumn
    ): array {
        $anchors = [];

        foreach (
            $items as $item
        ) {
            if (
                $this->isNoise(
                    $item['text']
                )
            ) {
                continue;
            }

            $column =
                $this->columnForX(
                    $item['x'],
                    $columns
                );

            if (
                $column !==
                $anchorColumn
            ) {
                continue;
            }

            if (
                $this->normalizeNif(
                    $item['text']
                ) === null
            ) {
                continue;
            }

            $anchors[] =
                $item;
        }

        usort(
            $anchors,
            fn (
                array $a,
                array $b
            ): int => $b['y'] <=>
                $a['y']
        );

        $rows = [];

        $anchorCount =
            count(
                $anchors
            );

        for (
            $index = 0;
            $index < $anchorCount;
            $index++
        ) {
            $anchor =
                $anchors[$index];

            $upperBoundary =
                $index === 0
                ? INF
                : (
                    $anchors[$index - 1]['y'] +
                    $anchor['y']
                ) / 2;

            $lowerBoundary =
                $index ===
                $anchorCount - 1
                ? -INF
                : (
                    $anchor['y'] +
                    $anchors[$index + 1]['y']
                ) / 2;

            $bucket = [];

            foreach (
                $items as $item
            ) {
                if (
                    $item['y'] >
                    $upperBoundary ||
                    $item['y'] <=
                    $lowerBoundary
                ) {
                    continue;
                }

                if (
                    $this->isNoise(
                        $item['text']
                    )
                ) {
                    continue;
                }

                $column =
                    $this->columnForX(
                        $item['x'],
                        $columns
                    );

                $bucket[$column][] = $item;
            }

            $row = [];

            foreach (
                array_keys(
                    $columns
                ) as $column
            ) {
                $row[$column] = $this->joinItems(
                    $bucket[$column]
                        ?? []
                );
            }

            $row[$anchorColumn] =
                $anchor['text'];

            $rows[] =
                $row;
        }

        return $rows;
    }

    private function columnForX(
        float $x,
        array $columns
    ): string {
        $names =
            array_keys(
                $columns
            );

        $positions =
            array_values(
                $columns
            );

        $count =
            count(
                $names
            );

        for (
            $index = 0;
            $index < $count - 1;
            $index++
        ) {
            $boundary =
                (
                    $positions[$index] +
                    $positions[$index + 1]
                ) / 2;

            if (
                $x <
                $boundary
            ) {
                return $names[$index];
            }
        }

        return $names[$count - 1];
    }

    private function joinItems(
        array $items
    ): string {
        usort(
            $items,
            function (
                array $a,
                array $b
            ): int {
                $yCompare =
                    $b['y'] <=>
                    $a['y'];

                if (
                    $yCompare !== 0
                ) {
                    return $yCompare;
                }

                return $a['x'] <=>
                    $b['x'];
            }
        );

        $parts = [];

        foreach (
            $items as $item
        ) {
            $text =
                $this->cleanText(
                    $item['text']
                );

            if (
                $text === '' ||
                $this->isNoise(
                    $text
                )
            ) {
                continue;
            }

            $parts[] =
                $text;
        }

        return $this->cleanText(
            implode(
                ' ',
                $parts
            )
        );
    }

    private function normalizeNif(
        string $value
    ): ?string {
        $digits =
            preg_replace(
                '/\D+/',
                '',
                $value
            );

        if (
            ! is_string(
                $digits
            ) ||
            strlen(
                $digits
            ) !== 9
        ) {
            return null;
        }

        return $digits;
    }

    private function extractImtDate(
        array $pages
    ): string {
        $text =
            $pages[0]
                ->getText();

        if (
            ! preg_match(
                '/(\d{1,2})\s+([A-ZÁÉÍÓÚÇÃÕ]+)\s+(\d{4})/iu',
                $text,
                $matches
            )
        ) {
            throw new RuntimeException(
                'Não foi possível identificar a data da lista IMT.'
            );
        }

        $monthName =
            mb_strtoupper(
                $matches[2],
                'UTF-8'
            );

        $month =
            self::PORTUGUESE_MONTHS[$monthName]
            ?? null;

        if ($month === null) {
            throw new RuntimeException(
                "Mês IMT desconhecido: {$monthName}"
            );
        }

        return sprintf(
            '%04d-%02d-%02d',
            (int) $matches[3],
            $month,
            (int) $matches[1]
        );
    }

    private function extractRamDate(
        array $pages
    ): string {
        foreach (
            array_reverse(
                $pages
            ) as $page
        ) {
            $text =
                $page->getText();

            if (
                ! preg_match(
                    '/Atualizado\s+a:\s*(\d{2})\/(\d{2})\/(\d{4})/iu',
                    $text,
                    $matches
                )
            ) {
                continue;
            }

            return sprintf(
                '%04d-%02d-%02d',
                (int) $matches[3],
                (int) $matches[2],
                (int) $matches[1]
            );
        }

        throw new RuntimeException(
            'Não foi possível identificar a data da lista RAM.'
        );
    }

    private function isRamPlatformPage(
        string $text
    ): bool {
        $text =
            $this->lower(
                $text
            );

        return str_contains(
            $text,
            'operadores de plataforma eletrónica'
        ) ||
            str_contains(
                $text,
                'operadores de plataforma eletronica'
            );
    }

    private function isNoise(
        string $text
    ): bool {
        $text =
            $this->cleanText(
                $text
            );

        $lower =
            $this->lower(
                $text
            );

        if (
            in_array(
                $lower,
                [
                    'nif',
                    'distrito',
                    'concelho',
                    'licença',
                    'licenca',
                    'denominação',
                    'denominacao',
                    'denominação social',
                    'denominacao social',
                    'localidade postal',
                ],
                true
            )
        ) {
            return true;
        }

        if (
            str_contains(
                $lower,
                'tvde - lista de operadores por distrito'
            ) ||
            str_contains(
                $lower,
                'listagem de operadores tvde - ram'
            )
        ) {
            return true;
        }

        if (
            preg_match(
                '/^\d{1,2}\s+[A-ZÁÉÍÓÚÇÃÕ]+\s+\d{4}$/iu',
                $text
            )
        ) {
            return true;
        }

        if (
            preg_match(
                '/^\d+\/\d+$/',
                $text
            )
        ) {
            return true;
        }

        if (
            preg_match(
                '/^Atualizado\s+a:/iu',
                $text
            )
        ) {
            return true;
        }

        return false;
    }

    private function normalizeSource(
        string $source
    ): string {
        $source =
            $this->lower(
                trim(
                    $source
                )
            );

        return match ($source) {
            'imt',
            'imt_continental',
            'continental' => TvdeImport::SOURCE_IMT,

            'ram',
            'madeira' => TvdeImport::SOURCE_RAM,

            default => throw new RuntimeException(
                "Fonte inválida: {$source}. Use imt ou ram."
            ),
        };
    }

    private function cleanText(
        string $value
    ): string {
        $value =
            str_replace(
                [
                    "\u{00A0}",
                    "\r",
                    "\n",
                    "\t",
                ],
                [
                    ' ',
                    ' ',
                    ' ',
                    ' ',
                ],
                $value
            );

        $value =
            preg_replace(
                '/\s+/u',
                ' ',
                $value
            );

        return trim(
            $value
                ?? ''
        );
    }

    private function lower(
        string $value
    ): string {
        return mb_strtolower(
            $this->cleanText(
                $value
            ),
            'UTF-8'
        );
    }
}
