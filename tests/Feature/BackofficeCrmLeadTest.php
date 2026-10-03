<?php

use App\Models\CrmLead;
use App\Models\CrmPipelineStage;
use App\Models\Role;
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

function crmLeadHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function crmLeadAdmin(): User
{
    $user = User::factory()->create([
        'email' => 'crm.leads.admin@frotapro.test',
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

function crmLeadLogin($test, User $user): void
{
    $test
        ->postJson('/login', [
            'email' => $user->email,
            'password' => 'SenhaTeste123!',
        ])
        ->assertOk();
}

test('listagem de leads exige autenticação', function () {
    $this
        ->withHeaders(crmLeadHeaders())
        ->getJson('/api/backoffice/crm/leads')
        ->assertUnauthorized();
});

test('super admin cria lead manual na etapa inicial', function () {
    $admin = crmLeadAdmin();

    crmLeadLogin($this, $admin);

    $response = $this
        ->withHeaders(crmLeadHeaders())
        ->postJson('/api/backoffice/crm/leads', [
            'company_name' => 'Empresa Comercial Teste',
            'nif' => '509442013',
            'email' => 'comercial@example.test',
            'phone' => '910000000',
            'priority' => CrmLead::PRIORITY_HIGH,
            'source' => CrmLead::SOURCE_MANUAL,
        ])
        ->assertCreated()
        ->assertJsonPath(
            'message',
            'Lead criado com sucesso.'
        )
        ->assertJsonPath(
            'data.company_name',
            'Empresa Comercial Teste'
        )
        ->assertJsonPath(
            'data.nif',
            '509442013'
        )
        ->assertJsonPath(
            'data.priority',
            CrmLead::PRIORITY_HIGH
        )
        ->assertJsonPath(
            'data.stage.code',
            'new'
        );

    $leadId = $response->json('data.id');

    $this->assertDatabaseHas('crm_leads', [
        'id' => $leadId,
        'nif' => '509442013',
        'company_name' => 'Empresa Comercial Teste',
        'created_by_user_id' => $admin->id,
    ]);

    $this->assertDatabaseHas(
        'crm_lead_stage_histories',
        [
            'crm_lead_id' => $leadId,
            'from_stage_id' => null,
            'changed_by_user_id' => $admin->id,
        ]
    );
});

test('nif não pode pertencer a dois leads', function () {
    $stage = CrmPipelineStage::query()
        ->where('code', 'new')
        ->firstOrFail();

    CrmLead::create([
        'current_stage_id' => $stage->id,
        'nif' => '509442013',
        'company_name' => 'Primeiro Lead',
        'source' => CrmLead::SOURCE_MANUAL,
        'priority' => CrmLead::PRIORITY_NORMAL,
    ]);

    $admin = crmLeadAdmin();

    crmLeadLogin($this, $admin);

    $this
        ->withHeaders(crmLeadHeaders())
        ->postJson('/api/backoffice/crm/leads', [
            'company_name' => 'Lead Duplicado',
            'nif' => '509442013',
            'source' => CrmLead::SOURCE_MANUAL,
            'priority' => CrmLead::PRIORITY_NORMAL,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('nif');
});

test('super admin lista e filtra leads por prioridade', function () {
    $stage = CrmPipelineStage::query()
        ->where('code', 'new')
        ->firstOrFail();

    CrmLead::create([
        'current_stage_id' => $stage->id,
        'company_name' => 'Lead Normal',
        'source' => CrmLead::SOURCE_MANUAL,
        'priority' => CrmLead::PRIORITY_NORMAL,
    ]);

    CrmLead::create([
        'current_stage_id' => $stage->id,
        'company_name' => 'Lead Urgente',
        'source' => CrmLead::SOURCE_MANUAL,
        'priority' => CrmLead::PRIORITY_URGENT,
    ]);

    $admin = crmLeadAdmin();

    crmLeadLogin($this, $admin);

    $this
        ->withHeaders(crmLeadHeaders())
        ->getJson(
            '/api/backoffice/crm/leads?priority=urgent'
        )
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath(
            'data.0.company_name',
            'Lead Urgente'
        )
        ->assertJsonPath(
            'data.0.priority',
            CrmLead::PRIORITY_URGENT
        );
});
