<?php

use App\Jobs\SendFuncionarioInvitation;
use App\Models\Funcionario;
use App\Models\FuncionarioInvitation;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserPermission;
use App\Models\UserRole;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([
        RoleSeeder::class,
        PermissionSeeder::class,
    ]);
});

function funcionarioSpaHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function criarTenantFuncionario(
    string $nome = 'Empresa Funcionários',
    string $slug = 'empresa-funcionarios'
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function criarUsuarioFuncionario(
    string $email,
    string $senha = 'SenhaTeste123!'
): User {
    return User::factory()->create([
        'email' => $email,
        'password' => Hash::make($senha),
        'ativo' => true,
    ]);
}

function associarUsuarioTenantFuncionario(
    User $user,
    Tenant $tenant,
    bool $principal = true,
    string $status = 'ativo'
): TenantUser {
    return TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => $status,
        'principal' => $principal,
    ]);
}

function atribuirRoleFuncionario(
    User $user,
    Tenant $tenant,
    string $codigo
): UserRole {
    $role = Role::query()
        ->where('codigo', $codigo)
        ->firstOrFail();

    return UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);
}

function criarAdminFuncionario(
    Tenant $tenant,
    string $email = 'admin.funcionarios@frotapro.test'
): User {
    $user = criarUsuarioFuncionario($email);

    associarUsuarioTenantFuncionario(
        $user,
        $tenant
    );

    atribuirRoleFuncionario(
        $user,
        $tenant,
        'admin_empresa'
    );

    return $user;
}

function criarGestorFuncionario(
    Tenant $tenant,
    string $email = 'gestor.funcionarios@frotapro.test',
    string $nivel = 'configurar'
): User {
    $user = criarUsuarioFuncionario($email);

    associarUsuarioTenantFuncionario(
        $user,
        $tenant
    );

    atribuirRoleFuncionario(
        $user,
        $tenant,
        'funcionario'
    );

    $permission = Permission::query()
        ->where('codigo', 'funcionarios')
        ->firstOrFail();

    UserPermission::create([
        'user_id' => $user->id,
        'permission_id' => $permission->id,
        'tenant_id' => $tenant->id,
        'nivel' => $nivel,
    ]);

    return $user;
}

function autenticarFuncionario(
    $test,
    User $user,
    string $senha = 'SenhaTeste123!'
): void {
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => $senha,
    ])->assertOk();
}

function criarFuncionarioDireto(
    Tenant $tenant,
    array $dados = []
): Funcionario {
    return Funcionario::create(array_merge([
        'tenant_id' => $tenant->id,
        'numero_funcionario' => null,
        'nome' => 'Funcionário Teste',
        'nif' => null,
        'email' => null,
        'telefone' => null,
        'data_nascimento' => null,
        'cargo' => 'Administrativo',
        'departamento' => 'Operações',
        'data_admissao' => '2026-09-01',
        'data_saida' => null,
        'estado' => 'ativo',
        'observacoes' => null,
    ], $dados));
}

test('rotas de funcionários exigem autenticação', function () {
    $this->withHeaders(funcionarioSpaHeaders())
        ->getJson('/api/funcionarios')
        ->assertUnauthorized();
});

test('administrador cria funcionário sem criar conta de utilizador', function () {
    $tenant = criarTenantFuncionario();

    $admin = criarAdminFuncionario($tenant);

    autenticarFuncionario($this, $admin);

    $response = $this
        ->withHeaders(funcionarioSpaHeaders())
        ->postJson('/api/funcionarios', [
            'numero_funcionario' => 'FUNC-001',
            'nome' => 'Maria Funcionária',
            'nif' => '245123458',
            'email' => 'maria.funcionaria@example.test',
            'telefone' => '+351910000001',
            'cargo' => 'Administrativa',
            'departamento' => 'Operações',
            'data_admissao' => '2026-09-01',
        ])
        ->assertCreated();

    $response
        ->assertJsonPath(
            'data.nome',
            'Maria Funcionária'
        )
        ->assertJsonPath(
            'data.estado',
            'ativo'
        );

    $funcionario = Funcionario::query()
        ->where(
            'email',
            'maria.funcionaria@example.test'
        )
        ->firstOrFail();

    expect($funcionario->user_id)->toBeNull();

    $this->assertDatabaseMissing('users', [
        'email' => 'maria.funcionaria@example.test',
    ]);
});

