<?php

use App\Models\Empresa;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function empresaSpaHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function criarTenantEmpresa(string $nome, string $slug): Tenant
{
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function criarUsuarioEmpresa(
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
        'codigo' => 'empresas',
        'modulo' => 'empresas',
        'nome' => 'Empresas',
    ]);

    RolePermission::create([
        'role_id' => $role->id,
        'permission_id' => $permission->id,
        'nivel' => $nivel,
    ]);

    return $user;
}

function autenticarUsuarioEmpresa($test, User $user): void
{
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function criarEmpresaNoTenant(
    Tenant $tenant,
    string $nome,
    string $nif
): Empresa {
    $empresa = new Empresa([
        'nome_empresa' => $nome,
        'nif' => $nif,
    ]);

    $empresa->tenant_id = $tenant->id;
    $empresa->save();

    return $empresa;
}

test('rotas de empresas exigem autenticação', function () {
    $this->withHeaders(empresaSpaHeaders())
        ->getJson('/api/empresas')
        ->assertUnauthorized();
});

test('cliente não pode definir tenant id ao criar empresa', function () {
    $tenant = criarTenantEmpresa(
        'Empresa Tenant',
        'empresa-tenant-prohibited'
    );

    $user = criarUsuarioEmpresa(
        'empresa.prohibited@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioEmpresa($this, $user);

    $outroTenant = criarTenantEmpresa(
        'Outro Tenant',
        'outro-tenant-prohibited'
    );

    $this->withHeaders(empresaSpaHeaders())
        ->postJson('/api/empresas', [
            'tenant_id' => $outroTenant->id,
            'nome_empresa' => 'Empresa Maliciosa',
            'nif' => '500000001',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('tenant_id');

    $this->assertDatabaseMissing('empresas', [
        'nome_empresa' => 'Empresa Maliciosa',
    ]);
});

test('tenant da empresa é definido pelo contexto e defaults são aplicados', function () {
    $tenant = criarTenantEmpresa(
        'Tenant Contexto',
        'tenant-contexto-empresa'
    );

    $user = criarUsuarioEmpresa(
        'empresa.contexto@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioEmpresa($this, $user);

    $response = $this->withHeaders(empresaSpaHeaders())
        ->postJson('/api/empresas', [
            'nome_empresa' => 'Frota Lisboa Lda',
            'nif' => '500000002',
            'email' => 'geral@frotalisboa.pt',
            'capital_social' => 25000.50,
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.tenant_id', $tenant->id)
        ->assertJsonPath('data.nome_empresa', 'Frota Lisboa Lda')
        ->assertJsonPath('data.ativo', true)
        ->assertJsonPath('data.status_cadastro', 'pendente');

    $this->assertDatabaseHas('empresas', [
        'tenant_id' => $tenant->id,
        'nome_empresa' => 'Frota Lisboa Lda',
        'nif' => '500000002',
        'ativo' => true,
        'status_cadastro' => 'pendente',
    ]);
});

test('listagem retorna apenas empresas do tenant atual', function () {
    $tenantA = criarTenantEmpresa(
        'Tenant A',
        'tenant-a-listagem'
    );

    $tenantB = criarTenantEmpresa(
        'Tenant B',
        'tenant-b-listagem'
    );

    $user = criarUsuarioEmpresa(
        'empresa.listagem@frotapro.test',
        $tenantA,
        'visualizar'
    );

    criarEmpresaNoTenant(
        $tenantA,
        'Empresa Visível',
        '500000003'
    );

    criarEmpresaNoTenant(
        $tenantB,
        'Empresa Oculta',
        '500000004'
    );

    autenticarUsuarioEmpresa($this, $user);

    $response = $this->withHeaders(empresaSpaHeaders())
        ->getJson('/api/empresas')
        ->assertOk();

    $response
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.nome_empresa', 'Empresa Visível');

    $nomes = collect($response->json('data'))
        ->pluck('nome_empresa');

    expect($nomes)
        ->toContain('Empresa Visível')
        ->not->toContain('Empresa Oculta');
});

test('utilizador não consegue consultar empresa de outro tenant', function () {
    $tenantA = criarTenantEmpresa(
        'Tenant A',
        'tenant-a-show'
    );

    $tenantB = criarTenantEmpresa(
        'Tenant B',
        'tenant-b-show'
    );

    $user = criarUsuarioEmpresa(
        'empresa.show@frotapro.test',
        $tenantA,
        'visualizar'
    );

    $empresaB = criarEmpresaNoTenant(
        $tenantB,
        'Empresa Tenant B',
        '500000005'
    );

    autenticarUsuarioEmpresa($this, $user);

    $this->withHeaders(empresaSpaHeaders())
        ->getJson("/api/empresas/{$empresaB->id}")
        ->assertNotFound();
});

test('utilizador não consegue alterar nem apagar empresa de outro tenant', function () {
    $tenantA = criarTenantEmpresa(
        'Tenant A',
        'tenant-a-write'
    );

    $tenantB = criarTenantEmpresa(
        'Tenant B',
        'tenant-b-write'
    );

    $user = criarUsuarioEmpresa(
        'empresa.write@frotapro.test',
        $tenantA,
        'configurar'
    );

    $empresaB = criarEmpresaNoTenant(
        $tenantB,
        'Empresa Protegida',
        '500000006'
    );

    autenticarUsuarioEmpresa($this, $user);

    $this->withHeaders(empresaSpaHeaders())
        ->patchJson("/api/empresas/{$empresaB->id}", [
            'nome_empresa' => 'Empresa Invadida',
        ])
        ->assertNotFound();

    $this->assertDatabaseHas('empresas', [
        'id' => $empresaB->id,
        'nome_empresa' => 'Empresa Protegida',
    ]);

    $this->withHeaders(empresaSpaHeaders())
        ->deleteJson("/api/empresas/{$empresaB->id}")
        ->assertNotFound();

    $this->assertDatabaseHas('empresas', [
        'id' => $empresaB->id,
    ]);
});

test('nível visualizar permite leitura mas bloqueia criação', function () {
    $tenant = criarTenantEmpresa(
        'Tenant Visualizar',
        'tenant-visualizar'
    );

    $user = criarUsuarioEmpresa(
        'empresa.visualizar@frotapro.test',
        $tenant,
        'visualizar'
    );

    criarEmpresaNoTenant(
        $tenant,
        'Empresa Existente',
        '500000007'
    );

    autenticarUsuarioEmpresa($this, $user);

    $this->withHeaders(empresaSpaHeaders())
        ->getJson('/api/empresas')
        ->assertOk();

    $this->withHeaders(empresaSpaHeaders())
        ->postJson('/api/empresas', [
            'nome_empresa' => 'Empresa Não Permitida',
            'nif' => '500000008',
        ])
        ->assertForbidden()
        ->assertJsonPath(
            'message',
            'Sem permissão suficiente para este recurso.'
        );

    $this->assertDatabaseMissing('empresas', [
        'nome_empresa' => 'Empresa Não Permitida',
    ]);
});

test('nível configurar permite criar atualizar e apagar empresa do próprio tenant', function () {
    $tenant = criarTenantEmpresa(
        'Tenant Configurar',
        'tenant-configurar'
    );

    $user = criarUsuarioEmpresa(
        'empresa.configurar@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioEmpresa($this, $user);

    $createResponse = $this->withHeaders(empresaSpaHeaders())
        ->postJson('/api/empresas', [
            'nome_empresa' => 'Empresa CRUD',
            'nif' => '500000009',
            'email' => 'crud@empresa.pt',
        ])
        ->assertCreated();

    $empresaId = $createResponse->json('data.id');

    expect($empresaId)->not->toBeNull();

    $this->withHeaders(empresaSpaHeaders())
        ->patchJson("/api/empresas/{$empresaId}", [
            'nome_empresa' => 'Empresa CRUD Atualizada',
            'status_cadastro' => 'ativo',
        ])
        ->assertOk()
        ->assertJsonPath(
            'data.nome_empresa',
            'Empresa CRUD Atualizada'
        )
        ->assertJsonPath(
            'data.status_cadastro',
            'ativo'
        );

    $this->assertDatabaseHas('empresas', [
        'id' => $empresaId,
        'tenant_id' => $tenant->id,
        'nome_empresa' => 'Empresa CRUD Atualizada',
        'status_cadastro' => 'ativo',
    ]);

    $this->withHeaders(empresaSpaHeaders())
        ->deleteJson("/api/empresas/{$empresaId}")
        ->assertNoContent();

    $this->assertDatabaseMissing('empresas', [
        'id' => $empresaId,
    ]);
});
test(
    'tenant saas single company não pode criar segunda empresa',
    function () {
        $tenant =
            criarTenantEmpresa(
                'Tenant SaaS',
                'tenant-saas-single'
            );

        $tenant->settings = [
            'onboarding' => [
                'required' => false,
                'completed_at' => now()->toISOString(),
            ],
            'features' => [
                'multi_company' => false,
            ],
        ];

        $tenant->save();

        criarEmpresaNoTenant(
            $tenant,
            'Empresa Principal',
            '500100001'
        );

        $user =
            criarUsuarioEmpresa(
                'single.company@frotapro.test',
                $tenant,
                'configurar'
            );

        autenticarUsuarioEmpresa(
            $this,
            $user
        );

        $this
            ->withHeaders(
                empresaSpaHeaders()
            )
            ->postJson(
                '/api/empresas',
                [
                    'nome_empresa' => 'Segunda Empresa',

                    'nif' => '500100002',
                ]
            )
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'O plano atual permite apenas uma empresa.'
            );

        $this->assertDatabaseMissing(
            'empresas',
            [
                'tenant_id' => $tenant->id,

                'nome_empresa' => 'Segunda Empresa',
            ]
        );
    }
);

test(
    'tenant saas single company não pode eliminar empresa principal',
    function () {
        $tenant =
            criarTenantEmpresa(
                'Tenant SaaS Protegido',
                'tenant-saas-protegido'
            );

        $tenant->settings = [
            'onboarding' => [
                'required' => false,
            ],
            'features' => [
                'multi_company' => false,
            ],
        ];

        $tenant->save();

        $empresa =
            criarEmpresaNoTenant(
                $tenant,
                'Empresa Principal',
                '500100003'
            );

        $user =
            criarUsuarioEmpresa(
                'protected.company@frotapro.test',
                $tenant,
                'configurar'
            );

        autenticarUsuarioEmpresa(
            $this,
            $user
        );

        $this
            ->withHeaders(
                empresaSpaHeaders()
            )
            ->deleteJson(
                "/api/empresas/{$empresa->id}"
            )
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'A empresa principal não pode ser eliminada.'
            );

        $this->assertDatabaseHas(
            'empresas',
            [
                'id' => $empresa->id,
            ]
        );
    }
);

test(
    'tenant legado mantém suporte multiempresa',
    function () {
        $tenant =
            criarTenantEmpresa(
                'Tenant Legado',
                'tenant-legado-multi'
            );

        criarEmpresaNoTenant(
            $tenant,
            'Empresa Um',
            '500100004'
        );

        $user =
            criarUsuarioEmpresa(
                'legacy.multi@frotapro.test',
                $tenant,
                'configurar'
            );

        autenticarUsuarioEmpresa(
            $this,
            $user
        );

        $response =
            $this
                ->withHeaders(
                    empresaSpaHeaders()
                )
                ->postJson(
                    '/api/empresas',
                    [
                        'nome_empresa' => 'Empresa Dois',

                        'nif' => '500100005',
                    ]
                )
                ->assertCreated();

        $empresaId =
            $response->json(
                'data.id'
            );

        $this
            ->withHeaders(
                empresaSpaHeaders()
            )
            ->deleteJson(
                "/api/empresas/{$empresaId}"
            )
            ->assertNoContent();
    }
);
