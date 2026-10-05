<?php

use App\Models\AuditLog;
use App\Models\Empresa;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserPermission;
use App\Models\UserRole;
use Carbon\Carbon;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use LogicException;

uses(RefreshDatabase::class);

beforeEach(function(){
    Carbon::setTestNow(
        '2026-10-05 12:00:00'
    );

    $this->seed([
        RoleSeeder::class,
        PermissionSeeder::class,
    ]);
});

afterEach(function(){
    Carbon::setTestNow();
});

function audHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function audTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function audUser(
    Tenant $tenant,
    string $roleCode,
    string $email
): User {
    $user=
        User::factory()->create([
            'email'=>$email,
            'ativo'=>true,
        ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    $role=
        Role::query()
            ->where(
                'codigo',
                $roleCode
            )
            ->firstOrFail();

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>$tenant->id,
    ]);

    return $user;
}

function audGrant(
    User $user,
    Tenant $tenant
): void {
    $permission=
        Permission::query()
            ->where(
                'codigo',
                'auditoria'
            )
            ->firstOrFail();

    UserPermission::updateOrCreate(
        [
            'user_id'=>$user->id,
            'permission_id'=>$permission->id,
            'tenant_id'=>$tenant->id,
        ],
        [
            'nivel'=>'visualizar',
        ]
    );
}

function audActAs(
    $test,
    User $user,
    Tenant $tenant
): void {
    $test->flushSession();

    Auth::forgetGuards();

    $test->withHeaders(
        audHeaders()
    );

    $test->actingAs(
        $user,
        'web'
    );

    $test->withSession([
        'tenant_id'=>$tenant->id,
    ]);
}

function audEmpresa(
    Tenant $tenant,
    string $nome,
    string $nif
): Empresa {
    $empresa=
        new Empresa([
            'nome_empresa'=>$nome,
            'nif'=>$nif,
        ]);

    $empresa->tenant_id=
        $tenant->id;

    $empresa->save();

    return $empresa;
}

test('auditoria exige autenticacao',function(){
    $this
        ->withHeaders(
            audHeaders()
        )
        ->getJson(
            '/api/auditoria'
        )
        ->assertUnauthorized();
});

test('funcionario sem permissao nao consulta auditoria',function(){
    $tenant=
        audTenant(
            'Frota A',
            'frota-a-auditoria'
        );

    $user=
        audUser(
            $tenant,
            'funcionario',
            'auditoria.sem.permissao@example.test'
        );

    audActAs(
        $this,
        $user,
        $tenant
    );

    $this
        ->getJson(
            '/api/auditoria'
        )
        ->assertForbidden();
});

test('criacao de entidade gera registo automatico',function(){
    $tenant=
        audTenant(
            'Frota A',
            'frota-a-criacao'
        );

    $user=
        audUser(
            $tenant,
            'funcionario',
            'auditoria.criacao@example.test'
        );

    audGrant(
        $user,
        $tenant
    );

    audActAs(
        $this,
        $user,
        $tenant
    );

    $empresa=
        audEmpresa(
            $tenant,
            'Empresa Auditada',
            '500000001'
        );

    $this
        ->getJson(
            '/api/auditoria?module=empresas&action=created'
        )
        ->assertOk()
        ->assertJsonPath(
            'data.0.module',
            'empresas'
        )
        ->assertJsonPath(
            'data.0.action',
            'created'
        )
        ->assertJsonPath(
            'data.0.subject_id',
            $empresa->id
        )
        ->assertJsonPath(
            'data.0.subject_label',
            'Empresa Auditada'
        )
        ->assertJsonPath(
            'data.0.actor.id',
            $user->id
        )
        ->assertJsonPath(
            'kpis.created',
            1
        );
});

test('alteracao guarda valores anterior e novo',function(){
    $tenant=
        audTenant(
            'Frota Alteracao',
            'frota-alteracao'
        );

    $user=
        audUser(
            $tenant,
            'funcionario',
            'auditoria.alteracao@example.test'
        );

    audGrant(
        $user,
        $tenant
    );

    audActAs(
        $this,
        $user,
        $tenant
    );

    $empresa=
        audEmpresa(
            $tenant,
            'Nome Antigo',
            '500000002'
        );

    $empresa->nome_empresa=
        'Nome Novo';

    $empresa->save();

    $log=
        AuditLog::query()
            ->where(
                'tenant_id',
                $tenant->id
            )
            ->where(
                'module',
                'empresas'
            )
            ->where(
                'action',
                'updated'
            )
            ->where(
                'auditable_id',
                $empresa->id
            )
            ->latest(
                'created_at'
            )
            ->firstOrFail();

    $this
        ->getJson(
            "/api/auditoria/{$log->id}"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.old_values.nome_empresa',
            'Nome Antigo'
        )
        ->assertJsonPath(
            'data.new_values.nome_empresa',
            'Nome Novo'
        );
});

