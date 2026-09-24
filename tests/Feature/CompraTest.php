<?php

use App\Models\Compra;
use App\Models\CompraItem;
use App\Models\EstoqueMovimento;
use App\Models\Fornecedor;
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

function cmpHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function cmpTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function cmpLogin(
    $test,
    User $user
): void {
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function cmpFuncionario(
    Tenant $tenant,
    string $email,
    string $nivel = 'configurar'
): User {
    $user = User::factory()->create([
        'email' => $email,
        'password' => Hash::make(
            'SenhaTeste123!'
        ),
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $role = Role::firstOrCreate(
        ['codigo' => 'funcionario'],
        [
            'nome' => 'Funcionário',
            'sistema' => true,
        ]
    );

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);

    $permission = Permission::firstOrCreate(
        ['codigo' => 'manutencao'],
        [
            'modulo' => 'manutencao',
            'nome' => 'Manutenção',
        ]
    );

    RolePermission::updateOrCreate(
        [
            'role_id' => $role->id,
            'permission_id' => $permission->id,
        ],
        [
            'nivel' => $nivel,
        ]
    );

    return $user;
}

function cmpFornecedor(
    Tenant $tenant,
    string $nome = 'Fornecedor Teste'
): Fornecedor {
    $fornecedor = new Fornecedor([
        'tipo' => 'pecas',
        'nome' => $nome,
        'nif' =>
        (string)random_int(
            100000000,
            999999999
        ),
        'email' =>
        strtolower(
            str_replace(
                ' ',
                '.',
                $nome
            )
        ) .
            '@compras.test',
        'ativo' => true,
    ]);

    $fornecedor->tenant_id = $tenant->id;
    $fornecedor->save();

    return $fornecedor;
}

function cmpPeca(
    Tenant $tenant,
    string $codigo,
    string $nome,
    float $estoque = 0,
    float $custoMedio = 0
): Peca {
    $peca = new Peca([
        'codigo' => $codigo,
        'nome' => $nome,
        'unidade' => 'un',
        'estoque_minimo' => 2,
        'ativo' => true,
    ]);

    $peca->tenant_id = $tenant->id;
    $peca->estoque_atual = $estoque;
    $peca->custo_medio = $custoMedio;
    $peca->save();

    return $peca;
}

function cmpPayload(
    Fornecedor $fornecedor,
    Peca $peca,
    array $overrides = []
): array {
    return array_merge([
        'fornecedor_id' => $fornecedor->id,
        'numero_documento' => 'ENC-TEST-001',
        'status' => 'rascunho',
        'data_encomenda' =>
        now()->toDateString(),
        'data_prevista' =>
        now()
            ->addDays(5)
            ->toDateString(),
        'impostos' => 23,
        'observacoes' =>
        'Compra para testes.',
        'itens' => [
            [
                'peca_id' => $peca->id,
                'descricao' => $peca->nome,
                'quantidade' => 10,
                'valor_unitario' => 20,
            ],
        ],
    ], $overrides);
}

test('rotas de compras exigem autenticacao', function () {
    $this
        ->withHeaders(cmpHeaders())
        ->getJson('/api/compras')
        ->assertUnauthorized();

    $this
        ->withHeaders(cmpHeaders())
        ->postJson('/api/compras', [])
        ->assertUnauthorized();
});

test('gestor cria compra com totais tenant e autoria calculados pelo servidor', function () {
    $tenant = cmpTenant(
        'Tenant Criar Compra',
        'tenant-criar-compra'
    );

    $user = cmpFuncionario(
        $tenant,
        'criar@compras.test'
    );

    $fornecedor = cmpFornecedor(
        $tenant
    );

    $peca = cmpPeca(
        $tenant,
        'CMP-001',
        'Filtro de óleo'
    );

    cmpLogin($this, $user);

    $response = $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            '/api/compras',
            cmpPayload(
                $fornecedor,
                $peca
            )
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.tenant_id',
            $tenant->id
        )
        ->assertJsonPath(
            'data.fornecedor_id',
            $fornecedor->id
        )
        ->assertJsonPath(
            'data.status',
            'rascunho'
        );

    $compra = Compra::findOrFail(
        $response->json('data.id')
    );

    expect($compra->created_by)
        ->toBe($user->id);

    expect($compra->updated_by)
        ->toBe($user->id);

    expect((float)$compra->subtotal)
        ->toBe(200.0);

    expect((float)$compra->impostos)
        ->toBe(23.0);

    expect((float)$compra->total)
        ->toBe(223.0);

    $item = $compra
        ->itens()
        ->firstOrFail();

    expect((float)$item->quantidade)
        ->toBe(10.0);

    expect((float)$item->quantidade_recebida)
        ->toBe(0.0);

    expect((float)$item->valor_unitario)
        ->toBe(20.0);

    expect((float)$item->valor_total)
        ->toBe(200.0);
});

test('campos financeiros calculados pelo servidor nao podem ser enviados pelo cliente', function () {
    $tenant = cmpTenant(
        'Tenant Segurança Compra',
        'tenant-seguranca-compra'
    );

    $user = cmpFuncionario(
        $tenant,
        'seguranca@compras.test'
    );

    $fornecedor = cmpFornecedor(
        $tenant
    );

    $peca = cmpPeca(
        $tenant,
        'CMP-SEC',
        'Peça Segurança'
    );

    cmpLogin($this, $user);

    $payload = cmpPayload(
        $fornecedor,
        $peca
    );

    $payload['tenant_id'] =
        $tenant->id;

    $payload['subtotal'] = 1;
    $payload['total'] = 1;
    $payload['created_by'] = $user->id;

    $payload['itens'][0]['quantidade_recebida'] = 10;

    $payload['itens'][0]['valor_total'] = 1;

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            '/api/compras',
            $payload
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'tenant_id',
            'subtotal',
            'total',
            'created_by',
            'itens.0.quantidade_recebida',
            'itens.0.valor_total',
        ]);

    expect(Compra::count())
        ->toBe(0);
});

