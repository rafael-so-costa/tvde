<?php

use App\Models\EstoqueMovimento;
use App\Models\Peca;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function estHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function estTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function estLogin(
    $test,
    User $user
): void {
    $test->postJson('/login',[
        'email'=>$user->email,
        'password'=>'SenhaTeste123!',
    ])->assertOk();
}

function estFuncionario(
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

function estPeca(
    Tenant $tenant,
    string $codigo,
    string $nome,
    float $estoque=0,
    float $estoqueMinimo=0,
    float $custoMedio=0,
    bool $ativo=true
): Peca {
    $peca=new Peca([
        'codigo'=>$codigo,
        'nome'=>$nome,
        'unidade'=>'un',
        'estoque_minimo'=>$estoqueMinimo,
        'ativo'=>$ativo,
    ]);

    $peca->tenant_id=$tenant->id;
    $peca->estoque_atual=$estoque;
    $peca->custo_medio=$custoMedio;
    $peca->save();

    return $peca;
}

test('rotas de estoque exigem autenticacao',function(){
    $this
        ->withHeaders(estHeaders())
        ->getJson('/api/estoque')
        ->assertUnauthorized();

    $this
        ->withHeaders(estHeaders())
        ->getJson('/api/estoque/movimentos')
        ->assertUnauthorized();
});

test('gestor consulta apenas estoque do tenant atual',function(){
    $tenantA=estTenant(
        'Tenant Estoque A',
        'tenant-estoque-a'
    );

    $tenantB=estTenant(
        'Tenant Estoque B',
        'tenant-estoque-b'
    );

    $user=estFuncionario(
        $tenantA,
        'listar@estoque.test',
        'visualizar'
    );

    $pecaA=estPeca(
        $tenantA,
        'PEC-A',
        'Peça Tenant A',
        10,
        2
    );

    estPeca(
        $tenantB,
        'PEC-B',
        'Peça Tenant B',
        20,
        2
    );

    estLogin($this,$user);

    $this
        ->withHeaders(estHeaders())
        ->getJson('/api/estoque')
        ->assertOk()
        ->assertJsonCount(1,'data')
        ->assertJsonPath(
            'data.0.id',
            $pecaA->id
        )
        ->assertJsonPath(
            'data.0.codigo',
            'PEC-A'
        );
});

test('filtro de estoque baixo retorna apenas pecas abaixo ou no minimo',function(){
    $tenant=estTenant(
        'Tenant Estoque Baixo',
        'tenant-estoque-baixo'
    );

    $user=estFuncionario(
        $tenant,
        'baixo@estoque.test',
        'visualizar'
    );

    $baixa=estPeca(
        $tenant,
        'BAIXA',
        'Peça Baixa',
        2,
        5
    );

    estPeca(
        $tenant,
        'NORMAL',
        'Peça Normal',
        10,
        5
    );

    estPeca(
        $tenant,
        'LIMITE',
        'Peça no Limite',
        5,
        5
    );

    estLogin($this,$user);

    $response=$this
        ->withHeaders(estHeaders())
        ->getJson(
            '/api/estoque?estoque_baixo=1'
        )
        ->assertOk()
        ->assertJsonCount(2,'data');

    $ids=collect(
        $response->json('data')
    )->pluck('id');

    expect($ids)
        ->toContain($baixa->id);

    expect(
        collect(
            $response->json('data')
        )->pluck('codigo')
    )->toContain('LIMITE');

    expect(
        collect(
            $response->json('data')
        )->pluck('codigo')
    )->not->toContain('NORMAL');
});

test('ajuste para saldo maior cria movimento de entrada e atualiza estoque',function(){
    $tenant=estTenant(
        'Tenant Ajuste Entrada',
        'tenant-ajuste-entrada'
    );

    $user=estFuncionario(
        $tenant,
        'entrada@estoque.test'
    );

    $peca=estPeca(
        $tenant,
        'ENT-001',
        'Peça Entrada',
        5,
        2,
        10
    );

    estLogin($this,$user);

    $response=$this
        ->withHeaders(estHeaders())
        ->postJson(
            "/api/estoque/{$peca->id}/ajustar",
            [
                'estoque'=>8,
                'observacoes'=>
                    'Contagem física superior.',
            ]
        )
        ->assertOk();

    $movimento=EstoqueMovimento::findOrFail(
        $response->json('data.id')
    );

    $peca->refresh();

    expect((float)$peca->estoque_atual)
        ->toBe(8.0);

    expect($movimento->tipo)
        ->toBe('ajuste_entrada');

    expect($movimento->origem)
        ->toBe('ajuste');

    expect((float)$movimento->quantidade)
        ->toBe(3.0);

    expect((float)$movimento->saldo_anterior)
        ->toBe(5.0);

    expect((float)$movimento->saldo_posterior)
        ->toBe(8.0);

    expect($movimento->created_by)
        ->toBe($user->id);

    expect($movimento->observacoes)
        ->toBe(
            'Contagem física superior.'
        );
});

test('ajuste para saldo menor cria movimento de saida sem permitir saldo negativo',function(){
    $tenant=estTenant(
        'Tenant Ajuste Saída',
        'tenant-ajuste-saida'
    );

    $user=estFuncionario(
        $tenant,
        'saida@estoque.test'
    );

    $peca=estPeca(
        $tenant,
        'SAI-001',
        'Peça Saída',
        10,
        2,
        17.50
    );

    estLogin($this,$user);

    $response=$this
        ->withHeaders(estHeaders())
        ->postJson(
            "/api/estoque/{$peca->id}/ajustar",
            [
                'estoque'=>4,
                'observacoes'=>
                    'Correção da contagem.',
            ]
        )
        ->assertOk();

    $movimento=EstoqueMovimento::findOrFail(
        $response->json('data.id')
    );

    $peca->refresh();

    expect((float)$peca->estoque_atual)
        ->toBe(4.0);

    expect($movimento->tipo)
        ->toBe('ajuste_saida');

    expect($movimento->origem)
        ->toBe('ajuste');

    expect((float)$movimento->quantidade)
        ->toBe(6.0);

    expect((float)$movimento->saldo_anterior)
        ->toBe(10.0);

    expect((float)$movimento->saldo_posterior)
        ->toBe(4.0);

    /*
     * Saídas devem preservar no ledger
     * o custo médio atual da peça.
     */
    expect((float)$movimento->valor_unitario)
        ->toBe(17.5);

    $this
        ->withHeaders(estHeaders())
        ->postJson(
            "/api/estoque/{$peca->id}/ajustar",
            [
                'estoque'=>-1,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'estoque'
        );

    expect(
        (float)$peca
            ->fresh()
            ->estoque_atual
    )->toBe(4.0);
});

test('ajuste para o mesmo saldo nao gera movimento desnecessario',function(){
    $tenant=estTenant(
        'Tenant Ajuste Igual',
        'tenant-ajuste-igual'
    );

    $user=estFuncionario(
        $tenant,
        'igual@estoque.test'
    );

    $peca=estPeca(
        $tenant,
        'IGUAL-001',
        'Peça Igual',
        7,
        2,
        9
    );

    estLogin($this,$user);

    $this
        ->withHeaders(estHeaders())
        ->postJson(
            "/api/estoque/{$peca->id}/ajustar",
            [
                'estoque'=>7,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data',
            null
        );

    expect(
        EstoqueMovimento::query()
            ->where(
                'peca_id',
                $peca->id
            )
            ->count()
    )->toBe(0);

    expect(
        (float)$peca
            ->fresh()
            ->estoque_atual
    )->toBe(7.0);
});

test('historico de movimentos pode ser filtrado por peca tipo e origem',function(){
    $tenant=estTenant(
        'Tenant Histórico Estoque',
        'tenant-historico-estoque'
    );

    $user=estFuncionario(
        $tenant,
        'historico@estoque.test'
    );

    $pecaA=estPeca(
        $tenant,
        'HIST-A',
        'Peça Histórico A',
        10
    );

    $pecaB=estPeca(
        $tenant,
        'HIST-B',
        'Peça Histórico B',
        10
    );

    estLogin($this,$user);

    $this
        ->withHeaders(estHeaders())
        ->postJson(
            "/api/estoque/{$pecaA->id}/ajustar",
            [
                'estoque'=>15,
            ]
        )
        ->assertOk();

    $this
        ->withHeaders(estHeaders())
        ->postJson(
            "/api/estoque/{$pecaA->id}/ajustar",
            [
                'estoque'=>12,
            ]
        )
        ->assertOk();

    $this
        ->withHeaders(estHeaders())
        ->postJson(
            "/api/estoque/{$pecaB->id}/ajustar",
            [
                'estoque'=>20,
            ]
        )
        ->assertOk();

    $this
        ->withHeaders(estHeaders())
        ->getJson(
            '/api/estoque/movimentos'.
            '?peca_id='.$pecaA->id.
            '&tipo=ajuste_saida'.
            '&origem=ajuste'
        )
        ->assertOk()
        ->assertJsonCount(1,'data')
        ->assertJsonPath(
            'data.0.peca_id',
            $pecaA->id
        )
        ->assertJsonPath(
            'data.0.tipo',
            'ajuste_saida'
        )
        ->assertJsonPath(
            'data.0.origem',
            'ajuste'
        );
});

test('historico de estoque respeita isolamento entre tenants',function(){
    $tenantA=estTenant(
        'Tenant Movimento A',
        'tenant-movimento-a'
    );

    $tenantB=estTenant(
        'Tenant Movimento B',
        'tenant-movimento-b'
    );

    $userA=estFuncionario(
        $tenantA,
        'movimentos@estoque.test'
    );

    $pecaA=estPeca(
        $tenantA,
        'MOV-A',
        'Peça Movimento A',
        1
    );

    $pecaB=estPeca(
        $tenantB,
        'MOV-B',
        'Peça Movimento B',
        1
    );

    estLogin($this,$userA);

    $this
        ->withHeaders(estHeaders())
        ->postJson(
            "/api/estoque/{$pecaA->id}/ajustar",
            [
                'estoque'=>2,
            ]
        )
        ->assertOk();

    /*
     * Criamos um movimento no outro tenant
     * diretamente para provar isolamento
     * da consulta.
     */
    $movimentoB=new EstoqueMovimento();

    $movimentoB->tenant_id=
        $tenantB->id;

    $movimentoB->peca_id=
        $pecaB->id;

    $movimentoB->tipo=
        'ajuste_entrada';

    $movimentoB->origem=
        'ajuste';

    $movimentoB->quantidade=4;
    $movimentoB->valor_unitario=0;
    $movimentoB->saldo_anterior=1;
    $movimentoB->saldo_posterior=5;
    $movimentoB->save();

    $response=$this
        ->withHeaders(estHeaders())
        ->getJson(
            '/api/estoque/movimentos'
        )
        ->assertOk()
        ->assertJsonCount(1,'data');

    expect(
        collect(
            $response->json('data')
        )->pluck('peca_id')
    )->toContain($pecaA->id);

    expect(
        collect(
            $response->json('data')
        )->pluck('peca_id')
    )->not->toContain($pecaB->id);
});

test('peca de outro tenant nao pode ter estoque ajustado',function(){
    $tenantA=estTenant(
        'Tenant Ajuste A',
        'tenant-ajuste-cross-a'
    );

    $tenantB=estTenant(
        'Tenant Ajuste B',
        'tenant-ajuste-cross-b'
    );

    $userA=estFuncionario(
        $tenantA,
        'cross@estoque.test'
    );

    $pecaB=estPeca(
        $tenantB,
        'CROSS-B',
        'Peça Cross Tenant',
        10
    );

    estLogin($this,$userA);

    $this
        ->withHeaders(estHeaders())
        ->postJson(
            "/api/estoque/{$pecaB->id}/ajustar",
            [
                'estoque'=>50,
            ]
        )
        ->assertNotFound();

    expect(
        (float)$pecaB
            ->fresh()
            ->estoque_atual
    )->toBe(10.0);

    expect(
        EstoqueMovimento::query()
            ->where(
                'peca_id',
                $pecaB->id
            )
            ->count()
    )->toBe(0);
});

test('permissao visualizar permite consultar estoque mas bloqueia ajuste',function(){
    $tenant=estTenant(
        'Tenant Estoque Visualizar',
        'tenant-estoque-visualizar'
    );

    $user=estFuncionario(
        $tenant,
        'visualizar@estoque.test',
        'visualizar'
    );

    $peca=estPeca(
        $tenant,
        'VIS-001',
        'Peça Visualizar',
        10
    );

    estLogin($this,$user);

    $this
        ->withHeaders(estHeaders())
        ->getJson('/api/estoque')
        ->assertOk();

    $this
        ->withHeaders(estHeaders())
        ->getJson(
            '/api/estoque/movimentos'
        )
        ->assertOk();

    $this
        ->withHeaders(estHeaders())
        ->postJson(
            "/api/estoque/{$peca->id}/ajustar",
            [
                'estoque'=>20,
            ]
        )
        ->assertForbidden();

    expect(
        (float)$peca
            ->fresh()
            ->estoque_atual
    )->toBe(10.0);
});
