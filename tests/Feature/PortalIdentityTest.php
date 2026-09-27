<?php

use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Proprietario;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserPermission;
use App\Models\UserRole;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([
        RoleSeeder::class,
        PermissionSeeder::class,
    ]);
});

function portalIdentityHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',

        'Referer' => 'http://localhost:8000/',

        'Accept' => 'application/json',
    ];
}

function criarPortalTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,

        'slug' => $slug,

        'ativo' => true,
    ]);
}

function criarPortalUser(
    string $email
): User {
    return User::factory()->create([
        'name' => 'Utilizador Portal',

        'email' => $email,

        'password' => Hash::make(
            'SenhaTeste123!'
        ),

        'ativo' => true,
    ]);
}

function associarPortalTenant(
    User $user,
    Tenant $tenant,
    bool $principal = true
): void {
    TenantUser::create([
        'tenant_id' => $tenant->id,

        'user_id' => $user->id,

        'status' => 'ativo',

        'principal' => $principal,
    ]);
}

function atribuirPortalRole(
    User $user,
    Tenant $tenant,
    string $codigo
): void {
    $role =
        Role::query()
            ->where(
                'codigo',
                $codigo
            )
            ->firstOrFail();

    UserRole::create([
        'user_id' => $user->id,

        'role_id' => $role->id,

        'tenant_id' => $tenant->id,
    ]);
}

function criarPortalMotorista(
    Tenant $tenant,
    User $user,
    string $nome
): Motorista {
    $motorista =
        new Motorista([
            'nome_completo' => $nome,

            'email' => $user->email,
        ]);

    $motorista->tenant_id =
        $tenant->id;

    $motorista->user_id =
        $user->id;

    $motorista->ativo =
        true;

    $motorista->status_cadastro =
        'ativo';

    $motorista->save();

    return $motorista;
}

function criarPortalProprietario(
    Tenant $tenant,
    User $user,
    string $nome
): Proprietario {
    $proprietario =
        new Proprietario([
            'tipo' => 'pessoa_fisica',

            'nome_completo' => $nome,

            'email' => $user->email,
        ]);

    $proprietario->tenant_id =
        $tenant->id;

    $proprietario->user_id =
        $user->id;

    $proprietario->ativo =
        true;

    $proprietario->status_cadastro =
        'ativo';

    $proprietario->save();

    return $proprietario;
}

