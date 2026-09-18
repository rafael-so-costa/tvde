<?php

use App\Models\Contrato;
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
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function templateContratoHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function templateContratoTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function templateContratoUsuario(
    Tenant $tenant,
    string $email,
    string $nivel = 'configurar'
): User {
    $user = User::factory()->create([
        'email' => $email,
        'password' => Hash::make(
            'SenhaTeste123!'
        ),
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $role = Role::firstOrCreate(
        [
            'codigo' => 'funcionario',
        ],
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
        [
            'codigo' => 'templates',
        ],
        [
            'modulo' => 'templates',
            'nome' => 'Templates',
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

function templateContratoLogin(
    $test,
    User $user
): void {
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function templateContratoPerfil(
    Tenant $tenant,
    string $nome,
    int $ordem = 0,
    ?string $descricao = null
): PerfilTemplate {
    $perfil = new PerfilTemplate([
        'nome' => $nome,
        'descricao' => $descricao,
        'ordem' => $ordem,
    ]);

    $perfil->tenant_id = $tenant->id;
    $perfil->save();

    return $perfil;
}

function templateContratoTemplate(
    Tenant $tenant,
    string $nome,
    ?PerfilTemplate $perfil = null
): TemplateContrato {
    $template = new TemplateContrato([
        'nome' => $nome,
        'perfil_id' => $perfil?->id,
        'tipo_arquivo' => 'txt',
        'conteudo_original' => '{{NOME_MOTORISTA}}',
        'campos_detectados' => [
            [
                'id' => Str::uuid()->toString(),
                'name' => 'NOME_MOTORISTA',
                'label' => 'Nome Motorista',
                'type' => 'text',
                'required' => true,
            ],
        ],
        'campos_mapeados' => [],
    ]);

    $template->tenant_id = $tenant->id;
    $template->save();

    return $template;
}

test('rotas de perfis e templates exigem autenticação', function () {
    $this->withHeaders(
        templateContratoHeaders()
    )
        ->getJson('/api/perfis-template')
        ->assertUnauthorized();

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->getJson('/api/templates-contrato')
        ->assertUnauthorized();
});

test('perfil é criado no tenant atual com nome normalizado', function () {
    $tenant = templateContratoTenant(
        'Tenant Perfil',
        'tenant-perfil'
    );

    $user = templateContratoUsuario(
        $tenant,
        'perfil@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $response = $this->withHeaders(
        templateContratoHeaders()
    )
        ->postJson(
            '/api/perfis-template',
            [
                'nome' =>
                '  ALUGUER DE VEÍCULOS  ',
                'descricao' =>
                'Contratos de aluguer',
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.nome',
            'ALUGUER DE VEÍCULOS'
        )
        ->assertJsonPath(
            'data.tenant_id',
            $tenant->id
        )
        ->assertJsonPath(
            'data.ordem',
            0
        );

    $this->assertDatabaseHas(
        'perfis_template',
        [
            'id' => $response->json(
                'data.id'
            ),
            'tenant_id' => $tenant->id,
            'nome' =>
            'ALUGUER DE VEÍCULOS',
            'ordem' => 0,
        ]
    );
});

test('cliente não pode controlar tenant nem ordem do perfil', function () {
    $tenant = templateContratoTenant(
        'Tenant Segurança Perfil',
        'tenant-seguranca-perfil'
    );

    $user = templateContratoUsuario(
        $tenant,
        'seguranca.perfil@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->postJson(
            '/api/perfis-template',
            [
                'nome' => 'Perfil',
                'tenant_id' =>
                Str::uuid()->toString(),
                'ordem' => 99,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'tenant_id',
            'ordem',
        ]);

    expect(
        PerfilTemplate::count()
    )->toBe(0);
});

test('nome do perfil é único dentro do tenant mas pode repetir noutro tenant', function () {
    $tenantA = templateContratoTenant(
        'Tenant Perfil A',
        'tenant-perfil-a'
    );

    $tenantB = templateContratoTenant(
        'Tenant Perfil B',
        'tenant-perfil-b'
    );

    templateContratoPerfil(
        $tenantA,
        'ALUGUER'
    );

    templateContratoPerfil(
        $tenantB,
        'ALUGUER'
    );

    $user = templateContratoUsuario(
        $tenantA,
        'perfil.unico@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->postJson(
            '/api/perfis-template',
            [
                'nome' => 'ALUGUER',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'nome'
        );

    expect(
        PerfilTemplate::query()
            ->where(
                'nome',
                'ALUGUER'
            )
            ->count()
    )->toBe(2);
});

test('perfis são listados por ordem e depois nome apenas no tenant atual', function () {
    $tenantA = templateContratoTenant(
        'Tenant Ordenação A',
        'tenant-ordenacao-a'
    );

    $tenantB = templateContratoTenant(
        'Tenant Ordenação B',
        'tenant-ordenacao-b'
    );

    $perfilZulu = templateContratoPerfil(
        $tenantA,
        'Zulu',
        10
    );

    $perfilAlpha = templateContratoPerfil(
        $tenantA,
        'Alpha',
        10
    );

    $perfilFinal = templateContratoPerfil(
        $tenantA,
        'Final',
        20
    );

    templateContratoPerfil(
        $tenantB,
        'Outro Tenant',
        0
    );

    templateContratoTemplate(
        $tenantA,
        'Template Alpha',
        $perfilAlpha
    );

    $user = templateContratoUsuario(
        $tenantA,
        'ordenacao@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $response = $this->withHeaders(
        templateContratoHeaders()
    )
        ->getJson(
            '/api/perfis-template'
        )
        ->assertOk();

    expect(
        $response->json('data')
    )->toHaveCount(3);

    expect(
        $response->json('data.0.id')
    )->toBe($perfilAlpha->id);

    expect(
        $response->json('data.1.id')
    )->toBe($perfilZulu->id);

    expect(
        $response->json('data.2.id')
    )->toBe($perfilFinal->id);

    expect(
        $response->json(
            'data.0.templates_count'
        )
    )->toBe(1);
});

test('perfil pode ser atualizado sem colidir com o próprio nome', function () {
    $tenant = templateContratoTenant(
        'Tenant Atualização Perfil',
        'tenant-atualizacao-perfil'
    );

    $perfil = templateContratoPerfil(
        $tenant,
        'Perfil Atual'
    );

    $user = templateContratoUsuario(
        $tenant,
        'atualiza.perfil@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->patchJson(
            "/api/perfis-template/{$perfil->id}",
            [
                'nome' => ' Perfil Atual ',
                'descricao' =>
                'Descrição alterada',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.nome',
            'Perfil Atual'
        )
        ->assertJsonPath(
            'data.descricao',
            'Descrição alterada'
        );
});

test('perfil com templates não pode ser eliminado', function () {
    $tenant = templateContratoTenant(
        'Tenant Exclusão Perfil',
        'tenant-exclusao-perfil'
    );

    $perfil = templateContratoPerfil(
        $tenant,
        'Perfil Com Template'
    );

    templateContratoTemplate(
        $tenant,
        'Template Vinculado',
        $perfil
    );

    $user = templateContratoUsuario(
        $tenant,
        'exclusao.perfil@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->deleteJson(
            "/api/perfis-template/{$perfil->id}"
        )
        ->assertUnprocessable();

    $this->assertDatabaseHas(
        'perfis_template',
        [
            'id' => $perfil->id,
        ]
    );
});

test('template é criado com campos detectados e perfil do próprio tenant', function () {
    $tenant = templateContratoTenant(
        'Tenant Template',
        'tenant-template'
    );

    $perfil = templateContratoPerfil(
        $tenant,
        'PRESTAÇÃO DE SERVIÇO'
    );

    $user = templateContratoUsuario(
        $tenant,
        'template@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $fieldId = Str::uuid()->toString();

    $response = $this->withHeaders(
        templateContratoHeaders()
    )
        ->postJson(
            '/api/templates-contrato',
            [
                'perfil_id' => $perfil->id,
                'nome' =>
                '  Contrato Principal  ',
                'tipo_arquivo' => 'pdf',
                'conteudo_original' =>
                '{{NOME_MOTORISTA}}',
                'campos_detectados' => [
                    [
                        'id' => $fieldId,
                        'name' =>
                        'NOME_MOTORISTA',
                        'label' =>
                        'Nome Motorista',
                        'type' => 'text',
                        'required' => true,
                    ],
                ],
                'campos_mapeados' => [
                    'NOME_MOTORISTA' =>
                    'motorista.nome_completo',
                ],
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.nome',
            'Contrato Principal'
        )
        ->assertJsonPath(
            'data.tenant_id',
            $tenant->id
        )
        ->assertJsonPath(
            'data.perfil_id',
            $perfil->id
        )
        ->assertJsonPath(
            'data.campos_detectados.0.name',
            'NOME_MOTORISTA'
        );

    $this->assertDatabaseHas(
        'templates_contrato',
        [
            'id' => $response->json(
                'data.id'
            ),
            'tenant_id' => $tenant->id,
            'perfil_id' => $perfil->id,
            'nome' =>
            'Contrato Principal',
            'tipo_arquivo' => 'pdf',
        ]
    );
});

test('template sem tipo de arquivo usa pdf por padrão', function () {
    $tenant = templateContratoTenant(
        'Tenant Default Template',
        'tenant-default-template'
    );

    $user = templateContratoUsuario(
        $tenant,
        'default.template@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->postJson(
            '/api/templates-contrato',
            [
                'nome' =>
                'Template PDF Default',
                'conteudo_original' =>
                '{{NIF}}',
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.tipo_arquivo',
            'pdf'
        )
        ->assertJsonPath(
            'data.perfil_id',
            null
        );
});

test('template não aceita perfil de outro tenant nem tenant informado pelo cliente', function () {
    $tenantA = templateContratoTenant(
        'Tenant Template A',
        'tenant-template-a'
    );

    $tenantB = templateContratoTenant(
        'Tenant Template B',
        'tenant-template-b'
    );

    $perfilB = templateContratoPerfil(
        $tenantB,
        'Perfil B'
    );

    $user = templateContratoUsuario(
        $tenantA,
        'tenant.template@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->postJson(
            '/api/templates-contrato',
            [
                'nome' => 'Template Inválido',
                'perfil_id' => $perfilB->id,
                'tenant_id' => $tenantB->id,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'perfil_id',
            'tenant_id',
        ]);

    expect(
        TemplateContrato::count()
    )->toBe(0);
});

test('estrutura de campos detectados é validada', function () {
    $tenant = templateContratoTenant(
        'Tenant Campos',
        'tenant-campos'
    );

    $user = templateContratoUsuario(
        $tenant,
        'campos.template@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->postJson(
            '/api/templates-contrato',
            [
                'nome' => 'Template Campos',
                'campos_detectados' => [
                    [
                        'id' =>
                        Str::uuid()->toString(),
                        'name' => 'CAMPO',
                        'label' => 'Campo',
                        'type' => 'inexistente',
                        'required' => true,
                    ],
                ],
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'campos_detectados.0.type'
        );

    expect(
        TemplateContrato::count()
    )->toBe(0);
});

test('listagem de templates respeita tenant e filtro por perfil', function () {
    $tenantA = templateContratoTenant(
        'Tenant Lista A',
        'tenant-lista-template-a'
    );

    $tenantB = templateContratoTenant(
        'Tenant Lista B',
        'tenant-lista-template-b'
    );

    $perfilA1 = templateContratoPerfil(
        $tenantA,
        'Perfil A1'
    );

    $perfilA2 = templateContratoPerfil(
        $tenantA,
        'Perfil A2'
    );

    $templateA1 = templateContratoTemplate(
        $tenantA,
        'Template A1',
        $perfilA1
    );

    templateContratoTemplate(
        $tenantA,
        'Template A2',
        $perfilA2
    );

    templateContratoTemplate(
        $tenantB,
        'Template B'
    );

    $user = templateContratoUsuario(
        $tenantA,
        'lista.template@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->getJson(
            '/api/templates-contrato'
        )
        ->assertOk()
        ->assertJsonCount(
            2,
            'data'
        );

    $response = $this->withHeaders(
        templateContratoHeaders()
    )
        ->getJson(
            '/api/templates-contrato?' .
                http_build_query([
                    'perfil_id' =>
                    $perfilA1->id,
                ])
        )
        ->assertOk()
        ->assertJsonCount(
            1,
            'data'
        );

    expect(
        $response->json('data.0.id')
    )->toBe($templateA1->id);
});

test('template pode ser movido entre perfis e ficar sem categoria', function () {
    $tenant = templateContratoTenant(
        'Tenant Movimento Template',
        'tenant-movimento-template'
    );

    $perfilA = templateContratoPerfil(
        $tenant,
        'Perfil Origem'
    );

    $perfilB = templateContratoPerfil(
        $tenant,
        'Perfil Destino'
    );

    $template = templateContratoTemplate(
        $tenant,
        'Template Móvel',
        $perfilA
    );

    $user = templateContratoUsuario(
        $tenant,
        'movimento.template@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->patchJson(
            "/api/templates-contrato/{$template->id}",
            [
                'perfil_id' => $perfilB->id,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.perfil_id',
            $perfilB->id
        );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->patchJson(
            "/api/templates-contrato/{$template->id}",
            [
                'perfil_id' => null,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.perfil_id',
            null
        );

    $template->refresh();

    expect(
        $template->perfil_id
    )->toBeNull();
});

test('recursos de outro tenant não podem ser alterados ou eliminados', function () {
    $tenantA = templateContratoTenant(
        'Tenant Isolamento Template A',
        'tenant-isolamento-template-a'
    );

    $tenantB = templateContratoTenant(
        'Tenant Isolamento Template B',
        'tenant-isolamento-template-b'
    );

    $perfilB = templateContratoPerfil(
        $tenantB,
        'Perfil Tenant B'
    );

    $templateB = templateContratoTemplate(
        $tenantB,
        'Template Tenant B',
        $perfilB
    );

    $user = templateContratoUsuario(
        $tenantA,
        'isolamento.template@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->patchJson(
            "/api/perfis-template/{$perfilB->id}",
            [
                'nome' => 'Tentativa',
            ]
        )
        ->assertNotFound();

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->deleteJson(
            "/api/perfis-template/{$perfilB->id}"
        )
        ->assertNotFound();

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->getJson(
            "/api/templates-contrato/{$templateB->id}"
        )
        ->assertNotFound();

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->patchJson(
            "/api/templates-contrato/{$templateB->id}",
            [
                'nome' => 'Tentativa',
            ]
        )
        ->assertNotFound();

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->deleteJson(
            "/api/templates-contrato/{$templateB->id}"
        )
        ->assertNotFound();
});

test('eliminar template preserva contrato e remove referência ao template', function () {
    $tenant = templateContratoTenant(
        'Tenant FK Template',
        'tenant-fk-template'
    );

    $template = templateContratoTemplate(
        $tenant,
        'Template Referenciado'
    );

    $contrato = new Contrato([
        'tipo' => 'aluguer',
        'template_id' => $template->id,
    ]);

    $contrato->tenant_id = $tenant->id;
    $contrato->save();

    $user = templateContratoUsuario(
        $tenant,
        'fk.template@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->deleteJson(
            "/api/templates-contrato/{$template->id}"
        )
        ->assertNoContent();

    $this->assertDatabaseMissing(
        'templates_contrato',
        [
            'id' => $template->id,
        ]
    );

    $this->assertDatabaseHas(
        'contratos',
        [
            'id' => $contrato->id,
            'template_id' => null,
        ]
    );
});

test('perfil vazio pode ser eliminado', function () {
    $tenant = templateContratoTenant(
        'Tenant Perfil Vazio',
        'tenant-perfil-vazio'
    );

    $perfil = templateContratoPerfil(
        $tenant,
        'Perfil Vazio'
    );

    $user = templateContratoUsuario(
        $tenant,
        'perfil.vazio@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->deleteJson(
            "/api/perfis-template/{$perfil->id}"
        )
        ->assertNoContent();

    $this->assertDatabaseMissing(
        'perfis_template',
        [
            'id' => $perfil->id,
        ]
    );
});

test('permissão visualizar permite leitura mas bloqueia escrita', function () {
    $tenant = templateContratoTenant(
        'Tenant Permissão Template',
        'tenant-permissao-template'
    );

    $perfil = templateContratoPerfil(
        $tenant,
        'Perfil Leitura'
    );

    $template = templateContratoTemplate(
        $tenant,
        'Template Leitura',
        $perfil
    );

    $user = templateContratoUsuario(
        $tenant,
        'visualizar.template@frotapro.test',
        'visualizar'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->getJson('/api/perfis-template')
        ->assertOk();

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->getJson('/api/templates-contrato')
        ->assertOk();

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->getJson(
            "/api/templates-contrato/{$template->id}"
        )
        ->assertOk();

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->postJson(
            '/api/perfis-template',
            [
                'nome' => 'Bloqueado',
            ]
        )
        ->assertForbidden();

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->postJson(
            '/api/templates-contrato',
            [
                'nome' => 'Bloqueado',
            ]
        )
        ->assertForbidden();

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->patchJson(
            "/api/templates-contrato/{$template->id}",
            [
                'nome' => 'Bloqueado',
            ]
        )
        ->assertForbidden();

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->deleteJson(
            "/api/templates-contrato/{$template->id}"
        )
        ->assertForbidden();
});


test('crud genérico não permite controlar caminho do arquivo do template', function () {
    $tenant = templateContratoTenant(
        'Tenant Caminho Protegido',
        'tenant-caminho-protegido'
    );

    $template = templateContratoTemplate(
        $tenant,
        'Template Protegido'
    );

    $user = templateContratoUsuario(
        $tenant,
        'caminho.template@frotapro.test'
    );

    templateContratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->postJson(
            '/api/templates-contrato',
            [
                'nome' =>
                    'Template Forjado',
                'arquivo_url' =>
                    'contract-templates/outro-tenant/forjado.pdf',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'arquivo_url'
        );

    $this->withHeaders(
        templateContratoHeaders()
    )
        ->patchJson(
            "/api/templates-contrato/{$template->id}",
            [
                'arquivo_url' =>
                    'contract-templates/outro-tenant/forjado.pdf',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'arquivo_url'
        );

    $template->refresh();

    expect(
        $template->arquivo_url
    )->toBeNull();
});
