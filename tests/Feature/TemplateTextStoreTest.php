<?php

use App\Models\PerfilTemplate;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\TemplateContrato;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function templateTextStoreHeaders(): array
{
    return [
        'Origin' =>
        'http://localhost:8000',

        'Referer' =>
        'http://localhost:8000/',

        'Accept' =>
        'application/json',
    ];
}

function templateTextStoreTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function templateTextStoreUser(
    Tenant $tenant,
    string $nivel =
    'configurar'
): User {
    $user = User::factory()
        ->create([
            'email' =>
            uniqid(
                'template.store.',
                true
            ) .
                '@frotapro.test',

            'password' =>
            Hash::make(
                'SenhaTeste123!'
            ),

            'ativo' =>
            true,
        ]);

    TenantUser::create([
        'tenant_id' =>
        $tenant->id,

        'user_id' =>
        $user->id,

        'status' =>
        'ativo',

        'principal' =>
        true,
    ]);

    $role =
        Role::firstOrCreate(
            [
                'codigo' =>
                'funcionario',
            ],
            [
                'nome' =>
                'Funcionário',

                'sistema' =>
                true,
            ]
        );

    UserRole::create([
        'user_id' =>
        $user->id,

        'role_id' =>
        $role->id,

        'tenant_id' =>
        $tenant->id,
    ]);

    $permission =
        Permission::firstOrCreate(
            [
                'codigo' =>
                'templates',
            ],
            [
                'modulo' =>
                'templates',

                'nome' =>
                'Templates',
            ]
        );

    RolePermission::updateOrCreate(
        [
            'role_id' =>
            $role->id,

            'permission_id' =>
            $permission->id,
        ],
        [
            'nivel' =>
            $nivel,
        ]
    );

    return $user;
}

function templateTextStoreLogin(
    $test,
    User $user
): void {
    $test->postJson(
        '/login',
        [
            'email' =>
            $user->email,

            'password' =>
            'SenhaTeste123!',
        ]
    )->assertOk();
}

test('guardar modelo de texto exige autenticação', function () {
    $this
        ->withHeaders(
            templateTextStoreHeaders()
        )
        ->postJson(
            '/api/templates-contrato/texto',
            [
                'nome' =>
                'Contrato',

                'conteudo' =>
                'Contrato de {{NOME_DO_MOTORISTA}} para utilização do veículo.',
            ]
        )
        ->assertUnauthorized();
});

