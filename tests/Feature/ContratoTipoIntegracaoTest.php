<?php

use App\Models\ChecklistProcessRun;
use App\Models\ChecklistProcessTemplate;
use App\Models\ChecklistProcessTemplateItem;
use App\Models\Contrato;
use App\Models\ContratoAtivoVeiculo;
use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\TemplateContrato;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\TipoContrato;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function ctiHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function ctiTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function ctiAdmin(
    Tenant $tenant,
    string $email
): User {
    $user=User::factory()->create([
        'email'=>$email,
        'password'=>Hash::make(
            'SenhaTeste123!'
        ),
        'ativo'=>true,
    ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    $role=Role::firstOrCreate(
        [
            'codigo'=>'funcionario',
        ],
        [
            'nome'=>'Funcionário',
            'sistema'=>true,
        ]
    );

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>$tenant->id,
    ]);

    $permission=
        Permission::firstOrCreate(
            [
                'codigo'=>'contratos',
            ],
            [
                'modulo'=>'contratos',
                'nome'=>'Contratos',
            ]
        );

    RolePermission::updateOrCreate(
        [
            'role_id'=>$role->id,
            'permission_id'=>$permission->id,
        ],
        [
            'nivel'=>'configurar',
        ]
    );

    return $user;
}

function ctiLogin(
    $test,
    User $user
): void {
    $test
        ->postJson(
            '/login',
            [
                'email'=>$user->email,
                'password'=>'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

function ctiWorkflow(
    Tenant $tenant,
    string $codigo,
    string $itemCodigo
): ChecklistProcessTemplate {
    $workflow=
        new ChecklistProcessTemplate([
            'codigo'=>$codigo,
            'nome'=>"Workflow {$codigo}",
            'ativo'=>true,
            'versao'=>1,
        ]);

    $workflow->tenant_id=
        $tenant->id;

    $workflow->save();

    $item=
        new ChecklistProcessTemplateItem([
            'codigo'=>$itemCodigo,
            'ordem'=>1,
            'titulo'=>"Etapa {$itemCodigo}",
            'tipo'=>'tarefa',
            'obrigatorio'=>true,
            'configuracao'=>[],
        ]);

    $item->template_id=
        $workflow->id;

    $item->save();

    return $workflow->fresh()
        ->load('items');
}

function ctiTemplate(
    Tenant $tenant,
    string $nome,
    ?ChecklistProcessTemplate $workflow=null,
    string $conteudo='Contrato'
): TemplateContrato {
    $template=
        new TemplateContrato([
            'nome'=>$nome,
            'tipo_arquivo'=>'txt',
            'conteudo_original'=>$conteudo,
            'campos_detectados'=>[],
            'campos_mapeados'=>[],
            'checklist_process_template_id'=>
                $workflow?->id,
        ]);

    $template->tenant_id=
        $tenant->id;

    $template->ativo=true;

    $template->save();

    return $template;
}

function ctiTipo(
    Tenant $tenant,
    string $codigo,
    ?TemplateContrato $template=null,
    ?ChecklistProcessTemplate $workflow=null,
    array $options=[]
): TipoContrato {
    $tipo=
        new TipoContrato([
            'nome'=>
                $options['nome']
                ??"Tipo {$codigo}",

            'slug'=>
                $options['slug']
                ??str_replace(
                    '_',
                    '-',
                    $codigo
                ),

            'codigo'=>$codigo,

            'descricao'=>
                'Tipo configurável de teste.',

            'template_id'=>
                $template?->id,

            'checklist_process_template_id'=>
                $workflow?->id,

            'entidades'=>
                $options['entidades']
                ??[],

            'campos_configuracao'=>
                $options[
                    'campos_configuracao'
                ]??[],

            'assinaturas_configuracao'=>
                $options[
                    'assinaturas_configuracao'
                ]??[],

            'configuracao'=>
                $options['configuracao']
                ??[],

            'ativo'=>
                $options['ativo']
                ??true,

            'mostrar_menu'=>true,
            'ordem'=>1,
        ]);

    $tipo->tenant_id=
        $tenant->id;

    $tipo->save();

    return $tipo;
}

function ctiMotorista(
    Tenant $tenant,
    string $suffix
): Motorista {
    $motorista=
        new Motorista([
            'nome_completo'=>
                "Motorista {$suffix}",

            'nif'=>
                '2'.substr(
                    str_pad(
                        (string)abs(
                            crc32($suffix)
                        ),
                        8,
                        '0',
                        STR_PAD_LEFT
                    ),
                    0,
                    8
                ),

            'email'=>
                strtolower($suffix).
                '@contrato-tipo.test',

            'telemovel'=>
                '+351910000001',
        ]);

    $motorista->tenant_id=
        $tenant->id;

    $motorista->save();

    return $motorista;
}

function ctiVeiculo(
    Tenant $tenant,
    string $matricula
): Veiculo {
    $veiculo=
        new Veiculo([
            'matricula'=>$matricula,
            'marca'=>'Tesla',
            'modelo'=>'Model 3',
            'cor'=>'Preto',
            'valor_aluguel'=>250,
        ]);

    $veiculo->tenant_id=
        $tenant->id;

    $veiculo->save();

    return $veiculo;
}

function ctiSignature(): string
{
    return
        'data:image/png;base64,'.
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZrUQAAAAASUVORK5CYII=';
}

test(
    'tipo de contrato define tipo template e workflow ignorando configuração legada do template',
    function(){
        $tenant=ctiTenant(
            'Tenant Integração',
            'tenant-integracao'
        );

        $admin=ctiAdmin(
            $tenant,
            'admin.integracao@frotapro.test'
        );

        $workflowLegado=
            ctiWorkflow(
                $tenant,
                'workflow_legado',
                'etapa_legada'
            );

        $workflowConfigurado=
            ctiWorkflow(
                $tenant,
                'workflow_configurado',
                'etapa_configurada'
            );

        $template=
            ctiTemplate(
                $tenant,
                'Template Configurado',
                $workflowLegado,
                'Contrato {{ASSINATURA_MOTORISTA}}'
            );

        $motorista=ctiMotorista(
            $tenant,
            'Integracao'
        );

        $veiculo=ctiVeiculo(
            $tenant,
            'AA-11-AA'
        );

        $tipo=ctiTipo(
            $tenant,
            'contrato_configurado',
            $template,
            $workflowConfigurado,
            [
                'entidades'=>[
                    'motorista'=>true,
                    'veiculo'=>true,
                ],

                'campos_configuracao'=>[
                    [
                        'campo'=>
                            'REFERENCIA_INTERNA',

                        'origem'=>'manual',
                        'tipo'=>'text',
                        'obrigatorio'=>true,
                    ],
                ],

                'assinaturas_configuracao'=>[],
            ]
        );

        ctiLogin(
            $this,
            $admin
        );

        $response=$this
            ->withHeaders(
                ctiHeaders()
            )
            ->postJson(
                '/api/contratos',
                [
                    'tipo_contrato_id'=>
                        $tipo->id,

                    'motorista_id'=>
                        $motorista->id,

                    'veiculo_id'=>
                        $veiculo->id,

                    'campos_preenchidos'=>[
                        'REFERENCIA_INTERNA'=>
                            'REF-001',
                    ],
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.tipo_contrato_id',
                $tipo->id
            )
            ->assertJsonPath(
                'data.tipo',
                'contrato_configurado'
            )
            ->assertJsonPath(
                'data.template_id',
                $template->id
            )
            ->assertJsonPath(
                'data.status',
                'rascunho'
            );

        $contratoId=
            $response->json(
                'data.id'
            );

        $this->assertDatabaseHas(
            'contratos',
            [
                'id'=>$contratoId,
                'tenant_id'=>$tenant->id,
                'tipo_contrato_id'=>$tipo->id,
                'template_id'=>$template->id,
                'tipo'=>'contrato_configurado',
                'status'=>'rascunho',
            ]
        );

        $run=ChecklistProcessRun::query()
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
            ->firstOrFail();

        expect(
            $run->template_id
        )->toBe(
            $workflowConfigurado->id
        );

        expect(
            $run->items()
                ->where(
                    'codigo',
                    'etapa_configurada'
                )
                ->exists()
        )->toBeTrue();

        expect(
            $run->items()
                ->where(
                    'codigo',
                    'etapa_legada'
                )
                ->exists()
        )->toBeFalse();

        expect(
            $response->json(
                'data.assinaturas'
            )
        )->toBe([]);
    }
);

test(
    'template enviado pelo cliente não pode substituir template do tipo',
    function(){
        $tenant=ctiTenant(
            'Tenant Template Override',
            'tenant-template-override'
        );

        $admin=ctiAdmin(
            $tenant,
            'admin.override@frotapro.test'
        );

        $templateCorreto=
            ctiTemplate(
                $tenant,
                'Template Correto'
            );

        $templateAtaque=
            ctiTemplate(
                $tenant,
                'Template Ataque'
            );

        $tipo=ctiTipo(
            $tenant,
            'tipo_template',
            $templateCorreto
        );

        ctiLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                ctiHeaders()
            )
            ->postJson(
                '/api/contratos',
                [
                    'tipo_contrato_id'=>
                        $tipo->id,

                    'template_id'=>
                        $templateAtaque->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'template_id'
            );

        expect(
            Contrato::count()
        )->toBe(0);
    }
);

test(
    'tipo exige entidades configuradas',
    function(){
        $tenant=ctiTenant(
            'Tenant Entidades',
            'tenant-entidades'
        );

        $admin=ctiAdmin(
            $tenant,
            'admin.entidades@frotapro.test'
        );

        $tipo=ctiTipo(
            $tenant,
            'tipo_entidades',
            null,
            null,
            [
                'entidades'=>[
                    'motorista'=>true,
                    'veiculo'=>true,
                ],
            ]
        );

        ctiLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                ctiHeaders()
            )
            ->postJson(
                '/api/contratos',
                [
                    'tipo_contrato_id'=>
                        $tipo->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'motorista_id',
                'veiculo_id',
            ]);

        expect(
            Contrato::count()
        )->toBe(0);
    }
);

test(
    'tipo exige campos manuais configurados',
    function(){
        $tenant=ctiTenant(
            'Tenant Campos',
            'tenant-campos'
        );

        $admin=ctiAdmin(
            $tenant,
            'admin.campos@frotapro.test'
        );

        $tipo=ctiTipo(
            $tenant,
            'tipo_campos',
            null,
            null,
            [
                'campos_configuracao'=>[
                    [
                        'campo'=>
                            'REFERENCIA_INTERNA',

                        'origem'=>'manual',
                        'tipo'=>'text',
                        'obrigatorio'=>true,
                    ],
                ],
            ]
        );

        ctiLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                ctiHeaders()
            )
            ->postJson(
                '/api/contratos',
                [
                    'tipo_contrato_id'=>
                        $tipo->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'campos_preenchidos.REFERENCIA_INTERNA'
            );

        expect(
            Contrato::count()
        )->toBe(0);
    }
);

test(
    'tipo controla assinaturas obrigatórias e modos permitidos',
    function(){
        $tenant=ctiTenant(
            'Tenant Assinaturas',
            'tenant-assinaturas'
        );

        $admin=ctiAdmin(
            $tenant,
            'admin.assinaturas@frotapro.test'
        );

        $motorista=ctiMotorista(
            $tenant,
            'Assinatura'
        );

        $tipo=ctiTipo(
            $tenant,
            'tipo_assinatura',
            null,
            null,
            [
                'entidades'=>[
                    'motorista'=>true,
                ],

                'assinaturas_configuracao'=>[
                    [
                        'placeholder'=>
                            'ASSINATURA_MOTORISTA',

                        'obrigatoria'=>true,

                        'modos'=>[
                            'presencial',
                        ],
                    ],
                ],
            ]
        );

        ctiLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                ctiHeaders()
            )
            ->postJson(
                '/api/contratos',
                [
                    'tipo_contrato_id'=>
                        $tipo->id,

                    'motorista_id'=>
                        $motorista->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'assinaturas'
            );

        $this
            ->withHeaders(
                ctiHeaders()
            )
            ->postJson(
                '/api/contratos',
                [
                    'tipo_contrato_id'=>
                        $tipo->id,

                    'motorista_id'=>
                        $motorista->id,

                    'assinaturas'=>[
                        [
                            'placeholder'=>
                                'ASSINATURA_MOTORISTA',

                            'modo'=>'remota',
                        ],
                    ],
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'assinaturas'
            );

        expect(
            Contrato::count()
        )->toBe(0);
    }
);

test(
    'assinatura configurada presencial cria contrato assinado',
    function(){
        $tenant=ctiTenant(
            'Tenant Assinado',
            'tenant-assinado'
        );

        $admin=ctiAdmin(
            $tenant,
            'admin.assinado@frotapro.test'
        );

        $motorista=ctiMotorista(
            $tenant,
            'Assinado'
        );

        $tipo=ctiTipo(
            $tenant,
            'tipo_assinado',
            null,
            null,
            [
                'entidades'=>[
                    'motorista'=>true,
                ],

                'assinaturas_configuracao'=>[
                    [
                        'placeholder'=>
                            'ASSINATURA_MOTORISTA',

                        'obrigatoria'=>true,

                        'modos'=>[
                            'presencial',
                        ],
                    ],
                ],
            ]
        );

        ctiLogin(
            $this,
            $admin
        );

        $response=$this
            ->withHeaders(
                ctiHeaders()
            )
            ->postJson(
                '/api/contratos',
                [
                    'tipo_contrato_id'=>
                        $tipo->id,

                    'motorista_id'=>
                        $motorista->id,

                    'assinaturas'=>[
                        [
                            'placeholder'=>
                                'ASSINATURA_MOTORISTA',

                            'modo'=>
                                'presencial',

                            'assinatura_url'=>
                                ctiSignature(),
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
                'data.assinaturas.0.placeholder',
                'ASSINATURA_MOTORISTA'
            )
            ->assertJsonPath(
                'data.assinaturas.0.status',
                'assinado'
            );

        $this->assertDatabaseHas(
            'contratos',
            [
                'id'=>$response->json(
                    'data.id'
                ),
                'status'=>'assinado',
                'tipo_contrato_id'=>$tipo->id,
            ]
        );
    }
);

test(
    'configuração do tipo controla associação motorista veículo',
    function(){
        $tenant=ctiTenant(
            'Tenant Associação',
            'tenant-associacao'
        );

        $admin=ctiAdmin(
            $tenant,
            'admin.associacao@frotapro.test'
        );

        $motorista=ctiMotorista(
            $tenant,
            'Associacao'
        );

        $veiculo=ctiVeiculo(
            $tenant,
            'BB-22-BB'
        );

        $tipo=ctiTipo(
            $tenant,
            'aluguer',
            null,
            null,
            [
                'entidades'=>[
                    'motorista'=>true,
                    'veiculo'=>true,
                ],

                'assinaturas_configuracao'=>[
                    [
                        'placeholder'=>
                            'ASSINATURA_MOTORISTA',

                        'obrigatoria'=>true,

                        'modos'=>[
                            'presencial',
                        ],
                    ],
                ],

                'configuracao'=>[
                    'associar_motorista_veiculo'=>
                        true,
                ],
            ]
        );

        ctiLogin(
            $this,
            $admin
        );

        $response=$this
            ->withHeaders(
                ctiHeaders()
            )
            ->postJson(
                '/api/contratos',
                [
                    'tipo_contrato_id'=>
                        $tipo->id,

                    'motorista_id'=>
                        $motorista->id,

                    'veiculo_id'=>
                        $veiculo->id,

                    'assinaturas'=>[
                        [
                            'placeholder'=>
                                'ASSINATURA_MOTORISTA',

                            'modo'=>
                                'presencial',

                            'assinatura_url'=>
                                ctiSignature(),
                        ],
                    ],
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.status',
                'assinado'
            );

        $this->assertDatabaseHas(
            'contratos_ativos_veiculos',
            [
                'tenant_id'=>$tenant->id,
                'contrato_id'=>$response->json(
                    'data.id'
                ),
                'motorista_id'=>$motorista->id,
                'veiculo_id'=>$veiculo->id,
                'ativo'=>true,
            ]
        );
    }
);

test(
    'tipo configurado pode impedir associação mesmo usando código aluguer',
    function(){
        $tenant=ctiTenant(
            'Tenant Sem Associação',
            'tenant-sem-associacao'
        );

        $admin=ctiAdmin(
            $tenant,
            'admin.sem.associacao@frotapro.test'
        );

        $motorista=ctiMotorista(
            $tenant,
            'SemAssociacao'
        );

        $veiculo=ctiVeiculo(
            $tenant,
            'CC-33-CC'
        );

        $tipo=ctiTipo(
            $tenant,
            'aluguer',
            null,
            null,
            [
                'entidades'=>[
                    'motorista'=>true,
                    'veiculo'=>true,
                ],

                'assinaturas_configuracao'=>[
                    [
                        'placeholder'=>
                            'ASSINATURA_MOTORISTA',

                        'obrigatoria'=>true,

                        'modos'=>[
                            'presencial',
                        ],
                    ],
                ],

                'configuracao'=>[
                    'associar_motorista_veiculo'=>
                        false,
                ],
            ]
        );

        ctiLogin(
            $this,
            $admin
        );

        $response=$this
            ->withHeaders(
                ctiHeaders()
            )
            ->postJson(
                '/api/contratos',
                [
                    'tipo_contrato_id'=>
                        $tipo->id,

                    'motorista_id'=>
                        $motorista->id,

                    'veiculo_id'=>
                        $veiculo->id,

                    'assinaturas'=>[
                        [
                            'placeholder'=>
                                'ASSINATURA_MOTORISTA',

                            'modo'=>
                                'presencial',

                            'assinatura_url'=>
                                ctiSignature(),
                        ],
                    ],
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.status',
                'assinado'
            );

        expect(
            ContratoAtivoVeiculo::query()
                ->where(
                    'contrato_id',
                    $response->json(
                        'data.id'
                    )
                )
                ->exists()
        )->toBeFalse();
    }
);

test(
    'tipo inativo não pode originar novo contrato',
    function(){
        $tenant=ctiTenant(
            'Tenant Tipo Inativo',
            'tenant-tipo-inativo'
        );

        $admin=ctiAdmin(
            $tenant,
            'admin.inativo@frotapro.test'
        );

        $tipo=ctiTipo(
            $tenant,
            'tipo_inativo',
            null,
            null,
            [
                'ativo'=>false,
            ]
        );

        ctiLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                ctiHeaders()
            )
            ->postJson(
                '/api/contratos',
                [
                    'tipo_contrato_id'=>
                        $tipo->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'tipo_contrato_id'
            );

        expect(
            Contrato::count()
        )->toBe(0);
    }
);
test('preview moderno utiliza template do tipo',function(){
    $tenant=ctiTenant('Preview Wizard','preview-wizard');
    $user=ctiAdmin($tenant,'preview.wizard@frotapro.test');

    $template=ctiTemplate(
        $tenant,
        'Documento Preview',
        null,
        "CONTRATO DE PREVIEW\n\nCLÁUSULA PRIMEIRA\nObjeto contratual."
    );

    $tipo=ctiTipo(
        $tenant,
        'preview_wizard',
        $template
    );

    ctiLogin($this,$user);

    $response=$this
        ->withHeaders(ctiHeaders())
        ->postJson('/api/contratos/preview',[
            'tipo_contrato_id'=>$tipo->id,
        ])
        ->assertOk();

    expect((string)$response->json('data.html'))
        ->toContain('CONTRATO DE PREVIEW');

    expect(Contrato::query()->count())->toBe(0);
});

test('preview moderno bloqueia substituicao de template',function(){
    $tenant=ctiTenant('Preview Seguro','preview-seguro');
    $user=ctiAdmin($tenant,'preview.seguro@frotapro.test');

    $original=ctiTemplate($tenant,'Original');
    $indevido=ctiTemplate($tenant,'Indevido');

    $tipo=ctiTipo(
        $tenant,
        'preview_seguro',
        $original
    );

    ctiLogin($this,$user);

    $this
        ->withHeaders(ctiHeaders())
        ->postJson('/api/contratos/preview',[
            'tipo_contrato_id'=>$tipo->id,
            'template_id'=>$indevido->id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('template_id');

    expect(Contrato::query()->count())->toBe(0);
});

test('preview moderno rejeita tipo de outro tenant',function(){
    $tenant=ctiTenant('Preview Origem','preview-origem');
    $outro=ctiTenant('Preview Externo','preview-externo');

    $user=ctiAdmin($tenant,'preview.origem@frotapro.test');

    $template=ctiTemplate($outro,'Template Externo');
    $tipo=ctiTipo($outro,'tipo_externo',$template);

    ctiLogin($this,$user);

    $this
        ->withHeaders(ctiHeaders())
        ->postJson('/api/contratos/preview',[
            'tipo_contrato_id'=>$tipo->id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('tipo_contrato_id');

    expect(Contrato::query()->count())->toBe(0);
});

// FROTAPRO_4L2_TENANT_PDF

test('preview pdf devolve pdf real sem criar contrato ou consumir numero',function(){
    $tenant=ctiTenant(
        'Tenant Preview PDF',
        'tenant-preview-pdf-4l2'
    );

    $admin=ctiAdmin(
        $tenant,
        'pdf.4l2@frotapro.test'
    );

    $template=ctiTemplate(
        $tenant,
        'Contrato PDF',
        null,
        "CONTRATO DE PREVIEW\n\nCLÁUSULA PRIMEIRA\n\nObjeto contratual."
    );

    $tipo=ctiTipo(
        $tenant,
        'pdf_preview_4l2',
        $template
    );

    ctiLogin($this,$admin);

    $contratosAntes=\App\Models\Contrato::count();
    $documentosAntes=\App\Models\Documento::count();

    $sequenciaAntes=null;

    if(\Illuminate\Support\Facades\Schema::hasTable('document_sequences')){
        $sequenciaAntes=\Illuminate\Support\Facades\DB::table(
            'document_sequences'
        )->where('chave','documentos')
         ->value('ultimo_numero');
    }

    $response=$this
        ->withHeaders(ctiHeaders())
        ->postJson(
            '/api/contratos/preview-pdf',
            [
                'tipo_contrato_id'=>$tipo->id,
            ]
        )
        ->assertOk();

    expect(
        $response->headers->get('Content-Type')
    )->toContain('application/pdf');

    expect(
        $response->headers->get('Cache-Control')
    )->toContain('no-store');

    $binary=$response->baseResponse->getContent();

    expect(is_string($binary))->toBeTrue();

    expect($binary)->toStartWith('%PDF-');

    expect(strlen($binary))
        ->toBeGreaterThan(1000);

    $parser=new \Smalot\PdfParser\Parser();

    $parsed=$parser->parseContent($binary);

    expect(count($parsed->getPages()))
        ->toBeGreaterThanOrEqual(1);

    $text=preg_replace(
        '/\s+/u',
        ' ',
        $parsed->getText()
    );

    expect($text)->toContain('A ATRIBUIR');

    expect(\App\Models\Contrato::count())
        ->toBe($contratosAntes);

    expect(\App\Models\Documento::count())
        ->toBe($documentosAntes);

    if(\Illuminate\Support\Facades\Schema::hasTable('document_sequences')){
        $sequenciaDepois=\Illuminate\Support\Facades\DB::table(
            'document_sequences'
        )->where('chave','documentos')
         ->value('ultimo_numero');

        expect($sequenciaDepois)
            ->toBe($sequenciaAntes);
    }
});

test('preview pdf recusa tipo pertencente a outro tenant',function(){
    $tenant=ctiTenant(
        'Tenant PDF Local',
        'tenant-pdf-local-4l2'
    );

    $externo=ctiTenant(
        'Tenant PDF Externo',
        'tenant-pdf-externo-4l2'
    );

    $admin=ctiAdmin(
        $tenant,
        'pdf.externo.4l2@frotapro.test'
    );

    $template=ctiTemplate(
        $externo,
        'Template Externo'
    );

    $tipo=ctiTipo(
        $externo,
        'pdf_externo_4l2',
        $template
    );

    ctiLogin($this,$admin);

    $this
        ->withHeaders(ctiHeaders())
        ->postJson(
            '/api/contratos/preview-pdf',
            [
                'tipo_contrato_id'=>$tipo->id,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'tipo_contrato_id'
        );

    expect(\App\Models\Contrato::count())
        ->toBe(0);
});

test('preview pdf impede substituicao de template',function(){
    $tenant=ctiTenant(
        'Tenant PDF Seguro',
        'tenant-pdf-seguro-4l2'
    );

    $admin=ctiAdmin(
        $tenant,
        'pdf.seguro.4l2@frotapro.test'
    );

    $original=ctiTemplate(
        $tenant,
        'Documento Original'
    );

    $indevido=ctiTemplate(
        $tenant,
        'Documento Indevido'
    );

    $tipo=ctiTipo(
        $tenant,
        'pdf_seguro_4l2',
        $original
    );

    ctiLogin($this,$admin);

    $this
        ->withHeaders(ctiHeaders())
        ->postJson(
            '/api/contratos/preview-pdf',
            [
                'tipo_contrato_id'=>$tipo->id,
                'template_id'=>$indevido->id,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'template_id'
        );

    expect(\App\Models\Contrato::count())
        ->toBe(0);
});
