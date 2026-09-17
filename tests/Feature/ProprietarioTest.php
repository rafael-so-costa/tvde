<?php

use App\Models\Permission;
use App\Models\Proprietario;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function proprietarioSpaHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function criarTenantProprietario(string $nome, string $slug): Tenant
{
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function criarUsuarioProprietario(
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
        'codigo' => 'proprietarios',
        'modulo' => 'proprietarios',
        'nome' => 'Proprietários',
    ]);

    RolePermission::create([
        'role_id' => $role->id,
        'permission_id' => $permission->id,
        'nivel' => $nivel,
    ]);

    return $user;
}

function autenticarUsuarioProprietario($test, User $user): void
{
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function dadosProprietarioPessoaFisica(array $overrides = []): array
{
    return array_merge([
        'tipo' => 'pessoa_fisica',
        'nome_completo' => 'João da Silva',
        'nif' => '245123456',
        'email' => 'joao@example.test',
        'telemovel' => '+351912345678',
        'data_nascimento' => '1985-05-10',
        'filhos' => 1,
        'estado_civil' => 'casado',
        'tipo_documento' => 'cartao_cidadao',
        'numero_documento' => '12345678',
        'documento_valid_until' => '2030-05-10',
        'endereco_rua' => 'Rua das Flores',
        'endereco_numero' => '10',
        'endereco_cidade' => 'Lisboa',
        'endereco_cep' => '1000-100',
        'iban' => 'PT50000000000000000000000',
        'fotos_galeria' => [],
    ], $overrides);
}

function dadosProprietarioEmpresa(array $overrides = []): array
{
    return array_merge([
        'tipo' => 'empresa',
        'nome_empresa' => 'Frota Proprietária Lda',
        'nome_gerente' => 'Maria Ferreira',
        'nif' => '509123456',
        'email' => 'geral@frotaproprietaria.test',
        'telemovel' => '+351913456789',
        'endereco_rua' => 'Avenida da República',
        'endereco_numero' => '20',
        'endereco_cidade' => 'Lisboa',
        'endereco_cep' => '1050-100',
        'iban' => 'PT50000000000000000000001',
        'capital_social' => 50000,
        'certidao_permanente' => 'CERT-123456',
        'certidao_valid_until' => '2030-01-01',
        'certificado_tvde' => 'TVDE-123456',
        'certificado_tvde_valid_until' => '2030-06-30',
        'fotos_galeria' => [],
    ], $overrides);
}

function criarProprietarioDireto(
    Tenant $tenant,
    array $dados = []
): Proprietario {
    $proprietario = new Proprietario(
        dadosProprietarioPessoaFisica($dados)
    );

    $proprietario->tenant_id = $tenant->id;
    $proprietario->sincronizarCadastro();
    $proprietario->save();

    return $proprietario;
}

test('rotas de proprietários exigem autenticação', function () {
    $this->withHeaders(proprietarioSpaHeaders())
        ->getJson('/api/proprietarios')
        ->assertUnauthorized();
});

test('cliente não pode definir tenant user ativo ou status do proprietário', function () {
    $tenant = criarTenantProprietario(
        'Tenant Segurança',
        'tenant-seguranca-proprietario'
    );

    $outroTenant = criarTenantProprietario(
        'Tenant Malicioso',
        'tenant-malicioso-proprietario'
    );

    $outroUser = User::factory()->create();

    $user = criarUsuarioProprietario(
        'seguranca.proprietario@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioProprietario($this, $user);

    $payload = dadosProprietarioPessoaFisica([
        'tenant_id' => $outroTenant->id,
        'user_id' => $outroUser->id,
        'ativo' => true,
        'status_cadastro' => 'ativo',
    ]);

    $this->withHeaders(proprietarioSpaHeaders())
        ->postJson('/api/proprietarios', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'tenant_id',
            'user_id',
            'ativo',
            'status_cadastro',
        ]);

    $this->assertDatabaseMissing('proprietarios', [
        'nif' => '245123456',
    ]);
});

test('proprietário pessoa física incompleto é guardado inativo', function () {
    $tenant = criarTenantProprietario(
        'Tenant Incompleto',
        'tenant-incompleto-proprietario'
    );

    $user = criarUsuarioProprietario(
        'incompleto.proprietario@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioProprietario($this, $user);

    $response = $this->withHeaders(proprietarioSpaHeaders())
        ->postJson('/api/proprietarios', [
            'tipo' => 'pessoa_fisica',
            'nome_completo' => 'Pessoa Incompleta',
            'nif' => '245123457',
        ])
        ->assertCreated();

    $response
        ->assertJsonPath('data.tenant_id', $tenant->id)
        ->assertJsonPath('data.tipo', 'pessoa_fisica')
        ->assertJsonPath('data.ativo', false)
        ->assertJsonPath('data.status_cadastro', 'incompleto');

    $this->assertDatabaseHas('proprietarios', [
        'tenant_id' => $tenant->id,
        'nif' => '245123457',
        'ativo' => false,
        'status_cadastro' => 'incompleto',
    ]);
});

test('proprietário pessoa física completo é criado ativo', function () {
    $tenant = criarTenantProprietario(
        'Tenant Pessoa Física',
        'tenant-pessoa-fisica'
    );

    $user = criarUsuarioProprietario(
        'pessoa.fisica@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioProprietario($this, $user);

    $this->withHeaders(proprietarioSpaHeaders())
        ->postJson(
            '/api/proprietarios',
            dadosProprietarioPessoaFisica()
        )
        ->assertCreated()
        ->assertJsonPath('data.tenant_id', $tenant->id)
        ->assertJsonPath('data.ativo', true)
        ->assertJsonPath('data.status_cadastro', 'ativo')
        ->assertJsonPath('data.filhos', 1);

    $this->assertDatabaseHas('proprietarios', [
        'tenant_id' => $tenant->id,
        'nif' => '245123456',
        'tipo' => 'pessoa_fisica',
        'ativo' => true,
        'status_cadastro' => 'ativo',
    ]);
});

test('proprietário empresa completo é criado ativo', function () {
    $tenant = criarTenantProprietario(
        'Tenant Empresa',
        'tenant-proprietario-empresa'
    );

    $user = criarUsuarioProprietario(
        'empresa.proprietario@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioProprietario($this, $user);

    $this->withHeaders(proprietarioSpaHeaders())
        ->postJson(
            '/api/proprietarios',
            dadosProprietarioEmpresa()
        )
        ->assertCreated()
        ->assertJsonPath('data.tipo', 'empresa')
        ->assertJsonPath('data.nome_empresa', 'Frota Proprietária Lda')
        ->assertJsonPath('data.ativo', true)
        ->assertJsonPath('data.status_cadastro', 'ativo');

    $this->assertDatabaseHas('proprietarios', [
        'tenant_id' => $tenant->id,
        'nif' => '509123456',
        'tipo' => 'empresa',
        'ativo' => true,
    ]);
});

test('nif não pode ser repetido dentro do mesmo tenant', function () {
    $tenant = criarTenantProprietario(
        'Tenant NIF',
        'tenant-nif'
    );

    $user = criarUsuarioProprietario(
        'nif.proprietario@frotapro.test',
        $tenant,
        'configurar'
    );

    criarProprietarioDireto($tenant, [
        'nif' => '245123458',
        'email' => 'primeiro@example.test',
    ]);

    autenticarUsuarioProprietario($this, $user);

    $this->withHeaders(proprietarioSpaHeaders())
        ->postJson(
            '/api/proprietarios',
            dadosProprietarioPessoaFisica([
                'nif' => '245123458',
                'email' => 'segundo@example.test',
            ])
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('nif');

    expect(
        Proprietario::where('tenant_id', $tenant->id)
            ->where('nif', '245123458')
            ->count()
    )->toBe(1);
});

test('o mesmo nif pode existir em tenants diferentes', function () {
    $tenantA = criarTenantProprietario(
        'Tenant A NIF',
        'tenant-a-nif'
    );

    $tenantB = criarTenantProprietario(
        'Tenant B NIF',
        'tenant-b-nif'
    );

    criarProprietarioDireto($tenantB, [
        'nif' => '245123459',
        'email' => 'tenant-b@example.test',
    ]);

    $user = criarUsuarioProprietario(
        'tenant.a.nif@frotapro.test',
        $tenantA,
        'configurar'
    );

    autenticarUsuarioProprietario($this, $user);

    $this->withHeaders(proprietarioSpaHeaders())
        ->postJson(
            '/api/proprietarios',
            dadosProprietarioPessoaFisica([
                'nif' => '245123459',
                'email' => 'tenant-a@example.test',
            ])
        )
        ->assertCreated();

    $this->assertDatabaseHas('proprietarios', [
        'tenant_id' => $tenantA->id,
        'nif' => '245123459',
    ]);

    $this->assertDatabaseHas('proprietarios', [
        'tenant_id' => $tenantB->id,
        'nif' => '245123459',
    ]);
});

test('listagem retorna apenas proprietários do tenant atual', function () {
    $tenantA = criarTenantProprietario(
        'Tenant A Listagem',
        'tenant-a-listagem-proprietario'
    );

    $tenantB = criarTenantProprietario(
        'Tenant B Listagem',
        'tenant-b-listagem-proprietario'
    );

    $user = criarUsuarioProprietario(
        'listagem.proprietario@frotapro.test',
        $tenantA,
        'visualizar'
    );

    criarProprietarioDireto($tenantA, [
        'nome_completo' => 'Proprietário Visível',
        'nif' => '245123460',
        'email' => 'visivel@example.test',
    ]);

    criarProprietarioDireto($tenantB, [
        'nome_completo' => 'Proprietário Oculto',
        'nif' => '245123461',
        'email' => 'oculto@example.test',
    ]);

    autenticarUsuarioProprietario($this, $user);

    $response = $this->withHeaders(proprietarioSpaHeaders())
        ->getJson('/api/proprietarios')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect(
        collect($response->json('data'))
            ->pluck('nome_completo')
    )
        ->toContain('Proprietário Visível')
        ->not->toContain('Proprietário Oculto');
});

test('proprietário de outro tenant não pode ser consultado alterado ou apagado', function () {
    $tenantA = criarTenantProprietario(
        'Tenant A Isolamento',
        'tenant-a-isolamento-proprietario'
    );

    $tenantB = criarTenantProprietario(
        'Tenant B Isolamento',
        'tenant-b-isolamento-proprietario'
    );

    $user = criarUsuarioProprietario(
        'isolamento.proprietario@frotapro.test',
        $tenantA,
        'configurar'
    );

    $proprietarioB = criarProprietarioDireto($tenantB, [
        'nome_completo' => 'Proprietário Protegido',
        'nif' => '245123462',
        'email' => 'protegido@example.test',
    ]);

    autenticarUsuarioProprietario($this, $user);

    $this->withHeaders(proprietarioSpaHeaders())
        ->getJson("/api/proprietarios/{$proprietarioB->id}")
        ->assertNotFound();

    $this->withHeaders(proprietarioSpaHeaders())
        ->patchJson("/api/proprietarios/{$proprietarioB->id}", [
            'nome_completo' => 'Proprietário Invadido',
        ])
        ->assertNotFound();

    $this->withHeaders(proprietarioSpaHeaders())
        ->deleteJson("/api/proprietarios/{$proprietarioB->id}")
        ->assertNotFound();

    $this->assertDatabaseHas('proprietarios', [
        'id' => $proprietarioB->id,
        'nome_completo' => 'Proprietário Protegido',
    ]);
});

test('nível visualizar permite leitura mas bloqueia escrita', function () {
    $tenant = criarTenantProprietario(
        'Tenant Visualizar',
        'tenant-visualizar-proprietario'
    );

    $user = criarUsuarioProprietario(
        'visualizar.proprietario@frotapro.test',
        $tenant,
        'visualizar'
    );

    criarProprietarioDireto($tenant, [
        'nif' => '245123463',
        'email' => 'existente@example.test',
    ]);

    autenticarUsuarioProprietario($this, $user);

    $this->withHeaders(proprietarioSpaHeaders())
        ->getJson('/api/proprietarios')
        ->assertOk();

    $this->withHeaders(proprietarioSpaHeaders())
        ->postJson(
            '/api/proprietarios',
            dadosProprietarioPessoaFisica([
                'nif' => '245123464',
            ])
        )
        ->assertForbidden()
        ->assertJsonPath(
            'message',
            'Sem permissão suficiente para este recurso.'
        );

    $this->assertDatabaseMissing('proprietarios', [
        'nif' => '245123464',
    ]);
});

test('proprietário incompleto não pode ser ativado manualmente', function () {
    $tenant = criarTenantProprietario(
        'Tenant Ativação',
        'tenant-ativacao-incompleto'
    );

    $user = criarUsuarioProprietario(
        'ativacao.incompleto@frotapro.test',
        $tenant,
        'configurar'
    );

    $proprietario = new Proprietario([
        'tipo' => 'pessoa_fisica',
        'nome_completo' => 'Perfil Incompleto',
        'nif' => '245123465',
    ]);

    $proprietario->tenant_id = $tenant->id;
    $proprietario->sincronizarCadastro();
    $proprietario->save();

    autenticarUsuarioProprietario($this, $user);

    $this->withHeaders(proprietarioSpaHeaders())
        ->patchJson(
            "/api/proprietarios/{$proprietario->id}/status",
            ['ativo' => true]
        )
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'O proprietário possui cadastro incompleto e não pode ser ativado.'
        );

    $proprietario->refresh();

    expect($proprietario->ativo)->toBeFalse()
        ->and($proprietario->status_cadastro)->toBe('incompleto');
});

test('proprietário completo pode ser inativado e reativado', function () {
    $tenant = criarTenantProprietario(
        'Tenant Status',
        'tenant-status-proprietario'
    );

    $user = criarUsuarioProprietario(
        'status.proprietario@frotapro.test',
        $tenant,
        'configurar'
    );

    $proprietario = criarProprietarioDireto($tenant, [
        'nif' => '245123466',
        'email' => 'status@example.test',
    ]);

    autenticarUsuarioProprietario($this, $user);

    $this->withHeaders(proprietarioSpaHeaders())
        ->patchJson(
            "/api/proprietarios/{$proprietario->id}/status",
            ['ativo' => false]
        )
        ->assertOk()
        ->assertJsonPath('data.ativo', false)
        ->assertJsonPath('data.status_cadastro', 'ativo');

    $this->assertDatabaseHas('proprietarios', [
        'id' => $proprietario->id,
        'ativo' => false,
        'status_cadastro' => 'ativo',
    ]);

    $this->withHeaders(proprietarioSpaHeaders())
        ->patchJson(
            "/api/proprietarios/{$proprietario->id}/status",
            ['ativo' => true]
        )
        ->assertOk()
        ->assertJsonPath('data.ativo', true)
        ->assertJsonPath('data.status_cadastro', 'ativo');

    $this->assertDatabaseHas('proprietarios', [
        'id' => $proprietario->id,
        'ativo' => true,
        'status_cadastro' => 'ativo',
    ]);
});

test('nível configurar permite atualizar e apagar proprietário do próprio tenant', function () {
    $tenant = criarTenantProprietario(
        'Tenant CRUD',
        'tenant-crud-proprietario'
    );

    $user = criarUsuarioProprietario(
        'crud.proprietario@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioProprietario($this, $user);

    $createResponse = $this->withHeaders(proprietarioSpaHeaders())
        ->postJson(
            '/api/proprietarios',
            dadosProprietarioPessoaFisica([
                'nif' => '245123467',
                'email' => 'crud@example.test',
            ])
        )
        ->assertCreated();

    $id = $createResponse->json('data.id');

    expect($id)->not->toBeNull();

    $this->withHeaders(proprietarioSpaHeaders())
        ->patchJson("/api/proprietarios/{$id}", [
            'nome_completo' => 'Nome Atualizado',
            'filhos' => 2,
            'cartao_frota' => 'FROTA-001',
        ])
        ->assertOk()
        ->assertJsonPath('data.nome_completo', 'Nome Atualizado')
        ->assertJsonPath('data.filhos', 2)
        ->assertJsonPath('data.cartao_frota', 'FROTA-001');

    $this->assertDatabaseHas('proprietarios', [
        'id' => $id,
        'tenant_id' => $tenant->id,
        'nome_completo' => 'Nome Atualizado',
        'filhos' => 2,
        'cartao_frota' => 'FROTA-001',
    ]);

    $this->withHeaders(proprietarioSpaHeaders())
        ->deleteJson("/api/proprietarios/{$id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('proprietarios', [
        'id' => $id,
    ]);
});
