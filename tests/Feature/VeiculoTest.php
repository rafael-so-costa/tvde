<?php

use App\Models\Permission;
use App\Models\Proprietario;
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

function veiculoSpaHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function criarTenantVeiculo(string $nome, string $slug): Tenant
{
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function criarUsuarioVeiculo(
    string $email,
    Tenant $tenant,
    string $nivel
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

    $role = Role::create([
        'codigo' => 'funcionario',
        'nome' => 'Funcionário',
        'sistema' => true,
    ]);

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);

    $permission = Permission::create([
        'codigo' => 'veiculos',
        'modulo' => 'veiculos',
        'nome' => 'Veículos',
    ]);

    RolePermission::create([
        'role_id' => $role->id,
        'permission_id' => $permission->id,
        'nivel' => $nivel,
    ]);

    return $user;
}

function autenticarUsuarioVeiculo($test, User $user): void
{
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function criarProprietarioVeiculo(
    Tenant $tenant,
    array $dados = []
): Proprietario {
    $proprietario = new Proprietario(array_merge([
        'tipo' => 'pessoa_fisica',
        'nome_completo' => 'Proprietário do Veículo',
        'nif' => '250123456',
        'email' => 'proprietario.veiculo@example.test',
        'telemovel' => '+351912345678',
        'data_nascimento' => '1980-01-01',
        'tipo_documento' => 'cartao_cidadao',
        'numero_documento' => '12345678',
        'documento_valid_until' => '2030-01-01',
        'endereco_rua' => 'Rua do Proprietário',
        'endereco_cidade' => 'Lisboa',
        'endereco_cep' => '1000-100',
    ], $dados));

    $proprietario->tenant_id = $tenant->id;
    $proprietario->sincronizarCadastro();
    $proprietario->save();

    return $proprietario;
}

function dadosVeiculoCompleto(
    Proprietario $proprietario,
    array $overrides = []
): array {
    return array_merge([
        'matricula' => 'AA-00-AA',
        'data_matricula' => '2024-01-10',
        'marca' => 'Tesla',
        'modelo' => 'Model 3',
        'cor' => 'Branco',
        'combustivel' => 'Elétrico',
        'lugares' => 5,
        'portas' => 4,
        'chassi' => 'WVWZZZ1JZXW000001',
        'potencia' => 283,
        'proprietario_id' => $proprietario->id,
        'carta_verde' => 'CV-123456',
        'carta_verde_valid_until' => '2030-01-01',
        'inspecao_tvde' => 'ITVDE-123456',
        'inspecao_tvde_valid_until' => '2030-06-01',
        'uber_valid_until' => '2030-07-01',
        'bolt_valid_until' => '2030-08-01',
        'extintor_valid_until' => '2030-09-01',
        'valor_caucao' => 500,
        'valor_aluguel' => 250,
        'via_verde' => 'VV-123456',
        'fotos_galeria' => [],
    ], $overrides);
}

function criarVeiculoDireto(
    Tenant $tenant,
    Proprietario $proprietario,
    array $dados = []
): Veiculo {
    $veiculo = new Veiculo(
        dadosVeiculoCompleto($proprietario, $dados)
    );

    $veiculo->tenant_id = $tenant->id;
    $veiculo->sincronizarCadastro();
    $veiculo->save();

    return $veiculo;
}

test('rotas de veículos exigem autenticação', function () {
    $this->withHeaders(veiculoSpaHeaders())
        ->getJson('/api/veiculos')
        ->assertUnauthorized();
});

test('cliente não pode definir tenant ativo ou status do veículo', function () {
    $tenant = criarTenantVeiculo(
        'Tenant Segurança Veículo',
        'tenant-seguranca-veiculo'
    );

    $outroTenant = criarTenantVeiculo(
        'Tenant Malicioso Veículo',
        'tenant-malicioso-veiculo'
    );

    $proprietario = criarProprietarioVeiculo($tenant);

    $user = criarUsuarioVeiculo(
        'seguranca.veiculo@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioVeiculo($this, $user);

    $payload = dadosVeiculoCompleto($proprietario, [
        'tenant_id' => $outroTenant->id,
        'ativo' => true,
        'status_cadastro' => 'ativo',
    ]);

    $this->withHeaders(veiculoSpaHeaders())
        ->postJson('/api/veiculos', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'tenant_id',
            'ativo',
            'status_cadastro',
        ]);

    $this->assertDatabaseMissing('veiculos', [
        'matricula' => 'AA-00-AA',
    ]);
});

test('matrícula é normalizada para maiúsculas', function () {
    $tenant = criarTenantVeiculo(
        'Tenant Matrícula',
        'tenant-matricula-uppercase'
    );

    $proprietario = criarProprietarioVeiculo($tenant);

    $user = criarUsuarioVeiculo(
        'matricula.upper@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioVeiculo($this, $user);

    $this->withHeaders(veiculoSpaHeaders())
        ->postJson(
            '/api/veiculos',
            dadosVeiculoCompleto($proprietario, [
                'matricula' => '  aa-12-bb  ',
            ])
        )
        ->assertCreated()
        ->assertJsonPath('data.matricula', 'AA-12-BB');

    $this->assertDatabaseHas('veiculos', [
        'tenant_id' => $tenant->id,
        'matricula' => 'AA-12-BB',
    ]);
});

test('veículo incompleto é guardado inativo', function () {
    $tenant = criarTenantVeiculo(
        'Tenant Incompleto Veículo',
        'tenant-incompleto-veiculo'
    );

    $user = criarUsuarioVeiculo(
        'incompleto.veiculo@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioVeiculo($this, $user);

    $response = $this->withHeaders(veiculoSpaHeaders())
        ->postJson('/api/veiculos', [
            'matricula' => 'BB-00-BB',
            'marca' => 'Tesla',
            'modelo' => 'Model Y',
        ])
        ->assertCreated();

    $response
        ->assertJsonPath('data.matricula', 'BB-00-BB')
        ->assertJsonPath('data.ativo', false)
        ->assertJsonPath(
            'data.status_cadastro',
            'incompleto'
        );

    $this->assertDatabaseHas('veiculos', [
        'tenant_id' => $tenant->id,
        'matricula' => 'BB-00-BB',
        'ativo' => false,
        'status_cadastro' => 'incompleto',
    ]);
});

test('veículo completo é criado ativo', function () {
    $tenant = criarTenantVeiculo(
        'Tenant Completo Veículo',
        'tenant-completo-veiculo'
    );

    $proprietario = criarProprietarioVeiculo($tenant);

    $user = criarUsuarioVeiculo(
        'completo.veiculo@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioVeiculo($this, $user);

    $this->withHeaders(veiculoSpaHeaders())
        ->postJson(
            '/api/veiculos',
            dadosVeiculoCompleto($proprietario)
        )
        ->assertCreated()
        ->assertJsonPath('data.ativo', true)
        ->assertJsonPath('data.status_cadastro', 'ativo')
        ->assertJsonPath(
            'data.proprietario.id',
            $proprietario->id
        )
        ->assertJsonPath('data.valor_aluguel', '250.00')
        ->assertJsonPath('data.valor_caucao', '500.00');

    $this->assertDatabaseHas('veiculos', [
        'tenant_id' => $tenant->id,
        'proprietario_id' => $proprietario->id,
        'matricula' => 'AA-00-AA',
        'ativo' => true,
        'status_cadastro' => 'ativo',
    ]);
});

test('não aceita proprietário pertencente a outro tenant', function () {
    $tenantA = criarTenantVeiculo(
        'Tenant A Proprietário',
        'tenant-a-proprietario-veiculo'
    );

    $tenantB = criarTenantVeiculo(
        'Tenant B Proprietário',
        'tenant-b-proprietario-veiculo'
    );

    $proprietarioB = criarProprietarioVeiculo(
        $tenantB,
        [
            'nif' => '250123457',
            'email' => 'proprietario.b@example.test',
        ]
    );

    $user = criarUsuarioVeiculo(
        'admin.a.proprietario@frotapro.test',
        $tenantA,
        'configurar'
    );

    autenticarUsuarioVeiculo($this, $user);

    $this->withHeaders(veiculoSpaHeaders())
        ->postJson('/api/veiculos', [
            'matricula' => 'CC-00-CC',
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
            'proprietario_id' => $proprietarioB->id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('proprietario_id');

    $this->assertDatabaseMissing('veiculos', [
        'tenant_id' => $tenantA->id,
        'matricula' => 'CC-00-CC',
    ]);
});

test('matrícula não pode repetir dentro do mesmo tenant', function () {
    $tenant = criarTenantVeiculo(
        'Tenant Matrícula Única',
        'tenant-matricula-unica'
    );

    $proprietario = criarProprietarioVeiculo($tenant);

    criarVeiculoDireto(
        $tenant,
        $proprietario,
        [
            'matricula' => 'DD-00-DD',
        ]
    );

    $user = criarUsuarioVeiculo(
        'matricula.unica@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioVeiculo($this, $user);

    $this->withHeaders(veiculoSpaHeaders())
        ->postJson(
            '/api/veiculos',
            dadosVeiculoCompleto($proprietario, [
                'matricula' => 'dd-00-dd',
            ])
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('matricula');

    expect(
        Veiculo::where('tenant_id', $tenant->id)
            ->where('matricula', 'DD-00-DD')
            ->count()
    )->toBe(1);
});

test('mesma matrícula pode existir em tenants diferentes', function () {
    $tenantA = criarTenantVeiculo(
        'Tenant A Matrícula',
        'tenant-a-matricula'
    );

    $tenantB = criarTenantVeiculo(
        'Tenant B Matrícula',
        'tenant-b-matricula'
    );

    $proprietarioA = criarProprietarioVeiculo(
        $tenantA,
        [
            'nif' => '250123458',
            'email' => 'proprietario.a.matricula@example.test',
        ]
    );

    $proprietarioB = criarProprietarioVeiculo(
        $tenantB,
        [
            'nif' => '250123459',
            'email' => 'proprietario.b.matricula@example.test',
        ]
    );

    criarVeiculoDireto(
        $tenantB,
        $proprietarioB,
        [
            'matricula' => 'EE-00-EE',
        ]
    );

    $user = criarUsuarioVeiculo(
        'tenant.a.matricula@frotapro.test',
        $tenantA,
        'configurar'
    );

    autenticarUsuarioVeiculo($this, $user);

    $this->withHeaders(veiculoSpaHeaders())
        ->postJson(
            '/api/veiculos',
            dadosVeiculoCompleto($proprietarioA, [
                'matricula' => 'EE-00-EE',
            ])
        )
        ->assertCreated();

    $this->assertDatabaseHas('veiculos', [
        'tenant_id' => $tenantA->id,
        'matricula' => 'EE-00-EE',
    ]);

    $this->assertDatabaseHas('veiculos', [
        'tenant_id' => $tenantB->id,
        'matricula' => 'EE-00-EE',
    ]);
});

test('listagem retorna apenas veículos do tenant atual', function () {
    $tenantA = criarTenantVeiculo(
        'Tenant A Listagem',
        'tenant-a-listagem-veiculo'
    );

    $tenantB = criarTenantVeiculo(
        'Tenant B Listagem',
        'tenant-b-listagem-veiculo'
    );

    $proprietarioA = criarProprietarioVeiculo(
        $tenantA,
        [
            'nif' => '250123460',
            'email' => 'lista.a@example.test',
        ]
    );

    $proprietarioB = criarProprietarioVeiculo(
        $tenantB,
        [
            'nif' => '250123461',
            'email' => 'lista.b@example.test',
        ]
    );

    criarVeiculoDireto(
        $tenantA,
        $proprietarioA,
        [
            'matricula' => 'FF-00-FF',
        ]
    );

    criarVeiculoDireto(
        $tenantB,
        $proprietarioB,
        [
            'matricula' => 'GG-00-GG',
        ]
    );

    $user = criarUsuarioVeiculo(
        'listagem.veiculo@frotapro.test',
        $tenantA,
        'visualizar'
    );

    autenticarUsuarioVeiculo($this, $user);

    $response = $this->withHeaders(veiculoSpaHeaders())
        ->getJson('/api/veiculos')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect(
        collect($response->json('data'))
            ->pluck('matricula')
    )
        ->toContain('FF-00-FF')
        ->not->toContain('GG-00-GG');
});

test('veículo de outro tenant não pode ser consultado alterado ou apagado', function () {
    $tenantA = criarTenantVeiculo(
        'Tenant A Isolamento',
        'tenant-a-isolamento-veiculo'
    );

    $tenantB = criarTenantVeiculo(
        'Tenant B Isolamento',
        'tenant-b-isolamento-veiculo'
    );

    $proprietarioB = criarProprietarioVeiculo(
        $tenantB,
        [
            'nif' => '250123462',
            'email' => 'isolamento.b@example.test',
        ]
    );

    $veiculoB = criarVeiculoDireto(
        $tenantB,
        $proprietarioB,
        [
            'matricula' => 'HH-00-HH',
        ]
    );

    $user = criarUsuarioVeiculo(
        'isolamento.veiculo@frotapro.test',
        $tenantA,
        'configurar'
    );

    autenticarUsuarioVeiculo($this, $user);

    $this->withHeaders(veiculoSpaHeaders())
        ->getJson("/api/veiculos/{$veiculoB->id}")
        ->assertNotFound();

    $this->withHeaders(veiculoSpaHeaders())
        ->patchJson("/api/veiculos/{$veiculoB->id}", [
            'marca' => 'Marca Invadida',
        ])
        ->assertNotFound();

    $this->withHeaders(veiculoSpaHeaders())
        ->deleteJson("/api/veiculos/{$veiculoB->id}")
        ->assertNotFound();

    $this->assertDatabaseHas('veiculos', [
        'id' => $veiculoB->id,
        'marca' => 'Tesla',
    ]);
});

test('nível visualizar permite leitura mas bloqueia escrita', function () {
    $tenant = criarTenantVeiculo(
        'Tenant Visualizar Veículo',
        'tenant-visualizar-veiculo'
    );

    $proprietario = criarProprietarioVeiculo($tenant);

    criarVeiculoDireto(
        $tenant,
        $proprietario,
        [
            'matricula' => 'II-00-II',
        ]
    );

    $user = criarUsuarioVeiculo(
        'visualizar.veiculo@frotapro.test',
        $tenant,
        'visualizar'
    );

    autenticarUsuarioVeiculo($this, $user);

    $this->withHeaders(veiculoSpaHeaders())
        ->getJson('/api/veiculos')
        ->assertOk();

    $this->withHeaders(veiculoSpaHeaders())
        ->postJson(
            '/api/veiculos',
            dadosVeiculoCompleto($proprietario, [
                'matricula' => 'JJ-00-JJ',
            ])
        )
        ->assertForbidden()
        ->assertJsonPath(
            'message',
            'Sem permissão suficiente para este recurso.'
        );

    $this->assertDatabaseMissing('veiculos', [
        'matricula' => 'JJ-00-JJ',
    ]);
});

test('veículo incompleto não pode ser ativado manualmente', function () {
    $tenant = criarTenantVeiculo(
        'Tenant Ativação Veículo',
        'tenant-ativacao-veiculo'
    );

    $user = criarUsuarioVeiculo(
        'ativacao.veiculo@frotapro.test',
        $tenant,
        'configurar'
    );

    $veiculo = new Veiculo([
        'matricula' => 'KK-00-KK',
        'marca' => 'Tesla',
        'modelo' => 'Model 3',
    ]);

    $veiculo->tenant_id = $tenant->id;
    $veiculo->sincronizarCadastro();
    $veiculo->save();

    autenticarUsuarioVeiculo($this, $user);

    $this->withHeaders(veiculoSpaHeaders())
        ->patchJson(
            "/api/veiculos/{$veiculo->id}/status",
            ['ativo' => true]
        )
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'O veículo possui cadastro incompleto e não pode ser ativado.'
        );

    $veiculo->refresh();

    expect($veiculo->ativo)->toBeFalse()
        ->and($veiculo->status_cadastro)
        ->toBe('incompleto');
});

test('veículo completo pode ser inativado e reativado sem alterar status do cadastro', function () {
    $tenant = criarTenantVeiculo(
        'Tenant Status Veículo',
        'tenant-status-veiculo'
    );

    $proprietario = criarProprietarioVeiculo($tenant);

    $veiculo = criarVeiculoDireto(
        $tenant,
        $proprietario,
        [
            'matricula' => 'LL-00-LL',
        ]
    );

    $user = criarUsuarioVeiculo(
        'status.veiculo@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioVeiculo($this, $user);

    $this->withHeaders(veiculoSpaHeaders())
        ->patchJson(
            "/api/veiculos/{$veiculo->id}/status",
            ['ativo' => false]
        )
        ->assertOk()
        ->assertJsonPath('data.ativo', false)
        ->assertJsonPath(
            'data.status_cadastro',
            'ativo'
        );

    $this->assertDatabaseHas('veiculos', [
        'id' => $veiculo->id,
        'ativo' => false,
        'status_cadastro' => 'ativo',
    ]);

    $this->withHeaders(veiculoSpaHeaders())
        ->patchJson(
            "/api/veiculos/{$veiculo->id}/status",
            ['ativo' => true]
        )
        ->assertOk()
        ->assertJsonPath('data.ativo', true)
        ->assertJsonPath(
            'data.status_cadastro',
            'ativo'
        );
});

test('nível configurar permite atualizar e apagar veículo do próprio tenant', function () {
    $tenant = criarTenantVeiculo(
        'Tenant CRUD Veículo',
        'tenant-crud-veiculo'
    );

    $proprietario = criarProprietarioVeiculo($tenant);

    $user = criarUsuarioVeiculo(
        'crud.veiculo@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioVeiculo($this, $user);

    $createResponse = $this->withHeaders(veiculoSpaHeaders())
        ->postJson(
            '/api/veiculos',
            dadosVeiculoCompleto($proprietario, [
                'matricula' => 'MM-00-MM',
            ])
        )
        ->assertCreated();

    $id = $createResponse->json('data.id');

    expect($id)->not->toBeNull();

    $this->withHeaders(veiculoSpaHeaders())
        ->patchJson("/api/veiculos/{$id}", [
            'marca' => 'Mercedes-Benz',
            'modelo' => 'EQA',
            'valor_aluguel' => 325.50,
            'valor_caucao' => 750,
            'via_verde' => 'VV-999',
        ])
        ->assertOk()
        ->assertJsonPath(
            'data.marca',
            'Mercedes-Benz'
        )
        ->assertJsonPath('data.modelo', 'EQA')
        ->assertJsonPath(
            'data.valor_aluguel',
            '325.50'
        )
        ->assertJsonPath(
            'data.valor_caucao',
            '750.00'
        )
        ->assertJsonPath(
            'data.via_verde',
            'VV-999'
        );

    $this->assertDatabaseHas('veiculos', [
        'id' => $id,
        'tenant_id' => $tenant->id,
        'marca' => 'Mercedes-Benz',
        'modelo' => 'EQA',
        'via_verde' => 'VV-999',
    ]);

    $this->withHeaders(veiculoSpaHeaders())
        ->deleteJson("/api/veiculos/{$id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('veiculos', [
        'id' => $id,
    ]);
});
