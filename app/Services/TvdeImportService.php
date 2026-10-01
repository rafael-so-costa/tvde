<?php

namespace App\Services;

use App\Models\TvdeImport;
use App\Models\TvdeImportChange;
use App\Models\TvdeOperator;
use App\Models\TvdeOperatorRegistration;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class TvdeImportService
{
    public function __construct(
        private readonly TvdePdfParserService $parser
    ) {}

    public function import(
        string $path,
        string $source,
        ?string $userId = null
    ): TvdeImport {
        if (! is_file($path)) {
            throw new RuntimeException(
                "Ficheiro não encontrado: {$path}"
            );
        }

        $fileHash = hash_file(
            'sha256',
            $path
        );

        if (! is_string($fileHash)) {
            throw new RuntimeException(
                'Não foi possível calcular o hash do ficheiro.'
            );
        }

        $duplicate = TvdeImport::query()
            ->where(
                'file_hash',
                $fileHash
            )
            ->first();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'file' => sprintf(
                    'Este ficheiro já foi importado em %s. Importação %s.',
                    $duplicate->created_at?->format(
                        'd/m/Y H:i'
                    ) ?? 'data desconhecida',
                    $duplicate->id
                ),
            ]);
        }

        $parsed = $this->parser->parse(
            $path,
            $source
        );

        $this->guardChronologicalOrder(
            $parsed['source'],
            $parsed['reference_date']
        );

        $import = TvdeImport::create([
            'source' => $parsed['source'],

            'reference_date' => $parsed['reference_date'],

            'original_filename' => basename(
                $path
            ),

            'file_hash' => $fileHash,

            'status' => TvdeImport::STATUS_PROCESSING,

            'metadata' => [
            'total_pages' => $parsed['total_pages'],

            'parsed_pages' => $parsed['parsed_pages'],

            'skipped_pages' => $parsed['skipped_pages'],

            'file_size' => filesize(
                $path
            ),
            ],

            'imported_by' => $userId,

            'started_at' => now(),
        ]);

        try {
            DB::transaction(
                function () use (
                    $import,
                    $parsed
                ): void {
                    $this->persist(
                        $import,
                        $parsed
                    );
                }
            );
        } catch (Throwable $exception) {
            $import->forceFill([
                'status' => TvdeImport::STATUS_FAILED,

                'completed_at' => now(),

                'error_message' => mb_substr(
                    $exception->getMessage(),
                    0,
                    65535
                ),
            ])->save();

            throw $exception;
        }

        return $import->refresh();
    }

    private function persist(
        TvdeImport $import,
        array $parsed
    ): void {
        $records =
            $parsed['records'];

        $referenceDate =
            CarbonImmutable::parse(
                $parsed['reference_date']
            )
                ->startOfDay();

        $now = now();

        $nifs =
            array_values(
                array_unique(
                    array_map(
                        fn (array $record): string => $record['nif'],
                        $records
                    )
                )
            );

        $operators =
            $this->loadOperatorsByNifs(
                $nifs
            );

        $newOperatorCount =
            $this->createMissingOperators(
                $records,
                $operators,
                $now
            );

        $operators =
            $this->loadOperatorsByNifs(
                $nifs
            );

        $existingRegistrations =
            TvdeOperatorRegistration::query()
                ->where(
                    'source',
                    $parsed['source']
                )
                ->get()
                ->keyBy(
                    'source_key'
                );

        $operatorsWithImt =
            $parsed['source'] ===
                TvdeImport::SOURCE_RAM
                    ? $this->loadOperatorsWithActiveImt(
                        $operators
                            ->pluck('id')
                            ->all()
                    )
                    : [];

        $seenSourceKeys = [];

        $newRegistrationRows = [];
        $changeRows = [];
        $unchangedRegistrationIds = [];

        $newCount = 0;
        $changedCount = 0;
        $removedCount = 0;
        $restoredCount = 0;
        $unchangedCount = 0;

        foreach (
            $records as $record
        ) {
            $operator =
                $operators->get(
                    $record['nif']
                );

            if (! $operator) {
                throw new RuntimeException(
                    sprintf(
                        'Operador não encontrado após criação: NIF %s.',
                        $record['nif']
                    )
                );
            }

            $sourceKey =
                $record['source_key'];

            $seenSourceKeys[
                $sourceKey
            ] = true;

            $recordHash =
                $this->recordHash(
                    $record
                );

            $registration =
                $existingRegistrations->get(
                    $sourceKey
                );

            if (! $registration) {
                $registrationId =
                    (string) Str::uuid();

                $newRegistrationRows[] =
                    $this->registrationInsertRow(
                        $registrationId,
                        $operator,
                        $record,
                        $recordHash,
                        $import,
                        $referenceDate,
                        $now
                    );

                $after =
                    $this->recordSnapshot(
                        $record,
                        true
                    );

                $changeRows[] =
                    $this->changeInsertRow(
                        $import->id,
                        $operator->id,
                        $registrationId,
                        TvdeImportChange::TYPE_CREATED,
                        array_keys(
                            $after
                        ),
                        null,
                        $after,
                        $now
                    );

                $this->syncOperatorName(
                    $operator,
                    $record,
                    $parsed['source'],
                    $operatorsWithImt
                );

                $newCount++;

                continue;
            }

            $before =
                $this->registrationSnapshot(
                    $registration
                );

            $wasActive =
                $registration->active;

            $changedFields =
                $this->changedBusinessFields(
                    $registration,
                    $record
                );

            if (
                $wasActive &&
                $changedFields === []
            ) {
                $unchangedRegistrationIds[] =
                    $registration->id;

                $unchangedCount++;

                continue;
            }

            $registration->fill([
                'tvde_operator_id' => $operator->id,

                'jurisdiction' => $record['jurisdiction'],

                'denomination' => $record['denomination'],

                'license_number' => $record['license_number'],

                'district' => $record['district'],

                'municipality' => $record['municipality'],

                'postal_locality' => $record['postal_locality'],

                'active' => true,

                'record_hash' => $recordHash,

                'raw_data' => $record['raw_data'],

                'last_seen_import_id' => $import->id,

                'last_seen_at' => $referenceDate,

                'removed_in_import_id' => null,

                'removed_at' => null,
            ]);

            if (
                ! $registration
                    ->first_seen_import_id
            ) {
                $registration
                    ->first_seen_import_id =
                    $import->id;
            }

            if (
                ! $registration
                    ->first_seen_at
            ) {
                $registration
                    ->first_seen_at =
                    $referenceDate;
            }

            $registration->save();

            $after =
                $this->registrationSnapshot(
                    $registration
                );

            if (! $wasActive) {
                $fields =
                    array_values(
                        array_unique([
                            'active',
                            ...$changedFields,
                        ])
                    );

                $changeRows[] =
                    $this->changeInsertRow(
                        $import->id,
                        $operator->id,
                        $registration->id,
                        TvdeImportChange::TYPE_RESTORED,
                        $fields,
                        $before,
                        $after,
                        $now
                    );

                $restoredCount++;
            } else {
                $changeRows[] =
                    $this->changeInsertRow(
                        $import->id,
                        $operator->id,
                        $registration->id,
                        TvdeImportChange::TYPE_UPDATED,
                        $changedFields,
                        $before,
                        $after,
                        $now
                    );

                $changedCount++;
            }

            if (
                in_array(
                    'denomination',
                    $changedFields,
                    true
                )
            ) {
                $this->syncOperatorName(
                    $operator,
                    $record,
                    $parsed['source'],
                    $operatorsWithImt
                );
            }
        }

        foreach (
            array_chunk(
                $newRegistrationRows,
                500
            ) as $chunk
        ) {
            DB::table(
                'tvde_operator_registrations'
            )->insert(
                $chunk
            );
        }

        foreach (
            array_chunk(
                $unchangedRegistrationIds,
                1000
            ) as $chunk
        ) {
            TvdeOperatorRegistration::query()
                ->whereIn(
                    'id',
                    $chunk
                )
                ->update([
                    'last_seen_import_id' => $import->id,

                    'last_seen_at' => $referenceDate,

                    'updated_at' => $now,
                ]);
        }

        foreach (
            $existingRegistrations as $sourceKey => $registration
        ) {
            if (
                ! $registration->active ||
                isset(
                    $seenSourceKeys[
                        $sourceKey
                    ]
                )
            ) {
                continue;
            }

            $before =
                $this->registrationSnapshot(
                    $registration
                );

            $registration->active =
                false;

            $registration
                ->removed_in_import_id =
                $import->id;

            $registration->removed_at =
                $referenceDate;

            $registration->save();

            $after =
                $this->registrationSnapshot(
                    $registration
                );

            $changeRows[] =
                $this->changeInsertRow(
                    $import->id,
                    $registration
                        ->tvde_operator_id,
                    $registration->id,
                    TvdeImportChange::TYPE_REMOVED,
                    [
                        'active',
                    ],
                    $before,
                    $after,
                    $now
                );

            $removedCount++;
        }

        foreach (
            array_chunk(
                $changeRows,
                500
            ) as $chunk
        ) {
            DB::table(
                'tvde_import_changes'
            )->insert(
                $chunk
            );
        }

        $metadata =
            $import->metadata
            ?? [];

        $metadata[
            'new_operators'
        ] =
            $newOperatorCount;

        $metadata[
            'unique_nifs'
        ] =
            count(
                $nifs
            );

        $import->forceFill([
            'status' => TvdeImport::STATUS_COMPLETED,

            'total_records' => count(
                $records
            ),

            'new_records' => $newCount,

            'changed_records' => $changedCount,

            'removed_records' => $removedCount,

            'restored_records' => $restoredCount,

            'unchanged_records' => $unchangedCount,

            'metadata' => $metadata,

            'completed_at' => now(),

            'error_message' => null,
        ])->save();
    }

    private function createMissingOperators(
        array $records,
        Collection $existing,
        $now
    ): int {
        $existingNifs =
            array_fill_keys(
                $existing
                    ->keys()
                    ->all(),
                true
            );

        $names = [];

        foreach (
            $records as $record
        ) {
            $nif =
                $record['nif'];

            if (
                isset(
                    $existingNifs[
                        $nif
                    ]
                ) ||
                isset(
                    $names[
                        $nif
                    ]
                )
            ) {
                continue;
            }

            $names[
                $nif
            ] =
                $record[
                    'denomination'
                ];
        }

        $rows = [];

        foreach (
            $names as $nif => $name
        ) {
            $rows[] = [
                'id' => (string) Str::uuid(),

                'nif' => $nif,

                'display_name' => $name,

                'created_at' => $now,

                'updated_at' => $now,
            ];
        }

        foreach (
            array_chunk(
                $rows,
                500
            ) as $chunk
        ) {
            DB::table(
                'tvde_operators'
            )->insert(
                $chunk
            );
        }

        return count(
            $rows
        );
    }

    private function loadOperatorsByNifs(
        array $nifs
    ): Collection {
        $operators =
            collect();

        foreach (
            array_chunk(
                $nifs,
                1000
            ) as $chunk
        ) {
            TvdeOperator::query()
                ->whereIn(
                    'nif',
                    $chunk
                )
                ->get()
                ->each(
                    function (
                        TvdeOperator $operator
                    ) use (
                        $operators
                    ): void {
                        $operators->put(
                            $operator->nif,
                            $operator
                        );
                    }
                );
        }

        return $operators;
    }

    private function loadOperatorsWithActiveImt(
        array $operatorIds
    ): array {
        $result = [];

        foreach (
            array_chunk(
                $operatorIds,
                1000
            ) as $chunk
        ) {
            TvdeOperatorRegistration::query()
                ->where(
                    'source',
                    TvdeImport::SOURCE_IMT
                )
                ->where(
                    'active',
                    true
                )
                ->whereIn(
                    'tvde_operator_id',
                    $chunk
                )
                ->pluck(
                    'tvde_operator_id'
                )
                ->each(
                    function (
                        string $operatorId
                    ) use (
                        &$result
                    ): void {
                        $result[
                            $operatorId
                        ] = true;
                    }
                );
        }

        return $result;
    }

    private function syncOperatorName(
        TvdeOperator $operator,
        array $record,
        string $source,
        array $operatorsWithImt
    ): void {
        $canUpdate =
            $source ===
                TvdeImport::SOURCE_IMT ||
            ! isset(
                $operatorsWithImt[
                    $operator->id
                ]
            );

        if (
            ! $canUpdate ||
            $operator->display_name ===
                $record['denomination']
        ) {
            return;
        }

        $operator->display_name =
            $record[
                'denomination'
            ];

        $operator->save();
    }

    private function registrationInsertRow(
        string $id,
        TvdeOperator $operator,
        array $record,
        string $recordHash,
        TvdeImport $import,
        CarbonImmutable $referenceDate,
        $now
    ): array {
        return [
            'id' => $id,

            'tvde_operator_id' => $operator->id,

            'source' => $record['source'],

            'jurisdiction' => $record['jurisdiction'],

            'source_key' => $record['source_key'],

            'denomination' => $record['denomination'],

            'license_number' => $record['license_number'],

            'district' => $record['district'],

            'municipality' => $record['municipality'],

            'postal_locality' => $record['postal_locality'],

            'active' => true,

            'record_hash' => $recordHash,

            'raw_data' => json_encode(
                $record['raw_data'],
                JSON_THROW_ON_ERROR
                | JSON_UNESCAPED_UNICODE
                | JSON_UNESCAPED_SLASHES
            ),

            'first_seen_import_id' => $import->id,

            'last_seen_import_id' => $import->id,

            'removed_in_import_id' => null,

            'first_seen_at' => $referenceDate,

            'last_seen_at' => $referenceDate,

            'removed_at' => null,

            'created_at' => $now,

            'updated_at' => $now,
        ];
    }

    private function recordHash(
        array $record
    ): string {
        return hash(
            'sha256',
            json_encode(
                $this->recordBusinessData(
                    $record
                ),
                JSON_THROW_ON_ERROR
                | JSON_UNESCAPED_UNICODE
                | JSON_UNESCAPED_SLASHES
            )
        );
    }

    private function recordBusinessData(
        array $record
    ): array {
        return [
            'denomination' => $record['denomination'],

            'license_number' => $record['license_number'],

            'district' => $record['district'],

            'municipality' => $record['municipality'],

            'postal_locality' => $record['postal_locality'],
        ];
    }

    private function recordSnapshot(
        array $record,
        bool $active
    ): array {
        return [
            ...$this->recordBusinessData(
                $record
            ),

            'active' => $active,
        ];
    }

    private function registrationSnapshot(
        TvdeOperatorRegistration $registration
    ): array {
        return [
            'denomination' => $registration
                ->denomination,

            'license_number' => $registration
                ->license_number,

            'district' => $registration
                ->district,

            'municipality' => $registration
                ->municipality,

            'postal_locality' => $registration
                ->postal_locality,

            'active' => $registration
                ->active,
        ];
    }

    private function changedBusinessFields(
        TvdeOperatorRegistration $registration,
        array $record
    ): array {
        $current = [
            'denomination' => $registration
                ->denomination,

            'license_number' => $registration
                ->license_number,

            'district' => $registration
                ->district,

            'municipality' => $registration
                ->municipality,

            'postal_locality' => $registration
                ->postal_locality,
        ];

        $incoming =
            $this->recordBusinessData(
                $record
            );

        $changed = [];

        foreach (
            $incoming as $field => $value
        ) {
            if (
                $current[
                    $field
                ] !==
                $value
            ) {
                $changed[] =
                    $field;
            }
        }

        return $changed;
    }

    private function changeInsertRow(
        string $importId,
        string $operatorId,
        ?string $registrationId,
        string $type,
        array $changedFields,
        ?array $before,
        ?array $after,
        $now
    ): array {
        return [
            'id' => (string) Str::uuid(),

            'tvde_import_id' => $importId,

            'tvde_operator_id' => $operatorId,

            'tvde_operator_registration_id' => $registrationId,

            'change_type' => $type,

            'changed_fields' => json_encode(
                $changedFields,
                JSON_THROW_ON_ERROR
                | JSON_UNESCAPED_UNICODE
                | JSON_UNESCAPED_SLASHES
            ),

            'before_data' => $before === null
                    ? null
                    : json_encode(
                        $before,
                        JSON_THROW_ON_ERROR
                        | JSON_UNESCAPED_UNICODE
                        | JSON_UNESCAPED_SLASHES
                    ),

            'after_data' => $after === null
                    ? null
                    : json_encode(
                        $after,
                        JSON_THROW_ON_ERROR
                        | JSON_UNESCAPED_UNICODE
                        | JSON_UNESCAPED_SLASHES
                    ),

            'created_at' => $now,

            'updated_at' => $now,
        ];
    }

    private function guardChronologicalOrder(
        string $source,
        string $referenceDate
    ): void {
        $latest =
            TvdeImport::query()
                ->where(
                    'source',
                    $source
                )
                ->where(
                    'status',
                    TvdeImport::STATUS_COMPLETED
                )
                ->orderByDesc(
                    'reference_date'
                )
                ->first();

        if (! $latest) {
            return;
        }

        $incoming =
            CarbonImmutable::parse(
                $referenceDate
            )
                ->startOfDay();

        $current =
            CarbonImmutable::parse(
                $latest->reference_date
            )
                ->startOfDay();

        if (
            $incoming->greaterThan(
                $current
            )
        ) {
            return;
        }

        throw ValidationException::withMessages([
            'reference_date' => sprintf(
                'A fonte %s já possui uma importação mais recente ou da mesma data (%s). Os snapshots devem ser importados em ordem cronológica.',
                $source,
                $current->format(
                    'd/m/Y'
                )
            ),
        ]);
    }
}
