<?php

use App\Models\ModeloDocumentoSaas;
use App\Models\ModeloDocumentoSaasCategoria;
use App\Models\ModeloDocumentoSaasVersao;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\TemplateContrato;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\TipoContrato;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function modeloDocumentoSaasHeaders(): array
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

function modeloDocumentoSaasAdmin(): User
{
    $user =
        User::factory()
            ->create([
                'email' =>
                    uniqid(
                        'modelo.saas.admin.',
                        true
                    ) .
                    '@frotapro.test',

                'ativo' =>
                    true,
            ]);

    $role =
        Role::firstOrCreate(
            [
                'codigo' =>
                    'super_admin',
            ],
            [
                'nome' =>
                    'Super Administrador',

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
            null,
    ]);

    return $user;
}

function modeloDocumentoSaasTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' =>
            $nome,

        'slug' =>
            $slug,

        'ativo' =>
            true,
    ]);
}

function modeloDocumentoSaasTenantUser(
    Tenant $tenant,
    string $nivel = 'configurar'
): User {
    $user =
        User::factory()
            ->create([
                'email' =>
                    uniqid(
                        'modelo.saas.tenant.',
                        true
                    ) .
                    '@frotapro.test',

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

                'descricao' =>
                    'Acesso ao módulo Templates',
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

function modeloDocumentoSaasConteudo(): string
{
    return <<<'TXT'
CONTRATO DE ALUGUER DE VEÍCULO

Entre {{PROPRIETARIO_NOME_COMPLETO}}, NIF {{PROPRIETARIO_NIF}}, na qualidade de proprietário,

e {{MOTORISTA_NOME_COMPLETO}}, NIF {{MOTORISTA_NIF}}, na qualidade de motorista,

é celebrado o presente contrato relativo ao veículo de matrícula {{VEICULO_MATRICULA}}.

{{ASSINATURA_PROPRIETARIO}}

{{ASSINATURA_MOTORISTA}}
TXT;
}

function modeloDocumentoSaasCriarCategoria(
    $test
): string {
    $response =
        $test
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->postJson(
                '/api/backoffice/modelos-documento/categorias',
                [
                    'nome' =>
                        'Contratos',

                    'descricao' =>
                        'Modelos contratuais recomendados.',

                    'ordem' =>
                        10,

                    'ativo' =>
                        true,
                ]
            )
            ->assertCreated();

    return $response->json(
        'data.id'
    );
}

function modeloDocumentoSaasCriarModelo(
    $test,
    string $categoriaId,
    array $overrides = []
): string {
    $payload =
        array_merge(
            [
                'categoria_id' =>
                    $categoriaId,

                'nome' =>
                    'Contrato de Aluguer TVDE',

                'resumo' =>
                    'Modelo recomendado de contrato de aluguer.',

                'tipo_documento' =>
                    'contrato_aluguer',

                'pais' =>
                    'PT',

                'idioma' =>
                    'pt-PT',

                'conteudo' =>
                    modeloDocumentoSaasConteudo(),

                'versao' =>
                    '1.0',

                'juridicamente_revisto' =>
                    true,

                'destaque' =>
                    true,

                'ativo' =>
                    true,

                'ordem' =>
                    10,
            ],
            $overrides
        );

    $response =
        $test
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->postJson(
                '/api/backoffice/modelos-documento',
                $payload
            )
            ->assertCreated();

    return $response->json(
        'data.id'
    );
}

test(
    'catálogo de modelos recomendados exige autenticação',
    function () {
        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->getJson(
                '/api/modelos-recomendados'
            )
            ->assertUnauthorized();

        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->getJson(
                '/api/backoffice/modelos-documento'
            )
            ->assertUnauthorized();
    }
);

test(
    'utilizador de tenant não pode administrar catálogo saas',
    function () {
        $tenant =
            modeloDocumentoSaasTenant(
                'Tenant A',
                'modelo-saas-tenant-a'
            );

        $user =
            modeloDocumentoSaasTenantUser(
                $tenant
            );

        Sanctum::actingAs(
            $user
        );

        $this->withSession([
            'tenant_id' =>
                $tenant->id,
        ]);

        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->getJson(
                '/api/backoffice/modelos-documento/categorias'
            )
            ->assertForbidden();
    }
);

test(
    'super admin cria analisa e publica versão imutável de modelo recomendado',
    function () {
        $admin =
            modeloDocumentoSaasAdmin();

        Sanctum::actingAs(
            $admin
        );

        $categoriaId =
            modeloDocumentoSaasCriarCategoria(
                $this
            );

        $modeloId =
            modeloDocumentoSaasCriarModelo(
                $this,
                $categoriaId
            );

        $model =
            ModeloDocumentoSaas::query()
                ->findOrFail(
                    $modeloId
                );

        expect(
            $model->status
        )->toBe(
            'rascunho'
        );

        expect(
            $model
                ->tecnicamente_validado
        )->toBeTrue();

        expect(
            $model->warnings
        )->toBe([]);

        expect(
            $model
                ->conteudo_parametrizado
        )
            ->toContain(
                '{{PROPRIETARIO_NOME_COMPLETO}}'
            )
            ->toContain(
                '{{MOTORISTA_NOME_COMPLETO}}'
            )
            ->toContain(
                '{{VEICULO_MATRICULA}}'
            )
            ->toContain(
                '{{ASSINATURA_PROPRIETARIO}}'
            )
            ->toContain(
                '{{ASSINATURA_MOTORISTA}}'
            );

        expect(
            $model
                ->entidades_requeridas
        )
            ->toContain(
                'proprietario'
            )
            ->toContain(
                'motorista'
            )
            ->toContain(
                'veiculo'
            );

        expect(
            $model
                ->assinaturas_requeridas
        )
            ->toContain(
                'ASSINATURA_PROPRIETARIO'
            )
            ->toContain(
                'ASSINATURA_MOTORISTA'
            );

        $response =
            $this
                ->withHeaders(
                    modeloDocumentoSaasHeaders()
                )
                ->postJson(
                    "/api/backoffice/modelos-documento/{$modeloId}/publicar"
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.versao',
                    '1.0'
                );

        $versionId =
            $response->json(
                'data.id'
            );

        $version =
            ModeloDocumentoSaasVersao::query()
                ->findOrFail(
                    $versionId
                );

        $model->refresh();

        expect(
            $model->status
        )->toBe(
            'publicado'
        );

        expect(
            $model
                ->versao_publicada
        )->toBe(
            '1.0'
        );

        expect(
            $version->checksum
        )->toBe(
            hash(
                'sha256',
                $version
                    ->conteudo_parametrizado
            )
        );

        expect(
            $version
                ->juridicamente_revisto
        )->toBeTrue();

        expect(
            ModeloDocumentoSaasVersao::query()
                ->where(
                    'modelo_documento_saas_id',
                    $model->id
                )
                ->count()
        )->toBe(1);
    }
);

test(
    'modelo com aviso técnico não pode ser publicado',
    function () {
        $admin =
            modeloDocumentoSaasAdmin();

        Sanctum::actingAs(
            $admin
        );

        $categoriaId =
            modeloDocumentoSaasCriarCategoria(
                $this
            );

        $modeloId =
            modeloDocumentoSaasCriarModelo(
                $this,
                $categoriaId,
                [
                    'nome' =>
                        'Modelo Inválido',

                    'conteudo' =>
                        'Documento com {{CAMPO_DESCONHECIDO}} que ainda precisa de configuração.',

                    'juridicamente_revisto' =>
                        false,
                ]
            );

        $model =
            ModeloDocumentoSaas::query()
                ->findOrFail(
                    $modeloId
                );

        expect(
            $model
                ->tecnicamente_validado
        )->toBeFalse();

        expect(
            collect(
                $model->warnings
            )->pluck('code')->all()
        )->toContain(
            'UNKNOWN_PLACEHOLDER'
        );

        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->postJson(
                "/api/backoffice/modelos-documento/{$modeloId}/publicar"
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'modelo'
            );

        expect(
            ModeloDocumentoSaasVersao::count()
        )->toBe(0);
    }
);

test(
    'mesma versão publicada não pode ser sobrescrita',
    function () {
        $admin =
            modeloDocumentoSaasAdmin();

        Sanctum::actingAs(
            $admin
        );

        $categoriaId =
            modeloDocumentoSaasCriarCategoria(
                $this
            );

        $modeloId =
            modeloDocumentoSaasCriarModelo(
                $this,
                $categoriaId
            );

        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->postJson(
                "/api/backoffice/modelos-documento/{$modeloId}/publicar"
            )
            ->assertCreated();

        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->postJson(
                "/api/backoffice/modelos-documento/{$modeloId}/publicar"
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'versao'
            );

        expect(
            ModeloDocumentoSaasVersao::query()
                ->where(
                    'modelo_documento_saas_id',
                    $modeloId
                )
                ->count()
        )->toBe(1);
    }
);

test(
    'tenant vê somente snapshot publicado e copia versão imutável para os próprios modelos',
    function () {
        $admin =
            modeloDocumentoSaasAdmin();

        Sanctum::actingAs(
            $admin
        );

        $categoriaId =
            modeloDocumentoSaasCriarCategoria(
                $this
            );

        $modeloId =
            modeloDocumentoSaasCriarModelo(
                $this,
                $categoriaId
            );

        $publishResponse =
            $this
                ->withHeaders(
                    modeloDocumentoSaasHeaders()
                )
                ->postJson(
                    "/api/backoffice/modelos-documento/{$modeloId}/publicar"
                )
                ->assertCreated();

        $publishedVersionId =
            $publishResponse->json(
                'data.id'
            );

        $publishedVersion =
            ModeloDocumentoSaasVersao::query()
                ->findOrFail(
                    $publishedVersionId
                );

        /*
         * O Admin começa a preparar uma nova versão,
         * mas ainda NÃO a publica.
         *
         * O catálogo deve continuar mostrando v1.0.
         */
        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->patchJson(
                "/api/backoffice/modelos-documento/{$modeloId}",
                [
                    'versao' =>
                        '1.1',

                    'juridicamente_revisto' =>
                        false,

                    'conteudo' =>
                        'NOVA VERSÃO EM PREPARAÇÃO para {{MOTORISTA_NOME_COMPLETO}}, NIF {{MOTORISTA_NIF}}. {{ASSINATURA_MOTORISTA}}',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.versao',
                '1.1'
            );

        $tenant =
            modeloDocumentoSaasTenant(
                'Frota Lisboa',
                'frota-lisboa-modelos'
            );

        $tenantUser =
            modeloDocumentoSaasTenantUser(
                $tenant
            );

        Sanctum::actingAs(
            $tenantUser
        );

        $this->withSession([
            'tenant_id' =>
                $tenant->id,
        ]);

        $catalogResponse =
            $this
                ->withHeaders(
                    modeloDocumentoSaasHeaders()
                )
                ->getJson(
                    '/api/modelos-recomendados'
                )
                ->assertOk()
                ->assertJsonCount(
                    1,
                    'data'
                )
                ->assertJsonPath(
                    'data.0.id',
                    $modeloId
                )
                ->assertJsonPath(
                    'data.0.versao',
                    '1.0'
                )
                ->assertJsonPath(
                    'data.0.juridicamente_revisto',
                    true
                );

        expect(
            $catalogResponse->json(
                'data.0.entidades_requeridas'
            )
        )
            ->toContain(
                'proprietario'
            )
            ->toContain(
                'motorista'
            )
            ->toContain(
                'veiculo'
            );

        expect(
            $catalogResponse->json(
                'data.0.assinaturas_requeridas'
            )
        )
            ->toContain(
                'ASSINATURA_PROPRIETARIO'
            )
            ->toContain(
                'ASSINATURA_MOTORISTA'
            );

        $showResponse =
            $this
                ->withHeaders(
                    modeloDocumentoSaasHeaders()
                )
                ->getJson(
                    "/api/modelos-recomendados/{$modeloId}"
                )
                ->assertOk()
                ->assertJsonPath(
                    'data.versao',
                    '1.0'
                )
                ->assertJsonPath(
                    'data.juridicamente_revisto',
                    true
                );

        expect(
            $showResponse->json(
                'data.conteudo_parametrizado'
            )
        )
            ->toBe(
                $publishedVersion
                    ->conteudo_parametrizado
            )
            ->not
            ->toContain(
                'NOVA VERSÃO EM PREPARAÇÃO'
            );

        $copyResponse =
            $this
                ->withHeaders(
                    modeloDocumentoSaasHeaders()
                )
                ->postJson(
                    "/api/modelos-recomendados/{$modeloId}/usar",
                    [
                        'nome' =>
                            'Contrato Aluguer Frota Lisboa',
                    ]
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.nome',
                    'Contrato Aluguer Frota Lisboa'
                )
                ->assertJsonPath(
                    'data.modelo_documento_saas_id',
                    $modeloId
                )
                ->assertJsonPath(
                    'data.modelo_documento_saas_versao_id',
                    $publishedVersion->id
                )
                ->assertJsonPath(
                    'data.modelo_documento_saas_versao',
                    '1.0'
                );

        $template =
            TemplateContrato::query()
                ->findOrFail(
                    $copyResponse->json(
                        'data.id'
                    )
                );

        expect(
            $template->tenant_id
        )->toBe(
            $tenant->id
        );

        expect(
            $template
                ->modelo_documento_saas_id
        )->toBe(
            $modeloId
        );

        expect(
            $template
                ->modelo_documento_saas_versao_id
        )->toBe(
            $publishedVersion->id
        );

        expect(
            $template
                ->modelo_documento_saas_versao
        )->toBe(
            '1.0'
        );

        expect(
            $template
                ->conteudo_original
        )
            ->toBe(
                $publishedVersion
                    ->conteudo_parametrizado
            )
            ->toContain(
                '{{VEICULO_MATRICULA}}'
            )
            ->not
            ->toContain(
                'NOVA VERSÃO EM PREPARAÇÃO'
            );
    }
);

test(
    'rascunho não aparece no catálogo do tenant',
    function () {
        $admin =
            modeloDocumentoSaasAdmin();

        Sanctum::actingAs(
            $admin
        );

        $categoriaId =
            modeloDocumentoSaasCriarCategoria(
                $this
            );

        modeloDocumentoSaasCriarModelo(
            $this,
            $categoriaId
        );

        $tenant =
            modeloDocumentoSaasTenant(
                'Tenant Rascunho',
                'tenant-rascunho-modelo'
            );

        $tenantUser =
            modeloDocumentoSaasTenantUser(
                $tenant
            );

        Sanctum::actingAs(
            $tenantUser
        );

        $this->withSession([
            'tenant_id' =>
                $tenant->id,
        ]);

        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->getJson(
                '/api/modelos-recomendados'
            )
            ->assertOk()
            ->assertJsonCount(
                0,
                'data'
            );
    }
);

test(
    'tenant não pode falsificar origem saas ao importar modelo próprio',
    function () {
        $tenant =
            modeloDocumentoSaasTenant(
                'Tenant Origem',
                'tenant-origem-saas'
            );

        $user =
            modeloDocumentoSaasTenantUser(
                $tenant
            );

        Sanctum::actingAs(
            $user
        );

        $this->withSession([
            'tenant_id' =>
                $tenant->id,
        ]);

        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->postJson(
                '/api/templates-contrato/texto',
                [
                    'nome' =>
                        'Modelo Forjado',

                    'conteudo' =>
                        'Contrato para {{MOTORISTA_NOME_COMPLETO}} com NIF {{MOTORISTA_NIF}}.',

                    'modelo_documento_saas_id' =>
                        '11111111-1111-4111-8111-111111111111',

                    'modelo_documento_saas_versao_id' =>
                        '22222222-2222-4222-8222-222222222222',

                    'modelo_documento_saas_versao' =>
                        '99.0',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'modelo_documento_saas_id',
                'modelo_documento_saas_versao_id',
                'modelo_documento_saas_versao',
            ]);

        expect(
            TemplateContrato::count()
        )->toBe(0);
    }
);


test(
    'origem saas de template não permite mass assignment',
    function () {
        $template =
            new TemplateContrato();

        expect(
            $template->getFillable()
        )
            ->not
            ->toContain(
                'modelo_documento_saas_id'
            )
            ->not
            ->toContain(
                'modelo_documento_saas_versao_id'
            )
            ->not
            ->toContain(
                'modelo_documento_saas_versao'
            );
    }
);


test(
    'backoffice calcula metricas reais de adocao dos modelos recomendados',
    function () {
        $admin =
            modeloDocumentoSaasAdmin();

        Sanctum::actingAs(
            $admin
        );

        $categoriaId =
            modeloDocumentoSaasCriarCategoria(
                $this
            );

        $modeloId =
            modeloDocumentoSaasCriarModelo(
                $this,
                $categoriaId
            );

        $versaoUmResponse =
            $this
                ->withHeaders(
                    modeloDocumentoSaasHeaders()
                )
                ->postJson(
                    "/api/backoffice/modelos-documento/{$modeloId}/publicar"
                )
                ->assertCreated();

        $versaoUmId =
            $versaoUmResponse
                ->json(
                    'data.id'
                );

        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->patchJson(
                "/api/backoffice/modelos-documento/{$modeloId}",
                [
                    'versao' =>
                        '1.1',
                ]
            )
            ->assertOk();

        $versaoDoisResponse =
            $this
                ->withHeaders(
                    modeloDocumentoSaasHeaders()
                )
                ->postJson(
                    "/api/backoffice/modelos-documento/{$modeloId}/publicar"
                )
                ->assertCreated();

        $versaoDoisId =
            $versaoDoisResponse
                ->json(
                    'data.id'
                );

        $tenantA =
            modeloDocumentoSaasTenant(
                'Tenant Métricas A',
                'tenant-metricas-a'
            );

        $tenantB =
            modeloDocumentoSaasTenant(
                'Tenant Métricas B',
                'tenant-metricas-b'
            );

        $tenantC =
            modeloDocumentoSaasTenant(
                'Tenant Métricas C',
                'tenant-metricas-c'
            );

        $criarTemplate =
            function (
                Tenant $tenant,
                string $nome,
                bool $ativo,
                ?string $modeloId = null,
                ?string $versaoId = null,
                ?string $versao = null
            ): TemplateContrato {
                $template =
                    new TemplateContrato([
                        'nome' =>
                            $nome,

                        'tipo_arquivo' =>
                            'txt',

                        'conteudo_original' =>
                            'Documento de teste.',

                        'campos_detectados' =>
                            [],

                        'campos_mapeados' =>
                            [],
                    ]);

                $template->tenant_id =
                    $tenant->id;

                $template->ativo =
                    $ativo;

                $template->modelo_documento_saas_id =
                    $modeloId;

                $template->modelo_documento_saas_versao_id =
                    $versaoId;

                $template->modelo_documento_saas_versao =
                    $versao;

                $template->save();

                return $template;
            };

        $criarTemplate(
            $tenantA,
            'FrotaPro A v1.0',
            true,
            $modeloId,
            $versaoUmId,
            '1.0'
        );

        $criarTemplate(
            $tenantB,
            'FrotaPro B v1.1',
            true,
            $modeloId,
            $versaoDoisId,
            '1.1'
        );

        $criarTemplate(
            $tenantB,
            'FrotaPro B cópia 2 v1.1',
            true,
            $modeloId,
            $versaoDoisId,
            '1.1'
        );

        /*
         * Continua no histórico de cópias,
         * mas não conta como adoção ativa.
         */
        $criarTemplate(
            $tenantC,
            'FrotaPro C arquivado',
            false,
            $modeloId,
            $versaoUmId,
            '1.0'
        );

        $criarTemplate(
            $tenantA,
            'Modelo próprio A',
            true
        );

        $criarTemplate(
            $tenantC,
            'Modelo próprio C',
            true
        );

        $response =
            $this
                ->withHeaders(
                    modeloDocumentoSaasHeaders()
                )
                ->getJson(
                    '/api/backoffice/modelos-documento/metricas'
                )
                ->assertOk();

        $response
            ->assertJsonPath(
                'data.resumo.modelos_publicados',
                1
            )
            ->assertJsonPath(
                'data.resumo.organizacoes_aderentes',
                2
            )
            ->assertJsonPath(
                'data.resumo.copias_totais',
                4
            )
            ->assertJsonPath(
                'data.resumo.templates_ativos_frotapro',
                3
            )
            ->assertJsonPath(
                'data.resumo.templates_ativos_proprios',
                2
            )
            ->assertJsonPath(
                'data.resumo.templates_ativos_total',
                5
            )
            ->assertJsonPath(
                'data.resumo.taxa_padronizacao',
                60
            )
            ->assertJsonPath(
                'data.modelos.0.id',
                $modeloId
            )
            ->assertJsonPath(
                'data.modelos.0.versao_publicada',
                '1.1'
            )
            ->assertJsonPath(
                'data.modelos.0.copias_totais',
                4
            )
            ->assertJsonPath(
                'data.modelos.0.copias_ativas',
                3
            )
            ->assertJsonPath(
                'data.modelos.0.organizacoes_aderentes',
                2
            )
            ->assertJsonPath(
                'data.modelos.0.versao_mais_usada',
                '1.1'
            )
            ->assertJsonPath(
                'data.modelos.0.versao_mais_usada_copias',
                2
            )
            ->assertJsonPath(
                'data.modelos.0.organizacoes_desatualizadas',
                1
            )
            ->assertJsonPath(
                'data.modelos.0.versoes_em_uso.0.versao',
                '1.1'
            )
            ->assertJsonPath(
                'data.modelos.0.versoes_em_uso.0.copias',
                2
            )
            ->assertJsonPath(
                'data.modelos.0.versoes_em_uso.1.versao',
                '1.0'
            )
            ->assertJsonPath(
                'data.modelos.0.versoes_em_uso.1.copias',
                1
            );
    }
);

test(
    'tenant compara e adota nova versao de modelo recomendado preservando historico',
    function () {
        $admin =
            modeloDocumentoSaasAdmin();

        Sanctum::actingAs(
            $admin
        );

        $categoriaId =
            modeloDocumentoSaasCriarCategoria(
                $this
            );

        $modeloId =
            modeloDocumentoSaasCriarModelo(
                $this,
                $categoriaId
            );

        $versaoUmResponse =
            $this
                ->withHeaders(
                    modeloDocumentoSaasHeaders()
                )
                ->postJson(
                    "/api/backoffice/modelos-documento/{$modeloId}/publicar"
                )
                ->assertCreated();

        $versaoUmId =
            $versaoUmResponse
                ->json(
                    'data.id'
                );

        $tenant =
            modeloDocumentoSaasTenant(
                'Tenant Update',
                'tenant-update-modelo'
            );

        $tenantUser =
            modeloDocumentoSaasTenantUser(
                $tenant
            );

        Sanctum::actingAs(
            $tenantUser
        );

        $this->withSession([
            'tenant_id' =>
                $tenant->id,
        ]);

        $copyResponse =
            $this
                ->withHeaders(
                    modeloDocumentoSaasHeaders()
                )
                ->postJson(
                    "/api/modelos-recomendados/{$modeloId}/usar",
                    [
                        'nome' =>
                            'Contrato Operacional',
                    ]
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.modelo_documento_saas_versao',
                    '1.0'
                );

        $templateId =
            $copyResponse
                ->json(
                    'data.id'
                );

        $tipo =
            new TipoContrato([
                'nome' =>
                    'Contrato Operacional',

                'slug' =>
                    'contrato-operacional',

                'codigo' =>
                    'contrato_operacional',

                'template_id' =>
                    $templateId,

                'ativo' =>
                    true,

                'mostrar_menu' =>
                    true,

                'ordem' =>
                    10,
            ]);

        $tipo->tenant_id =
            $tenant->id;

        $tipo->created_by =
            $tenantUser->id;

        $tipo->updated_by =
            $tenantUser->id;

        $tipo->save();

        $template =
            TemplateContrato::query()
                ->findOrFail(
                    $templateId
                );

        $template->conteudo_original =
            $template
                ->conteudo_original .
            "\n\nCLÁUSULA PERSONALIZADA DA EMPRESA.";

        $template->save();

        Sanctum::actingAs(
            $admin
        );

        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->patchJson(
                "/api/backoffice/modelos-documento/{$modeloId}",
                [
                    'versao' =>
                        '1.1',
                ]
            )
            ->assertOk();

        $versaoDoisResponse =
            $this
                ->withHeaders(
                    modeloDocumentoSaasHeaders()
                )
                ->postJson(
                    "/api/backoffice/modelos-documento/{$modeloId}/publicar"
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.versao',
                    '1.1'
                );

        $versaoDoisId =
            $versaoDoisResponse
                ->json(
                    'data.id'
                );

        expect(
            $versaoDoisId
        )->not->toBe(
            $versaoUmId
        );

        Sanctum::actingAs(
            $tenantUser
        );

        $this->withSession([
            'tenant_id' =>
                $tenant->id,
        ]);

        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->getJson(
                "/api/modelos-recomendados/templates/{$templateId}/comparar"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.template.versao_origem',
                '1.0'
            )
            ->assertJsonPath(
                'data.template.personalizado',
                true
            )
            ->assertJsonPath(
                'data.modelo.versao_publicada',
                '1.1'
            )
            ->assertJsonPath(
                'data.nova_versao.versao',
                '1.1'
            )
            ->assertJsonPath(
                'data.update_disponivel',
                true
            )
            ->assertJsonCount(
                1,
                'data.tipos_contrato_afetados'
            );

        $updateResponse =
            $this
                ->withHeaders(
                    modeloDocumentoSaasHeaders()
                )
                ->postJson(
                    "/api/modelos-recomendados/templates/{$templateId}/atualizar"
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.template.nome',
                    'Contrato Operacional'
                )
                ->assertJsonPath(
                    'data.template.modelo_documento_saas_versao',
                    '1.1'
                )
                ->assertJsonPath(
                    'data.template_anterior_id',
                    $templateId
                )
                ->assertJsonPath(
                    'data.versao_anterior',
                    '1.0'
                )
                ->assertJsonPath(
                    'data.versao_nova',
                    '1.1'
                )
                ->assertJsonPath(
                    'data.tipos_contrato_atualizados',
                    1
                );

        $newTemplateId =
            $updateResponse
                ->json(
                    'data.template.id'
                );

        expect(
            $newTemplateId
        )->not->toBe(
            $templateId
        );

        $template->refresh();

        expect(
            (bool)
            $template->ativo
        )->toBeFalse();

        expect(
            $template
                ->arquivado_em
        )->not->toBeNull();

        expect(
            $template
                ->arquivado_por
        )->toBe(
            $tenantUser->id
        );

        $newTemplate =
            TemplateContrato::query()
                ->findOrFail(
                    $newTemplateId
                );

        expect(
            (bool)
            $newTemplate->ativo
        )->toBeTrue();

        expect(
            $newTemplate
                ->modelo_documento_saas_versao
        )->toBe(
            '1.1'
        );

        expect(
            $newTemplate
                ->modelo_documento_saas_versao_id
        )->toBe(
            $versaoDoisId
        );

        $tipo->refresh();

        expect(
            $tipo->template_id
        )->toBe(
            $newTemplateId
        );

        expect(
            TemplateContrato::query()
                ->where(
                    'tenant_id',
                    $tenant->id
                )
                ->count()
        )->toBe(2);

        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->getJson(
                "/api/modelos-recomendados/templates/{$newTemplateId}/comparar"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.update_disponivel',
                false
            )
            ->assertJsonPath(
                'data.template.personalizado',
                false
            );

        $this
            ->withHeaders(
                modeloDocumentoSaasHeaders()
            )
            ->postJson(
                "/api/modelos-recomendados/templates/{$newTemplateId}/atualizar"
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'versao',
            ]);
    }
);