test('cliente não pode definir tenant user ou auditoria do funcionário', function () {
    $tenant = criarTenantFuncionario();

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.seguranca.funcionarios@frotapro.test'
    );

    $outroTenant = criarTenantFuncionario(
        'Outro Tenant',
        'outro-tenant-funcionarios'
    );

    $outroUser = criarUsuarioFuncionario(
        'outro.usuario@frotapro.test'
    );

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->postJson('/api/funcionarios', [
            'nome' => 'Tentativa Maliciosa',
            'email' => 'malicioso@example.test',
            'tenant_id' => $outroTenant->id,
            'user_id' => $outroUser->id,
            'estado' => 'ativo',
            'created_by' => $outroUser->id,
            'updated_by' => $outroUser->id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'tenant_id',
            'user_id',
            'estado',
            'created_by',
            'updated_by',
        ]);
});

test('listagem é isolada pelo tenant atual', function () {
    $tenantA = criarTenantFuncionario(
        'Empresa A',
        'empresa-a-funcionarios'
    );

    $tenantB = criarTenantFuncionario(
        'Empresa B',
        'empresa-b-funcionarios'
    );

    criarFuncionarioDireto($tenantA, [
        'nome' => 'Funcionário Empresa A',
        'email' => 'funcionario.a@example.test',
    ]);

    criarFuncionarioDireto($tenantB, [
        'nome' => 'Funcionário Empresa B',
        'email' => 'funcionario.b@example.test',
    ]);

    $admin = criarAdminFuncionario(
        $tenantA,
        'admin.lista.funcionarios@frotapro.test'
    );

    autenticarFuncionario($this, $admin);

    $response = $this
        ->withHeaders(funcionarioSpaHeaders())
        ->getJson('/api/funcionarios')
        ->assertOk();

    expect(
        collect($response->json('data'))
            ->pluck('nome')
            ->contains('Funcionário Empresa A')
    )->toBeTrue();

    expect(
        collect($response->json('data'))
            ->pluck('nome')
            ->contains('Funcionário Empresa B')
    )->toBeFalse();
});

test('funcionário visualizar pode consultar mas não criar', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Visualizar',
        'empresa-visualizar-funcionarios'
    );

    criarFuncionarioDireto($tenant, [
        'nome' => 'Funcionário Visível',
    ]);

    $user = criarGestorFuncionario(
        $tenant,
        'visualizar.funcionarios@frotapro.test',
        'visualizar'
    );

    autenticarFuncionario($this, $user);

    $this->withHeaders(funcionarioSpaHeaders())
        ->getJson('/api/funcionarios')
        ->assertOk();

    $this->withHeaders(funcionarioSpaHeaders())
        ->postJson('/api/funcionarios', [
            'nome' => 'Funcionário Bloqueado',
        ])
        ->assertForbidden();
});

test('nif email e número são únicos dentro do tenant', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Únicos',
        'empresa-unicos-funcionarios'
    );

    criarFuncionarioDireto($tenant, [
        'numero_funcionario' => 'FUNC-100',
        'nif' => '245123466',
        'email' => 'unico@example.test',
    ]);

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.unicos@frotapro.test'
    );

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->postJson('/api/funcionarios', [
            'numero_funcionario' => 'FUNC-100',
            'nome' => 'Duplicado',
            'nif' => '245123466',
            'email' => 'unico@example.test',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'numero_funcionario',
            'nif',
            'email',
        ]);
});

test('mesmos dados únicos podem existir em tenants diferentes', function () {
    $tenantA = criarTenantFuncionario(
        'Empresa Única A',
        'empresa-unica-a'
    );

    $tenantB = criarTenantFuncionario(
        'Empresa Única B',
        'empresa-unica-b'
    );

    criarFuncionarioDireto($tenantB, [
        'numero_funcionario' => 'FUNC-200',
        'nif' => '245123474',
        'email' => 'compartilhado@example.test',
    ]);

    $admin = criarAdminFuncionario(
        $tenantA,
        'admin.unica.a@frotapro.test'
    );

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->postJson('/api/funcionarios', [
            'numero_funcionario' => 'FUNC-200',
            'nome' => 'Funcionário Tenant A',
            'nif' => '245123474',
            'email' => 'compartilhado@example.test',
            'data_admissao' => '2026-09-01',
        ])
        ->assertCreated();

    expect(
        Funcionario::query()
            ->where('nif', '245123474')
            ->count()
    )->toBe(2);
});