test('compra nao aceita fornecedor nem peca de outro tenant', function () {
    $tenantA = cmpTenant(
        'Tenant Compra A',
        'tenant-compra-a'
    );

    $tenantB = cmpTenant(
        'Tenant Compra B',
        'tenant-compra-b'
    );

    $user = cmpFuncionario(
        $tenantA,
        'cross@compras.test'
    );

    $fornecedorA = cmpFornecedor(
        $tenantA,
        'Fornecedor A'
    );

    $fornecedorB = cmpFornecedor(
        $tenantB,
        'Fornecedor B'
    );

    $pecaA = cmpPeca(
        $tenantA,
        'CROSS-A',
        'Peça A'
    );

    $pecaB = cmpPeca(
        $tenantB,
        'CROSS-B',
        'Peça B'
    );

    cmpLogin($this, $user);

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            '/api/compras',
            cmpPayload(
                $fornecedorB,
                $pecaA
            )
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'fornecedor_id'
        );

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            '/api/compras',
            cmpPayload(
                $fornecedorA,
                $pecaB
            )
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'peca_id'
        );

    expect(Compra::count())
        ->toBe(0);
});

test('compra passa de rascunho para encomendada', function () {
    $tenant = cmpTenant(
        'Tenant Encomendar Compra',
        'tenant-encomendar-compra'
    );

    $user = cmpFuncionario(
        $tenant,
        'encomendar@compras.test'
    );

    $fornecedor = cmpFornecedor(
        $tenant
    );

    $peca = cmpPeca(
        $tenant,
        'ENC-001',
        'Peça Encomenda'
    );

    cmpLogin($this, $user);

    $response = $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            '/api/compras',
            cmpPayload(
                $fornecedor,
                $peca
            )
        )
        ->assertCreated();

    $id = $response->json('data.id');

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            "/api/compras/{$id}/encomendar"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'encomendada'
        );

    expect(
        Compra::findOrFail($id)
            ->status
    )->toBe('encomendada');
});

