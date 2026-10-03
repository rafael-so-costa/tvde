<?php

use App\Models\CrmLead;
use App\Models\CrmPipelineStage;
use App\Models\CrmTag;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\CrmPipelineStageSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([
        RoleSeeder::class,
        CrmPipelineStageSeeder::class,
    ]);
});

function crmTagHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function crmTagAdmin(): User
{
    $user = User::factory()->create([
        'email' => 'crm.tags.admin@frotapro.test',
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

function crmTagLogin($test, User $user): void
{
    $test
        ->postJson('/login', [
            'email' => $user->email,
            'password' => 'SenhaTeste123!',
        ])
        ->assertOk();
}

test('super admin cria e atualiza tag crm', function () {
    $admin = crmTagAdmin();

    crmTagLogin($this, $admin);

    $response = $this
        ->withHeaders(crmTagHeaders())
        ->postJson('/api/backoffice/crm/tags', [
            'name' => 'Prioridade Comercial',
            'color' => 'indigo',
            'description' => 'Leads prioritários.',
        ])
        ->assertCreated()
        ->assertJsonPath(
            'data.name',
            'Prioridade Comercial'
        )
        ->assertJsonPath(
            'data.slug',
            'prioridade-comercial'
        )
        ->assertJsonPath(
            'data.is_active',
            true
        );

    $id = $response->json('data.id');

    $this
        ->withHeaders(crmTagHeaders())
        ->patchJson(
            "/api/backoffice/crm/tags/{$id}",
            [
                'name' => 'Prioridade Alta',
                'color' => 'red',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.name',
            'Prioridade Alta'
        )
        ->assertJsonPath(
            'data.slug',
            'prioridade-alta'
        );
});

test('tag sem leads pode ser eliminada', function () {
    $tag = CrmTag::create([
        'name' => 'Temporária',
        'slug' => 'temporaria',
        'is_active' => true,
    ]);

    $admin = crmTagAdmin();

    crmTagLogin($this, $admin);

    $this
        ->withHeaders(crmTagHeaders())
        ->deleteJson(
            "/api/backoffice/crm/tags/{$tag->id}"
        )
        ->assertOk()
        ->assertJsonPath(
            'message',
            'Tag eliminada com sucesso.'
        );

    $this->assertDatabaseMissing('crm_tags', [
        'id' => $tag->id,
    ]);
});

test('tag usada por lead é desativada em vez de eliminada', function () {
    $tag = CrmTag::create([
        'name' => 'Cliente Quente',
        'slug' => 'cliente-quente',
        'is_active' => true,
    ]);

    $stage = CrmPipelineStage::query()
        ->where('code', 'new')
        ->firstOrFail();

    $lead = CrmLead::create([
        'current_stage_id' => $stage->id,
        'company_name' => 'Lead com Tag',
        'source' => CrmLead::SOURCE_MANUAL,
        'priority' => CrmLead::PRIORITY_NORMAL,
    ]);

    $lead->tags()->attach(
        $tag->id,
        [
            'id' => (string) Str::uuid(),
        ]
    );

    $admin = crmTagAdmin();

    crmTagLogin($this, $admin);

    $this
        ->withHeaders(crmTagHeaders())
        ->deleteJson(
            "/api/backoffice/crm/tags/{$tag->id}"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.is_active',
            false
        );

    expect(
        $tag->refresh()->is_active
    )->toBeFalse();
});