function loginPortalIdentity(
    $test,
    User $user
): void {
    $test
        ->withHeaders(
            portalIdentityHeaders()
        )
        ->postJson(
            '/login',
            [
                'email' => $user->email,

                'password' => 'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

test(
    'identidade do portal exige autenticação',
    function () {
        $this
            ->withHeaders(
                portalIdentityHeaders()
            )
            ->getJson(
                '/api/portal/identity'
            )
            ->assertUnauthorized();
    }
);

test(
    'admin empresa recebe gestão como área padrão',
    function () {
        $tenant =
            criarPortalTenant(
                'Empresa Gestão',
                'empresa-gestao'
            );

        $user =
            criarPortalUser(
                'admin.portal@frotapro.test'
            );

        associarPortalTenant(
            $user,
            $tenant
        );

        atribuirPortalRole(
            $user,
            $tenant,
            'admin_empresa'
        );

        loginPortalIdentity(
            $this,
            $user
        );

        $this
            ->withHeaders(
                portalIdentityHeaders()
            )
            ->getJson(
                '/api/portal/identity'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.tenant_id',
                $tenant->id
            )
            ->assertJsonPath(
                'data.default_area',
                'gestao'
            )
            ->assertJsonPath(
                'data.default_path',
                '/painel'
            )
            ->assertJsonPath(
                'data.areas.0.code',
                'gestao'
            );
    }
);

test(
    'motorista vinculado recebe portal do motorista',
    function () {
        $tenant =
            criarPortalTenant(
                'Empresa Motorista',
                'empresa-motorista'
            );

        $user =
            criarPortalUser(
                'motorista.portal@frotapro.test'
            );

        associarPortalTenant(
            $user,
            $tenant
        );

        atribuirPortalRole(
            $user,
            $tenant,
            'motorista'
        );

        $motorista =
            criarPortalMotorista(
                $tenant,
                $user,
                'Motorista Portal'
            );

        loginPortalIdentity(
            $this,
            $user
        );

        $this
            ->withHeaders(
                portalIdentityHeaders()
            )
            ->getJson(
                '/api/portal/identity'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.default_area',
                'motorista'
            )
            ->assertJsonPath(
                'data.default_path',
                '/portal/motorista'
            )
            ->assertJsonPath(
                'data.links.motorista.has_role',
                true
            )
            ->assertJsonPath(
                'data.links.motorista.linked',
                true
            )
            ->assertJsonPath(
                'data.links.motorista.id',
                $motorista->id
            );
    }
);

test(
    'role motorista sem vínculo não libera portal do motorista',
    function () {
        $tenant =
            criarPortalTenant(
                'Empresa Motorista Sem Vínculo',
                'empresa-motorista-sem-vinculo'
            );

        $user =
            criarPortalUser(
                'motorista.sem.vinculo@frotapro.test'
            );

        associarPortalTenant(
            $user,
            $tenant
        );

        atribuirPortalRole(
            $user,
            $tenant,
            'motorista'
        );

        loginPortalIdentity(
            $this,
            $user
        );

        $this
            ->withHeaders(
                portalIdentityHeaders()
            )
            ->getJson(
                '/api/portal/identity'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.links.motorista.has_role',
                true
            )
            ->assertJsonPath(
                'data.links.motorista.linked',
                false
            )
            ->assertJsonPath(
                'data.default_area',
                null
            )
            ->assertJsonPath(
                'data.default_path',
                null
            )
            ->assertJsonCount(
                0,
                'data.areas'
            );
    }
);

test(
    'proprietário vinculado recebe portal do proprietário',
    function () {
        $tenant =
            criarPortalTenant(
                'Empresa Proprietário',
                'empresa-proprietario'
            );

        $user =
            criarPortalUser(
                'proprietario.portal@frotapro.test'
            );

        associarPortalTenant(
            $user,
            $tenant
        );

        atribuirPortalRole(
            $user,
            $tenant,
            'proprietario'
        );

        $proprietario =
            criarPortalProprietario(
                $tenant,
                $user,
                'Proprietário Portal'
            );

        loginPortalIdentity(
            $this,
            $user
        );

        $this
            ->withHeaders(
                portalIdentityHeaders()
            )
            ->getJson(
                '/api/portal/identity'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.default_area',
                'proprietario'
            )
            ->assertJsonPath(
                'data.default_path',
                '/portal/proprietario'
            )
            ->assertJsonPath(
                'data.links.proprietario.id',
                $proprietario->id
            );
    }
);

test(
    'multi role prioriza gestão e mantém portais disponíveis',
    function () {
        $tenant =
            criarPortalTenant(
                'Empresa Multi Role',
                'empresa-multi-role'
            );

        $user =
            criarPortalUser(
                'multi.role@frotapro.test'
            );

        associarPortalTenant(
            $user,
            $tenant
        );

        foreach (
            [
                'admin_empresa',
                'motorista',
                'proprietario',
            ] as $role
        ) {
            atribuirPortalRole(
                $user,
                $tenant,
                $role
            );
        }

        criarPortalMotorista(
            $tenant,
            $user,
            'Motorista Multi'
        );

        criarPortalProprietario(
            $tenant,
            $user,
            'Proprietário Multi'
        );

        loginPortalIdentity(
            $this,
            $user
        );

        $this
            ->withHeaders(
                portalIdentityHeaders()
            )
            ->getJson(
                '/api/portal/identity'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.default_area',
                'gestao'
            )
            ->assertJsonPath(
                'data.areas.0.code',
                'gestao'
            )
            ->assertJsonPath(
                'data.areas.1.code',
                'motorista'
            )
            ->assertJsonPath(
                'data.areas.2.code',
                'proprietario'
            );
    }
);

test(
    'funcionário com permissão recebe área de gestão',
    function () {
        $tenant =
            criarPortalTenant(
                'Empresa Funcionário',
                'empresa-funcionario'
            );

        $user =
            criarPortalUser(
                'funcionario.portal@frotapro.test'
            );

        associarPortalTenant(
            $user,
            $tenant
        );

        atribuirPortalRole(
            $user,
            $tenant,
            'funcionario'
        );

        $permission =
            Permission::query()
                ->where(
                    'codigo',
                    'dashboard'
                )
                ->firstOrFail();

        UserPermission::create([
            'user_id' => $user->id,

            'permission_id' => $permission->id,

            'tenant_id' => $tenant->id,

            'nivel' => 'visualizar',
        ]);

        loginPortalIdentity(
            $this,
            $user
        );

        $this
            ->withHeaders(
                portalIdentityHeaders()
            )
            ->getJson(
                '/api/portal/identity'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.default_area',
                'gestao'
            );
    }
);

test(
    'funcionário sem permissões não recebe automaticamente área de gestão',
    function () {
        $tenant =
            criarPortalTenant(
                'Empresa Funcionário Sem Permissão',
                'empresa-funcionario-sem-permissao'
            );

        $user =
            criarPortalUser(
                'funcionario.sem.permissao@frotapro.test'
            );

        associarPortalTenant(
            $user,
            $tenant
        );

        atribuirPortalRole(
            $user,
            $tenant,
            'funcionario'
        );

        loginPortalIdentity(
            $this,
            $user
        );

        $this
            ->withHeaders(
                portalIdentityHeaders()
            )
            ->getJson(
                '/api/portal/identity'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.default_area',
                null
            )
            ->assertJsonCount(
                0,
                'data.areas'
            );
    }
);

test(
    'identidade muda conforme o tenant selecionado',
    function () {
        $tenantMotorista =
            criarPortalTenant(
                'Tenant Motorista',
                'tenant-motorista'
            );

        $tenantProprietario =
            criarPortalTenant(
                'Tenant Proprietário',
                'tenant-proprietario'
            );

        $user =
            criarPortalUser(
                'multi.tenant.portal@frotapro.test'
            );

        associarPortalTenant(
            $user,
            $tenantMotorista,
            true
        );

        associarPortalTenant(
            $user,
            $tenantProprietario,
            false
        );

        atribuirPortalRole(
            $user,
            $tenantMotorista,
            'motorista'
        );

        atribuirPortalRole(
            $user,
            $tenantProprietario,
            'proprietario'
        );

        criarPortalMotorista(
            $tenantMotorista,
            $user,
            'Motorista Tenant A'
        );

        criarPortalProprietario(
            $tenantProprietario,
            $user,
            'Proprietário Tenant B'
        );

        loginPortalIdentity(
            $this,
            $user
        );

        $this
            ->withHeaders(
                portalIdentityHeaders()
            )
            ->getJson(
                '/api/portal/identity'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.default_area',
                'motorista'
            );

        $this
            ->withHeaders(
                portalIdentityHeaders()
            )
            ->postJson(
                '/api/tenant-context',
                [
                    'tenant_id' => $tenantProprietario
                        ->id,
                ]
            )
            ->assertOk();

        $this
            ->withHeaders(
                portalIdentityHeaders()
            )
            ->getJson(
                '/api/portal/identity'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.tenant_id',
                $tenantProprietario
                    ->id
            )
            ->assertJsonPath(
                'data.default_area',
                'proprietario'
            )
            ->assertJsonPath(
                'data.links.motorista.linked',
                false
            )
            ->assertJsonPath(
                'data.links.proprietario.linked',
                true
            );
    }
);

test(
    'super admin sem tenant mantém acesso à gestão',
    function () {
        $user =
            criarPortalUser(
                'super.portal@frotapro.test'
            );

        $role =
            Role::query()
                ->where(
                    'codigo',
                    'super_admin'
                )
                ->firstOrFail();

        UserRole::create([
            'user_id' => $user->id,

            'role_id' => $role->id,

            'tenant_id' => null,
        ]);

        loginPortalIdentity(
            $this,
            $user
        );

        $this
            ->withHeaders(
                portalIdentityHeaders()
            )
            ->getJson(
                '/api/portal/identity'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.tenant_id',
                null
            )
            ->assertJsonPath(
                'data.default_area',
                'gestao'
            )
            ->assertJsonPath(
                'data.default_path',
                '/painel'
            );
    }
);