test('recebimento parcial aumenta estoque e mantem compra parcialmente recebida', function () {
    $tenant = cmpTenant(
        'Tenant Compra Parcial',
        'tenant-compra-parcial'
    );

    $user = cmpFuncionario(
        $tenant,
        'parcial@compras.test'
    );

    $fornecedor = cmpFornecedor(
        $tenant
    );

    $peca = cmpPeca(
        $tenant,
        'PAR-001',
        'Peça Parcial',
        10,
        10
    );

    cmpLogin($this, $user);

    $response = $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            '/api/compras',
            cmpPayload(
                $fornecedor,
                $peca
            )
        )
        ->assertCreated();

    $compra = Compra::findOrFail(
        $response->json('data.id')
    );

    $item = $compra
        ->itens()
        ->firstOrFail();

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            "/api/compras/{$compra->id}/encomendar"
        )
        ->assertOk();

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            "/api/compras/{$compra->id}/receber",
            [
                'itens' => [
                    [
                        'item_id' => $item->id,
                        'quantidade' => 4,
                    ],
                ],
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'parcialmente_recebida'
        );

    $compra->refresh();
    $item->refresh();
    $peca->refresh();

    expect($compra->status)
        ->toBe(
            'parcialmente_recebida'
        );

    expect((float)$item->quantidade_recebida)
        ->toBe(4.0);

    expect((float)$peca->estoque_atual)
        ->toBe(14.0);

    /*
     * 10 unidades x 10 = 100
     * + 4 unidades x 20 = 80
     * Total 180 / 14 = 12,8571...
     */
    expect(
        round(
            (float)$peca->custo_medio,
            4
        )
    )->toBe(12.8571);

    $movimento = EstoqueMovimento::query()
        ->where(
            'compra_id',
            $compra->id
        )
        ->firstOrFail();

    expect($movimento->tipo)
        ->toBe('entrada');

    expect($movimento->origem)
        ->toBe('compra');
        expect($movimento->compra_item_id)
    ->toBe($item->id);

    expect((float)$movimento->quantidade)
        ->toBe(4.0);

    expect((float)$movimento->saldo_anterior)
        ->toBe(10.0);

    expect((float)$movimento->saldo_posterior)
        ->toBe(14.0);
});

test('recebimento total conclui compra e custo medio ponderado fica correto', function () {
    $tenant = cmpTenant(
        'Tenant Compra Total',
        'tenant-compra-total'
    );

    $user = cmpFuncionario(
        $tenant,
        'total@compras.test'
    );

    $fornecedor = cmpFornecedor(
        $tenant
    );

    $peca = cmpPeca(
        $tenant,
        'TOT-001',
        'Peça Total',
        10,
        10
    );

    cmpLogin($this, $user);

    $response = $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            '/api/compras',
            cmpPayload(
                $fornecedor,
                $peca
            )
        )
        ->assertCreated();

    $compra = Compra::findOrFail(
        $response->json('data.id')
    );

    $item = $compra
        ->itens()
        ->firstOrFail();

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            "/api/compras/{$compra->id}/encomendar"
        )
        ->assertOk();

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            "/api/compras/{$compra->id}/receber",
            [
                'itens' => [
                    [
                        'item_id' => $item->id,
                        'quantidade' => 4,
                    ],
                ],
            ]
        )
        ->assertOk();

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            "/api/compras/{$compra->id}/receber",
            [
                'itens' => [
                    [
                        'item_id' => $item->id,
                        'quantidade' => 6,
                    ],
                ],
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'recebida'
        );

    $compra->refresh();
    $item->refresh();
    $peca->refresh();

    expect($compra->status)
        ->toBe('recebida');

    expect($compra->data_recebimento)
        ->not->toBeNull();

    expect((float)$item->quantidade_recebida)
        ->toBe(10.0);

    expect((float)$peca->estoque_atual)
        ->toBe(20.0);

    /*
     * Estoque inicial:
     * 10 x 10 = 100
     *
     * Compra:
     * 10 x 20 = 200
     *
     * 300 / 20 = 15
     */
    expect(
        round(
            (float)$peca->custo_medio,
            4
        )
    )->toBe(15.0);

    expect(
        EstoqueMovimento::query()
            ->where(
                'compra_id',
                $compra->id
            )
            ->count()
    )->toBe(2);
});

