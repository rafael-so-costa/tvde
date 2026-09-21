<?php

use App\Models\Motorista;
use App\Models\Permission;
use App\Models\RegistoExpediente;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function exHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function exTenant(string $nome,string $slug): Tenant
{
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function exLogin($test,User $user): void
{
    $test->postJson('/login',[
        'email'=>$user->email,
        'password'=>'SenhaTeste123!',
    ])->assertOk();
}

function exRoleUser(
    Tenant $tenant,
    string $email,
    string $roleCode,
    ?string $permission=null,
    ?string $nivel=null
): User {
    $user=User::factory()->create([
        'email'=>$email,
        'password'=>Hash::make('SenhaTeste123!'),
        'ativo'=>true,
    ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    $role=Role::firstOrCreate(
        ['codigo'=>$roleCode],
        [
            'nome'=>ucfirst(str_replace('_',' ',$roleCode)),
            'sistema'=>true,
        ]
    );

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>$tenant->id,
    ]);

    if($permission && $nivel){
        $perm=Permission::firstOrCreate(
            ['codigo'=>$permission],
            [
                'modulo'=>$permission,
                'nome'=>ucfirst(str_replace('_',' ',$permission)),
            ]
        );

        RolePermission::updateOrCreate(
            [
                'role_id'=>$role->id,
                'permission_id'=>$perm->id,
            ],
            ['nivel'=>$nivel]
        );
    }

    return $user;
}

function exMotorista(
    Tenant $tenant,
    string $nome,
    string $nif,
    ?User $user=null,
    bool $ativo=true
): Motorista {
    $motorista=new Motorista([
        'nome_completo'=>$nome,
        'nif'=>$nif,
        'email'=>$nif.'@expediente.test',
    ]);

    $motorista->tenant_id=$tenant->id;
    $motorista->user_id=$user?->id;
    $motorista->ativo=$ativo;
    $motorista->save();

    return $motorista;
}

test('rota pública exige NIF válido',function(){
    $this
        ->withHeaders(exHeaders())
        ->postJson('/api/expediente/publico/marcar',[
            'nif'=>'123',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('nif');
});

test('página pública regista entrada e saída pelo NIF',function(){
    $tenant=exTenant('Expediente Público','exp-publico');
    $motorista=exMotorista($tenant,'Motorista Público','245678901');

    $primeiro=$this
        ->withHeaders(exHeaders())
        ->postJson('/api/expediente/publico/marcar',[
            'nif'=>$motorista->nif,
            'tenant_id'=>$tenant->id,
        ])
        ->assertCreated()
        ->assertJsonPath('data.tipo','entrada');

    $this
        ->withHeaders(exHeaders())
        ->postJson('/api/expediente/publico/marcar',[
            'nif'=>$motorista->nif,
            'tenant_id'=>$tenant->id,
        ])
        ->assertCreated()
        ->assertJsonPath('data.tipo','saida');

    expect(RegistoExpediente::count())->toBe(2);
    expect($primeiro->json('data.data_local'))->not->toBeNull();
});

test('marcação pública não aceita motorista inativo',function(){
    $tenant=exTenant('Expediente Inativo','exp-inativo');
    $motorista=exMotorista($tenant,'Motorista Inativo','245678902',null,false);

    $this
        ->withHeaders(exHeaders())
        ->postJson('/api/expediente/publico/marcar',[
            'nif'=>$motorista->nif,
            'tenant_id'=>$tenant->id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('nif');
});

test('NIF repetido em tenants exige tenant na marcação pública',function(){
    $tenantA=exTenant('Tenant A','exp-a');
    $tenantB=exTenant('Tenant B','exp-b');

    exMotorista($tenantA,'Motorista A','245678903');
    exMotorista($tenantB,'Motorista B','245678903');

    $this
        ->withHeaders(exHeaders())
        ->postJson('/api/expediente/publico/marcar',[
            'nif'=>'245678903',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('tenant_id');
});

test('motorista autenticado regista apenas o próprio expediente',function(){
    $tenant=exTenant('Tenant Motorista','exp-motorista');
    $user=exRoleUser($tenant,'motorista@exp.test','motorista');
    $motorista=exMotorista($tenant,'Motorista Próprio','245678904',$user);

    exLogin($this,$user);

    $this
        ->withHeaders(exHeaders())
        ->postJson('/api/expediente/marcar')
        ->assertCreated()
        ->assertJsonPath('data.motorista_id',$motorista->id)
        ->assertJsonPath('data.tipo','entrada');

    $this
        ->withHeaders(exHeaders())
        ->getJson('/api/expediente')
        ->assertOk()
        ->assertJsonCount(1,'data')
        ->assertJsonPath('data.0.motorista_id',$motorista->id);
});

test('motorista consegue consultar o estado atual',function(){
    $tenant=exTenant('Tenant Estado','exp-estado');
    $user=exRoleUser($tenant,'estado@exp.test','motorista');
    $motorista=exMotorista($tenant,'Motorista Estado','245678905',$user);

    exLogin($this,$user);

    $this
        ->withHeaders(exHeaders())
        ->postJson('/api/expediente/marcar')
        ->assertCreated();

    $this
        ->withHeaders(exHeaders())
        ->getJson('/api/expediente/estado')
        ->assertOk()
        ->assertJsonPath('data.motorista_id',$motorista->id)
        ->assertJsonPath('data.em_servico',true)
        ->assertJsonPath('data.registos_hoje',1);
});

test('motorista pode corrigir o próprio registo dentro de 30 dias',function(){
    $tenant=exTenant('Tenant Correção','exp-correcao');
    $user=exRoleUser($tenant,'corrigir@exp.test','motorista');
    exMotorista($tenant,'Motorista Correção','245678906',$user);

    exLogin($this,$user);

    $response=$this
        ->withHeaders(exHeaders())
        ->postJson('/api/expediente/marcar')
        ->assertCreated();

    $id=$response->json('data.id');

    $this
        ->withHeaders(exHeaders())
        ->patchJson("/api/expediente/{$id}",[
            'data_hora'=>now()->subHour()->toIso8601String(),
            'observacoes_correcao'=>'Esqueci-me de marcar na hora correta.',
        ])
        ->assertOk()
        ->assertJsonPath('data.corrigido',true)
        ->assertJsonPath(
            'data.observacoes_correcao',
            'Esqueci-me de marcar na hora correta.'
        );

    $registo=RegistoExpediente::findOrFail($id);

    expect($registo->corrigido_por)->toBe($user->id);
    expect($registo->corrigido_em)->not->toBeNull();
});

test('motorista não corrige registo de outro motorista',function(){
    $tenant=exTenant('Tenant Segurança','exp-seguranca');
    $userA=exRoleUser($tenant,'a@exp.test','motorista');
    $userB=exRoleUser($tenant,'b@exp.test','motorista');

    exMotorista($tenant,'Motorista A','245678907',$userA);
    $motoristaB=exMotorista($tenant,'Motorista B','245678908',$userB);

    $registo=new RegistoExpediente([
        'data_hora'=>now()->subHour(),
        'tipo'=>'entrada',
        'data_local'=>now()->format('Y-m-d'),
        'origem'=>'app',
    ]);

    $registo->tenant_id=$tenant->id;
    $registo->motorista_id=$motoristaB->id;
    $registo->save();

    exLogin($this,$userA);

    $this
        ->withHeaders(exHeaders())
        ->patchJson("/api/expediente/{$registo->id}",[
            'data_hora'=>now()->subMinutes(30)->toIso8601String(),
        ])
        ->assertForbidden();
});

test('gestor com permissão visualiza todos e consulta estatísticas',function(){
    $tenant=exTenant('Tenant Gestão','exp-gestao');

    $gestor=exRoleUser(
        $tenant,
        'gestor@exp.test',
        'funcionario',
        'expediente',
        'configurar'
    );

    $motorista=exMotorista($tenant,'Motorista Gestão','245678909');

    $entrada=new RegistoExpediente([
        'data_hora'=>now()->subHours(8),
        'tipo'=>'entrada',
        'data_local'=>now()->format('Y-m-d'),
        'origem'=>'app',
    ]);

    $entrada->tenant_id=$tenant->id;
    $entrada->motorista_id=$motorista->id;
    $entrada->save();

    $saida=new RegistoExpediente([
        'data_hora'=>now()->subHours(4),
        'tipo'=>'saida',
        'data_local'=>now()->format('Y-m-d'),
        'origem'=>'app',
    ]);

    $saida->tenant_id=$tenant->id;
    $saida->motorista_id=$motorista->id;
    $saida->save();

    exLogin($this,$gestor);

    $this
        ->withHeaders(exHeaders())
        ->getJson('/api/expediente')
        ->assertOk()
        ->assertJsonCount(2,'data');

    $response=$this
        ->withHeaders(exHeaders())
        ->getJson('/api/expediente-estatisticas')
        ->assertOk()
        ->assertJsonPath('data.0.motorista_id',$motorista->id)
        ->assertJsonPath('data.0.dias_online',1);

    expect(
        $response->json('data.0.segundos_trabalhados')
    )->toBeGreaterThanOrEqual(14300);
});

test('gestor pode corrigir registo de qualquer motorista do tenant',function(){
    $tenant=exTenant('Tenant Gestão Correção','exp-gestao-correcao');

    $gestor=exRoleUser(
        $tenant,
        'gestor.correcao@exp.test',
        'funcionario',
        'expediente',
        'configurar'
    );

    $motorista=exMotorista($tenant,'Motorista Corrigido','245678910');

    $registo=new RegistoExpediente([
        'data_hora'=>now()->subDays(60),
        'tipo'=>'entrada',
        'data_local'=>now()->subDays(60)->format('Y-m-d'),
        'origem'=>'app',
    ]);

    $registo->tenant_id=$tenant->id;
    $registo->motorista_id=$motorista->id;
    $registo->save();

    exLogin($this,$gestor);

    $this
        ->withHeaders(exHeaders())
        ->patchJson("/api/expediente/{$registo->id}",[
            'data_hora'=>now()->subDays(59)->toIso8601String(),
            'observacoes_correcao'=>'Correção administrativa.',
        ])
        ->assertOk()
        ->assertJsonPath('data.corrigido',true);
});

test('não existe rota para apagar expediente',function(){
    $tenant=exTenant('Tenant Imutável','exp-imutavel');

    $gestor=exRoleUser(
        $tenant,
        'imutavel@exp.test',
        'funcionario',
        'expediente',
        'configurar'
    );

    $motorista=exMotorista($tenant,'Motorista Imutável','245678911');

    $registo=new RegistoExpediente([
        'data_hora'=>now(),
        'tipo'=>'entrada',
        'data_local'=>now()->format('Y-m-d'),
        'origem'=>'app',
    ]);

    $registo->tenant_id=$tenant->id;
    $registo->motorista_id=$motorista->id;
    $registo->save();

    exLogin($this,$gestor);

    $this
        ->withHeaders(exHeaders())
        ->deleteJson("/api/expediente/{$registo->id}")
        ->assertMethodNotAllowed();

    expect(RegistoExpediente::find($registo->id))->not->toBeNull();
});
