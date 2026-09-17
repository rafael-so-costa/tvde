<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserPermission;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;

uses(RefreshDatabase::class);

beforeEach(function () {
    Route::middleware([
        'api',
        'auth:sanctum',
        'tenant',
        'permission:dashboard,visualizar',
    ])->get('/api/_test/permission/view', function (Request $request) {
        return response()->json([
            'permission_level' => $request->attributes->get('permission_level'),
        ]);
    });

    Route::middleware([
        'api',
        'auth:sanctum',
        'tenant',
        'permission:dashboard,configurar',
    ])->get('/api/_test/permission/configure', function (Request $request) {
        return response()->json([
            'permission_level' => $request->attributes->get('permission_level'),
        ]);
    });
});

function permissionSpaHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function criarContextoPermissao(
    string $email,
    string $tenantSlug = 'empresa-teste'
): array {
    $user = User::factory()->create([
        'email' => $email,
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);

    $tenant = Tenant::create([
        'nome' => 'Empresa Teste',
        'slug' => $tenantSlug,
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $permission = Permission::create([
        'codigo' => 'dashboard',
        'modulo' => 'dashboard',
        'nome' => 'Dashboard',
    ]);

    return [$user, $tenant, $permission];
}

test('rota com permissão exige autenticação', function () {
    $this->withHeaders(permissionSpaHeaders())
        ->getJson('/api/_test/permission/view')
        ->assertUnauthorized();
});

test('super admin possui nível configurar globalmente', function () {
    $user = User::factory()->create([
        'email' => 'super.permission@frotapro.test',
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);

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
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();

    $this->withHeaders(permissionSpaHeaders())
        ->getJson('/api/_test/permission/configure')
        ->assertOk()
        ->assertJsonPath('permission_level', 'configurar');
});

test('admin empresa possui nível configurar no próprio tenant', function () {
    [$user, $tenant] = criarContextoPermissao(
        'admin.permission@frotapro.test',
        'empresa-admin'
    );

    $role = Role::create([
        'codigo' => 'admin_empresa',
        'nome' => 'Administrador da Empresa',
        'sistema' => true,
    ]);

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);

    $this->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();

    $this->withHeaders(permissionSpaHeaders())
        ->getJson('/api/_test/permission/configure')
        ->assertOk()
        ->assertJsonPath('permission_level', 'configurar');
});

test('funcionário com visualizar pode visualizar mas não configurar', function () {
    [$user, $tenant, $permission] = criarContextoPermissao(
        'funcionario.view@frotapro.test',
        'empresa-view'
    );

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

    RolePermission::create([
        'role_id' => $role->id,
        'permission_id' => $permission->id,
        'nivel' => 'visualizar',
    ]);

    $this->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();

    $this->withHeaders(permissionSpaHeaders())
        ->getJson('/api/_test/permission/view')
        ->assertOk()
        ->assertJsonPath('permission_level', 'visualizar');

    $this->withHeaders(permissionSpaHeaders())
        ->getJson('/api/_test/permission/configure')
        ->assertForbidden()
        ->assertJsonPath(
            'message',
            'Sem permissão suficiente para este recurso.'
        );
});

test('permissão direta configurar sobrepõe permissão visualizar da role', function () {
    [$user, $tenant, $permission] = criarContextoPermissao(
        'funcionario.override@frotapro.test',
        'empresa-override'
    );

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

    RolePermission::create([
        'role_id' => $role->id,
        'permission_id' => $permission->id,
        'nivel' => 'visualizar',
    ]);

    UserPermission::create([
        'user_id' => $user->id,
        'permission_id' => $permission->id,
        'tenant_id' => $tenant->id,
        'nivel' => 'configurar',
    ]);

    $this->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();

    $this->withHeaders(permissionSpaHeaders())
        ->getJson('/api/_test/permission/configure')
        ->assertOk()
        ->assertJsonPath('permission_level', 'configurar');
});

test('permissão direta nenhum remove permissão herdada da role', function () {
    [$user, $tenant, $permission] = criarContextoPermissao(
        'funcionario.deny@frotapro.test',
        'empresa-deny'
    );

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

    RolePermission::create([
        'role_id' => $role->id,
        'permission_id' => $permission->id,
        'nivel' => 'configurar',
    ]);

    UserPermission::create([
        'user_id' => $user->id,
        'permission_id' => $permission->id,
        'tenant_id' => $tenant->id,
        'nivel' => 'nenhum',
    ]);

    $this->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();

    $this->withHeaders(permissionSpaHeaders())
        ->getJson('/api/_test/permission/view')
        ->assertForbidden()
        ->assertJsonPath(
            'message',
            'Sem permissão suficiente para este recurso.'
        );
});

test('role de um tenant não concede acesso no outro tenant', function () {
    $user = User::factory()->create([
        'email' => 'isolamento.permission@frotapro.test',
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);

    $tenantA = Tenant::create([
        'nome' => 'Empresa A',
        'slug' => 'permission-empresa-a',
        'ativo' => true,
    ]);

    $tenantB = Tenant::create([
        'nome' => 'Empresa B',
        'slug' => 'permission-empresa-b',
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' => $tenantA->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    TenantUser::create([
        'tenant_id' => $tenantB->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => false,
    ]);

    $permission = Permission::create([
        'codigo' => 'dashboard',
        'modulo' => 'dashboard',
        'nome' => 'Dashboard',
    ]);

    $role = Role::create([
        'codigo' => 'funcionario',
        'nome' => 'Funcionário',
        'sistema' => true,
    ]);

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenantA->id,
    ]);

    RolePermission::create([
        'role_id' => $role->id,
        'permission_id' => $permission->id,
        'nivel' => 'configurar',
    ]);

    $this->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();

    $this->withSession([
        'tenant_id' => $tenantB->id,
    ]);

    $this->withHeaders(permissionSpaHeaders())
        ->getJson('/api/_test/permission/view')
        ->assertForbidden()
        ->assertJsonPath(
            'message',
            'Sem permissão suficiente para este recurso.'
        );
});
