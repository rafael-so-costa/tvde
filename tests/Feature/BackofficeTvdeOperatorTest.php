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

function backofficeTvdeHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function backofficeTvdeUser(
    bool $superAdmin
): User {
    $user = User::factory()
        ->create([
            'email' => $superAdmin
                ? 'tvde.superadmin@frotapro.test'
                : 'tvde.user@frotapro.test',

            'password' => Hash::make(
                'SenhaTeste123!'
            ),

            'ativo' => true,
        ]);

    if ($superAdmin) {
        $role = Role::query()
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

function backofficeTvdeLogin(
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

function backofficeTvdeImport(
    string $source,
    string $date,
    string $hash
): TvdeImport {
    return TvdeImport::create([
        'source' => $source,

        'reference_date' => $date,

        'original_filename' => "{$source}.pdf",

        'file_hash' => $hash,

        'status' => TvdeImport::STATUS_COMPLETED,

        'started_at' => now(),

        'completed_at' => now(),
    ]);
}

function backofficeTvdeOperator(
    string $nif,
    string $name
): TvdeOperator {
    return TvdeOperator::create([
        'nif' => $nif,

        'display_name' => $name,
    ]);
}

function backofficeTvdeRegistration(
    TvdeOperator $operator,
    TvdeImport $import,
    string $source,
    string $sourceKey,
    string $district,
    string $municipality,
    ?string $license = null,
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

        'license_number' => $license,

        'district' => $district,

        'municipality' => $municipality,

        'postal_locality' => $municipality,

        'active' => $active,

        'record_hash' => hash(
            'sha256',
            $sourceKey
        ),

        'first_seen_import_id' => $import->id,

        'last_seen_import_id' => $import->id,

        'first_seen_at' => $import->reference_date,

        'last_seen_at' => $import->reference_date,

        'removed_at' => $active
                ? null
                : $import->reference_date,
    ]);
}

test(
    'base tvde do backoffice exige autenticação',
    function () {
        $this
            ->withHeaders(
                backofficeTvdeHeaders()
            )
            ->getJson(
                '/api/backoffice/crm/operadores'
            )
            ->assertUnauthorized();
    }
);

test(
    'utilizador comum não consulta base tvde',
    function () {
        $user =
            backofficeTvdeUser(
                false
            );

        backofficeTvdeLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                backofficeTvdeHeaders()
            )
            ->getJson(
                '/api/backoffice/crm/operadores'
            )
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'Acesso restrito ao backoffice FrotaPRO.'
            );
    }
);

test(
    'super admin lista operadores tvde',
    function () {
        $import =
            backofficeTvdeImport(
                TvdeImport::SOURCE_IMT,
                '2026-08-05',
                str_repeat(
                    'a',
                    64
                )
            );

        $operator =
            backofficeTvdeOperator(
                '515696544',
                '100 Rotas, Lda.'
            );

        backofficeTvdeRegistration(
            $operator,
            $import,
            TvdeImport::SOURCE_IMT,
            'imt_continental:515696544',
            'Aveiro',
            'Albergaria-A-Velha'
        );

        $user =
            backofficeTvdeUser(
                true
            );

        backofficeTvdeLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                backofficeTvdeHeaders()
            )
            ->getJson(
                '/api/backoffice/crm/operadores'
            )
            ->assertOk()
            ->assertJsonPath(
                'meta.total',
                1
            )
            ->assertJsonPath(
                'data.0.nif',
                '515696544'
            )
            ->assertJsonPath(
                'data.0.display_name',
                '100 Rotas, Lda.'
            )
            ->assertJsonPath(
                'data.0.active',
                true
            )
            ->assertJsonPath(
                'data.0.is_customer',
                false
            )
            ->assertJsonPath(
                'data.0.sources.0',
                TvdeImport::SOURCE_IMT
            );
    }
);