test('eliminacao gera historico',function(){
    $tenant=
        audTenant(
            'Frota Delete',
            'frota-delete'
        );

    $user=
        audUser(
            $tenant,
            'funcionario',
            'auditoria.delete@example.test'
        );

    audGrant(
        $user,
        $tenant
    );

    audActAs(
        $this,
        $user,
        $tenant
    );

    $empresa=
        audEmpresa(
            $tenant,
            'Empresa Eliminada',
            '500000003'
        );

    $id=
        $empresa->id;

    $empresa->delete();

    expect(
        AuditLog::query()
            ->where(
                'tenant_id',
                $tenant->id
            )
            ->where(
                'action',
                'deleted'
            )
            ->where(
                'auditable_id',
                $id
            )
            ->exists()
    )->toBeTrue();
});

test('auditoria respeita isolamento entre tenants',function(){
    $tenantA=
        audTenant(
            'Tenant A',
            'auditoria-tenant-a'
        );

    $tenantB=
        audTenant(
            'Tenant B',
            'auditoria-tenant-b'
        );

    $userA=
        audUser(
            $tenantA,
            'funcionario',
            'auditoria.a@example.test'
        );

    $userB=
        audUser(
            $tenantB,
            'funcionario',
            'auditoria.b@example.test'
        );

    audGrant(
        $userA,
        $tenantA
    );

    audGrant(
        $userB,
        $tenantB
    );

    audActAs(
        $this,
        $userA,
        $tenantA
    );

    audEmpresa(
        $tenantA,
        'Empresa Tenant A',
        '500000004'
    );

    audActAs(
        $this,
        $userB,
        $tenantB
    );

    audEmpresa(
        $tenantB,
        'Empresa Tenant B',
        '500000005'
    );

    audActAs(
        $this,
        $userA,
        $tenantA
    );

    $response=
        $this
            ->getJson(
                '/api/auditoria?module=empresas'
            )
            ->assertOk()
            ->json(
                'data'
            );

    expect(
        collect(
            $response
        )
            ->pluck(
                'subject_label'
            )
            ->all()
    )
        ->toContain(
            'Empresa Tenant A'
        )
        ->not
        ->toContain(
            'Empresa Tenant B'
        );
});

test('auditoria permite filtrar por pesquisa modulo e acao',function(){
    $tenant=
        audTenant(
            'Frota Filtros',
            'frota-filtros'
        );

    $user=
        audUser(
            $tenant,
            'funcionario',
            'auditoria.filtros@example.test'
        );

    audGrant(
        $user,
        $tenant
    );

    audActAs(
        $this,
        $user,
        $tenant
    );

    audEmpresa(
        $tenant,
        'Empresa Encontravel',
        '500000006'
    );

    audEmpresa(
        $tenant,
        'Outra Empresa',
        '500000007'
    );

    $this
        ->getJson(
            '/api/auditoria?module=empresas&action=created&search=Encontravel'
        )
        ->assertOk()
        ->assertJsonCount(
            1,
            'data'
        )
        ->assertJsonPath(
            'data.0.subject_label',
            'Empresa Encontravel'
        );
});

test('registos de auditoria sao imutaveis',function(){
    $tenant=
        audTenant(
            'Frota Imutavel',
            'frota-imutavel'
        );

    $user=
        audUser(
            $tenant,
            'funcionario',
            'auditoria.imutavel@example.test'
        );

    audGrant(
        $user,
        $tenant
    );

    audActAs(
        $this,
        $user,
        $tenant
    );

    audEmpresa(
        $tenant,
        'Empresa Imutavel',
        '500000008'
    );

    $log=
        AuditLog::query()
            ->where(
                'tenant_id',
                $tenant->id
            )
            ->where(
                'module',
                'empresas'
            )
            ->firstOrFail();

    expect(
        fn()=>
            $log->update([
                'description'=>
                    'Alteração indevida',
            ])
    )->toThrow(
        LogicException::class
    );

    expect(
        fn()=>
            $log->delete()
    )->toThrow(
        LogicException::class
    );
});

test('api de auditoria nao possui operacoes de escrita',function(){
    $tenant=
        audTenant(
            'Frota Read Only',
            'frota-read-only'
        );

    $user=
        audUser(
            $tenant,
            'funcionario',
            'auditoria.readonly@example.test'
        );

    audGrant(
        $user,
        $tenant
    );

    audActAs(
        $this,
        $user,
        $tenant
    );

    $this
        ->postJson(
            '/api/auditoria',
            []
        )
        ->assertStatus(
            405
        );
});
