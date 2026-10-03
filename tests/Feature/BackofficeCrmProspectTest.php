<?php

use App\Models\CrmLead;
use App\Models\CrmPipelineStage;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TvdeImport;
use App\Models\TvdeOperator;
use App\Models\TvdeOperatorRegistration;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\CrmPipelineStageSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([
        RoleSeeder::class,
        CrmPipelineStageSeeder::class,
    ]);
});

function crmProspectHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function crmProspectAdmin(): User
{
    $user = User::factory()->create([
        'email' => 'crm.prospect.admin@frotapro.test',
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);

    $role = Role::query()
        ->where('codigo', 'super_admin')
        ->firstOrFail();

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => null,
    ]);

    return $user;
}

function crmProspectLogin($test, User $user): void
{
    $test
        ->postJson('/login', [
            'email' => $user->email,
            'password' => 'SenhaTeste123!',
        ])
        ->assertOk();
}

function crmProspectImport(): TvdeImport
{
    return TvdeImport::create([
        'source' => TvdeImport::SOURCE_IMT,
        'reference_date' => '2026-08-05',
        'original_filename' => 'tvde.pdf',
        'file_hash' => str_repeat('f', 64),
        'status' => TvdeImport::STATUS_COMPLETED,
        'total_records' => 3,
        'new_records' => 3,
        'started_at' => now(),
        'completed_at' => now(),
    ]);
}

function crmProspectOperator(
    TvdeImport $import,
    string $nif,
    string $name
): TvdeOperator {
    $operator = TvdeOperator::create([
        'nif' => $nif,
        'display_name' => $name,
    ]);

    TvdeOperatorRegistration::create([
        'tvde_operator_id' => $operator->id,
        'source' => TvdeImport::SOURCE_IMT,
        'jurisdiction' => TvdeOperatorRegistration::JURISDICTION_CONTINENTAL,
        'source_key' => "imt_continental:{$nif}",
        'denomination' => $name,
        'district' => 'Lisboa',
        'municipality' => 'Lisboa',
        'postal_locality' => 'Lisboa',
        'active' => true,
        'record_hash' => hash('sha256', $nif),
        'first_seen_import_id' => $import->id,
        'last_seen_import_id' => $import->id,
        'first_seen_at' => '2026-08-05',
        'last_seen_at' => '2026-08-05',
    ]);

    return $operator;
}

test('seleção de operadores cria apenas novos prospects', function () {
    $import = crmProspectImport();

    $newOperator = crmProspectOperator(
        $import,
        '509442013',
        'Novo Prospect TVDE'
    );

    $existingOperator = crmProspectOperator(
        $import,
        '515696544',
        'Lead Existente TVDE'
    );

    $customerOperator = crmProspectOperator(
        $import,
        '515653780',
        'Cliente Existente TVDE'
    );

    $stage = CrmPipelineStage::query()
        ->where('code', 'new')
        ->firstOrFail();

    CrmLead::create([
        'tvde_operator_id' => $existingOperator->id,
        'current_stage_id' => $stage->id,
        'nif' => $existingOperator->nif,
        'company_name' => $existingOperator->display_name,
        'source' => CrmLead::SOURCE_TVDE,
        'priority' => CrmLead::PRIORITY_NORMAL,
    ]);

    Tenant::create([
        'nome' => 'Cliente Existente',
        'slug' => 'cliente-existente-prospect',
        'nif' => $customerOperator->nif,
        'ativo' => true,
    ]);

    $admin = crmProspectAdmin();

    crmProspectLogin($this, $admin);

    $this
        ->withHeaders(crmProspectHeaders())
        ->postJson(
            '/api/backoffice/crm/prospects/operadores',
            [
                'operator_ids' => [
                    $newOperator->id,
                    $existingOperator->id,
                    $customerOperator->id,
                ],
                'priority' => CrmLead::PRIORITY_HIGH,
            ]
        )
        ->assertCreated()
        ->assertJsonPath('data.counts.requested', 3)
        ->assertJsonPath('data.counts.created', 1)
        ->assertJsonPath('data.counts.existing', 1)
        ->assertJsonPath('data.counts.customers', 1);

    $this->assertDatabaseHas('crm_leads', [
        'tvde_operator_id' => $newOperator->id,
        'nif' => '509442013',
        'source' => CrmLead::SOURCE_TVDE,
        'priority' => CrmLead::PRIORITY_HIGH,
    ]);

    expect(
        CrmLead::query()->count()
    )->toBe(2);
});
