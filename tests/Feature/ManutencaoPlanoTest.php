<?php

use App\Models\Manutencao;
use App\Models\ManutencaoPlano;
use App\Models\ManutencaoPlanoVeiculo;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function mnpHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function mnpTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function mnpLogin(
    $test,
    User $user
): void {
    $test->postJson('/login',[
        'email'=>$user->email,
        'password'=>'SenhaTeste123!',
    ])->assertOk();
}

function mnpFuncionario(
    Tenant $tenant,
    string $email,
    string $nivel='configurar'
): User {
    $user=User::factory()->create([
        'email'=>$email,
        'password'=>Hash::make(
            'SenhaTeste123!'
        ),
        'ativo'=>true,
    ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    $role=Role::firstOrCreate(
        ['codigo'=>'funcionario'],
        [
            'nome'=>'Funcionário',
            'sistema'=>true,
        ]
    );

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>$tenant->id,
    ]);

    $permission=Permission::firstOrCreate(
        ['codigo'=>'manutencao'],
        [
            'modulo'=>'manutencao',
            'nome'=>'Manutenção',
        ]
    );

    RolePermission::updateOrCreate(
        [
            'role_id'=>$role->id,
            'permission_id'=>$permission->id,
        ],
        [
            'nivel'=>$nivel,
        ]
    );

    return $user;
}

function mnpVeiculo(
    Tenant $tenant,
    string $matricula,
    ?int $km=50000
): Veiculo {
    $veiculo=new Veiculo([
        'matricula'=>$matricula,
        'marca'=>'Tesla',
        'modelo'=>'Model 3',
    ]);

    $veiculo->tenant_id=$tenant->id;
    $veiculo->km_atual=$km;
    $veiculo->disponibilidade='disponivel';
    $veiculo->save();

    return $veiculo;
}

function mnpPlano(
    Tenant $tenant,
    User $user,
    array $overrides=[]
): ManutencaoPlano {
    $plano=new ManutencaoPlano(array_merge([
        'nome'=>'Revisão 20 mil km',
        'tipo_servico'=>'Revisão Completa',
        'descricao'=>'Plano de manutenção preventiva.',
        'intervalo_km'=>20000,
        'intervalo_meses'=>12,
        'alerta_antecedencia_km'=>2000,
        'alerta_antecedencia_dias'=>30,
        'ativo'=>true,
    ],$overrides));

    $plano->tenant_id=$tenant->id;
    $plano->created_by=$user->id;
    $plano->updated_by=$user->id;
    $plano->save();

    return $plano;
}

test('rotas de planos de manutencao exigem autenticacao',function(){
    $this
        ->withHeaders(mnpHeaders())
        ->getJson('/api/manutencao-planos')
        ->assertUnauthorized();
});

