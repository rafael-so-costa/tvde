<?php

use App\Models\ChecklistProcessRun;
use App\Models\ChecklistProcessTemplate;
use App\Models\ChecklistProcessTemplateItem;
use App\Models\Contrato;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\TemplateContrato;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Motorista;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function processHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function processTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function processUser(
    Tenant $tenant,
    string $email
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
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);

    foreach (
        [
            'templates' =>
                'Templates',

            'contratos' =>
                'Contratos',
        ]
        as $codigo => $nome
    ) {
        $permission =
            Permission::firstOrCreate(
                [
                    'codigo' =>
                        $codigo,
                ],
                [
                    'modulo' =>
                        $codigo,

                    'nome' =>
                        $nome,
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
                    'configurar',
            ]
        );
    }

    return $user;
}

function processLogin(
    $test,
    User $user
): void {
    $test
        ->postJson(
            '/login',
            [
                'email' =>
                    $user->email,

                'password' =>
                    'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

function processTemplate(
    Tenant $tenant,
    string $codigo,
    array $items
): ChecklistProcessTemplate {
    $template =
        new ChecklistProcessTemplate([
            'codigo' =>
                $codigo,

            'nome' =>
                "Processo {$codigo}",

            'ativo' =>
                true,

            'versao' =>
                1,
        ]);

    $template->tenant_id =
        $tenant->id;

    $template->save();

    foreach (
        $items as $index => $data
    ) {
        $item =
            new ChecklistProcessTemplateItem([
                'codigo' =>
                    $data[
                        'codigo'
                    ],

                'ordem' =>
                    $data[
                        'ordem'
                    ] ?? $index,

                'titulo' =>
                    $data[
                        'titulo'
                    ],

                'descricao' =>
                    $data[
                        'descricao'
                    ] ?? null,

                'tipo' =>
                    $data[
                        'tipo'
                    ] ?? 'tarefa',

                'obrigatorio' =>
                    $data[
                        'obrigatorio'
                    ] ?? true,

                'configuracao' =>
                    $data[
                        'configuracao'
                    ] ?? [],
            ]);

        $item->template_id =
            $template->id;

        $item->save();
    }

    return $template
        ->fresh()
        ->load('items');
}

function processDocumentTemplate(
    Tenant $tenant,
    ChecklistProcessTemplate $process,
    string $nome =
        'Contrato de Teste'
): TemplateContrato {
    $template =
        new TemplateContrato([
            'nome' =>
                $nome,

            'checklist_process_template_id' =>
                $process->id,

            'tipo_arquivo' =>
                'txt',

            'conteudo_original' =>
                'Contrato de teste',

            'campos_detectados' =>
                [],

            'campos_mapeados' =>
                [],
        ]);

    $template->tenant_id =
        $tenant->id;

    $template->save();

    return $template;
}

test(
    'rotas de checklist de processo exigem autenticação',
    function () {
        $this
            ->withHeaders(
                processHeaders()
            )
            ->getJson(
                '/api/checklist-process-templates'
            )
            ->assertUnauthorized();
    }
);

test(
    'checklist de processo é criado no tenant atual com etapas normalizadas',
    function () {
        $tenant =
            processTenant(
                'Tenant Processo',
                'tenant-processo'
            );

        $user =
            processUser(
                $tenant,
                'processo@frotapro.test'
            );

        processLogin(
            $this,
            $user
        );

        $response =
            $this
                ->withHeaders(
                    processHeaders()
                )
                ->postJson(
                    '/api/checklist-process-templates',
                    [
                        'codigo' =>
                            '  contrato_aluguer  ',

                        'nome' =>
                            '  Contrato de Aluguer  ',

                        'descricao' =>
                            'Fluxo de emissão do contrato.',

                        'items' => [
                            [
                                'codigo' =>
                                    '  validar_dados  ',

                                'ordem' =>
                                    1,

                                'titulo' =>
                                    '  Validar dados  ',

                                'tipo' =>
                                    'validacao',

                                'obrigatorio' =>
                                    true,

                                'configuracao' =>
                                    [],
                            ],

                            [
                                'codigo' =>
                                    'assinatura_motorista',

                                'ordem' =>
                                    2,

                                'titulo' =>
                                    'Assinatura do motorista',

                                'tipo' =>
                                    'assinatura',

                                'obrigatorio' =>
                                    true,

                                'configuracao' =>
                                    [
                                        'placeholder' =>
                                            'ASSINATURA_MOTORISTA',
                                    ],
                            ],
                        ],
                    ]
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.codigo',
                    'contrato_aluguer'
                )
                ->assertJsonPath(
                    'data.nome',
                    'Contrato de Aluguer'
                )
                ->assertJsonPath(
                    'data.versao',
                    1
                )
                ->assertJsonPath(
                    'data.items.0.codigo',
                    'validar_dados'
                );

        $id =
            $response->json(
                'data.id'
            );

        $this->assertDatabaseHas(
            'checklist_process_templates',
            [
                'id' =>
                    $id,

                'tenant_id' =>
                    $tenant->id,

                'codigo' =>
                    'contrato_aluguer',

                'versao' =>
                    1,
            ]
        );

        $this->assertDatabaseCount(
            'checklist_process_template_items',
            2
        );
    }
);

test(
    'checklists de processo são isolados por tenant',
    function () {
        $tenantA =
            processTenant(
                'Tenant Processo A',
                'tenant-processo-a'
            );

        $tenantB =
            processTenant(
                'Tenant Processo B',
                'tenant-processo-b'
            );

        $userA =
            processUser(
                $tenantA,
                'processo.a@frotapro.test'
            );

        $templateA =
            processTemplate(
                $tenantA,
                'processo_a',
                [
                    [
                        'codigo' =>
                            'etapa_a',

                        'titulo' =>
                            'Etapa A',
                    ],
                ]
            );

        $templateB =
            processTemplate(
                $tenantB,
                'processo_b',
                [
                    [
                        'codigo' =>
                            'etapa_b',

                        'titulo' =>
                            'Etapa B',
                    ],
                ]
            );

        processLogin(
            $this,
            $userA
        );

        $response =
            $this
                ->withHeaders(
                    processHeaders()
                )
                ->getJson(
                    '/api/checklist-process-templates'
                )
                ->assertOk()
                ->assertJsonCount(
                    1,
                    'data'
                );

        expect(
            $response->json(
                'data.0.id'
            )
        )->toBe(
            $templateA->id
        );

        $this
            ->withHeaders(
                processHeaders()
            )
            ->getJson(
                "/api/checklist-process-templates/{$templateB->id}"
            )
            ->assertNotFound();

        $this
            ->withHeaders(
                processHeaders()
            )
            ->patchJson(
                "/api/checklist-process-templates/{$templateB->id}",
                [
                    'nome' =>
                        'Ataque',
                ]
            )
            ->assertNotFound();

        $this
            ->withHeaders(
                processHeaders()
            )
            ->deleteJson(
                "/api/checklist-process-templates/{$templateB->id}"
            )
            ->assertNotFound();
    }
);

test(
    'template de documento não aceita checklist de processo de outro tenant',
    function () {
        $tenantA =
            processTenant(
                'Tenant Documento A',
                'tenant-documento-a'
            );

        $tenantB =
            processTenant(
                'Tenant Documento B',
                'tenant-documento-b'
            );

        $userA =
            processUser(
                $tenantA,
                'documento.a@frotapro.test'
            );

        $processB =
            processTemplate(
                $tenantB,
                'processo_externo',
                [
                    [
                        'codigo' =>
                            'etapa',

                        'titulo' =>
                            'Etapa',
                    ],
                ]
            );

        processLogin(
            $this,
            $userA
        );

        $this
            ->withHeaders(
                processHeaders()
            )
            ->postJson(
                '/api/templates-contrato',
                [
                    'nome' =>
                        'Template Inválido',

                    'checklist_process_template_id' =>
                        $processB->id,

                    'conteudo_original' =>
                        'Teste',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'checklist_process_template_id'
            );

        expect(
            TemplateContrato::count()
        )->toBe(0);
    }
);

test(
    'criação de contrato gera snapshot automático do checklist do template',
    function () {
        $tenant =
            processTenant(
                'Tenant Snapshot',
                'tenant-snapshot'
            );

        $user =
            processUser(
                $tenant,
                'snapshot@frotapro.test'
            );

        $process =
            processTemplate(
                $tenant,
                'contrato_snapshot',
                [
                    [
                        'codigo' =>
                            'validar_dados',

                        'ordem' =>
                            1,

                        'titulo' =>
                            'Validar dados',

                        'tipo' =>
                            'validacao',
                    ],

                    [
                        'codigo' =>
                            'gerar_documento',

                        'ordem' =>
                            2,

                        'titulo' =>
                            'Gerar documento',

                        'tipo' =>
                            'gerar_documento',
                    ],
                ]
            );

        $documentTemplate =
            processDocumentTemplate(
                $tenant,
                $process
            );

        processLogin(
            $this,
            $user
        );

        $response =
            $this
                ->withHeaders(
                    processHeaders()
                )
                ->postJson(
                    '/api/contratos',
                    [
                        'template_id' =>
                            $documentTemplate->id,

                        'tipo' =>
                            'aluguer',
                    ]
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.checklist_process_run.template_codigo_snapshot',
                    'contrato_snapshot'
                )
                ->assertJsonPath(
                    'data.checklist_process_run.template_versao_snapshot',
                    1
                )
                ->assertJsonCount(
                    2,
                    'data.checklist_process_run.items'
                );

        $contratoId =
            $response->json(
                'data.id'
            );

        $run =
            ChecklistProcessRun::query()
                ->where(
                    'tenant_id',
                    $tenant->id
                )
                ->where(
                    'entidade_tipo',
                    'contrato'
                )
                ->where(
                    'entidade_id',
                    $contratoId
                )
                ->with('items')
                ->firstOrFail();

        expect(
            $run->status
        )->toBe(
            'em_andamento'
        );

        expect(
            $run->items
                ->pluck('codigo')
                ->all()
        )->toBe([
            'validar_dados',
            'gerar_documento',
        ]);
    }
);

test(
    'alterar definição incrementa versão sem modificar snapshot antigo',
    function () {
        $tenant =
            processTenant(
                'Tenant Versão Processo',
                'tenant-versao-processo'
            );

        $user =
            processUser(
                $tenant,
                'versao.processo@frotapro.test'
            );

        $process =
            processTemplate(
                $tenant,
                'processo_versionado',
                [
                    [
                        'codigo' =>
                            'etapa_original',

                        'titulo' =>
                            'Etapa Original',

                        'tipo' =>
                            'tarefa',
                    ],
                ]
            );

        $documentTemplate =
            processDocumentTemplate(
                $tenant,
                $process
            );

        processLogin(
            $this,
            $user
        );

        $contractResponse =
            $this
                ->withHeaders(
                    processHeaders()
                )
                ->postJson(
                    '/api/contratos',
                    [
                        'template_id' =>
                            $documentTemplate->id,

                        'tipo' =>
                            'aluguer',
                    ]
                )
                ->assertCreated();

        $contratoId =
            $contractResponse->json(
                'data.id'
            );

        $run =
            ChecklistProcessRun::query()
                ->where(
                    'entidade_tipo',
                    'contrato'
                )
                ->where(
                    'entidade_id',
                    $contratoId
                )
                ->with('items')
                ->firstOrFail();

        expect(
            $run->template_versao_snapshot
        )->toBe(1);

        expect(
            $run->items
                ->first()
                ->titulo_snapshot
        )->toBe(
            'Etapa Original'
        );

        $this
            ->withHeaders(
                processHeaders()
            )
            ->patchJson(
                "/api/checklist-process-templates/{$process->id}",
                [
                    'nome' =>
                        'Processo Atualizado',

                    'items' => [
                        [
                            'codigo' =>
                                'etapa_nova',

                            'ordem' =>
                                1,

                            'titulo' =>
                                'Etapa Nova',

                            'tipo' =>
                                'tarefa',

                            'obrigatorio' =>
                                true,

                            'configuracao' =>
                                [],
                        ],
                    ],
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.versao',
                2
            );

        $run->refresh();
        $run->load('items');

        expect(
            $run->template_versao_snapshot
        )->toBe(1);

        expect(
            $run->template_nome_snapshot
        )->toBe(
            'Processo processo_versionado'
        );

        expect(
            $run->items
                ->first()
                ->codigo
        )->toBe(
            'etapa_original'
        );

        expect(
            $run->items
                ->first()
                ->titulo_snapshot
        )->toBe(
            'Etapa Original'
        );

        expect(
            $run->items
                ->first()
                ->template_item_id
        )->toBeNull();
    }
);

test(
    'etapa manual pode ser concluída e encerra processo quando não restam obrigatórias',
    function () {
        $tenant =
            processTenant(
                'Tenant Conclusão Manual',
                'tenant-conclusao-manual'
            );

        $user =
            processUser(
                $tenant,
                'conclusao.manual@frotapro.test'
            );

        $process =
            processTemplate(
                $tenant,
                'processo_manual',
                [
                    [
                        'codigo' =>
                            'validar_dados',

                        'titulo' =>
                            'Validar dados',

                        'tipo' =>
                            'validacao',

                        'obrigatorio' =>
                            true,
                    ],

                    [
                        'codigo' =>
                            'observacao_opcional',

                        'titulo' =>
                            'Observação opcional',

                        'tipo' =>
                            'tarefa',

                        'obrigatorio' =>
                            false,
                    ],
                ]
            );

        $documentTemplate =
            processDocumentTemplate(
                $tenant,
                $process
            );

        processLogin(
            $this,
            $user
        );

        $response =
            $this
                ->withHeaders(
                    processHeaders()
                )
                ->postJson(
                    '/api/contratos',
                    [
                        'template_id' =>
                            $documentTemplate->id,

                        'tipo' =>
                            'prestacao_servico',
                    ]
                )
                ->assertCreated();

        $contratoId =
            $response->json(
                'data.id'
            );

        $run =
            ChecklistProcessRun::query()
                ->where(
                    'entidade_tipo',
                    'contrato'
                )
                ->where(
                    'entidade_id',
                    $contratoId
                )
                ->with('items')
                ->firstOrFail();

        $required =
            $run->items
                ->firstWhere(
                    'codigo',
                    'validar_dados'
                );

        $optional =
            $run->items
                ->firstWhere(
                    'codigo',
                    'observacao_opcional'
                );

        $this
            ->withHeaders(
                processHeaders()
            )
            ->patchJson(
                "/api/contratos/{$contratoId}/checklist-processo/items/{$required->id}/concluir",
                [
                    'resultado' => [
                        'validado' =>
                            true,
                    ],
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'concluido'
            );

        $run->refresh();

        expect(
            $run->status
        )->toBe(
            'concluido'
        );

        expect(
            $run->concluido_em
        )->not->toBeNull();

        $required->refresh();
        $optional->refresh();

        expect(
            $required->status
        )->toBe(
            'concluido'
        );

        expect(
            $required->concluido_por
        )->toBe(
            $user->id
        );

        expect(
            $optional->status
        )->toBe(
            'pendente'
        );
    }
);

test(
    'etapas automáticas não podem ser concluídas manualmente',
    function (
        string $tipo
    ) {
        $tenant =
            processTenant(
                "Tenant Automático {$tipo}",
                'tenant-auto-' .
                    str_replace(
                        '_',
                        '-',
                        $tipo
                    )
            );

        $user =
            processUser(
                $tenant,
                "{$tipo}@frotapro.test"
            );

        $process =
            processTemplate(
                $tenant,
                "processo_{$tipo}",
                [
                    [
                        'codigo' =>
                            "etapa_{$tipo}",

                        'titulo' =>
                            "Etapa {$tipo}",

                        'tipo' =>
                            $tipo,

                        'obrigatorio' =>
                            true,
                    ],
                ]
            );

        $documentTemplate =
            processDocumentTemplate(
                $tenant,
                $process
            );

        processLogin(
            $this,
            $user
        );

        $response =
            $this
                ->withHeaders(
                    processHeaders()
                )
                ->postJson(
                    '/api/contratos',
                    [
                        'template_id' =>
                            $documentTemplate->id,

                        'tipo' =>
                            'aluguer',
                    ]
                )
                ->assertCreated();

        $contratoId =
            $response->json(
                'data.id'
            );

        $run =
            ChecklistProcessRun::query()
                ->where(
                    'entidade_tipo',
                    'contrato'
                )
                ->where(
                    'entidade_id',
                    $contratoId
                )
                ->with('items')
                ->firstOrFail();

        $item =
            $run->items
                ->first();

        $this
            ->withHeaders(
                processHeaders()
            )
            ->patchJson(
                "/api/contratos/{$contratoId}/checklist-processo/items/{$item->id}/concluir",
                [
                    'resultado' =>
                        [],
                ]
            )
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Esta etapa é concluída automaticamente pelo sistema.'
            );

        $item->refresh();
        $run->refresh();

        expect(
            $item->status
        )->toBe(
            'pendente'
        );

        expect(
            $run->status
        )->toBe(
            'em_andamento'
        );
    }
)->with([
    'assinatura',
    'gerar_documento',
    'checklist_veiculo',
]);

test(
    'execução de checklist de contrato de outro tenant não pode ser consultada nem alterada',
    function () {
        $tenantA =
            processTenant(
                'Tenant Execução A',
                'tenant-execucao-a'
            );

        $tenantB =
            processTenant(
                'Tenant Execução B',
                'tenant-execucao-b'
            );

        $userA =
            processUser(
                $tenantA,
                'execucao.a@frotapro.test'
            );

        $processB =
            processTemplate(
                $tenantB,
                'processo_b',
                [
                    [
                        'codigo' =>
                            'etapa_b',

                        'titulo' =>
                            'Etapa B',

                        'tipo' =>
                            'tarefa',
                    ],
                ]
            );

        $templateB =
            processDocumentTemplate(
                $tenantB,
                $processB
            );

        $contratoB =
            new Contrato([
                'template_id' =>
                    $templateB->id,

                'tipo' =>
                    'aluguer',
            ]);

        $contratoB->tenant_id =
            $tenantB->id;

        $contratoB->save();

        processLogin(
            $this,
            $userA
        );

        $this
            ->withHeaders(
                processHeaders()
            )
            ->getJson(
                "/api/contratos/{$contratoB->id}/checklist-processo"
            )
            ->assertNotFound();
    }
);

test(
    'assinatura presencial conclui automaticamente etapa do processo',
    function () {
        $tenant =
            processTenant(
                'Tenant Assinatura Processo',
                'tenant-assinatura-processo'
            );

        $user =
            processUser(
                $tenant,
                'assinatura.processo@frotapro.test'
            );

        $process =
            processTemplate(
                $tenant,
                'processo_assinatura',
                [
                    [
                        'codigo' =>
                            'assinar_motorista',

                        'titulo' =>
                            'Assinatura do motorista',

                        'tipo' =>
                            'assinatura',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'placeholder' =>
                                'ASSINATURA_MOTORISTA',
                        ],
                    ],
                ]
            );

        $template =
            new TemplateContrato([
                'nome' =>
                    'Contrato com Assinatura',

                'checklist_process_template_id' =>
                    $process->id,

                'tipo_arquivo' =>
                    'txt',

                'conteudo_original' =>
                    '{{ASSINATURA_MOTORISTA}}',

                'campos_detectados' =>
                    [],

                'campos_mapeados' =>
                    [],
            ]);

        $template->tenant_id =
            $tenant->id;

        $template->save();

        $motorista =
            new Motorista([
                'nome_completo' =>
                    'Motorista Processo',
            ]);

        $motorista->tenant_id =
            $tenant->id;

        $motorista->save();

        processLogin(
            $this,
            $user
        );

        $response =
            $this
                ->withHeaders(
                    processHeaders()
                )
                ->postJson(
                    '/api/contratos',
                    [
                        'template_id' =>
                            $template->id,

                        'tipo' =>
                            'prestacao_servico',

                        'motorista_id' =>
                            $motorista->id,

                        'assinaturas' => [
                            [
                                'placeholder' =>
                                    'ASSINATURA_MOTORISTA',

                                'modo' =>
                                    'presencial',

                                'assinatura_url' =>
                                    'data:image/png;base64,teste',
                            ],
                        ],
                    ]
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.status',
                    'assinado'
                )
                ->assertJsonPath(
                    'data.checklist_process_run.status',
                    'concluido'
                )
                ->assertJsonPath(
                    'data.checklist_process_run.items.0.status',
                    'concluido'
                );

        $run =
            ChecklistProcessRun::query()
                ->where(
                    'entidade_tipo',
                    'contrato'
                )
                ->where(
                    'entidade_id',
                    $response->json(
                        'data.id'
                    )
                )
                ->with('items')
                ->firstOrFail();

        expect(
            $run->status
        )->toBe(
            'concluido'
        );

        expect(
            $run->items
                ->first()
                ->resultado[
                    'placeholder'
                ]
        )->toBe(
            'ASSINATURA_MOTORISTA'
        );
    }
);

test(
    'catálogo de workflows recomendados exige autenticação',
    function () {
        $this
            ->withHeaders(
                processHeaders()
            )
            ->getJson(
                '/api/checklist-process-presets'
            )
            ->assertUnauthorized();
    }
);

test(
    'tenant copia workflow recomendado com proveniência e etapas operacionais',
    function () {
        $tenant =
            processTenant(
                'Tenant Preset',
                'tenant-preset'
            );

        $user =
            processUser(
                $tenant,
                'preset@frotapro.test'
            );

        processLogin(
            $this,
            $user
        );

        $catalog =
            $this
                ->withHeaders(
                    processHeaders()
                )
                ->getJson(
                    '/api/checklist-process-presets'
                )
                ->assertOk()
                ->assertJsonCount(
                    12,
                    'data'
                );

        $recommended =
            collect(
                $catalog->json(
                    'data'
                )
            )->firstWhere(
                'codigo',
                'aluguer_completo_tvde'
            );

        expect(
            $recommended
        )->not->toBeNull();

        expect(
            $recommended[
                'items'
            ]
        )->toHaveCount(
            9
        );

        $response =
            $this
                ->withHeaders(
                    processHeaders()
                )
                ->postJson(
                    '/api/checklist-process-presets/aluguer_completo_tvde/usar'
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.preset_codigo',
                    'aluguer_completo_tvde'
                )
                ->assertJsonPath(
                    'data.preset_versao',
                    2
                )
                ->assertJsonCount(
                    9,
                    'data.items'
                );

        $id =
            $response->json(
                'data.id'
            );

        $template =
            ChecklistProcessTemplate::query()
                ->with(
                    'items'
                )
                ->findOrFail(
                    $id
                );

        expect(
            $template
                ->tenant_id
        )->toBe(
            $tenant->id
        );

        expect(
            $template
                ->originadoDePresetFrotaPro()
        )->toBeTrue();

        $related =
            $template
                ->items
                ->firstWhere(
                    'tipo',
                    'contrato_relacionado'
                );

        expect(
            $related
        )->not->toBeNull();

        expect(
            data_get(
                $related
                    ->configuracao,
                'tipo_contrato_codigo'
            )
        )->toBe(
            'prestacao_servico'
        );

        $delivery =
            $template
                ->items
                ->firstWhere(
                    'codigo',
                    'entrega_veiculo'
                );

        $return =
            $template
                ->items
                ->firstWhere(
                    'codigo',
                    'recolha_veiculo'
                );

        expect(
            data_get(
                $delivery
                    ->configuracao,
                'checklist_tipo'
            )
        )->toBe(
            'entrega'
        );

        expect(
            data_get(
                $return
                    ->configuracao,
                'checklist_tipo'
            )
        )->toBe(
            'recolha'
        );

        $this->assertDatabaseHas(
            'checklist_process_templates',
            [
                'id' =>
                    $id,

                'tenant_id' =>
                    $tenant->id,

                'preset_codigo' =>
                    'aluguer_completo_tvde',

                'preset_versao' =>
                    2,
            ]
        );
    }
);

test(
    'workflow manual aceita etapa de contrato relacionado',
    function () {
        $tenant =
            processTenant(
                'Tenant Relacionado',
                'tenant-relacionado'
            );

        $user =
            processUser(
                $tenant,
                'relacionado@frotapro.test'
            );

        processLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                processHeaders()
            )
            ->postJson(
                '/api/checklist-process-templates',
                [
                    'codigo' =>
                        'aluguer_customizado',

                    'nome' =>
                        'Aluguer customizado',

                    'ativo' =>
                        true,

                    'items' => [
                        [
                            'codigo' =>
                                'prestacao_servico',

                            'ordem' =>
                                1,

                            'titulo' =>
                                'Contrato de prestação de serviços',

                            'tipo' =>
                                'contrato_relacionado',

                            'obrigatorio' =>
                                true,

                            'configuracao' => [
                                'tipo_contrato_codigo' =>
                                    'prestacao_servico',
                            ],
                        ],
                    ],
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.items.0.tipo',
                'contrato_relacionado'
            )
            ->assertJsonPath(
                'data.items.0.configuracao.tipo_contrato_codigo',
                'prestacao_servico'
            );
    }
);
