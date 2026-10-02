<?php

use App\Models\Role;
use App\Models\Tenant;
use App\Models\TvdeImport;
use App\Models\TvdeImportChange;
use App\Models\TvdeOperator;
use App\Models\TvdeOperatorRegistration;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(
        RoleSeeder::class
    );
});

function crmFoundationHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function crmFoundationUser(
    bool $superAdmin
): User {
    $user =
        User::factory()
            ->create([
                'email' => $superAdmin
                        ? 'crm.foundation.admin@frotapro.test'
                        : 'crm.foundation.user@frotapro.test',

                'password' => Hash::make(
                    'SenhaTeste123!'
                ),

                'ativo' => true,
            ]);

    if ($superAdmin) {
        $role =
            Role::query()
                ->where(
                    'codigo',
                    'super_admin'
                )
                ->firstOrFail();

        UserRole::create([
            'user_id' => $user->id,

            'role_id' => $role->id,

            'tenant_id' => null,
        ]);
    }

    return $user;
}

function crmFoundationLogin(
    $test,
    User $user
): void {
    $test
        ->postJson(
            '/login',
            [
                'email' => $user->email,

                'password' => 'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

function crmFoundationImport(
    string $source,
    string $date,
    string $hash,
    int $total = 0
): TvdeImport {
    return TvdeImport::create([
        'source' => $source,

        'reference_date' => $date,

        'original_filename' => "{$source}.pdf",

        'file_hash' => $hash,

        'status' => TvdeImport::STATUS_COMPLETED,

        'total_records' => $total,

        'new_records' => $total,

        'started_at' => now(),

        'completed_at' => now(),
    ]);
}

function crmFoundationOperator(
    string $nif,
    string $name
): TvdeOperator {
    return TvdeOperator::create([
        'nif' => $nif,

        'display_name' => $name,
    ]);
}

function crmFoundationRegistration(
    TvdeOperator $operator,
    TvdeImport $import,
    string $source,
    string $sourceKey,
    bool $active = true
): TvdeOperatorRegistration {
    return TvdeOperatorRegistration::create([
        'tvde_operator_id' => $operator->id,

        'source' => $source,

        'jurisdiction' => $source ===
                TvdeImport::SOURCE_RAM
                ? TvdeOperatorRegistration::JURISDICTION_MADEIRA
                : TvdeOperatorRegistration::JURISDICTION_CONTINENTAL,

        'source_key' => $sourceKey,

        'denomination' => $operator->display_name,

        'license_number' => $source ===
                TvdeImport::SOURCE_RAM
                ? '8100'
                : null,

        'district' => $source ===
                TvdeImport::SOURCE_RAM
                ? 'Madeira'
                : 'Lisboa',

        'municipality' => $source ===
                TvdeImport::SOURCE_RAM
                ? 'Funchal'
                : 'Lisboa',

        'postal_locality' => $source ===
                TvdeImport::SOURCE_RAM
                ? null
                : 'Lisboa',

        'active' => $active,

        'record_hash' => hash(
            'sha256',
            $sourceKey
        ),

        'first_seen_import_id' => $import->id,

        'last_seen_import_id' => $import->id,

        'first_seen_at' => $import->reference_date,

        'last_seen_at' => $import->reference_date,

        'removed_in_import_id' => $active
                ? null
                : $import->id,

        'removed_at' => $active
                ? null
                : $import->reference_date,
    ]);
}

test(
    'dashboard crm exige autenticação',
    function () {
        $this
            ->withHeaders(
                crmFoundationHeaders()
            )
            ->getJson(
                '/api/backoffice/crm/dashboard'
            )
            ->assertUnauthorized();
    }
);

test(
    'utilizador comum não consulta importações tvde',
    function () {
        $user =
            crmFoundationUser(
                false
            );

        crmFoundationLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                crmFoundationHeaders()
            )
            ->getJson(
                '/api/backoffice/crm/importacoes'
            )
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'Acesso restrito ao backoffice FrotaPRO.'
            );
    }
);

test(
    'dashboard crm apresenta métricas da base tvde',
    function () {
        $imt =
            crmFoundationImport(
                TvdeImport::SOURCE_IMT,
                '2026-08-05',
                str_repeat(
                    'a',
                    64
                ),
                2
            );

        $ram =
            crmFoundationImport(
                TvdeImport::SOURCE_RAM,
                '2025-10-06',
                str_repeat(
                    'b',
                    64
                ),
                1
            );

        $operatorBoth =
            crmFoundationOperator(
                '515696544',
                'Operador Ambas Fontes'
            );

        $operatorImt =
            crmFoundationOperator(
                '515653780',
                'Operador IMT'
            );

        $operatorInactive =
            crmFoundationOperator(
                '519029828',
                'Operador Removido'
            );

        crmFoundationRegistration(
            $operatorBoth,
            $imt,
            TvdeImport::SOURCE_IMT,
            'imt_continental:515696544'
        );

        crmFoundationRegistration(
            $operatorBoth,
            $ram,
            TvdeImport::SOURCE_RAM,
            'ram:8100'
        );

        crmFoundationRegistration(
            $operatorImt,
            $imt,
            TvdeImport::SOURCE_IMT,
            'imt_continental:515653780'
        );

        crmFoundationRegistration(
            $operatorInactive,
            $imt,
            TvdeImport::SOURCE_IMT,
            'imt_continental:519029828',
            false
        );

        Tenant::create([
            'nome' => 'Cliente Existente',

            'slug' => 'cliente-existente',

            'nif' => '515696544',

            'ativo' => true,
        ]);

        $user =
            crmFoundationUser(
                true
            );

        crmFoundationLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                crmFoundationHeaders()
            )
            ->getJson(
                '/api/backoffice/crm/dashboard'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.metrics.operators_historical',
                3
            )
            ->assertJsonPath(
                'data.metrics.operators_active',
                2
            )
            ->assertJsonPath(
                'data.metrics.operators_inactive',
                1
            )
            ->assertJsonPath(
                'data.metrics.registrations_active',
                3
            )
            ->assertJsonPath(
                'data.metrics.imt_active',
                2
            )
            ->assertJsonPath(
                'data.metrics.ram_active',
                1
            )
            ->assertJsonPath(
                'data.metrics.both_sources',
                1
            )
            ->assertJsonPath(
                'data.metrics.customers',
                1
            )
            ->assertJsonPath(
                'data.metrics.prospects',
                1
            )
            ->assertJsonPath(
                'data.latest_sources.imt.total_records',
                2
            )
            ->assertJsonPath(
                'data.latest_sources.ram.total_records',
                1
            );
    }
);