test('dar acesso cria convite sem criar imediatamente um utilizador', function () {
    Queue::fake();

    $tenant = criarTenantFuncionario(
        'Empresa Convite',
        'empresa-convite'
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.convite@frotapro.test'
    );

    $funcionario = criarFuncionarioDireto($tenant, [
        'nome' => 'Funcionário Convidado',
        'email' => 'convidado@example.test',
    ]);

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->postJson(
            "/api/funcionarios/{$funcionario->id}/acesso",
            []
        )
        ->assertSuccessful();

    $funcionario->refresh();

    expect($funcionario->user_id)->toBeNull();

    $convite = FuncionarioInvitation::query()
        ->where(
            'funcionario_id',
            $funcionario->id
        )
        ->latest()
        ->firstOrFail();

    expect($convite->accepted_at)->toBeNull();
    expect($convite->revoked_at)->toBeNull();
    expect($convite->expires_at->isFuture())
        ->toBeTrue();

    expect($convite->token_hash)
        ->not
        ->toBeNull();

    expect($convite->token_ciphertext)
        ->not
        ->toBeNull();

    Queue::assertPushed(
        SendFuncionarioInvitation::class
    );

    $this->assertDatabaseMissing('users', [
        'email' => 'convidado@example.test',
    ]);
});

test('aceitar convite cria utilizador perfil membership role e vínculo', function () {
    Queue::fake();

    $tenant = criarTenantFuncionario(
        'Empresa Aceitação',
        'empresa-aceitacao'
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.aceitacao@frotapro.test'
    );

    $funcionario = criarFuncionarioDireto($tenant, [
        'nome' => 'Funcionário Aceitação',
        'email' => 'aceitacao@example.test',
        'telefone' => '+351910000009',
    ]);

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->postJson(
            "/api/funcionarios/{$funcionario->id}/acesso",
            []
        )
        ->assertSuccessful();

    $convite = FuncionarioInvitation::query()
        ->where(
            'funcionario_id',
            $funcionario->id
        )
        ->whereNull('revoked_at')
        ->latest()
        ->firstOrFail();

    $token = Crypt::decryptString(
        $convite->token_ciphertext
    );

    $this->withHeaders(funcionarioSpaHeaders())
        ->getJson(
            "/api/funcionario-convites/{$token}"
        )
        ->assertOk();

    $this->withHeaders(funcionarioSpaHeaders())
        ->postJson(
            "/api/funcionario-convites/{$token}/aceitar",
            [
                'password' => 'NovaSenha123!',
                'password_confirmation' => 'NovaSenha123!',
            ]
        )
        ->assertSuccessful();

    $funcionario->refresh();
    $convite->refresh();

    expect($funcionario->user_id)
        ->not
        ->toBeNull();

    expect($convite->accepted_at)
        ->not
        ->toBeNull();

    expect($convite->token_ciphertext)
        ->toBeNull();

    $user = User::query()
        ->findOrFail($funcionario->user_id);

    expect($user->email)
        ->toBe('aceitacao@example.test');

    expect($user->ativo)
        ->toBeTrue();

    expect(
        Hash::check(
            'NovaSenha123!',
            $user->password
        )
    )->toBeTrue();

    $this->assertDatabaseHas('profiles', [
        'user_id' => $user->id,
    ]);

    $this->assertDatabaseHas('tenant_users', [
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
    ]);

    $role = Role::query()
        ->where('codigo', 'funcionario')
        ->firstOrFail();

    $this->assertDatabaseHas('user_roles', [
        'user_id' => $user->id,
        'tenant_id' => $tenant->id,
        'role_id' => $role->id,
    ]);
});

