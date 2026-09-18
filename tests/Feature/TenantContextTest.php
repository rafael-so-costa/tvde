<?php

use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function criarUtilizadorTenant(string $email): User
{
    return User::factory()->create([
        'email' => $email,
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);
}

function spaHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

test('rota tenant context exige autenticação', function () {
    $this->withHeaders(spaHeaders())
        ->getJson('/api/tenant-context')
        ->assertUnauthorized();
});

test('super admin acessa sem tenant', function () {
    $user = criarUtilizadorTenant('superadmin@frotapro.test');

    $role = Role::create([
        'codigo' => 'super_admin',
        'nome' => 'Super Administrador',
        'sistema' => true,
    ]);

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => null,
    ]);

    $this->postJson('/login', [
        'email' => 'superadmin@frotapro.test',
        'password' => 'SenhaTeste123!',
    ])->assertOk();

    $this->withHeaders(spaHeaders())
        ->getJson('/api/tenant-context')
        ->assertOk()
        ->assertJson([
            'tenant_id' => null,
            'has_tenant' => false,
        ]);
});

test('utilizador recebe automaticamente o tenant principal ativo', function () {
    $user = criarUtilizadorTenant('tenant@frotapro.test');

    $tenant = Tenant::create([
        'nome' => 'Empresa Teste',
        'slug' => 'empresa-teste',
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $this->postJson('/login', [
        'email' => 'tenant@frotapro.test',
        'password' => 'SenhaTeste123!',
    ])->assertOk();

    $this->withHeaders(spaHeaders())
        ->getJson('/api/tenant-context')
        ->assertOk()
        ->assertJson([
            'tenant_id' => $tenant->id,
            'has_tenant' => true,
        ])
        ->assertSessionHas('tenant_id', $tenant->id);
});

test('utilizador sem tenant ativo recebe 403', function () {
    criarUtilizadorTenant('semtenant@frotapro.test');

    $this->postJson('/login', [
        'email' => 'semtenant@frotapro.test',
        'password' => 'SenhaTeste123!',
    ])->assertOk();

    $this->withHeaders(spaHeaders())
        ->getJson('/api/tenant-context')
        ->assertForbidden()
        ->assertJsonPath(
            'message',
            'Nenhuma organização ativa associada a este utilizador.'
        );
});

test('tenant desativado não pode ser usado', function () {
    $user = criarUtilizadorTenant('inativo@frotapro.test');

    $tenant = Tenant::create([
        'nome' => 'Empresa Inativa',
        'slug' => 'empresa-inativa',
        'ativo' => false,
    ]);

    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $this->postJson('/login', [
        'email' => 'inativo@frotapro.test',
        'password' => 'SenhaTeste123!',
    ])->assertOk();

    $this->withHeaders(spaHeaders())
        ->getJson('/api/tenant-context')
        ->assertForbidden()
        ->assertJsonPath(
            'message',
            'Nenhuma organização ativa associada a este utilizador.'
        );
});

test('utilizador não pode usar tenant de outra organização', function () {
    $user = criarUtilizadorTenant('isolamento@frotapro.test');

    $tenantAutorizado = Tenant::create([
        'nome' => 'Empresa A',
        'slug' => 'empresa-a',
        'ativo' => true,
    ]);

    $tenantNaoAutorizado = Tenant::create([
        'nome' => 'Empresa B',
        'slug' => 'empresa-b',
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' => $tenantAutorizado->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $this->postJson('/login', [
        'email' => 'isolamento@frotapro.test',
        'password' => 'SenhaTeste123!',
    ])->assertOk();

    $this->withSession([
        'tenant_id' => $tenantNaoAutorizado->id,
    ]);

    $this->withHeaders(spaHeaders())
        ->getJson('/api/tenant-context')
        ->assertForbidden()
        ->assertJsonPath(
            'message',
            'Acesso à organização não autorizado.'
        )
        ->assertSessionMissing('tenant_id');
});

test('super admin pode selecionar qualquer tenant ativo', function () {
    $user = criarUtilizadorTenant(
        'super-selecao@frotapro.test'
    );

    $role = Role::create([
        'codigo' => 'super_admin',
        'nome' => 'Super Administrador',
        'sistema' => true,
    ]);

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => null,
    ]);

    $tenant = Tenant::create([
        'nome' => 'Tenant Selecionado',
        'slug' => 'tenant-selecionado',
        'ativo' => true,
    ]);

    $this->postJson('/login', [
        'email' =>
            'super-selecao@frotapro.test',
        'password' =>
            'SenhaTeste123!',
    ])->assertOk();

    $this->withHeaders(
        spaHeaders()
    )
        ->postJson(
            '/api/tenant-context',
            [
                'tenant_id' =>
                    $tenant->id,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.id',
            $tenant->id
        )
        ->assertSessionHas(
            'tenant_id',
            $tenant->id
        );

    $this->withHeaders(
        spaHeaders()
    )
        ->getJson(
            '/api/tenant-context'
        )
        ->assertOk()
        ->assertJson([
            'tenant_id' =>
                $tenant->id,
            'has_tenant' =>
                true,
        ]);
});

test('super admin não pode selecionar tenant inativo', function () {
    $user = criarUtilizadorTenant(
        'super-inativo@frotapro.test'
    );

    $role = Role::create([
        'codigo' => 'super_admin',
        'nome' => 'Super Administrador',
        'sistema' => true,
    ]);

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => null,
    ]);

    $tenant = Tenant::create([
        'nome' => 'Tenant Inativo',
        'slug' => 'tenant-inativo-super',
        'ativo' => false,
    ]);

    $this->postJson('/login', [
        'email' =>
            'super-inativo@frotapro.test',
        'password' =>
            'SenhaTeste123!',
    ])->assertOk();

    $this->withHeaders(
        spaHeaders()
    )
        ->postJson(
            '/api/tenant-context',
            [
                'tenant_id' =>
                    $tenant->id,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'tenant_id'
        );
});

test('utilizador comum não pode selecionar tenant alheio', function () {
    $user = criarUtilizadorTenant(
        'selecao-isolada@frotapro.test'
    );

    $permitido = Tenant::create([
        'nome' => 'Tenant Permitido',
        'slug' => 'tenant-permitido',
        'ativo' => true,
    ]);

    $alheio = Tenant::create([
        'nome' => 'Tenant Alheio',
        'slug' => 'tenant-alheio',
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' =>
            $permitido->id,
        'user_id' =>
            $user->id,
        'status' =>
            'ativo',
        'principal' =>
            true,
    ]);

    $this->postJson('/login', [
        'email' =>
            'selecao-isolada@frotapro.test',
        'password' =>
            'SenhaTeste123!',
    ])->assertOk();

    $this->withHeaders(
        spaHeaders()
    )
        ->postJson(
            '/api/tenant-context',
            [
                'tenant_id' =>
                    $alheio->id,
            ]
        )
        ->assertForbidden();
});