test(
    'super admin lista importações e filtra por fonte',
    function () {
        crmFoundationImport(
            TvdeImport::SOURCE_IMT,
            '2026-08-05',
            str_repeat(
                'c',
                64
            ),
            24610
        );

        crmFoundationImport(
            TvdeImport::SOURCE_RAM,
            '2025-10-06',
            str_repeat(
                'd',
                64
            ),
            394
        );

        $user =
            crmFoundationUser(
                true
            );

        crmFoundationLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                crmFoundationHeaders()
            )
            ->getJson(
                '/api/backoffice/crm/importacoes?source=ram'
            )
            ->assertOk()
            ->assertJsonPath(
                'meta.total',
                1
            )
            ->assertJsonPath(
                'data.0.source',
                TvdeImport::SOURCE_RAM
            )
            ->assertJsonPath(
                'data.0.total_records',
                394
            );
    }
);

test(
    'super admin consulta importação com alterações paginadas',
    function () {
        $import =
            crmFoundationImport(
                TvdeImport::SOURCE_IMT,
                '2026-08-05',
                str_repeat(
                    'e',
                    64
                ),
                1
            );

        $operator =
            crmFoundationOperator(
                '515696544',
                '100 Rotas, Lda.'
            );

        $registration =
            crmFoundationRegistration(
                $operator,
                $import,
                TvdeImport::SOURCE_IMT,
                'imt_continental:515696544'
            );

        TvdeImportChange::create([
            'tvde_import_id' => $import->id,

            'tvde_operator_id' => $operator->id,

            'tvde_operator_registration_id' => $registration->id,

            'change_type' => TvdeImportChange::TYPE_CREATED,

            'changed_fields' => [
                'denomination',
            ],

            'after_data' => [
                'denomination' => '100 Rotas, Lda.',
            ],
        ]);

        $user =
            crmFoundationUser(
                true
            );

        crmFoundationLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                crmFoundationHeaders()
            )
            ->getJson(
                "/api/backoffice/crm/importacoes/{$import->id}?change_type=created"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.id',
                $import->id
            )
            ->assertJsonPath(
                'data.change_counts.created',
                1
            )
            ->assertJsonPath(
                'data.change_counts.updated',
                0
            )
            ->assertJsonPath(
                'data.changes.meta.total',
                1
            )
            ->assertJsonPath(
                'data.changes.data.0.operator.nif',
                '515696544'
            )
            ->assertJsonPath(
                'data.changes.data.0.change_type',
                TvdeImportChange::TYPE_CREATED
            );
    }
);