test('convite revogado não pode ser utilizado', function () {
    Queue::fake();

    $tenant = criarTenantFuncionario(
        'Empresa Revogado',
        'empresa-revogado'
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.revogado@frotapro.test'
    );

    $funcionario = criarFuncionarioDireto($tenant, [
        'email' => 'revogado@example.test',
    ]);

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->postJson(
            "/api/funcionarios/{$funcionario->id}/acesso",
            []
        )
        ->assertSuccessful();

    $convite = FuncionarioInvitation::query()
        ->where(
            'funcionario_id',
            $funcionario->id
        )
        ->latest()
        ->firstOrFail();

    $token = Crypt::decryptString(
        $convite->token_ciphertext
    );

    $convite->update([
        'revoked_at' => now(),
    ]);

    $this->withHeaders(funcionarioSpaHeaders())
        ->getJson(
            "/api/funcionario-convites/{$token}"
        )
        ->assertStatus(410);
});

test('convite expirado não pode ser utilizado', function () {
    Queue::fake();

    $tenant = criarTenantFuncionario(
        'Empresa Expirado',
        'empresa-expirado'
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.expirado@frotapro.test'
    );

    $funcionario = criarFuncionarioDireto($tenant, [
        'email' => 'expirado@example.test',
    ]);

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->postJson(
            "/api/funcionarios/{$funcionario->id}/acesso",
            []
        )
        ->assertSuccessful();

    $convite = FuncionarioInvitation::query()
        ->where(
            'funcionario_id',
            $funcionario->id
        )
        ->latest()
        ->firstOrFail();

    $token = Crypt::decryptString(
        $convite->token_ciphertext
    );

    $convite->update([
        'expires_at' => now()->subMinute(),
    ]);

    $this->withHeaders(funcionarioSpaHeaders())
        ->getJson(
            "/api/funcionario-convites/{$token}"
        )
        ->assertStatus(410);
});

test('conta existente exige confirmação explícita antes da associação', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Existente',
        'empresa-existente'
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.existente@frotapro.test'
    );

    $existente = criarUsuarioFuncionario(
        'existente@example.test'
    );

    $funcionario = criarFuncionarioDireto($tenant, [
        'nome' => 'Funcionário Existente',
        'email' => $existente->email,
    ]);

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->postJson(
            "/api/funcionarios/{$funcionario->id}/acesso",
            []
        )
        ->assertUnprocessable();

    $funcionario->refresh();

    expect($funcionario->user_id)->toBeNull();

    $this->withHeaders(funcionarioSpaHeaders())
        ->postJson(
            "/api/funcionarios/{$funcionario->id}/acesso",
            [
                'confirm_existing_user' => true,
            ]
        )
        ->assertSuccessful();

    $funcionario->refresh();

    expect($funcionario->user_id)
        ->toBe($existente->id);

    $this->assertDatabaseHas('tenant_users', [
        'tenant_id' => $tenant->id,
        'user_id' => $existente->id,
        'status' => 'ativo',
    ]);

    $role = Role::query()
        ->where('codigo', 'funcionario')
        ->firstOrFail();

    $this->assertDatabaseHas('user_roles', [
        'user_id' => $existente->id,
        'tenant_id' => $tenant->id,
        'role_id' => $role->id,
    ]);
});

test('conta globalmente bloqueada não pode ser associada ao funcionário', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Bloqueada',
        'empresa-bloqueada'
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.bloqueada@frotapro.test'
    );

    $bloqueado = criarUsuarioFuncionario(
        'bloqueado@example.test'
    );

    $bloqueado->update([
        'ativo' => false,
    ]);

    $funcionario = criarFuncionarioDireto($tenant, [
        'email' => $bloqueado->email,
    ]);

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->postJson(
            "/api/funcionarios/{$funcionario->id}/acesso",
            [
                'confirm_existing_user' => true,
            ]
        )
        ->assertUnprocessable();

    expect(
        $funcionario->fresh()->user_id
    )->toBeNull();
});

test('suspender funcionário suspende apenas acesso ao tenant e não bloqueia conta global', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Suspensão',
        'empresa-suspensao'
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.suspensao@frotapro.test'
    );

    $user = criarUsuarioFuncionario(
        'funcionario.suspensao@example.test'
    );

    associarUsuarioTenantFuncionario(
        $user,
        $tenant
    );

    atribuirRoleFuncionario(
        $user,
        $tenant,
        'funcionario'
    );

    $funcionario = criarFuncionarioDireto($tenant, [
        'user_id' => $user->id,
        'email' => $user->email,
    ]);

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->patchJson(
            "/api/funcionarios/{$funcionario->id}/estado",
            [
                'estado' => 'suspenso',
            ]
        )
        ->assertSuccessful();

    expect(
        $funcionario->fresh()->estado
    )->toBe('suspenso');

    expect(
        $user->fresh()->ativo
    )->toBeTrue();

    $this->assertDatabaseHas('tenant_users', [
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'inativo',
    ]);
});