test('modelo analisado é guardado com conteúdo parametrizado e sem arquivo', function () {
    $tenant =
        templateTextStoreTenant(
            'Tenant Texto',
            'tenant-texto'
        );

    $user =
        templateTextStoreUser(
            $tenant
        );

    templateTextStoreLogin(
        $this,
        $user
    );

    $response = $this
        ->withHeaders(
            templateTextStoreHeaders()
        )
        ->postJson(
            '/api/templates-contrato/texto',
            [
                'nome' =>
                ' Contrato de Aluguer ',

                'conteudo' =>
                'Contrato celebrado com {{NOME_DO_MOTORISTA}}, NIF {{NIF_DO_MOTORISTA}}, para o veículo {{MATRICULA_DO_VEICULO}}.',
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.nome',
            'Contrato de Aluguer'
        )
        ->assertJsonPath(
            'data.tipo_arquivo',
            'txt'
        )
        ->assertJsonPath(
            'data.arquivo_url',
            null
        );

    $template =
        TemplateContrato::findOrFail(
            $response->json(
                'data.id'
            )
        );

    expect(
        $template->tenant_id
    )->toBe(
        $tenant->id
    );

    expect(
        $template->conteudo_original
    )
        ->toContain(
            '{{MOTORISTA_NOME_COMPLETO}}'
        )
        ->toContain(
            '{{MOTORISTA_NIF}}'
        )
        ->toContain(
            '{{VEICULO_MATRICULA}}'
        );

    expect(
        collect(
            $template->campos_detectados
        )
            ->pluck(
                'name'
            )
            ->all()
    )->toContain(
        'MOTORISTA_NOME_COMPLETO',
        'MOTORISTA_NIF',
        'VEICULO_MATRICULA'
    );
});

test('guardar modelo permite rever mapeamento de campo detectado', function () {
    $tenant =
        templateTextStoreTenant(
            'Tenant Revisão',
            'tenant-revisao'
        );

    $user =
        templateTextStoreUser(
            $tenant
        );

    templateTextStoreLogin(
        $this,
        $user
    );

    $response = $this
        ->withHeaders(
            templateTextStoreHeaders()
        )
        ->postJson(
            '/api/templates-contrato/texto',
            [
                'nome' =>
                'Prestação',

                'conteudo' =>
                'O contrato começa em {{DATA_INICIO_CONTRATO}}.',

                'campos_mapeados' => [
                    'DATA_INICIO' => [
                        'tipo' =>
                        'automatico',

                        'origem' =>
                        'contrato',

                        'campo' =>
                        'contrato.data_assinatura',
                    ],
                ],
            ]
        )
        ->assertCreated();

    expect(
        $response->json(
            'data.campos_mapeados.DATA_INICIO.tipo'
        )
    )->toBe(
        'automatico'
    );

    expect(
        $response->json(
            'data.campos_mapeados.DATA_INICIO.origem'
        )
    )->toBe(
        'contrato'
    );

    expect(
        $response->json(
            'data.campos_mapeados.DATA_INICIO.campo'
        )
    )->toBe(
        'contrato.data_assinatura'
    );
});

test('guardar modelo rejeita mapeamento de campo não detectado', function () {
    $tenant =
        templateTextStoreTenant(
            'Tenant Campo Forjado',
            'tenant-campo-forjado'
        );

    $user =
        templateTextStoreUser(
            $tenant
        );

    templateTextStoreLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            templateTextStoreHeaders()
        )
        ->postJson(
            '/api/templates-contrato/texto',
            [
                'nome' =>
                'Template',

                'conteudo' =>
                'Contrato para {{NOME_DO_MOTORISTA}}.',

                'campos_mapeados' => [
                    'CAMPO_FORJADO' => [
                        'tipo' =>
                        'automatico',

                        'origem' =>
                        'motorista',

                        'campo' =>
                        'motorista.nome_completo',
                    ],
                ],
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'campos_mapeados.CAMPO_FORJADO'
        );

    expect(
        TemplateContrato::count()
    )->toBe(0);
});

test('guardar modelo aceita perfil apenas do tenant atual', function () {
    $tenantA =
        templateTextStoreTenant(
            'Tenant A',
            'tenant-text-store-a'
        );

    $tenantB =
        templateTextStoreTenant(
            'Tenant B',
            'tenant-text-store-b'
        );

    $perfilB =
        new PerfilTemplate([
            'nome' =>
            'Perfil B',

            'ordem' =>
            0,
        ]);

    $perfilB->tenant_id =
        $tenantB->id;

    $perfilB->save();

    $user =
        templateTextStoreUser(
            $tenantA
        );

    templateTextStoreLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            templateTextStoreHeaders()
        )
        ->postJson(
            '/api/templates-contrato/texto',
            [
                'nome' =>
                'Template inválido',

                'perfil_id' =>
                $perfilB->id,

                'conteudo' =>
                'Contrato para {{NOME_DO_MOTORISTA}}.',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'perfil_id'
        );

    expect(
        TemplateContrato::count()
    )->toBe(0);
});

test('guardar modelo preserva perfil válido do próprio tenant', function () {
    $tenant =
        templateTextStoreTenant(
            'Tenant Perfil',
            'tenant-text-store-perfil'
        );

    $perfil =
        new PerfilTemplate([
            'nome' =>
            'Contratos',

            'ordem' =>
            0,
        ]);

    $perfil->tenant_id =
        $tenant->id;

    $perfil->save();

    $user =
        templateTextStoreUser(
            $tenant
        );

    templateTextStoreLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            templateTextStoreHeaders()
        )
        ->postJson(
            '/api/templates-contrato/texto',
            [
                'nome' =>
                'Contrato com perfil',

                'perfil_id' =>
                $perfil->id,

                'conteudo' =>
                'Contrato para {{NOME_DO_MOTORISTA}}.',
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.perfil_id',
            $perfil->id
        )
        ->assertJsonPath(
            'data.perfil.nome',
            'Contratos'
        );
});

test('cliente não pode controlar tenant arquivo nem tipo do modelo de texto', function () {
    $tenant =
        templateTextStoreTenant(
            'Tenant Segurança',
            'tenant-text-store-seguranca'
        );

    $user =
        templateTextStoreUser(
            $tenant
        );

    templateTextStoreLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            templateTextStoreHeaders()
        )
        ->postJson(
            '/api/templates-contrato/texto',
            [
                'nome' =>
                'Template forjado',

                'conteudo' =>
                'Contrato para {{NOME_DO_MOTORISTA}}.',

                'tenant_id' =>
                $tenant->id,

                'arquivo_url' =>
                'qualquer/coisa.pdf',

                'tipo_arquivo' =>
                'pdf',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'tenant_id',
            'arquivo_url',
            'tipo_arquivo',
        ]);

    expect(
        TemplateContrato::count()
    )->toBe(0);
});

test('utilizador apenas visualizar não pode guardar modelo de texto', function () {
    $tenant =
        templateTextStoreTenant(
            'Tenant Leitura',
            'tenant-text-store-leitura'
        );

    $user =
        templateTextStoreUser(
            $tenant,
            'visualizar'
        );

    templateTextStoreLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            templateTextStoreHeaders()
        )
        ->postJson(
            '/api/templates-contrato/texto',
            [
                'nome' =>
                'Bloqueado',

                'conteudo' =>
                'Contrato para {{NOME_DO_MOTORISTA}}.',
            ]
        )
        ->assertForbidden();

    expect(
        TemplateContrato::count()
    )->toBe(0);
});


test('guardar modelo rejeita campo de origem fora do catálogo', function () {
    $tenant =
        templateTextStoreTenant(
            'Tenant Origem Forjada',
            'tenant-origem-forjada'
        );

    $user =
        templateTextStoreUser(
            $tenant
        );

    templateTextStoreLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            templateTextStoreHeaders()
        )
        ->postJson(
            '/api/templates-contrato/texto',
            [
                'nome' =>
                'Template',

                'conteudo' =>
                'Contrato para {{NOME_DO_MOTORISTA}}.',

                'campos_mapeados' => [
                    'MOTORISTA_NOME_COMPLETO' => [
                        'tipo' =>
                        'automatico',

                        'origem' =>
                        'motorista',

                        'campo' =>
                        'motorista.password',
                    ],
                ],
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'campos_mapeados.MOTORISTA_NOME_COMPLETO.campo'
        );

    expect(
        TemplateContrato::count()
    )->toBe(0);
});
