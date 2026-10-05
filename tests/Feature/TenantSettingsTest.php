<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantCustomField;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserPermission;
use App\Models\UserRole;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;

uses(RefreshDatabase::class);

beforeEach(function(){
    $this->seed([
        RoleSeeder::class,
        PermissionSeeder::class,
    ]);
});

function fleetConfigHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function fleetConfigTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
        'settings'=>[
            'unrelated'=>[
                'keep'=>true,
            ],
        ],
    ]);
}

function fleetConfigUser(
    Tenant $tenant,
    string $roleCode,
    string $email
): User {
    $user=User::factory()->create([
        'email'=>$email,
        'ativo'=>true,
    ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    $role=Role::query()
        ->where(
            'codigo',
            $roleCode
        )
        ->firstOrFail();

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>$tenant->id,
    ]);

    return $user;
}

function fleetConfigActAs(
    $test,
    User $user,
    Tenant $tenant
): void {
    $test->flushSession();

    Auth::forgetGuards();

    $test->withHeaders(
        fleetConfigHeaders()
    );

    $test->actingAs(
        $user,
        'web'
    );

    $test->withSession([
        'tenant_id'=>$tenant->id,
    ]);
}

test('configurações exigem autenticação',function(){
    $this
        ->withHeaders(
            fleetConfigHeaders()
        )
        ->getJson('/api/configuracoes')
        ->assertUnauthorized();
});

test('gestor recebe defaults da frota',function(){
    $tenant=fleetConfigTenant(
        'Frota Config',
        'frota-config'
    );

    $user=fleetConfigUser(
        $tenant,
        'admin_empresa',
        'gestor.config@frotapro.test'
    );

    fleetConfigActAs(
        $this,
        $user,
        $tenant
    );

    $this
        ->getJson('/api/configuracoes')
        ->assertOk()
        ->assertJsonPath(
            'data.tenant.id',
            $tenant->id
        )
        ->assertJsonPath(
            'data.settings.alerts.insurance_days',
            30
        )
        ->assertJsonPath(
            'data.settings.vehicles.revision_interval_km',
            15000
        )
        ->assertJsonPath(
            'data.settings.regional.currency',
            'EUR'
        );
});

test('gestor atualiza configurações sem destruir outras settings do tenant',function(){
    $tenant=fleetConfigTenant(
        'Frota Atualização',
        'frota-atualizacao'
    );

    $user=fleetConfigUser(
        $tenant,
        'admin_empresa',
        'gestor.update@frotapro.test'
    );

    fleetConfigActAs(
        $this,
        $user,
        $tenant
    );

    $this
        ->patchJson('/api/configuracoes',[
            'nome'=>'Frota Atualizada',

            'general'=>[
                'commercial_name'=>
                    'Mobilidade Lisboa',
                'city'=>'Lisboa',
            ],

            'operation'=>[
                'platforms'=>[
                    'uber',
                    'bolt',
                ],
            ],

            'alerts'=>[
                'insurance_days'=>45,
            ],

            'vehicles'=>[
                'revision_interval_km'=>20000,
                'revision_alert_km'=>1500,
            ],

            'rentals'=>[
                'periodicity'=>'weekly',
                'due_weekday'=>1,
                'default_deposit'=>250,
            ],
        ])
        ->assertOk()
        ->assertJsonPath(
            'data.tenant.nome',
            'Frota Atualizada'
        )
        ->assertJsonPath(
            'data.settings.alerts.insurance_days',
            45
        )
        ->assertJsonPath(
            'data.settings.vehicles.revision_interval_km',
            20000
        );

    $tenant->refresh();

    expect(
        data_get(
            $tenant->settings,
            'unrelated.keep'
        )
    )->toBeTrue();

    expect(
        data_get(
            $tenant->settings,
            'fleet.general.city'
        )
    )->toBe('Lisboa');

    expect(
        data_get(
            $tenant->settings,
            'fleet.operation.platforms'
        )
    )->toBe([
        'uber',
        'bolt',
    ]);
});

test('validação rejeita valores operacionais inválidos',function(){
    $tenant=fleetConfigTenant(
        'Frota Inválida',
        'frota-invalida'
    );

    $user=fleetConfigUser(
        $tenant,
        'admin_empresa',
        'gestor.invalid@frotapro.test'
    );

    fleetConfigActAs(
        $this,
        $user,
        $tenant
    );

    $this
        ->patchJson('/api/configuracoes',[
            'alerts'=>[
                'insurance_days'=>999,
            ],

            'operation'=>[
                'platforms'=>[
                    'plataforma-inexistente',
                ],
            ],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'alerts.insurance_days',
            'operation.platforms.0',
        ]);
});

test('funcionario com visualizar pode consultar mas não configurar',function(){
    $tenant=fleetConfigTenant(
        'Frota Permissões',
        'frota-permissoes'
    );

    $user=fleetConfigUser(
        $tenant,
        'funcionario',
        'funcionario.config@frotapro.test'
    );

    $permission=
        Permission::query()
            ->where(
                'codigo',
                'configuracoes'
            )
            ->firstOrFail();

    UserPermission::create([
        'user_id'=>$user->id,
        'permission_id'=>$permission->id,
        'tenant_id'=>$tenant->id,
        'nivel'=>'visualizar',
    ]);

    fleetConfigActAs(
        $this,
        $user,
        $tenant
    );

    $this
        ->getJson('/api/configuracoes')
        ->assertOk();

    $this
        ->patchJson('/api/configuracoes',[
            'alerts'=>[
                'insurance_days'=>20,
            ],
        ])
        ->assertForbidden();
});