test('funcionário desligado recebe data de saída e não pode ser reativado', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Desligamento',
        'empresa-desligamento'
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.desligamento@frotapro.test'
    );

    $funcionario = criarFuncionarioDireto($tenant, [
        'data_admissao' => '2026-01-01',
    ]);

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->patchJson(
            "/api/funcionarios/{$funcionario->id}/estado",
            [
                'estado' => 'desligado',
                'data_saida' => '2026-09-26',
            ]
        )
        ->assertSuccessful();

    $funcionario->refresh();

    expect($funcionario->estado)
        ->toBe('desligado');

    expect(
        $funcionario->data_saida
            ?->toDateString()
    )->toBe('2026-09-26');

    $this->withHeaders(funcionarioSpaHeaders())
        ->patchJson(
            "/api/funcionarios/{$funcionario->id}/estado",
            [
                'estado' => 'ativo',
            ]
        )
        ->assertUnprocessable();

    expect(
        $funcionario->fresh()->estado
    )->toBe('desligado');
});

test('administrador pode configurar permissões diretas do funcionário', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Permissões',
        'empresa-permissoes-funcionarios'
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.permissoes.func@frotapro.test'
    );

    $user = criarUsuarioFuncionario(
        'permissoes.funcionario@frotapro.test'
    );

    associarUsuarioTenantFuncionario(
        $user,
        $tenant
    );

    atribuirRoleFuncionario(
        $user,
        $tenant,
        'funcionario'
    );

    $funcionario = criarFuncionarioDireto($tenant, [
        'user_id' => $user->id,
        'email' => $user->email,
    ]);

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->putJson(
            "/api/funcionarios/{$funcionario->id}/permissoes",
            [
                'permissions' => [
                    'motoristas' => 'visualizar',
                    'veiculos' => 'configurar',
                    'contratos' => 'nenhum',
                ],
            ]
        )
        ->assertSuccessful();

    $motoristas = Permission::query()
        ->where('codigo', 'motoristas')
        ->firstOrFail();

    $veiculos = Permission::query()
        ->where('codigo', 'veiculos')
        ->firstOrFail();

    $contratos = Permission::query()
        ->where('codigo', 'contratos')
        ->firstOrFail();

    $this->assertDatabaseHas('user_permissions', [
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'permission_id' => $motoristas->id,
        'nivel' => 'visualizar',
    ]);

    $this->assertDatabaseHas('user_permissions', [
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'permission_id' => $veiculos->id,
        'nivel' => 'configurar',
    ]);

    $this->assertDatabaseHas('user_permissions', [
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'permission_id' => $contratos->id,
        'nivel' => 'nenhum',
    ]);
});

test('gestor com funcionarios configurar não pode alterar matriz de permissões', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Gestor',
        'empresa-gestor-funcionarios'
    );

    $gestor = criarGestorFuncionario(
        $tenant,
        'gestor.matriz@frotapro.test',
        'configurar'
    );

    $targetUser = criarUsuarioFuncionario(
        'target.matriz@frotapro.test'
    );

    associarUsuarioTenantFuncionario(
        $targetUser,
        $tenant,
        false
    );

    atribuirRoleFuncionario(
        $targetUser,
        $tenant,
        'funcionario'
    );

    $funcionario = criarFuncionarioDireto($tenant, [
        'user_id' => $targetUser->id,
        'email' => $targetUser->email,
    ]);

    autenticarFuncionario($this, $gestor);

    $this->withHeaders(funcionarioSpaHeaders())
        ->putJson(
            "/api/funcionarios/{$funcionario->id}/permissoes",
            [
                'permissions' => [
                    'veiculos' => 'configurar',
                ],
            ]
        )
        ->assertForbidden();
});

