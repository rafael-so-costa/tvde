<?php

use App\Models\CrmActivity;
use App\Models\CrmLead;
use App\Models\CrmPipelineStage;
use App\Models\NifEnrichment;
use App\Models\NifEnrichmentBatch;
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

function crmDashboardCommercialHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function crmDashboardCommercialAdmin(): User
{
    $user = User::factory()->create([
        'email' => 'crm.dashboard.commercial@frotapro.test',
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

function crmDashboardCommercialLogin(
    $test,
    User $user
): void {
    $test
        ->postJson('/login', [
            'email' => $user->email,
            'password' => 'SenhaTeste123!',
        ])
        ->assertOk();
}

test('dashboard crm apresenta métricas comerciais e pipeline', function () {
    $new = CrmPipelineStage::query()
        ->where('code', 'new')
        ->firstOrFail();

    $customer = CrmPipelineStage::query()
        ->where('code', 'customer')
        ->firstOrFail();

    $lost = CrmPipelineStage::query()
        ->where('code', 'lost')
        ->firstOrFail();

    $openLead = CrmLead::create([
        'current_stage_id' => $new->id,
        'company_name' => 'Lead Aberto',
        'source' => CrmLead::SOURCE_MANUAL,
        'priority' => CrmLead::PRIORITY_NORMAL,
        'next_follow_up_at' => now()
            ->subDay(),
    ]);

    CrmLead::create([
        'current_stage_id' => $customer->id,
        'company_name' => 'Lead Convertido',
        'source' => CrmLead::SOURCE_MANUAL,
        'priority' => CrmLead::PRIORITY_HIGH,
        'converted_at' => now(),
    ]);

    CrmLead::create([
        'current_stage_id' => $lost->id,
        'company_name' => 'Lead Perdido',
        'source' => CrmLead::SOURCE_MANUAL,
        'priority' => CrmLead::PRIORITY_LOW,
        'lost_reason' => 'Sem interesse.',
    ]);

    CrmActivity::create([
        'crm_lead_id' => $openLead->id,
        'type' => CrmActivity::TYPE_CALL,
        'status' => CrmActivity::STATUS_PLANNED,
        'subject' => 'Chamada de hoje',
        'scheduled_at' => now()
            ->addHour(),
    ]);

    CrmActivity::create([
        'crm_lead_id' => $openLead->id,
        'type' => CrmActivity::TYPE_FOLLOW_UP,
        'status' => CrmActivity::STATUS_PLANNED,
        'subject' => 'Follow-up atrasado',
        'scheduled_at' => now()
            ->subDay(),
    ]);

    NifEnrichment::create([
        'nif' => '509442013',
        'provider' => NifEnrichment::PROVIDER_NIF_PT,
        'lookup_status' => NifEnrichment::STATUS_SUCCESS,
        'title' => 'Empresa Enriquecida',
        'lookup_count' => 1,
        'last_looked_up_at' => now(),
        'last_success_at' => now(),
    ]);

    NifEnrichmentBatch::create([
        'name' => 'Lote Pendente',
        'status' => NifEnrichmentBatch::STATUS_PENDING,
        'force_refresh' => false,
        'total_items' => 1,
        'pending_items' => 1,
    ]);

    $admin = crmDashboardCommercialAdmin();

    crmDashboardCommercialLogin(
        $this,
        $admin
    );

    $this
        ->withHeaders(
            crmDashboardCommercialHeaders()
        )
        ->getJson(
            '/api/backoffice/crm/dashboard'
        )
        ->assertOk()
        ->assertJsonPath(
            'data.commercial.leads_total',
            3
        )
        ->assertJsonPath(
            'data.commercial.open_leads',
            1
        )
        ->assertJsonPath(
            'data.commercial.won_leads',
            1
        )
        ->assertJsonPath(
            'data.commercial.lost_leads',
            1
        )
        ->assertJsonPath(
            'data.commercial.conversion_rate',
            50
        )
        ->assertJsonPath(
            'data.commercial.new_leads_30d',
            3
        )
        ->assertJsonPath(
            'data.commercial.converted_30d',
            1
        )
        ->assertJsonPath(
            'data.commercial.overdue_follow_ups',
            1
        )
        ->assertJsonPath(
            'data.commercial.planned_activities_today',
            1
        )
        ->assertJsonPath(
            'data.commercial.overdue_activities',
            1
        )
        ->assertJsonPath(
            'data.enrichment.successful',
            1
        )
        ->assertJsonPath(
            'data.enrichment.active_batches',
            1
        );

    $response = $this
        ->withHeaders(
            crmDashboardCommercialHeaders()
        )
        ->getJson(
            '/api/backoffice/crm/dashboard'
        )
        ->json('data.pipeline');

    $counts = collect($response)
        ->pluck(
            'leads_count',
            'code'
        );

    expect(
        $counts['new']
    )->toBe(1);

    expect(
        $counts['customer']
    )->toBe(1);

    expect(
        $counts['lost']
    )->toBe(1);
});