test('recebimento superior ao saldo pendente e bloqueado sem alterar estoque', function () {
    $tenant = cmpTenant(
        'Tenant Compra Excesso',
        'tenant-compra-excesso'
    );

    $user = cmpFuncionario(
        $tenant,
        'excesso@compras.test'
    );

    $fornecedor = cmpFornecedor(
        $tenant
    );

    $peca = cmpPeca(
        $tenant,
        'EXC-001',
        'Peça Excesso',
        5,
        10
    );

    cmpLogin($this, $user);

    $response = $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            '/api/compras',
            cmpPayload(
                $fornecedor,
                $peca,
                [
                    'itens' => [
                        [
                            'peca_id' => $peca->id,
                            'descricao' => 'Peça Excesso',
                            'quantidade' => 5,
                            'valor_unitario' => 20,
                        ],
                    ],
                ]
            )
        )
        ->assertCreated();

    $compra = Compra::findOrFail(
        $response->json('data.id')
    );

    $item = $compra
        ->itens()
        ->firstOrFail();

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            "/api/compras/{$compra->id}/encomendar"
        )
        ->assertOk();

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            "/api/compras/{$compra->id}/receber",
            [
                'itens' => [
                    [
                        'item_id' => $item->id,
                        'quantidade' => 6,
                    ],
                ],
            ]
        )
        ->assertUnprocessable();

    expect(
        (float)$item
            ->fresh()
            ->quantidade_recebida
    )->toBe(0.0);

    expect(
        (float)$peca
            ->fresh()
            ->estoque_atual
    )->toBe(5.0);

    expect(
        EstoqueMovimento::query()
            ->where(
                'compra_id',
                $compra->id
            )
            ->count()
    )->toBe(0);
});

test('compra com recebimento nao pode ser cancelada nem eliminada', function () {
    $tenant = cmpTenant(
        'Tenant Compra Protegida',
        'tenant-compra-protegida'
    );

    $user = cmpFuncionario(
        $tenant,
        'protegida@compras.test'
    );

    $fornecedor = cmpFornecedor(
        $tenant
    );

    $peca = cmpPeca(
        $tenant,
        'PRO-001',
        'Peça Protegida'
    );

    cmpLogin($this, $user);

    $response = $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            '/api/compras',
            cmpPayload(
                $fornecedor,
                $peca
            )
        )
        ->assertCreated();

    $compra = Compra::findOrFail(
        $response->json('data.id')
    );

    $item = $compra
        ->itens()
        ->firstOrFail();

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            "/api/compras/{$compra->id}/encomendar"
        )
        ->assertOk();

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            "/api/compras/{$compra->id}/receber",
            [
                'itens' => [
                    [
                        'item_id' => $item->id,
                        'quantidade' => 1,
                    ],
                ],
            ]
        )
        ->assertOk();

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            "/api/compras/{$compra->id}/cancelar"
        )
        ->assertUnprocessable();

    $this
        ->withHeaders(cmpHeaders())
        ->deleteJson(
            "/api/compras/{$compra->id}"
        )
        ->assertUnprocessable();

    $this->assertDatabaseHas(
        'compras',
        [
            'id' => $compra->id,
        ]
    );
});

test('compra em rascunho pode ser atualizada e eliminada', function () {
    $tenant = cmpTenant(
        'Tenant CRUD Compra',
        'tenant-crud-compra'
    );

    $user = cmpFuncionario(
        $tenant,
        'crud@compras.test'
    );

    $fornecedor = cmpFornecedor(
        $tenant
    );

    $peca = cmpPeca(
        $tenant,
        'CRUD-001',
        'Peça CRUD'
    );

    cmpLogin($this, $user);

    $response = $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            '/api/compras',
            cmpPayload(
                $fornecedor,
                $peca
            )
        )
        ->assertCreated();

    $id = $response->json('data.id');

    $this
        ->withHeaders(cmpHeaders())
        ->patchJson(
            "/api/compras/{$id}",
            [
                'numero_documento' =>
                'ENC-ALTERADA',
                'impostos' => 10,
                'observacoes' =>
                'Compra atualizada.',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.numero_documento',
            'ENC-ALTERADA'
        );

    $compra = Compra::findOrFail($id);

    expect((float)$compra->subtotal)
        ->toBe(200.0);

    expect((float)$compra->impostos)
        ->toBe(10.0);

    expect((float)$compra->total)
        ->toBe(210.0);

    $this
        ->withHeaders(cmpHeaders())
        ->deleteJson(
            "/api/compras/{$id}"
        )
        ->assertOk();

    $this->assertDatabaseMissing(
        'compras',
        [
            'id' => $id,
        ]
    );

    expect(
        CompraItem::query()
            ->where(
                'compra_id',
                $id
            )
            ->count()
    )->toBe(0);
});