test('endpoint de permissões atuais devolve permissões efetivas do tenant', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Permissões Atuais',
        'empresa-permissoes-atuais'
    );

    $user = criarGestorFuncionario(
        $tenant,
        'atuais.funcionarios@frotapro.test',
        'visualizar'
    );

    autenticarFuncionario($this, $user);

    $this->withHeaders(funcionarioSpaHeaders())
        ->getJson('/api/permissoes-atuais')
        ->assertOk()
        ->assertJsonPath(
            'data.funcionarios',
            'visualizar'
        )
        ->assertJsonPath(
            'capabilities.manage_employee_permissions',
            false
        );
});

test('administrador recebe capacidade de gerir permissões de funcionários', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Capability',
        'empresa-capability'
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.capability@frotapro.test'
    );

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->getJson('/api/permissoes-atuais')
        ->assertOk()
        ->assertJsonPath(
            'data.funcionarios',
            'configurar'
        )
        ->assertJsonPath(
            'capabilities.manage_employee_permissions',
            true
        );
});

test('utilizador não pode suspender o próprio acesso através do cadastro de funcionário', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Autoproteção',
        'empresa-autoprotecao'
    );

    $user = criarGestorFuncionario(
        $tenant,
        'autoprotecao@frotapro.test',
        'configurar'
    );

    $funcionario = criarFuncionarioDireto($tenant, [
        'user_id' => $user->id,
        'email' => $user->email,
    ]);

    autenticarFuncionario($this, $user);

    $this->withHeaders(funcionarioSpaHeaders())
        ->patchJson(
            "/api/funcionarios/{$funcionario->id}/estado",
            [
                'estado' => 'suspenso',
            ]
        )
        ->assertForbidden();

    expect(
        $funcionario->fresh()->estado
    )->toBe('ativo');
});

test('gestor não administrador não pode suspender conta admin empresa vinculada a funcionário', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Privilégio',
        'empresa-privilegio'
    );

    $gestor = criarGestorFuncionario(
        $tenant,
        'gestor.privilegio@frotapro.test',
        'configurar'
    );

    $adminAlvo = criarAdminFuncionario(
        $tenant,
        'admin.alvo@frotapro.test'
    );

    $funcionarioAdmin = criarFuncionarioDireto(
        $tenant,
        [
            'user_id' => $adminAlvo->id,
            'email' => $adminAlvo->email,
            'nome' => 'Administrador Alvo',
        ]
    );

    autenticarFuncionario($this, $gestor);

    $this->withHeaders(funcionarioSpaHeaders())
        ->patchJson(
            "/api/funcionarios/{$funcionarioAdmin->id}/estado",
            [
                'estado' => 'suspenso',
            ]
        )
        ->assertForbidden();

    expect(
        $funcionarioAdmin->fresh()->estado
    )->toBe('ativo');

    $this->assertDatabaseHas('tenant_users', [
        'tenant_id' => $tenant->id,
        'user_id' => $adminAlvo->id,
        'status' => 'ativo',
    ]);
});

test('gestor não administrador não pode inativar acesso de admin empresa', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Proteção Acesso',
        'empresa-protecao-acesso'
    );

    $gestor = criarGestorFuncionario(
        $tenant,
        'gestor.acesso@frotapro.test',
        'configurar'
    );

    $adminAlvo = criarAdminFuncionario(
        $tenant,
        'admin.acesso.alvo@frotapro.test'
    );

    $funcionarioAdmin = criarFuncionarioDireto(
        $tenant,
        [
            'user_id' => $adminAlvo->id,
            'email' => $adminAlvo->email,
            'nome' => 'Administrador Protegido',
        ]
    );

    autenticarFuncionario($this, $gestor);

    $this->withHeaders(funcionarioSpaHeaders())
        ->patchJson(
            "/api/funcionarios/{$funcionarioAdmin->id}/acesso",
            [
                'ativo' => false,
            ]
        )
        ->assertForbidden();

    $this->assertDatabaseHas('tenant_users', [
        'tenant_id' => $tenant->id,
        'user_id' => $adminAlvo->id,
        'status' => 'ativo',
    ]);
});

