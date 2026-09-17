<?php

use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Profile;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function contaMotoristaHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function contaMotoristaTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function contaMotoristaRole(): Role
{
    return Role::firstOrCreate(
        ['codigo' => 'motorista'],
        [
            'nome' => 'Motorista',
            'sistema' => true,
        ]
    );
}

function contaMotoristaAdmin(
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
        ['codigo' => 'motoristas'],
        [
            'modulo' => 'motoristas',
            'nome' => 'Motoristas',
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

function contaMotoristaLogin(
    $test,
    User $user
): void {
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function contaMotoristaCriar(
    Tenant $tenant,
    array $dados = []
): Motorista {
    $motorista = new Motorista(array_merge([
        'nome_completo' => 'Motorista Conta Teste',
        'nif' => '246987654',
        'email' => 'motorista.conta@example.test',
        'telemovel' => '+351912345678',
        'data_nascimento' => '1990-01-01',
        'tipo_documento' => 'cartao_cidadao',
        'numero_documento' => '12345678',
        'documento_valid_until' => '2030-01-01',
        'carta_numero' => 'L-123456',
        'carta_valid_until' => '2030-02-01',
        'registo_criminal_valid_until' => '2030-03-01',
        'endereco_rua' => 'Rua Teste',
        'endereco_cidade' => 'Lisboa',
        'endereco_cep' => '1000-100',
    ], $dados));

    $motorista->tenant_id = $tenant->id;
    $motorista->sincronizarCadastro();
    $motorista->save();

    return $motorista;
}

test('criação de conta de motorista exige autenticação', function () {
    $this->withHeaders(contaMotoristaHeaders())
        ->postJson(
            '/api/motoristas/00000000-0000-0000-0000-000000000000/conta',
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
            ]
        )
        ->assertUnauthorized();
});

test('utilizador somente visualizar não pode criar conta de motorista', function () {
    $tenant = contaMotoristaTenant(
        'Tenant Visualizar Motorista',
        'tenant-visualizar-conta-motorista'
    );

    contaMotoristaRole();

    $admin = contaMotoristaAdmin(
        $tenant,
        'visualizar.motorista.conta@frotapro.test',
        'visualizar'
    );

    $motorista = contaMotoristaCriar($tenant);

    contaMotoristaLogin($this, $admin);

    $this->withHeaders(contaMotoristaHeaders())
        ->postJson(
            "/api/motoristas/{$motorista->id}/conta",
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
            ]
        )
        ->assertForbidden();

    expect($motorista->fresh()->user_id)->toBeNull();
});

test('conta de motorista cria todas as associações', function () {
    $tenant = contaMotoristaTenant(
        'Tenant Conta Motorista',
        'tenant-conta-motorista'
    );

    $role = contaMotoristaRole();

    $admin = contaMotoristaAdmin(
        $tenant,
        'admin.conta.motorista@frotapro.test'
    );

    $motorista = contaMotoristaCriar($tenant);

    contaMotoristaLogin($this, $admin);

    $response = $this->withHeaders(contaMotoristaHeaders())
        ->postJson(
            "/api/motoristas/{$motorista->id}/conta",
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.email',
            'motorista.conta@example.test'
        )
        ->assertJsonPath(
            'data.name',
            'Motorista Conta Teste'
        );

    $userId = $response->json('data.user_id');

    expect($userId)->not->toBeNull();

    $user = User::findOrFail($userId);

    expect(
        Hash::check('SenhaNova123', $user->password)
    )->toBeTrue();

    $this->assertDatabaseHas('profiles', [
        'user_id' => $userId,
        'nif' => '246987654',
        'telefone' => '+351912345678',
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

    $this->assertDatabaseHas('motoristas', [
        'id' => $motorista->id,
        'user_id' => $userId,
    ]);
});

test('cliente não pode escolher email tenant user role ou entidade da conta de motorista', function () {
    $tenant = contaMotoristaTenant(
        'Tenant Spoof Motorista',
        'tenant-spoof-motorista'
    );

    contaMotoristaRole();

    $admin = contaMotoristaAdmin(
        $tenant,
        'admin.spoof.motorista@frotapro.test'
    );

    $motorista = contaMotoristaCriar($tenant);

    contaMotoristaLogin($this, $admin);

    $this->withHeaders(contaMotoristaHeaders())
        ->postJson(
            "/api/motoristas/{$motorista->id}/conta",
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

    expect($motorista->fresh()->user_id)->toBeNull();
});

test('não é possível criar conta para motorista de outro tenant', function () {
    $tenantA = contaMotoristaTenant(
        'Tenant A Conta Motorista',
        'tenant-a-conta-motorista'
    );

    $tenantB = contaMotoristaTenant(
        'Tenant B Conta Motorista',
        'tenant-b-conta-motorista'
    );

    contaMotoristaRole();

    $admin = contaMotoristaAdmin(
        $tenantA,
        'admin.tenant.a.motorista@frotapro.test'
    );

    $motoristaB = contaMotoristaCriar(
        $tenantB,
        [
            'nif' => '246987655',
            'email' => 'motorista.b@example.test',
        ]
    );

    contaMotoristaLogin($this, $admin);

    $this->withHeaders(contaMotoristaHeaders())
        ->postJson(
            "/api/motoristas/{$motoristaB->id}/conta",
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
            ]
        )
        ->assertNotFound();

    expect($motoristaB->fresh()->user_id)->toBeNull();
});

test('email existente é bloqueado sem alterar a conta existente', function () {
    $tenant = contaMotoristaTenant(
        'Tenant Email Motorista',
        'tenant-email-motorista'
    );

    contaMotoristaRole();

    $admin = contaMotoristaAdmin(
        $tenant,
        'admin.email.motorista@frotapro.test'
    );

    $existingUser = User::factory()->create([
        'email' => 'existente.motorista@example.test',
        'password' => 'SenhaOriginal123',
    ]);

    $motorista = contaMotoristaCriar(
        $tenant,
        [
            'nif' => '246987656',
            'email' => 'existente.motorista@example.test',
        ]
    );

    contaMotoristaLogin($this, $admin);

    $this->withHeaders(contaMotoristaHeaders())
        ->postJson(
            "/api/motoristas/{$motorista->id}/conta",
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

    expect($motorista->fresh()->user_id)->toBeNull();
});

test('nif já associado a outro perfil bloqueia criação da conta', function () {
    $tenant = contaMotoristaTenant(
        'Tenant NIF Conta Motorista',
        'tenant-nif-conta-motorista'
    );

    contaMotoristaRole();

    $admin = contaMotoristaAdmin(
        $tenant,
        'admin.nif.motorista@frotapro.test'
    );

    $existingUser = User::factory()->create([
        'email' => 'perfil.existente@frotapro.test',
    ]);

    Profile::create([
        'user_id' => $existingUser->id,
        'nif' => '246987657',
    ]);

    $motorista = contaMotoristaCriar(
        $tenant,
        [
            'nif' => '246987657',
            'email' => 'novo.motorista@example.test',
        ]
    );

    contaMotoristaLogin($this, $admin);

    $this->withHeaders(contaMotoristaHeaders())
        ->postJson(
            "/api/motoristas/{$motorista->id}/conta",
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('conta');

    expect($motorista->fresh()->user_id)->toBeNull();

    $this->assertDatabaseMissing('users', [
        'email' => 'novo.motorista@example.test',
    ]);
});

test('motorista que já possui conta não recebe outra', function () {
    $tenant = contaMotoristaTenant(
        'Tenant Conta Duplicada Motorista',
        'tenant-conta-duplicada-motorista'
    );

    contaMotoristaRole();

    $admin = contaMotoristaAdmin(
        $tenant,
        'admin.duplicada.motorista@frotapro.test'
    );

    $userExistente = User::factory()->create([
        'email' => 'vinculado.motorista@example.test',
    ]);

    $motorista = contaMotoristaCriar(
        $tenant,
        [
            'nif' => '246987658',
            'email' => 'vinculado.motorista@example.test',
        ]
    );

    $motorista->user_id = $userExistente->id;
    $motorista->save();

    contaMotoristaLogin($this, $admin);

    $this->withHeaders(contaMotoristaHeaders())
        ->postJson(
            "/api/motoristas/{$motorista->id}/conta",
            [
                'password' => 'SenhaNova123',
                'password_confirmation' => 'SenhaNova123',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('conta');

    expect(
        User::where(
            'email',
            'vinculado.motorista@example.test'
        )->count()
    )->toBe(1);
});

test('senha da conta do motorista pode ser atualizada', function () {
    $tenant = contaMotoristaTenant(
        'Tenant Senha Motorista',
        'tenant-senha-motorista'
    );

    contaMotoristaRole();

    $admin = contaMotoristaAdmin(
        $tenant,
        'admin.senha.motorista@frotapro.test'
    );

    $motorista = contaMotoristaCriar(
        $tenant,
        [
            'nif' => '246987659',
            'email' => 'senha.motorista@example.test',
        ]
    );

    contaMotoristaLogin($this, $admin);

    $createResponse = $this
        ->withHeaders(contaMotoristaHeaders())
        ->postJson(
            "/api/motoristas/{$motorista->id}/conta",
            [
                'password' => 'SenhaOriginal123',
                'password_confirmation' => 'SenhaOriginal123',
            ]
        )
        ->assertCreated();

    $userId = $createResponse->json('data.user_id');

    $this->withHeaders(contaMotoristaHeaders())
        ->patchJson(
            "/api/motoristas/{$motorista->id}/conta/senha",
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

test('não é possível alterar senha de motorista sem conta vinculada', function () {
    $tenant = contaMotoristaTenant(
        'Tenant Sem Conta Motorista',
        'tenant-sem-conta-motorista'
    );

    contaMotoristaRole();

    $admin = contaMotoristaAdmin(
        $tenant,
        'admin.sem.conta.motorista@frotapro.test'
    );

    $motorista = contaMotoristaCriar(
        $tenant,
        [
            'nif' => '246987660',
            'email' => 'sem.conta.motorista@example.test',
        ]
    );

    contaMotoristaLogin($this, $admin);

    $this->withHeaders(contaMotoristaHeaders())
        ->patchJson(
            "/api/motoristas/{$motorista->id}/conta/senha",
            [
                'password' => 'SenhaAlterada123',
                'password_confirmation' => 'SenhaAlterada123',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('conta');
});
