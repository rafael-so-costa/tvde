<?php

use App\Models\CrmActivity;
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

function crmActivityHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function crmActivityAdmin(): User
{
    $user = User::factory()->create([
        'email' => 'crm.activity.admin@frotapro.test',
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

function crmActivityLogin($test, User $user): void
{
    $test
        ->postJson('/login', [
            'email' => $user->email,
            'password' => 'SenhaTeste123!',
        ])
        ->assertOk();
}

function crmActivityLead(): CrmLead
{
    $stage = CrmPipelineStage::query()
        ->where('code', 'new')
        ->firstOrFail();

    return CrmLead::create([
        'current_stage_id' => $stage->id,
        'company_name' => 'Lead Atividades',
        'source' => CrmLead::SOURCE_MANUAL,
        'priority' => CrmLead::PRIORITY_NORMAL,
    ]);
}

test('chamada concluída atualiza último contacto do lead', function () {
    $lead = crmActivityLead();

    $admin = crmActivityAdmin();

    crmActivityLogin($this, $admin);

    $this
        ->withHeaders(crmActivityHeaders())
        ->postJson(
            "/api/backoffice/crm/leads/{$lead->id}/atividades",
            [
                'type' => CrmActivity::TYPE_CALL,
                'status' => CrmActivity::STATUS_COMPLETED,
                'subject' => 'Contacto telefónico',
                'outcome' => 'Cliente interessado.',
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.type',
            CrmActivity::TYPE_CALL
        )
        ->assertJsonPath(
            'data.status',
            CrmActivity::STATUS_COMPLETED
        );

    expect(
        $lead->refresh()->last_contacted_at
    )->not->toBeNull();
});

test('atividade planeada pode ser concluída', function () {
    $lead = crmActivityLead();

    $admin = crmActivityAdmin();

    crmActivityLogin($this, $admin);

    $response = $this
        ->withHeaders(crmActivityHeaders())
        ->postJson(
            "/api/backoffice/crm/leads/{$lead->id}/atividades",
            [
                'type' => CrmActivity::TYPE_FOLLOW_UP,
                'status' => CrmActivity::STATUS_PLANNED,
                'subject' => 'Follow-up comercial',
                'scheduled_at' => now()
                    ->addDay()
                    ->toDateTimeString(),
            ]
        )
        ->assertCreated();

    $activityId = $response->json('data.id');

    $this
        ->withHeaders(crmActivityHeaders())
        ->postJson(
            "/api/backoffice/crm/atividades/{$activityId}/concluir",
            [
                'outcome' => 'Follow-up realizado.',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            CrmActivity::STATUS_COMPLETED
        )
        ->assertJsonPath(
            'data.outcome',
            'Follow-up realizado.'
        );

    $this->assertDatabaseHas('crm_activities', [
        'id' => $activityId,
        'status' => CrmActivity::STATUS_COMPLETED,
    ]);
});

test('atividade planeada pode ser cancelada', function () {
    $lead = crmActivityLead();

    $activity = CrmActivity::create([
        'crm_lead_id' => $lead->id,
        'type' => CrmActivity::TYPE_TASK,
        'status' => CrmActivity::STATUS_PLANNED,
        'subject' => 'Preparar proposta',
        'scheduled_at' => now()->addDay(),
    ]);

    $admin = crmActivityAdmin();

    crmActivityLogin($this, $admin);

    $this
        ->withHeaders(crmActivityHeaders())
        ->postJson(
            "/api/backoffice/crm/atividades/{$activity->id}/cancelar"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            CrmActivity::STATUS_CANCELED
        );

    expect(
        $activity->refresh()->status
    )->toBe(CrmActivity::STATUS_CANCELED);
});
