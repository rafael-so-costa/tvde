<?php

use App\Models\CrmLead;
use App\Models\CrmPipelineStage;
use App\Models\Role;
use App\Models\SaasPlan;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use App\Services\SaasSubscriptionService;
use Database\Seeders\CrmPipelineStageSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SaasPlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([
        RoleSeeder::class,
        SaasPlanSeeder::class,
        CrmPipelineStageSeeder::class,
    ]);
});

function crmConversionHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function crmConversionAdmin(): User
{
    $user = User::factory()->create([
        'email' => 'crm.conversion.admin@frotapro.test',
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

function crmConversionLogin($test, User $user): void
{
    $test
        ->postJson('/login', [
            'email' => $user->email,
            'password' => 'SenhaTeste123!',
        ])
        ->assertOk();
}

function crmConversionLead(
    string $nif,
    string $name
): CrmLead {
    $stage = CrmPipelineStage::query()
        ->where('code', 'qualified')
        ->firstOrFail();

    return CrmLead::create([
        'current_stage_id' => $stage->id,
        'nif' => $nif,
        'company_name' => $name,
        'email' => 'cliente@example.test',
        'phone' => '910000000',
        'source' => CrmLead::SOURCE_MANUAL,
        'priority' => CrmLead::PRIORITY_HIGH,
    ]);
}

test('lead é convertido num novo tenant com assinatura e trial', function () {
    $lead = crmConversionLead(
        '509442013',
        'Novo Cliente FrotaPRO'
    );

    $plan = SaasPlan::query()
        ->where('codigo', 'starter')
        ->firstOrFail();

    $admin = crmConversionAdmin();

    crmConversionLogin($this, $admin);

    $response = $this
        ->withHeaders(crmConversionHeaders())
        ->postJson(
            "/api/backoffice/crm/leads/{$lead->id}/converter",
            [
                'saas_plan_id' => $plan->id,
                'trial_days' => 14,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.tenant_created',
            true
        )
        ->assertJsonPath(
            'data.trial_started',
            true
        )
        ->assertJsonPath(
            'data.tenant.nif',
            '509442013'
        )
        ->assertJsonPath(
            'data.subscription.status',
            'trialing'
        )
        ->assertJsonPath(
            'data.subscription.plan.codigo',
            'starter'
        );

    $tenantId = $response->json(
        'data.tenant.id'
    );

    expect(
        $lead->refresh()->converted_tenant_id
    )->toBe($tenantId);

    expect(
        $lead->currentStage->code
    )->toBe('customer');

    $this->assertDatabaseHas(
        'saas_subscriptions',
        [
            'tenant_id' => $tenantId,
            'saas_plan_id' => $plan->id,
            'status' => 'trialing',
        ]
    );
});

test('conversão associa tenant existente pelo nif sem duplicar cliente', function () {
    $starter = SaasPlan::query()
        ->where('codigo', 'starter')
        ->firstOrFail();

    $pro = SaasPlan::create([
        'codigo' => 'pro-conversao',
        'nome' => 'Pro Conversão',
        'ativo' => true,
        'ordem' => 20,
        'limits' => [],
        'features' => [],
    ]);

    $tenant = Tenant::create([
        'saas_plan_id' => $starter->id,
        'nome' => 'Cliente Já Existente',
        'slug' => 'cliente-ja-existente',
        'nif' => '515696544',
        'ativo' => true,
    ]);

    app(SaasSubscriptionService::class)
        ->ensureForTenant(
            $tenant,
            $starter
        );

    $lead = crmConversionLead(
        '515696544',
        'Lead Cliente Existente'
    );

    $admin = crmConversionAdmin();

    crmConversionLogin($this, $admin);

    $this
        ->withHeaders(crmConversionHeaders())
        ->postJson(
            "/api/backoffice/crm/leads/{$lead->id}/converter",
            [
                'saas_plan_id' => $pro->id,
                'trial_days' => 30,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.tenant_created',
            false
        )
        ->assertJsonPath(
            'data.trial_started',
            false
        )
        ->assertJsonPath(
            'data.tenant.id',
            $tenant->id
        )
        ->assertJsonPath(
            'data.subscription.plan.codigo',
            'starter'
        );

    expect(
        Tenant::query()
            ->where('nif', '515696544')
            ->count()
    )->toBe(1);

    expect(
        $tenant->refresh()->saas_plan_id
    )->toBe($starter->id);
});

test('lead já convertido não pode ser convertido novamente', function () {
    $plan = SaasPlan::query()
        ->where('codigo', 'starter')
        ->firstOrFail();

    $tenant = Tenant::create([
        'saas_plan_id' => $plan->id,
        'nome' => 'Cliente Convertido',
        'slug' => 'cliente-convertido',
        'nif' => '515653780',
        'ativo' => true,
    ]);

    $lead = crmConversionLead(
        '515653780',
        'Lead Convertido'
    );

    $lead->converted_tenant_id = $tenant->id;
    $lead->converted_at = now();
    $lead->save();

    $admin = crmConversionAdmin();

    crmConversionLogin($this, $admin);

    $this
        ->withHeaders(crmConversionHeaders())
        ->postJson(
            "/api/backoffice/crm/leads/{$lead->id}/converter",
            [
                'saas_plan_id' => $plan->id,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('lead');
});