test('gestor cria campo personalizado',function(){
    $tenant=fleetConfigTenant(
        'Frota Campos',
        'frota-campos'
    );

    $user=fleetConfigUser(
        $tenant,
        'admin_empresa',
        'gestor.campos@frotapro.test'
    );

    fleetConfigActAs(
        $this,
        $user,
        $tenant
    );

    $response=$this
        ->postJson(
            '/api/configuracoes/campos',
            [
                'entity'=>'motorista',
                'label'=>'Número interno',
                'type'=>'text',
                'required'=>false,
                'active'=>true,
                'placeholder'=>'Ex.: MOT-023',
                'sort_order'=>10,
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.key',
            'numero_interno'
        );

    $id=$response->json(
        'data.id'
    );

    $this->assertDatabaseHas(
        'tenant_custom_fields',
        [
            'id'=>$id,
            'tenant_id'=>$tenant->id,
            'entity'=>'motorista',
            'key'=>'numero_interno',
        ]
    );
});

test('campo select exige opções',function(){
    $tenant=fleetConfigTenant(
        'Frota Select',
        'frota-select'
    );

    $user=fleetConfigUser(
        $tenant,
        'admin_empresa',
        'gestor.select@frotapro.test'
    );

    fleetConfigActAs(
        $this,
        $user,
        $tenant
    );

    $this
        ->postJson(
            '/api/configuracoes/campos',
            [
                'entity'=>'veiculo',
                'label'=>'Categoria interna',
                'type'=>'select',
                'options'=>[],
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'options'
        );
});

test('não permite chave duplicada na mesma entidade',function(){
    $tenant=fleetConfigTenant(
        'Frota Duplicado',
        'frota-duplicado'
    );

    $user=fleetConfigUser(
        $tenant,
        'admin_empresa',
        'gestor.duplicado@frotapro.test'
    );

    fleetConfigActAs(
        $this,
        $user,
        $tenant
    );

    $payload=[
        'entity'=>'motorista',
        'key'=>'codigo_interno',
        'label'=>'Código interno',
        'type'=>'text',
    ];

    $this
        ->postJson(
            '/api/configuracoes/campos',
            $payload
        )
        ->assertCreated();

    $this
        ->postJson(
            '/api/configuracoes/campos',
            $payload
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'key'
        );
});

test('campos personalizados ficam isolados por tenant',function(){
    $tenantA=fleetConfigTenant(
        'Frota A',
        'config-frota-a'
    );

    $tenantB=fleetConfigTenant(
        'Frota B',
        'config-frota-b'
    );

    $gestorA=fleetConfigUser(
        $tenantA,
        'admin_empresa',
        'gestor.a.config@frotapro.test'
    );

    $gestorB=fleetConfigUser(
        $tenantB,
        'admin_empresa',
        'gestor.b.config@frotapro.test'
    );

    $field=
        TenantCustomField::create([
            'tenant_id'=>$tenantA->id,
            'entity'=>'motorista',
            'key'=>'privado',
            'label'=>'Privado',
            'type'=>'text',
            'required'=>false,
            'active'=>true,
            'sort_order'=>0,
        ]);

    fleetConfigActAs(
        $this,
        $gestorB,
        $tenantB
    );

    $this
        ->patchJson(
            "/api/configuracoes/campos/{$field->id}",
            [
                'label'=>'Tentativa',
            ]
        )
        ->assertNotFound();

    $this
        ->deleteJson(
            "/api/configuracoes/campos/{$field->id}"
        )
        ->assertNotFound();

    fleetConfigActAs(
        $this,
        $gestorA,
        $tenantA
    );

    $this
        ->getJson('/api/configuracoes/campos')
        ->assertOk()
        ->assertJsonFragment([
            'id'=>$field->id,
            'key'=>'privado',
        ]);
});

test('gestor atualiza e remove campo personalizado',function(){
    $tenant=fleetConfigTenant(
        'Frota CRUD',
        'frota-crud'
    );

    $user=fleetConfigUser(
        $tenant,
        'admin_empresa',
        'gestor.crud@frotapro.test'
    );

    $field=
        TenantCustomField::create([
            'tenant_id'=>$tenant->id,
            'entity'=>'veiculo',
            'key'=>'uso',
            'label'=>'Uso',
            'type'=>'text',
            'required'=>false,
            'active'=>true,
            'sort_order'=>0,
        ]);

    fleetConfigActAs(
        $this,
        $user,
        $tenant
    );

    $this
        ->patchJson(
            "/api/configuracoes/campos/{$field->id}",
            [
                'label'=>'Tipo de uso',
                'type'=>'select',
                'options'=>[
                    'TVDE',
                    'Substituição',
                ],
                'required'=>true,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.type',
            'select'
        )
        ->assertJsonPath(
            'data.required',
            true
        );

    $this
        ->deleteJson(
            "/api/configuracoes/campos/{$field->id}"
        )
        ->assertOk();

    $this->assertDatabaseMissing(
        'tenant_custom_fields',
        [
            'id'=>$field->id,
        ]
    );
});
