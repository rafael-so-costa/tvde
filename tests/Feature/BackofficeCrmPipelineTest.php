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

function crmPipelineHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function crmPipelineAdmin(): User
{
    $user = User::factory()->create([
        'email' => 'crm.pipeline.admin@frotapro.test',
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

function crmPipelineLogin($test, User $user): void
{
    $test
        ->postJson('/login', [
            'email' => $user->email,
            'password' => 'SenhaTeste123!',
        ])
        ->assertOk();
}

function crmPipelineLead(): CrmLead
{
    $stage = CrmPipelineStage::query()
        ->where('code', 'new')
        ->firstOrFail();

    return CrmLead::create([
        'current_stage_id' => $stage->id,
        'company_name' => 'Lead Pipeline',
        'source' => CrmLead::SOURCE_MANUAL,
        'priority' => CrmLead::PRIORITY_NORMAL,
    ]);
}

test('pipeline apresenta todas as etapas configuradas', function () {
    $admin = crmPipelineAdmin();

    crmPipelineLogin($this, $admin);

    $this
        ->withHeaders(crmPipelineHeaders())
        ->getJson('/api/backoffice/crm/pipeline')
        ->assertOk()
        ->assertJsonCount(13, 'data')
        ->assertJsonPath('data.0.code', 'new')
        ->assertJsonPath('data.0.is_default', true);
});

test('lead pode avançar de etapa e cria histórico', function () {
    $lead = crmPipelineLead();

    $contacted = CrmPipelineStage::query()
        ->where('code', 'contacted')
        ->firstOrFail();

    $admin = crmPipelineAdmin();

    crmPipelineLogin($this, $admin);

    $this
        ->withHeaders(crmPipelineHeaders())
        ->patchJson(
            "/api/backoffice/crm/leads/{$lead->id}/etapa",
            [
                'stage_id' => $contacted->id,
                'note' => 'Contacto efetuado.',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.current_stage.code',
            'contacted'
        );

    expect(
        $lead->refresh()->current_stage_id
    )->toBe($contacted->id);

    $this->assertDatabaseHas(
        'crm_lead_stage_histories',
        [
            'crm_lead_id' => $lead->id,
            'to_stage_id' => $contacted->id,
            'changed_by_user_id' => $admin->id,
            'note' => 'Contacto efetuado.',
        ]
    );
});

test('etapa cliente não pode ser selecionada sem conversão', function () {
    $lead = crmPipelineLead();

    $customer = CrmPipelineStage::query()
        ->where('code', 'customer')
        ->firstOrFail();

    $admin = crmPipelineAdmin();

    crmPipelineLogin($this, $admin);

    $this
        ->withHeaders(crmPipelineHeaders())
        ->patchJson(
            "/api/backoffice/crm/leads/{$lead->id}/etapa",
            [
                'stage_id' => $customer->id,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('stage_id');

    expect(
        $lead->refresh()->currentStage->code
    )->toBe('new');
});

test('etapa perdida exige motivo de encerramento', function () {
    $lead = crmPipelineLead();

    $lost = CrmPipelineStage::query()
        ->where('code', 'lost')
        ->firstOrFail();

    $admin = crmPipelineAdmin();

    crmPipelineLogin($this, $admin);

    $this
        ->withHeaders(crmPipelineHeaders())
        ->patchJson(
            "/api/backoffice/crm/leads/{$lead->id}/etapa",
            [
                'stage_id' => $lost->id,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('lost_reason');

    $this
        ->withHeaders(crmPipelineHeaders())
        ->patchJson(
            "/api/backoffice/crm/leads/{$lead->id}/etapa",
            [
                'stage_id' => $lost->id,
                'lost_reason' => 'Sem interesse no momento.',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.current_stage.code',
            'lost'
        )
        ->assertJsonPath(
            'data.lost_reason',
            'Sem interesse no momento.'
        );
});