test('funcionário normaliza nif email e telefone no cadastro', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Normalização Funcionário',
        'empresa-normalizacao-funcionario'
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.normalizacao.funcionario@frotapro.test'
    );

    autenticarFuncionario(
        $this,
        $admin
    );

    $this
        ->withHeaders(
            funcionarioSpaHeaders()
        )
        ->postJson(
            '/api/funcionarios',
            [
                'nome' => 'Funcionário Normalizado',

                'nif' => 'PT 245 123 458',

                'email' => '  FUNCIONARIO.NORMALIZADO@EXAMPLE.TEST  ',

                'telefone' => '+351 912 345 678',

                'data_admissao' => '2026-10-01',
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.nif',
            '245123458'
        )
        ->assertJsonPath(
            'data.email',
            'funcionario.normalizado@example.test'
        )
        ->assertJsonPath(
            'data.telefone',
            '+351912345678'
        );

    $this->assertDatabaseHas(
        'funcionarios',
        [
            'tenant_id' => $tenant->id,

            'nif' => '245123458',

            'email' => 'funcionario.normalizado@example.test',

            'telefone' => '+351912345678',
        ]
    );
});

test('funcionário rejeita nif telefone e nascimento inválidos', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Validação Funcionário',
        'empresa-validacao-funcionario'
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.validacao.funcionario@frotapro.test'
    );

    autenticarFuncionario(
        $this,
        $admin
    );

    $this
        ->withHeaders(
            funcionarioSpaHeaders()
        )
        ->postJson(
            '/api/funcionarios',
            [
                'nome' => 'Funcionário Inválido',

                'nif' => '245123459',

                'telefone' => '123',

                'data_nascimento' => now()
                    ->addDay()
                    ->toDateString(),
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'nif',
            'telefone',
            'data_nascimento',
        ]);
});

test('nif duplicado é detetado após normalização', function () {
    $tenant = criarTenantFuncionario(
        'Empresa NIF Normalizado',
        'empresa-nif-normalizado'
    );

    criarFuncionarioDireto(
        $tenant,
        [
            'nif' => '245123466',
        ]
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.nif.normalizado@frotapro.test'
    );

    autenticarFuncionario(
        $this,
        $admin
    );

    $this
        ->withHeaders(
            funcionarioSpaHeaders()
        )
        ->postJson(
            '/api/funcionarios',
            [
                'nome' => 'Funcionário Duplicado',

                'nif' => 'PT 245-123-466',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'nif'
        );

    expect(
        Funcionario::query()
            ->where(
                'tenant_id',
                $tenant->id
            )
            ->where(
                'nif',
                '245123466'
            )
            ->count()
    )->toBe(1);
});

test('atualização normaliza dados e permite manter o próprio nif', function () {
    $tenant = criarTenantFuncionario(
        'Empresa Update Funcionário',
        'empresa-update-funcionario'
    );

    $funcionario =
        criarFuncionarioDireto(
            $tenant,
            [
                'nif' => '245123482',

                'email' => 'original.funcionario@example.test',
            ]
        );

    $admin = criarAdminFuncionario(
        $tenant,
        'admin.update.funcionario@frotapro.test'
    );

    autenticarFuncionario(
        $this,
        $admin
    );

    $this
        ->withHeaders(
            funcionarioSpaHeaders()
        )
        ->patchJson(
            "/api/funcionarios/{$funcionario->id}",
            [
                'nif' => 'PT 245 123 482',

                'email' => '  NOVO.FUNCIONARIO@EXAMPLE.TEST ',

                'telefone' => '00351 913 456 789',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.nif',
            '245123482'
        )
        ->assertJsonPath(
            'data.email',
            'novo.funcionario@example.test'
        )
        ->assertJsonPath(
            'data.telefone',
            '+351913456789'
        );
});

test('funcionario aceita telefone internacional', function () {
    $tenant = criarTenantFuncionario(
        'Tenant Internacional Funcionario',
        'tenant-internacional-funcionario'
    );

    $admin = criarAdminFuncionario(
        $tenant,
        'internacional.funcionario@frotapro.test'
    );

    autenticarFuncionario($this, $admin);

    $this->withHeaders(funcionarioSpaHeaders())
        ->postJson('/api/funcionarios', [
            'nome' => 'Funcionario Internacional',
            'telefone' => '+55 11 99876 5432',
        ])
        ->assertCreated()
        ->assertJsonPath(
            'data.telefone',
            '+5511998765432'
        );
});