test('listagem de compras respeita tenant status fornecedor e pesquisa', function () {
    $tenantA = cmpTenant(
        'Tenant Lista Compra A',
        'tenant-lista-compra-a'
    );

    $tenantB = cmpTenant(
        'Tenant Lista Compra B',
        'tenant-lista-compra-b'
    );

    $user = cmpFuncionario(
        $tenantA,
        'lista@compras.test',
        'visualizar'
    );

    $fornecedorA = cmpFornecedor(
        $tenantA,
        'Oficina Lisboa'
    );

    $fornecedorB = cmpFornecedor(
        $tenantB,
        'Fornecedor Externo'
    );

    $pecaA = cmpPeca(
        $tenantA,
        'LIST-A',
        'Peça Lista A'
    );

    $pecaB = cmpPeca(
        $tenantB,
        'LIST-B',
        'Peça Lista B'
    );

    $compraA = new Compra();

    $compraA->tenant_id = $tenantA->id;
    $compraA->fornecedor_id =
        $fornecedorA->id;

    $compraA->numero_documento =
        'LISBOA-001';

    $compraA->status = 'encomendada';

    $compraA->data_encomenda =
        now()->toDateString();

    $compraA->subtotal = 100;
    $compraA->impostos = 0;
    $compraA->total = 100;
    $compraA->save();

    $itemA = new CompraItem();

    $itemA->tenant_id = $tenantA->id;
    $itemA->compra_id = $compraA->id;
    $itemA->peca_id = $pecaA->id;
    $itemA->descricao = 'Peça Lista A';
    $itemA->quantidade = 1;
    $itemA->quantidade_recebida = 0;
    $itemA->valor_unitario = 100;
    $itemA->valor_total = 100;
    $itemA->save();

    $compraB = new Compra();

    $compraB->tenant_id = $tenantB->id;
    $compraB->fornecedor_id =
        $fornecedorB->id;

    $compraB->numero_documento =
        'OUTRO-TENANT';

    $compraB->status = 'encomendada';

    $compraB->data_encomenda =
        now()->toDateString();

    $compraB->subtotal = 100;
    $compraB->impostos = 0;
    $compraB->total = 100;
    $compraB->save();

    $itemB = new CompraItem();

    $itemB->tenant_id = $tenantB->id;
    $itemB->compra_id = $compraB->id;
    $itemB->peca_id = $pecaB->id;
    $itemB->descricao = 'Peça Lista B';
    $itemB->quantidade = 1;
    $itemB->quantidade_recebida = 0;
    $itemB->valor_unitario = 100;
    $itemB->valor_total = 100;
    $itemB->save();

    cmpLogin($this, $user);

    $response = $this
        ->withHeaders(cmpHeaders())
        ->getJson(
            '/api/compras' .
                '?status=encomendada' .
                '&fornecedor_id=' .
                $fornecedorA->id .
                '&search=Lisboa'
        )
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath(
            'data.0.id',
            $compraA->id
        );

    expect(
        collect(
            $response->json('data')
        )->pluck('numero_documento')
    )->not->toContain(
        'OUTRO-TENANT'
    );
});

test('permissao visualizar permite consultar compras mas bloqueia configuracao', function () {
    $tenant = cmpTenant(
        'Tenant Compra Visualizar',
        'tenant-compra-visualizar'
    );

    $user = cmpFuncionario(
        $tenant,
        'visualizar@compras.test',
        'visualizar'
    );

    $fornecedor = cmpFornecedor(
        $tenant
    );

    $peca = cmpPeca(
        $tenant,
        'VIS-CMP',
        'Peça Visualizar'
    );

    cmpLogin($this, $user);

    $this
        ->withHeaders(cmpHeaders())
        ->getJson('/api/compras')
        ->assertOk();

    $this
        ->withHeaders(cmpHeaders())
        ->postJson(
            '/api/compras',
            cmpPayload(
                $fornecedor,
                $peca
            )
        )
        ->assertForbidden();

    expect(Compra::count())
        ->toBe(0);
});
