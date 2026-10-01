<?php

namespace App\Console\Commands;

use App\Services\TvdeImportService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;
use Throwable;

class ImportTvdePdf extends Command
{
    protected $signature = 'tvde:import
        {file : Caminho completo do PDF}
        {--source= : Fonte da listagem: imt ou ram}';

    protected $description =
        'Importa um snapshot oficial de operadores TVDE';

    public function handle(
        TvdeImportService $service
    ): int {
        $file =
            (string) $this->argument(
                'file'
            );

        $source =
            trim(
                (string) $this->option(
                    'source'
                )
            );

        if ($source === '') {
            $this->error(
                'Indique --source=imt ou --source=ram.'
            );

            return self::FAILURE;
        }

        $this->info(
            'A importar operadores TVDE...'
        );

        try {
            $import =
                $service->import(
                    $file,
                    $source
                );
        } catch (
            ValidationException $exception
        ) {
            foreach (
                $exception->errors() as $messages
            ) {
                foreach (
                    $messages as $message
                ) {
                    $this->error(
                        $message
                    );
                }
            }

            return self::FAILURE;
        } catch (
            Throwable $exception
        ) {
            $this->error(
                $exception->getMessage()
            );

            return self::FAILURE;
        }

        $this->newLine();

        $this->table(
            [
                'Campo',
                'Resultado',
            ],
            [
                [
                    'Importação',
                    $import->id,
                ],
                [
                    'Fonte',
                    $import->source,
                ],
                [
                    'Data',
                    $import
                        ->reference_date
                        ->format(
                            'd/m/Y'
                        ),
                ],
                [
                    'Registos',
                    $import
                        ->total_records,
                ],
                [
                    'Novos',
                    $import
                        ->new_records,
                ],
                [
                    'Alterados',
                    $import
                        ->changed_records,
                ],
                [
                    'Restaurados',
                    $import
                        ->restored_records,
                ],
                [
                    'Removidos',
                    $import
                        ->removed_records,
                ],
                [
                    'Sem alteração',
                    $import
                        ->unchanged_records,
                ],
                [
                    'Novas entidades',
                    $import
                        ->metadata[
                            'new_operators'
                        ]
                        ?? 0,
                ],
            ]
        );

        $this->info(
            'Importação concluída.'
        );

        return self::SUCCESS;
    }
}