test('gestor cria plano preventivo com tenant e autoria definidos pelo servidor',function(){
    $tenant=mnpTenant(
        'Tenant Plano Criar',
        'tenant-plano-criar'
    );

    $user=mnpFuncionario(
        $tenant,
        'criar.plano@manutencao.test'
    );

    mnpLogin($this,$user);

    $response=$this
        ->withHeaders(mnpHeaders())
        ->postJson(
            '/api/manutencao-planos',
            [
                'nome'=>'Revisão 15 mil km',
                'tipo_servico'=>'Revisão Completa',
                'descricao'=>
                    'Preventiva periódica.',
                'intervalo_km'=>15000,
                'intervalo_meses'=>12,
                'alerta_antecedencia_km'=>1500,
                'alerta_antecedencia_dias'=>30,
                'ativo'=>true,
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.nome',
            'Revisão 15 mil km'
        )
        ->assertJsonPath(
            'data.intervalo_km',
            15000
        );

    $plano=ManutencaoPlano::findOrFail(
        $response->json('data.id')
    );

    expect($plano->tenant_id)
        ->toBe($tenant->id);

    expect($plano->created_by)
        ->toBe($user->id);

    expect($plano->updated_by)
        ->toBe($user->id);
});

test('plano exige intervalo por quilometragem ou meses',function(){
    $tenant=mnpTenant(
        'Tenant Intervalo Plano',
        'tenant-intervalo-plano'
    );

    $user=mnpFuncionario(
        $tenant,
        'intervalo@manutencao.test'
    );

    mnpLogin($this,$user);

    $this
        ->withHeaders(mnpHeaders())
        ->postJson(
            '/api/manutencao-planos',
            [
                'nome'=>'Plano inválido',
                'tipo_servico'=>'Revisão',
                'intervalo_km'=>null,
                'intervalo_meses'=>null,
                'alerta_antecedencia_km'=>1000,
                'alerta_antecedencia_dias'=>15,
                'ativo'=>true,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'intervalo_km',
            'intervalo_meses',
        ]);

    expect(ManutencaoPlano::count())
        ->toBe(0);
});

test('gestor associa veiculo ao plano e calcula proxima revisao por km e data',function(){
    $tenant=mnpTenant(
        'Tenant Associar Plano',
        'tenant-associar-plano'
    );

    $user=mnpFuncionario(
        $tenant,
        'associar@manutencao.test'
    );

    $veiculo=mnpVeiculo(
        $tenant,
        'AA-41-AA',
        50000
    );

    $plano=mnpPlano(
        $tenant,
        $user,
        [
            'intervalo_km'=>10000,
            'intervalo_meses'=>6,
        ]
    );

    mnpLogin($this,$user);

    $response=$this
        ->withHeaders(mnpHeaders())
        ->postJson(
            "/api/manutencao-planos/{$plano->id}/veiculos",
            [
                'veiculo_id'=>$veiculo->id,
                'ultimo_km'=>50000,
                'ultima_data'=>'2026-09-10',
                'ativo'=>true,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.veiculo_id',
            $veiculo->id
        )
        ->assertJsonPath(
            'data.ultimo_km',
            50000
        )
        ->assertJsonPath(
            'data.proximo_km',
            60000
        )
        ->assertJsonPath(
            'data.proxima_data',
            '2027-03-10'
        );

    $vinculo=
        ManutencaoPlanoVeiculo::findOrFail(
            $response->json('data.id')
        );

    expect($vinculo->tenant_id)
        ->toBe($tenant->id);

    expect($vinculo->created_by)
        ->toBe($user->id);

    expect($vinculo->updated_by)
        ->toBe($user->id);
});

test('associacao sem ultimo km usa quilometragem atual do veiculo',function(){
    $tenant=mnpTenant(
        'Tenant Plano KM Atual',
        'tenant-plano-km-atual'
    );

    $user=mnpFuncionario(
        $tenant,
        'kmatual@manutencao.test'
    );

    $veiculo=mnpVeiculo(
        $tenant,
        'BB-41-BB',
        72500
    );

    $plano=mnpPlano(
        $tenant,
        $user,
        [
            'intervalo_km'=>7500,
            'intervalo_meses'=>null,
        ]
    );

    mnpLogin($this,$user);

    $this
        ->withHeaders(mnpHeaders())
        ->postJson(
            "/api/manutencao-planos/{$plano->id}/veiculos",
            [
                'veiculo_id'=>$veiculo->id,
                'ativo'=>true,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.ultimo_km',
            72500
        )
        ->assertJsonPath(
            'data.proximo_km',
            80000
        );
});

test('plano nao aceita veiculo pertencente a outro tenant',function(){
    $tenantA=mnpTenant(
        'Tenant Plano A',
        'tenant-plano-a'
    );

    $tenantB=mnpTenant(
        'Tenant Plano B',
        'tenant-plano-b'
    );

    $user=mnpFuncionario(
        $tenantA,
        'outrotenant@manutencao.test'
    );

    $plano=mnpPlano(
        $tenantA,
        $user
    );

    $veiculoB=mnpVeiculo(
        $tenantB,
        'CC-41-CC'
    );

    mnpLogin($this,$user);

    $this
        ->withHeaders(mnpHeaders())
        ->postJson(
            "/api/manutencao-planos/{$plano->id}/veiculos",
            [
                'veiculo_id'=>$veiculoB->id,
                'ativo'=>true,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'veiculo_id'
        );

    expect(
        ManutencaoPlanoVeiculo::count()
    )->toBe(0);
});

test('alterar intervalo recalcula proximas revisoes dos veiculos associados',function(){
    $tenant=mnpTenant(
        'Tenant Recalcular Plano',
        'tenant-recalcular-plano'
    );

    $user=mnpFuncionario(
        $tenant,
        'recalcular@manutencao.test'
    );

    $veiculo=mnpVeiculo(
        $tenant,
        'DD-41-DD',
        40000
    );

    $plano=mnpPlano(
        $tenant,
        $user,
        [
            'intervalo_km'=>10000,
            'intervalo_meses'=>12,
        ]
    );

    $vinculo=new ManutencaoPlanoVeiculo([
        'plano_id'=>$plano->id,
        'veiculo_id'=>$veiculo->id,
        'ultimo_km'=>40000,
        'ultima_data'=>'2026-01-15',
        'ativo'=>true,
    ]);

    $vinculo->tenant_id=$tenant->id;
    $vinculo->proximo_km=50000;
    $vinculo->proxima_data='2027-01-15';
    $vinculo->created_by=$user->id;
    $vinculo->updated_by=$user->id;
    $vinculo->save();

    mnpLogin($this,$user);

    $this
        ->withHeaders(mnpHeaders())
        ->patchJson(
            "/api/manutencao-planos/{$plano->id}",
            [
                'intervalo_km'=>15000,
                'intervalo_meses'=>6,
            ]
        )
        ->assertOk();

    $vinculo->refresh();

    expect($vinculo->proximo_km)
        ->toBe(55000);

    expect(
        $vinculo->proxima_data
            ->toDateString()
    )->toBe('2026-07-15');
});

test('listagem calcula situacao vencida proxima e ok',function(){
    $tenant=mnpTenant(
        'Tenant Situação Plano',
        'tenant-situacao-plano'
    );

    $user=mnpFuncionario(
        $tenant,
        'situacao@manutencao.test',
        'visualizar'
    );

    $veiculo=mnpVeiculo(
        $tenant,
        'EE-41-EE',
        50000
    );

    $plano=mnpPlano(
        $tenant,
        $user,
        [
            'intervalo_km'=>10000,
            'intervalo_meses'=>null,
            'alerta_antecedencia_km'=>2000,
        ]
    );

    $vinculo=new ManutencaoPlanoVeiculo([
        'plano_id'=>$plano->id,
        'veiculo_id'=>$veiculo->id,
        'ultimo_km'=>40000,
        'ativo'=>true,
    ]);

    $vinculo->tenant_id=$tenant->id;
    $vinculo->proximo_km=50000;
    $vinculo->created_by=$user->id;
    $vinculo->updated_by=$user->id;
    $vinculo->save();

    mnpLogin($this,$user);

    $this
        ->withHeaders(mnpHeaders())
        ->getJson('/api/manutencao-planos')
        ->assertOk()
        ->assertJsonCount(1,'data')
        ->assertJsonPath(
            'data.0.veiculos.0.situacao',
            'vencida'
        );
});

test('permissao visualizar permite consulta mas bloqueia configuracao',function(){
    $tenant=mnpTenant(
        'Tenant Plano Visualizar',
        'tenant-plano-visualizar'
    );

    $user=mnpFuncionario(
        $tenant,
        'visualizar.plano@manutencao.test',
        'visualizar'
    );

    $plano=mnpPlano(
        $tenant,
        $user
    );

    mnpLogin($this,$user);

    $this
        ->withHeaders(mnpHeaders())
        ->getJson('/api/manutencao-planos')
        ->assertOk();

    $this
        ->withHeaders(mnpHeaders())
        ->getJson(
            "/api/manutencao-planos/{$plano->id}"
        )
        ->assertOk();

    $this
        ->withHeaders(mnpHeaders())
        ->postJson(
            '/api/manutencao-planos',
            [
                'nome'=>'Bloqueado',
                'tipo_servico'=>'Revisão',
                'intervalo_km'=>10000,
                'alerta_antecedencia_km'=>1000,
                'alerta_antecedencia_dias'=>15,
                'ativo'=>true,
            ]
        )
        ->assertForbidden();
});

test('plano com historico de manutencao nao pode ser eliminado',function(){
    $tenant=mnpTenant(
        'Tenant Plano Histórico',
        'tenant-plano-historico'
    );

    $user=mnpFuncionario(
        $tenant,
        'historico.plano@manutencao.test'
    );

    $veiculo=mnpVeiculo(
        $tenant,
        'FF-41-FF'
    );

    $plano=mnpPlano(
        $tenant,
        $user
    );

    $manutencao=new Manutencao([
        'veiculo_id'=>$veiculo->id,
        'plano_id'=>$plano->id,
        'origem'=>'preventiva',
        'tipo_servico'=>'Revisão',
        'prioridade'=>'normal',
        'data_solicitacao'=>
            now()->toDateString(),
        'aprovacao_obrigatoria'=>false,
        'indisponibiliza_veiculo'=>true,
    ]);

    $manutencao->tenant_id=$tenant->id;
    $manutencao->numero_ordem=
        'MAN-PLANO-HISTORICO';

    $manutencao->status='concluida';
    $manutencao->custo_pecas=0;
    $manutencao->custo_mao_obra=0;
    $manutencao->custo_outros=0;
    $manutencao->custo_total=0;
    $manutencao->created_by=$user->id;
    $manutencao->updated_by=$user->id;
    $manutencao->save();

    mnpLogin($this,$user);

    $this
        ->withHeaders(mnpHeaders())
        ->deleteJson(
            "/api/manutencao-planos/{$plano->id}"
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'plano'
        );

    $this->assertDatabaseHas(
        'manutencao_planos',
        [
            'id'=>$plano->id,
        ]
    );
});

test('plano sem historico pode ser eliminado',function(){
    $tenant=mnpTenant(
        'Tenant Plano Eliminar',
        'tenant-plano-eliminar'
    );

    $user=mnpFuncionario(
        $tenant,
        'eliminar.plano@manutencao.test'
    );

    $plano=mnpPlano(
        $tenant,
        $user
    );

    mnpLogin($this,$user);

    $this
        ->withHeaders(mnpHeaders())
        ->deleteJson(
            "/api/manutencao-planos/{$plano->id}"
        )
        ->assertOk();

    $this->assertDatabaseMissing(
        'manutencao_planos',
        [
            'id'=>$plano->id,
        ]
    );
});
