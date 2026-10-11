<?php

use App\Models\ChecklistProcessTemplate;
use App\Models\ChecklistProcessTemplateItem;
use App\Models\Contrato;
use App\Models\ContratoRelacao;
use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\TipoContrato;
use App\Models\User;
use App\Models\UserRole;
use App\Services\ChecklistProcessService;
use App\Services\ContratoRelacionadoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function relatedHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function relatedTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function relatedUser(
    Tenant $tenant,
    string $email
): User {
    $user =
        User::factory()->create([
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

    $role =
        Role::firstOrCreate(
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

    $permission =
        Permission::firstOrCreate(
            ['codigo' => 'contratos'],
            [
                'modulo' => 'contratos',
                'nome' => 'Contratos',
            ]
        );

    RolePermission::updateOrCreate(
        [
            'role_id' => $role->id,
            'permission_id' => $permission->id,
        ],
        [
            'nivel' => 'configurar',
        ]
    );

    return $user;
}

function relatedLogin(
    $test,
    User $user
): void {
    $test
        ->postJson(
            '/login',
            [
                'email' => $user->email,
                'password' => 'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

function relatedMotorista(
    Tenant $tenant,
    string $nome
): Motorista {
    $motorista =
        new Motorista([
            'nome_completo' => $nome,
            'email' => strtolower(
                str_replace(
                    ' ',
                    '.',
                    $nome
                )
            ).
                '@related.test',
        ]);

    $motorista->tenant_id =
        $tenant->id;

    $motorista->save();

    return $motorista;
}

test(
    'contrato relacionado é persistido idempotentemente e conclui etapa quando atinge estado exigido',
    function () {
        $tenant =
            relatedTenant(
                'Tenant Relacionados',
                'tenant-relacionados'
            );

        $user =
            relatedUser(
                $tenant,
                'relacionados@frotapro.test'
            );

        $motorista =
            relatedMotorista(
                $tenant,
                'Motorista Relacionado'
            );

        $tipo =
            new TipoContrato([
                'nome' => 'Prestação de Serviços',

                'slug' => 'prestacao-de-servicos',

                'codigo' => 'prestacao_servico',

                'entidades' => [
                    'motorista' => true,
                ],

                'campos_configuracao' => [],
                'assinaturas_configuracao' => [],
                'configuracao' => [],
                'ativo' => true,
                'mostrar_menu' => true,
                'ordem' => 10,
            ]);

        $tipo->tenant_id =
            $tenant->id;

        $tipo->save();

        $workflow =
            new ChecklistProcessTemplate([
                'codigo' => 'aluguer_com_relacionado',

                'nome' => 'Aluguer com relacionado',

                'ativo' => true,
                'versao' => 1,
            ]);

        $workflow->tenant_id =
            $tenant->id;

        $workflow->save();

        $definition =
            new ChecklistProcessTemplateItem([
                'codigo' => 'prestacao_servico',

                'ordem' => 1,

                'titulo' => 'Contrato de prestação de serviços',

                'tipo' => 'contrato_relacionado',

                'obrigatorio' => true,

                'configuracao' => [
                    'tipo_contrato_codigo' => 'prestacao_servico',

                    'status_conclusao' => 'assinado',
                ],
            ]);

        $definition->template_id =
            $workflow->id;

        $definition->save();

        $parent =
            new Contrato([
                'tipo' => 'aluguer',

                'motorista_id' => $motorista->id,
            ]);

        $parent->tenant_id =
            $tenant->id;

        $parent->status =
            'assinado';

        $parent->save();

        $run =
            app(
                ChecklistProcessService::class
            )->start(
                $tenant->id,
                $workflow,
                ChecklistProcessService::ENTITY_CONTRATO,
                $parent->id
            );

        $item =
            $run
                ->items
                ->firstWhere(
                    'codigo',
                    'prestacao_servico'
                );

        $related =
            new Contrato([
                'tipo_contrato_id' => $tipo->id,

                'tipo' => $tipo->codigo,

                'motorista_id' => $motorista->id,
            ]);

        $related->tenant_id =
            $tenant->id;

        $related->status =
            'enviado';

        $related->save();

        relatedLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                relatedHeaders()
            )
            ->getJson(
                "/api/contratos/{$parent->id}/workflow/items/{$item->id}/contrato-relacionado"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.tipo_contrato.id',
                $tipo->id
            )
            ->assertJsonPath(
                'data.status_conclusao',
                'assinado'
            )
            ->assertJsonPath(
                'data.candidatos.0.id',
                $related->id
            );

        $this
            ->withHeaders(
                relatedHeaders()
            )
            ->postJson(
                "/api/contratos/{$parent->id}/workflow/items/{$item->id}/contrato-relacionado/vincular",
                [
                    'contrato_relacionado_id' => $related->id,
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.relacao.contrato.id',
                $related->id
            )
            ->assertJsonPath(
                'data.relacao.criterio_atingido',
                false
            );

        expect(
            $item
                ->fresh()
                ->status
        )->toBe(
            'pendente'
        );

        expect(
            ContratoRelacao::query()
                ->where(
                    'process_run_item_id',
                    $item->id
                )
                ->count()
        )->toBe(1);

        $this
            ->withHeaders(
                relatedHeaders()
            )
            ->postJson(
                "/api/contratos/{$parent->id}/workflow/items/{$item->id}/contrato-relacionado/vincular",
                [
                    'contrato_relacionado_id' => $related->id,
                ]
            )
            ->assertCreated();

        expect(
            ContratoRelacao::query()
                ->where(
                    'process_run_item_id',
                    $item->id
                )
                ->count()
        )->toBe(1);

        $related->status =
            'assinado';

        $related->save();

        app(
            ContratoRelacionadoService::class
        )->syncByRelatedContract(
            $tenant->id,
            $related->id,
            $user->id
        );

        expect(
            $item
                ->fresh()
                ->status
        )->toBe(
            'concluido'
        );

        expect(
            $run
                ->fresh()
                ->status
        )->toBe(
            'concluido'
        );

        $this
            ->withHeaders(
                relatedHeaders()
            )
            ->getJson(
                "/api/contratos/{$parent->id}/workflow/items/{$item->id}/contrato-relacionado"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.relacao.criterio_atingido',
                true
            );
    }
);

test(
    'contrato relacionado de outro tenant não pode ser vinculado',
    function () {
        $tenantA =
            relatedTenant(
                'Tenant Relacionado A',
                'tenant-relacionado-a'
            );

        $tenantB =
            relatedTenant(
                'Tenant Relacionado B',
                'tenant-relacionado-b'
            );

        $user =
            relatedUser(
                $tenantA,
                'tenant.a@related.test'
            );

        $motorista =
            relatedMotorista(
                $tenantA,
                'Motorista Tenant A'
            );

        $tipo =
            new TipoContrato([
                'nome' => 'Prestação',
                'slug' => 'prestacao',
                'codigo' => 'prestacao_servico',

                'entidades' => [
                    'motorista' => true,
                ],

                'campos_configuracao' => [],
                'assinaturas_configuracao' => [],
                'configuracao' => [],
                'ativo' => true,
                'mostrar_menu' => true,
            ]);

        $tipo->tenant_id =
            $tenantA->id;

        $tipo->save();

        $workflow =
            new ChecklistProcessTemplate([
                'codigo' => 'workflow_related',
                'nome' => 'Workflow Related',
                'ativo' => true,
                'versao' => 1,
            ]);

        $workflow->tenant_id =
            $tenantA->id;

        $workflow->save();

        $definition =
            new ChecklistProcessTemplateItem([
                'codigo' => 'related',
                'ordem' => 1,
                'titulo' => 'Relacionado',
                'tipo' => 'contrato_relacionado',
                'obrigatorio' => true,

                'configuracao' => [
                    'tipo_contrato_codigo' => 'prestacao_servico',

                    'status_conclusao' => 'assinado',
                ],
            ]);

        $definition->template_id =
            $workflow->id;

        $definition->save();

        $parent =
            new Contrato([
                'tipo' => 'aluguer',

                'motorista_id' => $motorista->id,
            ]);

        $parent->tenant_id =
            $tenantA->id;

        $parent->status =
            'assinado';

        $parent->save();

        $run =
            app(
                ChecklistProcessService::class
            )->start(
                $tenantA->id,
                $workflow,
                ChecklistProcessService::ENTITY_CONTRATO,
                $parent->id
            );

        $item =
            $run
                ->items
                ->first();

        $foreign =
            new Contrato([
                'tipo' => 'prestacao_servico',
            ]);

        $foreign->tenant_id =
            $tenantB->id;

        $foreign->status =
            'assinado';

        $foreign->save();

        relatedLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                relatedHeaders()
            )
            ->postJson(
                "/api/contratos/{$parent->id}/workflow/items/{$item->id}/contrato-relacionado/vincular",
                [
                    'contrato_relacionado_id' => $foreign->id,
                ]
            )
            ->assertNotFound();

        expect(
            ContratoRelacao::count()
        )->toBe(0);
    }
);

test(
    'workflow legado com código inexistente lista tipos e permite definir tipo real',
    function () {
        $tenant =
            relatedTenant(
                'Tenant Tipo Relacionado',
                'tenant-tipo-relacionado'
            );

        $user =
            relatedUser(
                $tenant,
                'tipo.relacionado@frotapro.test'
            );

        $motorista =
            relatedMotorista(
                $tenant,
                'Motorista Tipo'
            );

        $tipo =
            new TipoContrato([
                'nome' => 'Prestação de Serviços TVDE',

                'slug' => 'prestacao-servicos-tvde',

                'codigo' => 'contrato_prestacao_tvde',

                'entidades' => [
                    'motorista' => true,
                ],

                'campos_configuracao' => [],
                'assinaturas_configuracao' => [],
                'configuracao' => [],
                'ativo' => true,
                'mostrar_menu' => true,
                'ordem' => 1,
            ]);

        $tipo->tenant_id =
            $tenant->id;

        $tipo->save();

        $workflow =
            new ChecklistProcessTemplate([
                'codigo' => 'workflow_codigo_legado',

                'nome' => 'Workflow código legado',

                'ativo' => true,
                'versao' => 1,
            ]);

        $workflow->tenant_id =
            $tenant->id;

        $workflow->save();

        $definition =
            new ChecklistProcessTemplateItem([
                'codigo' => 'contrato_relacionado',

                'ordem' => 1,

                'titulo' => 'Contrato relacionado',

                'tipo' => 'contrato_relacionado',

                'obrigatorio' => true,

                'configuracao' => [
                    'tipo_contrato_codigo' => 'prestacao_servico',

                    'status_conclusao' => 'assinado',
                ],
            ]);

        $definition->template_id =
            $workflow->id;

        $definition->save();

        $parent =
            new Contrato([
                'tipo' => 'aluguer',

                'motorista_id' => $motorista->id,
            ]);

        $parent->tenant_id =
            $tenant->id;

        $parent->status =
            'assinado';

        $parent->save();

        $run =
            app(
                ChecklistProcessService::class
            )->start(
                $tenant->id,
                $workflow,
                ChecklistProcessService::ENTITY_CONTRATO,
                $parent->id
            );

        $item =
            $run
                ->items
                ->first();

        relatedLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                relatedHeaders()
            )
            ->getJson(
                "/api/contratos/{$parent->id}/workflow/items/{$item->id}/contrato-relacionado"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.configuracao_pendente',
                true
            )
            ->assertJsonPath(
                'data.tipo_contrato',
                null
            )
            ->assertJsonPath(
                'data.tipos_disponiveis.0.id',
                $tipo->id
            );

        $this
            ->withHeaders(
                relatedHeaders()
            )
            ->postJson(
                "/api/contratos/{$parent->id}/workflow/items/{$item->id}/contrato-relacionado/configurar-tipo",
                [
                    'tipo_contrato_id' => $tipo->id,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.configuracao_pendente',
                false
            )
            ->assertJsonPath(
                'data.tipo_contrato.id',
                $tipo->id
            )
            ->assertJsonPath(
                'data.tipo_contrato.codigo',
                'contrato_prestacao_tvde'
            );

        $runConfig =
            (array) (
                $item
                    ->fresh()
                    ->configuracao_snapshot
            );

        expect(
            $runConfig[
                'tipo_contrato_id'
            ]
        )->toBe(
            $tipo->id
        );

        expect(
            $runConfig[
                'tipo_contrato_codigo'
            ]
        )->toBe(
            'contrato_prestacao_tvde'
        );

        $templateConfig =
            (array) (
                $definition
                    ->fresh()
                    ->configuracao
            );

        expect(
            $templateConfig[
                'tipo_contrato_id'
            ]
        )->toBe(
            $tipo->id
        );

        expect(
            $templateConfig[
                'tipo_contrato_codigo'
            ]
        )->toBe(
            'contrato_prestacao_tvde'
        );
    }
);