test(
    'lista operadores permite pesquisar e filtrar',
    function () {
        $imt =
            backofficeTvdeImport(
                TvdeImport::SOURCE_IMT,
                '2026-08-05',
                str_repeat(
                    'b',
                    64
                )
            );

        $ram =
            backofficeTvdeImport(
                TvdeImport::SOURCE_RAM,
                '2025-10-06',
                str_repeat(
                    'c',
                    64
                )
            );

        $aveiro =
            backofficeTvdeOperator(
                '515696544',
                '100 Rotas, Lda.'
            );

        $madeira =
            backofficeTvdeOperator(
                '516057464',
                'Estradacrobática- Unipessoal Lda'
            );

        backofficeTvdeRegistration(
            $aveiro,
            $imt,
            TvdeImport::SOURCE_IMT,
            'imt_continental:515696544',
            'Aveiro',
            'Albergaria-A-Velha'
        );

        backofficeTvdeRegistration(
            $madeira,
            $ram,
            TvdeImport::SOURCE_RAM,
            'ram:8100',
            'Madeira',
            'Câmara de Lobos',
            '8100'
        );

        $user =
            backofficeTvdeUser(
                true
            );

        backofficeTvdeLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                backofficeTvdeHeaders()
            )
            ->getJson(
                '/api/backoffice/crm/operadores?source=ram&district=Madeira&search=Estrada'
            )
            ->assertOk()
            ->assertJsonPath(
                'meta.total',
                1
            )
            ->assertJsonPath(
                'data.0.nif',
                '516057464'
            )
            ->assertJsonPath(
                'data.0.registrations.0.license_number',
                '8100'
            );
    }
);

test(
    'lista identifica operador que já é cliente frotapro',
    function () {
        $import =
            backofficeTvdeImport(
                TvdeImport::SOURCE_IMT,
                '2026-08-05',
                str_repeat(
                    'd',
                    64
                )
            );

        $operator =
            backofficeTvdeOperator(
                '515696544',
                '100 Rotas, Lda.'
            );

        backofficeTvdeRegistration(
            $operator,
            $import,
            TvdeImport::SOURCE_IMT,
            'imt_continental:515696544',
            'Aveiro',
            'Albergaria-A-Velha'
        );

        Tenant::create([
            'nome' => '100 Rotas FrotaPRO',

            'slug' => '100-rotas',

            'nif' => '515696544',

            'ativo' => true,
        ]);

        $user =
            backofficeTvdeUser(
                true
            );

        backofficeTvdeLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                backofficeTvdeHeaders()
            )
            ->getJson(
                '/api/backoffice/crm/operadores?customer=yes'
            )
            ->assertOk()
            ->assertJsonPath(
                'meta.total',
                1
            )
            ->assertJsonPath(
                'data.0.is_customer',
                true
            )
            ->assertJsonPath(
                'data.0.customers.0.nome',
                '100 Rotas FrotaPRO'
            );
    }
);

test(
    'super admin consulta detalhe e histórico do operador',
    function () {
        $import =
            backofficeTvdeImport(
                TvdeImport::SOURCE_IMT,
                '2026-08-05',
                str_repeat(
                    'e',
                    64
                )
            );

        $operator =
            backofficeTvdeOperator(
                '515696544',
                '100 Rotas, Lda.'
            );

        $registration =
            backofficeTvdeRegistration(
                $operator,
                $import,
                TvdeImport::SOURCE_IMT,
                'imt_continental:515696544',
                'Aveiro',
                'Albergaria-A-Velha'
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
            backofficeTvdeUser(
                true
            );

        backofficeTvdeLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                backofficeTvdeHeaders()
            )
            ->getJson(
                "/api/backoffice/crm/operadores/{$operator->id}"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.nif',
                '515696544'
            )
            ->assertJsonPath(
                'data.source_presence.imt',
                true
            )
            ->assertJsonPath(
                'data.source_presence.ram',
                false
            )
            ->assertJsonPath(
                'data.registrations.0.district',
                'Aveiro'
            )
            ->assertJsonPath(
                'data.changes.0.change_type',
                TvdeImportChange::TYPE_CREATED
            );
    }
);
