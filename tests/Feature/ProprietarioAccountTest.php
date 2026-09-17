<?php

use App\Models\Permission;
use App\Models\Profile;
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

function contaProprietarioHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function contaProprietarioTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function contaProprietarioRole(): Role
{
    return Role::firstOrCreate(
        ['codigo' => 'proprietario'],
        [
            'nome' => 'Proprietário',
            'sistema' => true,
        ]
    );
}

function contaProprietarioAdmin(
    Tenant $tenant,
    string $email,
    string $nivel = 'configurar'
): User {
    $user = User::factory()->create([
        'email' => $email,
        'password' => 'SenhaTeste123!',
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
        ['codigo' => 'proprietarios'],
        [
            'modulo' => 'proprietarios',
            'nome' => 'Proprietários',
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

function contaProprietarioLogin(
    $test,
    User $user
): void {
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function contaProprietarioCriar(
    Tenant $tenant,
    array $dados = []
): Proprietario {
    $proprietario = new Proprietario(array_merge([
        'tipo' => 'pessoa_fisica',
        'nome_completo' => 'Proprietário Teste',
        'nif' => '245987654',
        'email' => 'proprietario.conta@example.test',
        'telemovel' => '+351912345678',
        'data_nascimento' => '1985-01-01',
        'tipo_documento' => 'cartao_cidadao',
        'numero_documento' => '12345678',
        'documento_valid_until' => '2030-01-01',
        'endereco_rua' => 'Rua Teste',
        'endereco_cidade' => 'Lisboa',
        'endereco_cep' => '1000-100',
    ], $dados));

    $proprietario->tenant_id = $tenant->id;
    $proprietario->sincronizarCadastro();
    $proprietario->save();

    return $proprietario;
}

test('criação de conta exige autenticação', function () {
    $this->withHeaders(contaProprietarioHeaders())
        ->postJson(
            '/api/proprietarios/00000000-0000-0000-0000-000000000000/conta',
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
            ]
        )
        ->assertUnauthorized();
});

test('utilizador somente visualizar não pode criar conta', function () {
    $tenant = contaProprietarioTenant(
        'Tenant Visualizar Conta',
        'tenant-visualizar-conta'
    );

    contaProprietarioRole();

    $admin = contaProprietarioAdmin(
        $tenant,
        'visualizar.conta@frotapro.test',
        'visualizar'
    );

    $proprietario = contaProprietarioCriar($tenant);

    contaProprietarioLogin($this, $admin);

    $this->withHeaders(contaProprietarioHeaders())
        ->postJson(
            "/api/proprietarios/{$proprietario->id}/conta",
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
            ]
        )
        ->assertForbidden();

    expect($proprietario->fresh()->user_id)->toBeNull();
});

test('conta de proprietário cria todas as associações', function () {
    $tenant = contaProprietarioTenant(
        'Tenant Conta',
        'tenant-conta'
    );

    $role = contaProprietarioRole();

    $admin = contaProprietarioAdmin(
        $tenant,
        'admin.conta@frotapro.test'
    );

    $proprietario = contaProprietarioCriar($tenant);

    contaProprietarioLogin($this, $admin);

    $response = $this->withHeaders(contaProprietarioHeaders())
        ->postJson(
            "/api/proprietarios/{$proprietario->id}/conta",
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.email',
            'proprietario.conta@example.test'
        );

    $userId = $response->json('data.user_id');

    expect($userId)->not->toBeNull();

    $user = User::findOrFail($userId);

    expect(
        Hash::check('SenhaNova123', $user->password)
    )->toBeTrue();

    $this->assertDatabaseHas('profiles', [
        'user_id' => $userId,
        'nif' => '245987654',
    ]);

    $this->assertDatabaseHas('tenant_users', [
        'tenant_id' => $tenant->id,
        'user_id' => $userId,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $this->assertDatabaseHas('user_roles', [
        'tenant_id' => $tenant->id,
        'user_id' => $userId,
        'role_id' => $role->id,
    ]);

    $this->assertDatabaseHas('proprietarios', [
        'id' => $proprietario->id,
        'user_id' => $userId,
    ]);
});

test('cliente não pode escolher email tenant user role ou entidade', function () {
    $tenant = contaProprietarioTenant(
        'Tenant Spoof',
        'tenant-spoof-conta'
    );

    contaProprietarioRole();

    $admin = contaProprietarioAdmin(
        $tenant,
        'admin.spoof@frotapro.test'
    );

    $proprietario = contaProprietarioCriar($tenant);

    contaProprietarioLogin($this, $admin);

    $this->withHeaders(contaProprietarioHeaders())
        ->postJson(
            "/api/proprietarios/{$proprietario->id}/conta",
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
                'email' => 'ataque@example.test',
                'tenant_id' => $tenant->id,
                'user_id' => $admin->id,
                'role' => 'super_admin',
                'entity_table' => 'users',
                'entity_id' => $admin->id,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'email',
            'tenant_id',
            'user_id',
            'role',
            'entity_table',
            'entity_id',
        ]);

    expect($proprietario->fresh()->user_id)->toBeNull();
});

test('não é possível criar conta para proprietário de outro tenant', function () {
    $tenantA = contaProprietarioTenant(
        'Tenant A Conta',
        'tenant-a-conta'
    );

    $tenantB = contaProprietarioTenant(
        'Tenant B Conta',
        'tenant-b-conta'
    );

    contaProprietarioRole();

    $admin = contaProprietarioAdmin(
        $tenantA,
        'admin.tenant.a@frotapro.test'
    );

    $proprietarioB = contaProprietarioCriar(
        $tenantB,
        [
            'nif' => '245987655',
            'email' => 'proprietario.b@example.test',
        ]
    );

    contaProprietarioLogin($this, $admin);

    $this->withHeaders(contaProprietarioHeaders())
        ->postJson(
            "/api/proprietarios/{$proprietarioB->id}/conta",
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
            ]
        )
        ->assertNotFound();

    expect($proprietarioB->fresh()->user_id)->toBeNull();
});

test('email existente é bloqueado sem alterar a conta existente', function () {
    $tenant = contaProprietarioTenant(
        'Tenant E-mail',
        'tenant-email-conta'
    );

    contaProprietarioRole();

    $admin = contaProprietarioAdmin(
        $tenant,
        'admin.email@frotapro.test'
    );

    $existingUser = User::factory()->create([
        'email' => 'existente@example.test',
        'password' => 'SenhaOriginal123',
    ]);

    $proprietario = contaProprietarioCriar(
        $tenant,
        [
            'nif' => '245987656',
            'email' => 'existente@example.test',
        ]
    );

    contaProprietarioLogin($this, $admin);

    $this->withHeaders(contaProprietarioHeaders())
        ->postJson(
            "/api/proprietarios/{$proprietario->id}/conta",
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('conta');

    $existingUser->refresh();

    expect(
        Hash::check(
            'SenhaOriginal123',
            $existingUser->password
        )
    )->toBeTrue();

    expect(
        Hash::check(
            'SenhaNova123',
            $existingUser->password
        )
    )->toBeFalse();

    expect($proprietario->fresh()->user_id)->toBeNull();
});

test('proprietário que já possui conta não recebe outra', function () {
    $tenant = contaProprietarioTenant(
        'Tenant Duplicada',
        'tenant-conta-duplicada'
    );

    contaProprietarioRole();

    $admin = contaProprietarioAdmin(
        $tenant,
        'admin.duplicada@frotapro.test'
    );

    $userExistente = User::factory()->create([
        'email' => 'vinculado@example.test',
    ]);

    $proprietario = contaProprietarioCriar(
        $tenant,
        [
            'nif' => '245987657',
            'email' => 'vinculado@example.test',
        ]
    );

    $proprietario->user_id = $userExistente->id;
    $proprietario->save();

    contaProprietarioLogin($this, $admin);

    $this->withHeaders(contaProprietarioHeaders())
        ->postJson(
            "/api/proprietarios/{$proprietario->id}/conta",
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('conta');

    expect(
        User::where('email', 'vinculado@example.test')
            ->count()
    )->toBe(1);
});

test('senha da conta vinculada pode ser atualizada', function () {
    $tenant = contaProprietarioTenant(
        'Tenant Senha',
        'tenant-senha'
    );

    contaProprietarioRole();

    $admin = contaProprietarioAdmin(
        $tenant,
        'admin.senha@frotapro.test'
    );

    $proprietario = contaProprietarioCriar(
        $tenant,
        [
            'nif' => '245987658',
            'email' => 'senha@example.test',
        ]
    );

    contaProprietarioLogin($this, $admin);

    $createResponse = $this
        ->withHeaders(contaProprietarioHeaders())
        ->postJson(
            "/api/proprietarios/{$proprietario->id}/conta",
            [
                'password' => 'SenhaOriginal123',
                'password_confirmation' => 'SenhaOriginal123',
            ]
        )
        ->assertCreated();

    $userId = $createResponse->json('data.user_id');

    $this->withHeaders(contaProprietarioHeaders())
        ->patchJson(
            "/api/proprietarios/{$proprietario->id}/conta/senha",
            [
                'password' => 'SenhaAlterada123',
                'password_confirmation' => 'SenhaAlterada123',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'message',
            'Senha atualizada com sucesso.'
        );

    $user = User::findOrFail($userId);

    expect(
        Hash::check(
            'SenhaAlterada123',
            $user->password
        )
    )->toBeTrue();

    expect(
        Hash::check(
            'SenhaOriginal123',
            $user->password
        )
    )->toBeFalse();
});

test('não é possível alterar senha sem conta vinculada', function () {
    $tenant = contaProprietarioTenant(
        'Tenant Sem Conta',
        'tenant-sem-conta'
    );

    contaProprietarioRole();

    $admin = contaProprietarioAdmin(
        $tenant,
        'admin.sem.conta@frotapro.test'
    );

    $proprietario = contaProprietarioCriar(
        $tenant,
        [
            'nif' => '245987659',
            'email' => 'sem.conta@example.test',
        ]
    );

    contaProprietarioLogin($this, $admin);

    $this->withHeaders(contaProprietarioHeaders())
        ->patchJson(
            "/api/proprietarios/{$proprietario->id}/conta/senha",
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('conta');
});
