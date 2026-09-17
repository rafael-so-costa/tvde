<?php

use App\Models\Aluguer;
use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Proprietario;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use App\Models\Contrato;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function aluguerHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function aluguerTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function aluguerUsuario(
    Tenant $tenant,
    string $email,
    string $nivel = 'configurar'
): User {
    $user = User::factory()->create([
        'email' => $email,
        'password' => Hash::make('SenhaTeste123!'),
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
        ['codigo' => 'alugueres'],
        [
            'modulo' => 'alugueres',
            'nome' => 'Alugueres',
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

function aluguerLogin($test, User $user): void
{
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function aluguerEntidades(
    Tenant $tenant,
    string $sufixo = ''
): array {
    $motorista = new Motorista([
        'nome_completo' => "Motorista {$sufixo}",
    ]);

    $motorista->tenant_id = $tenant->id;
    $motorista->save();

    $proprietario = new Proprietario([
        'tipo' => 'pessoa_fisica',
        'nome_completo' => "Proprietário {$sufixo}",
    ]);

    $proprietario->tenant_id = $tenant->id;
    $proprietario->save();

    $veiculo = new Veiculo([
        'matricula' => 'AL-'.str_pad(
            (string) random_int(1, 99),
            2,
            '0',
            STR_PAD_LEFT
        ).'-'.strtoupper(
            substr(
                preg_replace(
                    '/[^A-Za-z]/',
                    '',
                    $sufixo.'AA'
                ),
                0,
                2
            )
        ),
        'marca' => 'Tesla',
        'modelo' => 'Model 3',
        'proprietario_id' => $proprietario->id,
    ]);

    $veiculo->tenant_id = $tenant->id;
    $veiculo->save();

    return compact(
        'motorista',
        'proprietario',
        'veiculo'
    );
}

function aluguerCriarDireto(
    Tenant $tenant,
    User $createdBy,
    array $dados = []
): Aluguer {
    $aluguer = new Aluguer(array_merge([
        'rascunho_passo' => 1,
        'rascunho_dados' => [],
    ], $dados));

    $aluguer->tenant_id = $tenant->id;
    $aluguer->created_by = $createdBy->id;
    $aluguer->save();

    return $aluguer;
}

test('rotas de alugueres exigem autenticação', function () {
    $this->withHeaders(aluguerHeaders())
        ->getJson('/api/alugueres')
        ->assertUnauthorized();
});

test('cliente não pode controlar tenant status autoria ou devolução', function () {
    $tenant = aluguerTenant(
        'Tenant Segurança Aluguer',
        'tenant-seguranca-aluguer'
    );

    $outroTenant = aluguerTenant(
        'Outro Tenant Aluguer',
        'outro-tenant-aluguer'
    );

    $user = aluguerUsuario(
        $tenant,
        'seguranca.aluguer@frotapro.test'
    );

    aluguerLogin($this, $user);

    $this->withHeaders(aluguerHeaders())
        ->postJson('/api/alugueres', [
            'tenant_id' => $outroTenant->id,
            'status' => 'finalizado',
            'created_by' => Str::uuid()->toString(),
            'data_finalizacao' => now()->toISOString(),
            'devolucao_tipo' => 'atraso',
            'devolucao_total_pagar' => 9999,
            'devolucao_declaracao_aceite' => true,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'tenant_id',
            'status',
            'created_by',
            'data_finalizacao',
            'devolucao_tipo',
            'devolucao_total_pagar',
            'devolucao_declaracao_aceite',
        ]);

    expect(Aluguer::count())->toBe(0);
});

test('criação gera rascunho no tenant e autoria atuais', function () {
    $tenant = aluguerTenant(
        'Tenant Criação Aluguer',
        'tenant-criacao-aluguer'
    );

    $user = aluguerUsuario(
        $tenant,
        'criacao.aluguer@frotapro.test'
    );

    aluguerLogin($this, $user);

    $response = $this->withHeaders(aluguerHeaders())
        ->postJson('/api/alugueres', [
            'rascunho_dados' => [
                'template_aluguer_id' => Str::uuid()->toString(),
            ],
            'observacoes' => 'Primeiro rascunho',
        ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'rascunho')
        ->assertJsonPath('data.rascunho_passo', 1)
        ->assertJsonPath(
            'data.created_by',
            $user->id
        );

    $id = $response->json('data.id');

    $this->assertDatabaseHas('alugueres', [
        'id' => $id,
        'tenant_id' => $tenant->id,
        'status' => 'rascunho',
        'created_by' => $user->id,
        'rascunho_passo' => 1,
        'observacoes' => 'Primeiro rascunho',
    ]);
});

test('rascunho aceita entidades do próprio tenant e retorna relações', function () {
    $tenant = aluguerTenant(
        'Tenant Relações Aluguer',
        'tenant-relacoes-aluguer'
    );

    $user = aluguerUsuario(
        $tenant,
        'relacoes.aluguer@frotapro.test'
    );

    $entidades = aluguerEntidades(
        $tenant,
        'RA'
    );

    aluguerLogin($this, $user);

    $this->withHeaders(aluguerHeaders())
        ->postJson('/api/alugueres', [
            'motorista_id' => $entidades['motorista']->id,
            'veiculo_id' => $entidades['veiculo']->id,
            'proprietario_id' => $entidades['proprietario']->id,
            'data_inicio' => '2026-09-20',
            'data_fim' => '2026-10-20',
            'rascunho_passo' => 3,
            'rascunho_dados' => [
                'motorista_id' => $entidades['motorista']->id,
                'veiculo_id' => $entidades['veiculo']->id,
            ],
        ])
        ->assertCreated()
        ->assertJsonPath(
            'data.motorista.id',
            $entidades['motorista']->id
        )
        ->assertJsonPath(
            'data.veiculo.id',
            $entidades['veiculo']->id
        )
        ->assertJsonPath(
            'data.proprietario.id',
            $entidades['proprietario']->id
        )
        ->assertJsonPath(
            'data.rascunho_passo',
            3
        );
});

test('não aceita entidades pertencentes a outro tenant', function () {
    $tenantA = aluguerTenant(
        'Tenant A Aluguer',
        'tenant-a-aluguer'
    );

    $tenantB = aluguerTenant(
        'Tenant B Aluguer',
        'tenant-b-aluguer'
    );

    $user = aluguerUsuario(
        $tenantA,
        'tenant.a.aluguer@frotapro.test'
    );

    $entidadesB = aluguerEntidades(
        $tenantB,
        'TB'
    );

    aluguerLogin($this, $user);

    $this->withHeaders(aluguerHeaders())
        ->postJson('/api/alugueres', [
            'motorista_id' => $entidadesB['motorista']->id,
            'veiculo_id' => $entidadesB['veiculo']->id,
            'proprietario_id' => $entidadesB['proprietario']->id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'motorista_id',
            'veiculo_id',
            'proprietario_id',
        ]);

    expect(Aluguer::count())->toBe(0);
});

test('contratos válidos e checklist de entrega podem ser guardados no rascunho', function () {
    $tenant = aluguerTenant(
        'Tenant IDs Futuros',
        'tenant-ids-futuros'
    );

    $user = aluguerUsuario(
        $tenant,
        'ids.futuros@frotapro.test'
    );

    $contratoAluguer = new Contrato([
        'tipo' => 'aluguer',
    ]);

    $contratoAluguer->tenant_id = $tenant->id;
    $contratoAluguer->save();

    $contratoPrestacao = new Contrato([
        'tipo' => 'prestacao_servico',
    ]);

    $contratoPrestacao->tenant_id = $tenant->id;
    $contratoPrestacao->save();

    $checklistEntrega = Str::uuid()->toString();

    aluguerLogin($this, $user);

    $this->withHeaders(aluguerHeaders())
        ->postJson('/api/alugueres', [
            'contrato_aluguer_id' => $contratoAluguer->id,
            'contrato_prestacao_id' => $contratoPrestacao->id,
            'checklist_entrega_id' => $checklistEntrega,
        ])
        ->assertCreated()
        ->assertJsonPath(
            'data.contrato_aluguer_id',
            $contratoAluguer->id
        )
        ->assertJsonPath(
            'data.contrato_prestacao_id',
            $contratoPrestacao->id
        )
        ->assertJsonPath(
            'data.checklist_entrega_id',
            $checklistEntrega
        );
});

test('não aceita contratos inexistentes de outro tenant ou de tipo incorreto', function () {
    $tenantA = aluguerTenant(
        'Tenant Contrato A',
        'tenant-contrato-a'
    );

    $tenantB = aluguerTenant(
        'Tenant Contrato B',
        'tenant-contrato-b'
    );

    $user = aluguerUsuario(
        $tenantA,
        'contratos.invalidos@frotapro.test'
    );

    $contratoOutroTenant = new Contrato([
        'tipo' => 'aluguer',
    ]);

    $contratoOutroTenant->tenant_id = $tenantB->id;
    $contratoOutroTenant->save();

    $contratoTipoErrado = new Contrato([
        'tipo' => 'prestacao_servico',
    ]);

    $contratoTipoErrado->tenant_id = $tenantA->id;
    $contratoTipoErrado->save();

    aluguerLogin($this, $user);

    $this->withHeaders(aluguerHeaders())
        ->postJson('/api/alugueres', [
            'contrato_aluguer_id' => Str::uuid()->toString(),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'contrato_aluguer_id'
        );

    $this->withHeaders(aluguerHeaders())
        ->postJson('/api/alugueres', [
            'contrato_aluguer_id' => $contratoOutroTenant->id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'contrato_aluguer_id'
        );

    $this->withHeaders(aluguerHeaders())
        ->postJson('/api/alugueres', [
            'contrato_aluguer_id' => $contratoTipoErrado->id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'contrato_aluguer_id'
        );
});

test('listagem respeita tenant e filtro de status', function () {
    $tenantA = aluguerTenant(
        'Tenant A Listagem',
        'tenant-a-listagem-aluguer'
    );

    $tenantB = aluguerTenant(
        'Tenant B Listagem',
        'tenant-b-listagem-aluguer'
    );

    $userA = aluguerUsuario(
        $tenantA,
        'lista.aluguer@frotapro.test',
        'visualizar'
    );

    aluguerCriarDireto(
        $tenantA,
        $userA,
        ['status' => 'rascunho']
    );

    $ativo = aluguerCriarDireto(
        $tenantA,
        $userA
    );

    $ativo->status = 'ativo';
    $ativo->save();

    $userB = User::factory()->create();

    aluguerCriarDireto(
        $tenantB,
        $userB,
        ['status' => 'rascunho']
    );

    aluguerLogin($this, $userA);

    $this->withHeaders(aluguerHeaders())
        ->getJson('/api/alugueres')
        ->assertOk()
        ->assertJsonCount(2, 'data');

    $response = $this->withHeaders(aluguerHeaders())
        ->getJson('/api/alugueres?status=ativo')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $ativo->id);

    expect(
        collect($response->json('data'))
            ->pluck('status')
            ->unique()
            ->values()
            ->all()
    )->toBe(['ativo']);
});

test('aluguer de outro tenant não pode ser consultado alterado ou eliminado', function () {
    $tenantA = aluguerTenant(
        'Tenant A Isolamento',
        'tenant-a-isolamento-aluguer'
    );

    $tenantB = aluguerTenant(
        'Tenant B Isolamento',
        'tenant-b-isolamento-aluguer'
    );

    $userA = aluguerUsuario(
        $tenantA,
        'isolamento.aluguer@frotapro.test'
    );

    $userB = User::factory()->create();

    $aluguerB = aluguerCriarDireto(
        $tenantB,
        $userB
    );

    aluguerLogin($this, $userA);

    $this->withHeaders(aluguerHeaders())
        ->getJson("/api/alugueres/{$aluguerB->id}")
        ->assertNotFound();

    $this->withHeaders(aluguerHeaders())
        ->patchJson(
            "/api/alugueres/{$aluguerB->id}",
            ['observacoes' => 'Ataque']
        )
        ->assertNotFound();

    $this->withHeaders(aluguerHeaders())
        ->deleteJson("/api/alugueres/{$aluguerB->id}")
        ->assertNotFound();

    $this->assertDatabaseHas('alugueres', [
        'id' => $aluguerB->id,
    ]);
});

test('apenas rascunho pode ser alterado por patch genérico', function () {
    $tenant = aluguerTenant(
        'Tenant Atualização Aluguer',
        'tenant-atualizacao-aluguer'
    );

    $user = aluguerUsuario(
        $tenant,
        'atualizacao.aluguer@frotapro.test'
    );

    $aluguer = aluguerCriarDireto(
        $tenant,
        $user
    );

    $aluguer->status = 'ativo';
    $aluguer->save();

    aluguerLogin($this, $user);

    $this->withHeaders(aluguerHeaders())
        ->patchJson(
            "/api/alugueres/{$aluguer->id}",
            ['observacoes' => 'Não deve alterar']
        )
        ->assertUnprocessable();

    $this->assertDatabaseMissing('alugueres', [
        'id' => $aluguer->id,
        'observacoes' => 'Não deve alterar',
    ]);
});

test('utilizador com visualizar pode ler mas não modificar alugueres', function () {
    $tenant = aluguerTenant(
        'Tenant Permissão Aluguer',
        'tenant-permissao-aluguer'
    );

    $user = aluguerUsuario(
        $tenant,
        'visualizar.aluguer@frotapro.test',
        'visualizar'
    );

    $aluguer = aluguerCriarDireto(
        $tenant,
        $user
    );

    aluguerLogin($this, $user);

    $this->withHeaders(aluguerHeaders())
        ->getJson('/api/alugueres')
        ->assertOk();

    $this->withHeaders(aluguerHeaders())
        ->postJson('/api/alugueres', [])
        ->assertForbidden();

    $this->withHeaders(aluguerHeaders())
        ->patchJson(
            "/api/alugueres/{$aluguer->id}",
            ['observacoes' => 'Bloqueado']
        )
        ->assertForbidden();

    $this->withHeaders(aluguerHeaders())
        ->deleteJson("/api/alugueres/{$aluguer->id}")
        ->assertForbidden();
});

test('rascunho pode ser atualizado e aluguer não finalizado pode ser eliminado', function () {
    $tenant = aluguerTenant(
        'Tenant CRUD Aluguer',
        'tenant-crud-aluguer'
    );

    $user = aluguerUsuario(
        $tenant,
        'crud.aluguer@frotapro.test'
    );

    $aluguer = aluguerCriarDireto(
        $tenant,
        $user
    );

    aluguerLogin($this, $user);

    $this->withHeaders(aluguerHeaders())
        ->patchJson(
            "/api/alugueres/{$aluguer->id}",
            [
                'rascunho_passo' => 4,
                'observacoes' => 'Rascunho atualizado',
                'rascunho_dados' => [
                    'observacoes' => 'Rascunho atualizado',
                ],
            ]
        )
        ->assertOk()
        ->assertJsonPath('data.rascunho_passo', 4)
        ->assertJsonPath(
            'data.observacoes',
            'Rascunho atualizado'
        );

    $this->withHeaders(aluguerHeaders())
        ->deleteJson("/api/alugueres/{$aluguer->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('alugueres', [
        'id' => $aluguer->id,
    ]);
});

test('aluguer finalizado não pode ser eliminado', function () {
    $tenant = aluguerTenant(
        'Tenant Finalizado Aluguer',
        'tenant-finalizado-aluguer'
    );

    $user = aluguerUsuario(
        $tenant,
        'finalizado.aluguer@frotapro.test'
    );

    $aluguer = aluguerCriarDireto(
        $tenant,
        $user
    );

    $aluguer->status = 'finalizado';
    $aluguer->data_finalizacao = now();
    $aluguer->save();

    aluguerLogin($this, $user);

    $this->withHeaders(aluguerHeaders())
        ->deleteJson("/api/alugueres/{$aluguer->id}")
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'Alugueres finalizados não podem ser eliminados.'
        );

    $this->assertDatabaseHas('alugueres', [
        'id' => $aluguer->id,
        'status' => 'finalizado',
    ]);
});
