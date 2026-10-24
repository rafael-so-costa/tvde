<?php

use App\Models\ChecklistProcessTemplate;
use App\Models\ChecklistProcessTemplateItem;
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
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function tipoContratoHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function tipoContratoTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function tipoContratoUser(
    Tenant $tenant,
    string $email,
    string $nivel='configurar'
): User {
    $user=User::factory()->create([
        'email'=>$email,
        'password'=>Hash::make('SenhaTeste123!'),
        'ativo'=>true,
    ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    $role=Role::firstOrCreate(
        ['codigo'=>'funcionario'],
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

    $permission=Permission::firstOrCreate(
        ['codigo'=>'contratos'],
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
            'nivel'=>$nivel,
        ]
    );

    return $user;
}

function tipoContratoLogin(
    $test,
    User $user
): void {
    $test
        ->postJson('/login',[
            'email'=>$user->email,
            'password'=>'SenhaTeste123!',
        ])
        ->assertOk();
}

function tipoContratoTemplate(
    Tenant $tenant,
    string $nome='Template de Contrato'
): TemplateContrato {
    $template=new TemplateContrato([
        'nome'=>$nome,
        'tipo_arquivo'=>'txt',
        'conteudo_original'=>
            'Contrato {{NOME_MOTORISTA}} {{ASSINATURA_MOTORISTA}}',
        'campos_detectados'=>[],
        'campos_mapeados'=>[],
    ]);

    $template->tenant_id=$tenant->id;
    $template->save();

    return $template;
}

function tipoContratoWorkflow(
    Tenant $tenant,
    string $codigo='workflow_contrato'
): ChecklistProcessTemplate {
    $template=new ChecklistProcessTemplate([
        'codigo'=>$codigo,
        'nome'=>'Workflow do contrato',
        'descricao'=>'Processo de teste.',
        'ativo'=>true,
        'versao'=>1,
    ]);

    $template->tenant_id=$tenant->id;
    $template->save();

    $items=[
        [
            'codigo'=>'gerar_documento',
            'ordem'=>1,
            'titulo'=>'Gerar documento',
            'tipo'=>'gerar_documento',
            'configuracao'=>[],
        ],
        [
            'codigo'=>'assinatura_motorista',
            'ordem'=>2,
            'titulo'=>'Assinatura do motorista',
            'tipo'=>'assinatura',
            'configuracao'=>[
                'placeholder'=>'ASSINATURA_MOTORISTA',
            ],
        ],
        [
            'codigo'=>'criar_acesso_motorista',
            'ordem'=>3,
            'titulo'=>'Criar acesso do motorista',
            'tipo'=>'acao_sistema',
            'configuracao'=>[
                'action'=>'motorista_acesso',
            ],
        ],
        [
            'codigo'=>'checklist_entrega',
            'ordem'=>4,
            'titulo'=>'Checklist de entrega',
            'tipo'=>'checklist_veiculo',
            'configuracao'=>[
                'checklist_tipo'=>'entrega',
            ],
        ],
    ];

    foreach($items as $itemData){
        $item=new ChecklistProcessTemplateItem([
            ...$itemData,
            'obrigatorio'=>true,
        ]);

        $item->template_id=$template->id;
        $item->save();
    }

    return $template->fresh()->load('items');
}

test(
    'rotas de tipos de contrato exigem autenticação',
    function(){
        $this
            ->withHeaders(tipoContratoHeaders())
            ->getJson('/api/tipos-contrato')
            ->assertUnauthorized();
    }
);

test(
    'tipo de contrato é criado com template workflow entidades campos e assinaturas',
    function(){
        $tenant=tipoContratoTenant(
            'Tenant Tipo',
            'tenant-tipo'
        );

        $user=tipoContratoUser(
            $tenant,
            'tipo@frotapro.test'
        );

        $template=tipoContratoTemplate(
            $tenant
        );

        $workflow=tipoContratoWorkflow(
            $tenant
        );

        tipoContratoLogin(
            $this,
            $user
        );

        $response=$this
            ->withHeaders(
                tipoContratoHeaders()
            )
            ->postJson(
                '/api/tipos-contrato',
                [
                    'nome'=>
                        'Contrato de Aluguer',

                    'slug'=>
                        'contrato-de-aluguer',

                    'codigo'=>
                        'contrato_aluguer',

                    'descricao'=>
                        'Contrato padrão para aluguer.',

                    'template_id'=>
                        $template->id,

                    'checklist_process_template_id'=>
                        $workflow->id,

                    'entidades'=>[
                        'empresa'=>true,
                        'proprietario'=>false,
                        'motorista'=>true,
                        'veiculo'=>true,
                    ],

                    'campos_configuracao'=>[
                        [
                            'campo'=>'DATA_INICIO',
                            'origem'=>'manual',
                            'tipo'=>'date',
                            'obrigatorio'=>true,
                        ],
                        [
                            'campo'=>'NOME_MOTORISTA',
                            'origem'=>'automatico',
                            'fonte'=>'motorista.nome_completo',
                            'tipo'=>'text',
                            'obrigatorio'=>true,
                        ],
                    ],

                    'assinaturas_configuracao'=>[
                        [
                            'placeholder'=>
                                'ASSINATURA_MOTORISTA',

                            'obrigatoria'=>true,

                            'modos'=>[
                                'presencial',
                                'remota',
                            ],
                        ],
                    ],

                    'configuracao'=>[
                        'associar_motorista_veiculo'=>true,
                    ],

                    'ativo'=>true,
                    'mostrar_menu'=>true,
                    'ordem'=>10,
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.nome',
                'Contrato de Aluguer'
            )
            ->assertJsonPath(
                'data.codigo',
                'contrato_aluguer'
            )
            ->assertJsonPath(
                'data.template_id',
                $template->id
            )
            ->assertJsonPath(
                'data.checklist_process_template_id',
                $workflow->id
            )
            ->assertJsonPath(
                'data.entidades.motorista',
                true
            )
            ->assertJsonPath(
                'data.assinaturas_configuracao.0.placeholder',
                'ASSINATURA_MOTORISTA'
            );

        $id=$response->json('data.id');

        $this->assertDatabaseHas(
            'tipos_contrato',
            [
                'id'=>$id,
                'tenant_id'=>$tenant->id,
                'codigo'=>'contrato_aluguer',
                'template_id'=>$template->id,
                'checklist_process_template_id'=>
                    $workflow->id,
                'ativo'=>true,
                'mostrar_menu'=>true,
                'ordem'=>10,
            ]
        );
    }
);

test(
    'tipos de contrato são isolados por tenant',
    function(){
        $tenantA=tipoContratoTenant(
            'Tenant A',
            'tenant-tipo-a'
        );

        $tenantB=tipoContratoTenant(
            'Tenant B',
            'tenant-tipo-b'
        );

        $userA=tipoContratoUser(
            $tenantA,
            'tipo.a@frotapro.test'
        );

        $tipoA=new TipoContrato([
            'nome'=>'Contrato A',
            'slug'=>'contrato-a',
            'codigo'=>'contrato_a',
            'ativo'=>true,
            'mostrar_menu'=>true,
            'ordem'=>1,
        ]);

        $tipoA->tenant_id=$tenantA->id;
        $tipoA->save();

        $tipoB=new TipoContrato([
            'nome'=>'Contrato B',
            'slug'=>'contrato-b',
            'codigo'=>'contrato_b',
            'ativo'=>true,
            'mostrar_menu'=>true,
            'ordem'=>1,
        ]);

        $tipoB->tenant_id=$tenantB->id;
        $tipoB->save();

        tipoContratoLogin(
            $this,
            $userA
        );

        $response=$this
            ->withHeaders(
                tipoContratoHeaders()
            )
            ->getJson('/api/tipos-contrato')
            ->assertOk()
            ->assertJsonCount(1,'data');

        expect(
            $response->json('data.0.id')
        )->toBe($tipoA->id);

        $this
            ->withHeaders(
                tipoContratoHeaders()
            )
            ->getJson(
                "/api/tipos-contrato/{$tipoB->id}"
            )
            ->assertNotFound();

        $this
            ->withHeaders(
                tipoContratoHeaders()
            )
            ->patchJson(
                "/api/tipos-contrato/{$tipoB->id}",
                [
                    'nome'=>'Ataque',
                ]
            )
            ->assertNotFound();
    }
);

test(
    'tipo de contrato não aceita template de outro tenant',
    function(){
        $tenantA=tipoContratoTenant(
            'Tenant Template A',
            'tenant-template-a'
        );

        $tenantB=tipoContratoTenant(
            'Tenant Template B',
            'tenant-template-b'
        );

        $userA=tipoContratoUser(
            $tenantA,
            'template.a@frotapro.test'
        );

        $templateB=tipoContratoTemplate(
            $tenantB,
            'Template B'
        );

        tipoContratoLogin(
            $this,
            $userA
        );

        $this
            ->withHeaders(
                tipoContratoHeaders()
            )
            ->postJson(
                '/api/tipos-contrato',
                [
                    'nome'=>'Contrato Inválido',
                    'slug'=>'contrato-invalido',
                    'codigo'=>'contrato_invalido',
                    'template_id'=>$templateB->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'template_id'
            );

        expect(
            TipoContrato::count()
        )->toBe(0);
    }
);

test(
    'tipo de contrato não aceita workflow de outro tenant',
    function(){
        $tenantA=tipoContratoTenant(
            'Tenant Workflow A',
            'tenant-workflow-a'
        );

        $tenantB=tipoContratoTenant(
            'Tenant Workflow B',
            'tenant-workflow-b'
        );

        $userA=tipoContratoUser(
            $tenantA,
            'workflow.a@frotapro.test'
        );

        $workflowB=tipoContratoWorkflow(
            $tenantB,
            'workflow_b'
        );

        tipoContratoLogin(
            $this,
            $userA
        );

        $this
            ->withHeaders(
                tipoContratoHeaders()
            )
            ->postJson(
                '/api/tipos-contrato',
                [
                    'nome'=>'Contrato Inválido',
                    'slug'=>'contrato-invalido',
                    'codigo'=>'contrato_invalido',
                    'checklist_process_template_id'=>
                        $workflowB->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'checklist_process_template_id'
            );

        expect(
            TipoContrato::count()
        )->toBe(0);
    }
);

test(
    'menu retorna somente tipos ativos configurados para aparecer',
    function(){
        $tenant=tipoContratoTenant(
            'Tenant Menu',
            'tenant-menu'
        );

        $user=tipoContratoUser(
            $tenant,
            'menu@frotapro.test',
            'visualizar'
        );

        $menuTemplate=tipoContratoTemplate(
            $tenant,
            'Template Menu 4N30'
        );

        $menuTemplate->ativo=true;
        $menuTemplate->save();

        $menuWorkflow=tipoContratoWorkflow(
            $tenant,
            'workflow_menu_4n30'
        );

        foreach([
            [
                'nome'=>'Segundo',
                'slug'=>'segundo',
                'codigo'=>'segundo',
                'ativo'=>true,
                'mostrar_menu'=>true,
                'ordem'=>20,
            ],
            [
                'nome'=>'Primeiro',
                'slug'=>'primeiro',
                'codigo'=>'primeiro',
                'ativo'=>true,
                'mostrar_menu'=>true,
                'ordem'=>10,
            ],
            [
                'nome'=>'Oculto',
                'slug'=>'oculto',
                'codigo'=>'oculto',
                'ativo'=>true,
                'mostrar_menu'=>false,
                'ordem'=>5,
            ],
            [
                'nome'=>'Inativo',
                'slug'=>'inativo',
                'codigo'=>'inativo',
                'ativo'=>false,
                'mostrar_menu'=>true,
                'ordem'=>1,
            ],
        ] as $data){
            if(
                ($data['ativo']??false) &&
                ($data['mostrar_menu']??false)
            ){
                $data['template_id']=$menuTemplate->id;
                $data['checklist_process_template_id']=$menuWorkflow->id;
            }

            $tipo=new TipoContrato(
                $data
            );

            $tipo->tenant_id=$tenant->id;
            $tipo->save();
        }

        tipoContratoLogin(
            $this,
            $user
        );

        $response=$this
            ->withHeaders(
                tipoContratoHeaders()
            )
            ->getJson(
                '/api/tipos-contrato?menu=1'
            )
            ->assertOk()
            ->assertJsonCount(2,'data');

        expect(
            $response->json(
                'data.0.codigo'
            )
        )->toBe('primeiro');

        expect(
            $response->json(
                'data.1.codigo'
            )
        )->toBe('segundo');
    }
);

test(
    'arquivar tipo retira do menu sem apagar histórico',
    function(){
        $tenant=tipoContratoTenant(
            'Tenant Arquivo',
            'tenant-arquivo'
        );

        $user=tipoContratoUser(
            $tenant,
            'arquivo@frotapro.test'
        );

        $tipo=new TipoContrato([
            'nome'=>'Contrato Arquivável',
            'slug'=>'contrato-arquivavel',
            'codigo'=>'contrato_arquivavel',
            'ativo'=>true,
            'mostrar_menu'=>true,
            'ordem'=>1,
        ]);

        $tipo->tenant_id=$tenant->id;
        $tipo->save();

        tipoContratoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                tipoContratoHeaders()
            )
            ->postJson(
                "/api/tipos-contrato/{$tipo->id}/arquivar"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.ativo',
                false
            )
            ->assertJsonPath(
                'data.mostrar_menu',
                false
            );

        $this->assertDatabaseHas(
            'tipos_contrato',
            [
                'id'=>$tipo->id,
                'tenant_id'=>$tenant->id,
                'ativo'=>false,
                'mostrar_menu'=>false,
            ]
        );

        $this
            ->withHeaders(
                tipoContratoHeaders()
            )
            ->getJson(
                '/api/tipos-contrato?menu=1'
            )
            ->assertOk()
            ->assertJsonCount(0,'data');

        $this
            ->withHeaders(
                tipoContratoHeaders()
            )
            ->getJson(
                '/api/tipos-contrato?incluir_inativos=1'
            )
            ->assertOk()
            ->assertJsonFragment([
                'id'=>$tipo->id,
            ]);
    }
);

test('4n29 tipo incompleto pode existir apenas como rascunho inativo',function(){
    $tenant=tipoContratoTenant('Homologacao Inativo','h29-inativo');
    $user=tipoContratoUser($tenant,'h29-inativo@frotapro.test');
    tipoContratoLogin($this,$user);

    $response=$this->withHeaders(tipoContratoHeaders())
        ->postJson('/api/tipos-contrato',[
            'nome'=>'Contrato ainda em configuracao',
            'slug'=>'contrato-a-configurar',
            'codigo'=>'contrato_a_configurar',
            'ativo'=>false,
            'mostrar_menu'=>false,
        ])
        ->assertCreated()
        ->assertJsonPath('data.ativo',false);

    $this->withHeaders(tipoContratoHeaders())
        ->getJson('/api/tipos-contrato?menu=1')
        ->assertOk()
        ->assertJsonMissing(['id'=>$response->json('data.id')]);
});

test('4n29 tipo nao pode ser ativado sem modelo e workflow',function(){
    $tenant=tipoContratoTenant('Homologacao Ativacao','h29-ativacao');
    $user=tipoContratoUser($tenant,'h29-ativacao@frotapro.test');
    tipoContratoLogin($this,$user);

    $this->withHeaders(tipoContratoHeaders())
        ->postJson('/api/tipos-contrato',[
            'nome'=>'Contrato de aluguer incompleto',
            'slug'=>'aluguer-incompleto',
            'codigo'=>'aluguer_incompleto',
            'ativo'=>true,
            'mostrar_menu'=>true,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'template_id',
            'checklist_process_template_id',
        ]);

    expect(
        \App\Models\TipoContrato::query()
            ->where('tenant_id',$tenant->id)
            ->count()
    )->toBe(0);
});

test('4n29 nao reativa tipo incompleto sem modelo e workflow',function(){
    $tenant=tipoContratoTenant('Homologacao Reativacao','h29-reativacao');
    $user=tipoContratoUser($tenant,'h29-reativacao@frotapro.test');

    $type=new \App\Models\TipoContrato([
        'nome'=>'Tipo legado sem template',
        'slug'=>'legado-sem-template',
        'codigo'=>'legado_sem_template',
        'ativo'=>false,
        'mostrar_menu'=>false,
    ]);

    $type->tenant_id=$tenant->id;
    $type->save();

    tipoContratoLogin($this,$user);

    $this->withHeaders(tipoContratoHeaders())
        ->patchJson('/api/tipos-contrato/'.$type->id,[
            'ativo'=>true,
            'mostrar_menu'=>true,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'template_id',
            'checklist_process_template_id',
        ]);

    expect($type->fresh()->ativo)->toBeFalse();
});

test('4n29 nao remove template de tipo ativo',function(){
    $tenant=tipoContratoTenant('Homologacao Template','h29-template');
    $user=tipoContratoUser($tenant,'h29-template@frotapro.test');

    $template=tipoContratoTemplate($tenant);
    $workflow=tipoContratoWorkflow($tenant,'h29-template-fluxo');

    $type=new \App\Models\TipoContrato([
        'nome'=>'Tipo valido',
        'slug'=>'tipo-valido',
        'codigo'=>'tipo_valido',
        'template_id'=>$template->id,
        'checklist_process_template_id'=>$workflow->id,
        'ativo'=>true,
        'mostrar_menu'=>true,
    ]);

    $type->tenant_id=$tenant->id;
    $type->save();

    tipoContratoLogin($this,$user);

    $this->withHeaders(tipoContratoHeaders())
        ->patchJson('/api/tipos-contrato/'.$type->id,[
            'template_id'=>null,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['template_id']);

    expect($type->fresh()->template_id)->toBe($template->id);
});

test('4n29 nao remove workflow de tipo ativo',function(){
    $tenant=tipoContratoTenant('Homologacao Workflow','h29-workflow');
    $user=tipoContratoUser($tenant,'h29-workflow@frotapro.test');

    $template=tipoContratoTemplate($tenant);
    $workflow=tipoContratoWorkflow($tenant,'h29-workflow-fluxo');

    $type=new \App\Models\TipoContrato([
        'nome'=>'Tipo valido',
        'slug'=>'tipo-valido',
        'codigo'=>'tipo_valido',
        'template_id'=>$template->id,
        'checklist_process_template_id'=>$workflow->id,
        'ativo'=>true,
        'mostrar_menu'=>true,
    ]);

    $type->tenant_id=$tenant->id;
    $type->save();

    tipoContratoLogin($this,$user);

    $this->withHeaders(tipoContratoHeaders())
        ->patchJson('/api/tipos-contrato/'.$type->id,[
            'checklist_process_template_id'=>null,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'checklist_process_template_id',
        ]);

    expect(
        $type->fresh()->checklist_process_template_id
    )->toBe($workflow->id);
});

/*
 * 4N.30 - O tipo so pode estar operacional enquanto
 * todas as suas dependencias permanecerem validas.
 */
function frotaPro4N30Fixture(
    \App\Models\Tenant $tenant,
    string $code
): array {
    $template=tipoContratoTemplate(
        $tenant,
        'Modelo '.$code
    );

    $template->ativo=true;
    $template->save();

    $workflow=tipoContratoWorkflow(
        $tenant,
        'workflow_'.$code
    );

    $type=new \App\Models\TipoContrato([
        'nome'=>'Tipo '.$code,
        'slug'=>str_replace('_','-',$code),
        'codigo'=>$code,
        'template_id'=>$template->id,
        'checklist_process_template_id'=>$workflow->id,
        'ativo'=>true,
        'mostrar_menu'=>true,
    ]);

    $type->tenant_id=$tenant->id;
    $type->save();

    return [$type,$template,$workflow];
}

test('4n30 modelo desativado impede novo contrato',function(){
    \Illuminate\Support\Facades\Mail::fake();
    \Illuminate\Support\Facades\Storage::fake('local');

    $tenant=tipoContratoTenant('4N30 Modelo','4n30-modelo');
    $user=tipoContratoUser($tenant,'4n30.modelo@frotapro.test');

    [$type,$template,$workflow]=frotaPro4N30Fixture(
        $tenant,'tipo_modelo_desativado'
    );

    $template->ativo=false;
    $template->save();

    tipoContratoLogin($this,$user);

    $this->withHeaders(tipoContratoHeaders())
        ->postJson('/api/contratos',[
            'tipo_contrato_id'=>$type->id,
            'data_inicio'=>'2026-11-01',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['tipo_contrato_id']);

    expect(
        \App\Models\Contrato::query()
            ->where('tenant_id',$tenant->id)
            ->count()
    )->toBe(0);
});

test('4n30 workflow desativado impede novo contrato',function(){
    \Illuminate\Support\Facades\Mail::fake();
    \Illuminate\Support\Facades\Storage::fake('local');

    $tenant=tipoContratoTenant('4N30 Workflow','4n30-workflow');
    $user=tipoContratoUser($tenant,'4n30.workflow@frotapro.test');

    [$type,$template,$workflow]=frotaPro4N30Fixture(
        $tenant,'tipo_workflow_desativado'
    );

    $workflow->ativo=false;
    $workflow->save();

    tipoContratoLogin($this,$user);

    $this->withHeaders(tipoContratoHeaders())
        ->postJson('/api/contratos',[
            'tipo_contrato_id'=>$type->id,
            'data_inicio'=>'2026-11-01',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['tipo_contrato_id']);

    expect(
        \App\Models\Contrato::query()
            ->where('tenant_id',$tenant->id)
            ->count()
    )->toBe(0);
});

test('4n30 workflow sem etapas impede novo contrato',function(){
    \Illuminate\Support\Facades\Mail::fake();
    \Illuminate\Support\Facades\Storage::fake('local');

    $tenant=tipoContratoTenant('4N30 Etapas','4n30-etapas');
    $user=tipoContratoUser($tenant,'4n30.etapas@frotapro.test');

    [$type,$template,$workflow]=frotaPro4N30Fixture(
        $tenant,'tipo_workflow_vazio'
    );

    $workflow->items()->delete();

    tipoContratoLogin($this,$user);

    $this->withHeaders(tipoContratoHeaders())
        ->postJson('/api/contratos',[
            'tipo_contrato_id'=>$type->id,
            'data_inicio'=>'2026-11-01',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['tipo_contrato_id']);

    expect(
        \App\Models\Contrato::query()
            ->where('tenant_id',$tenant->id)
            ->count()
    )->toBe(0);
});

test('4n30 menu omite tipo legado incompleto',function(){
    $tenant=tipoContratoTenant('4N30 Menu','4n30-menu');
    $user=tipoContratoUser($tenant,'4n30.menu@frotapro.test');

    [$valid]=frotaPro4N30Fixture(
        $tenant,'tipo_valido_menu'
    );

    $invalid=new \App\Models\TipoContrato([
        'nome'=>'Tipo legado incompleto',
        'slug'=>'tipo-legado-incompleto',
        'codigo'=>'tipo_legado_incompleto',
        'ativo'=>true,
        'mostrar_menu'=>true,
    ]);

    $invalid->tenant_id=$tenant->id;
    $invalid->save();

    tipoContratoLogin($this,$user);

    $this->withHeaders(tipoContratoHeaders())
        ->getJson('/api/tipos-contrato?menu=1')
        ->assertOk()
        ->assertJsonCount(1,'data')
        ->assertJsonPath('data.0.id',$valid->id);

    /*
     * O tipo continua consultavel na configuracao.
     */
    $this->withHeaders(tipoContratoHeaders())
        ->getJson('/api/tipos-contrato?incluir_inativos=1')
        ->assertOk()
        ->assertJsonFragment(['id'=>$invalid->id]);
});

test('4n30 menu omite tipo com modelo desativado',function(){
    $tenant=tipoContratoTenant('4N30 Menu Modelo','4n30-menu-modelo');
    $user=tipoContratoUser($tenant,'4n30.menu.modelo@frotapro.test');

    [$type,$template]=frotaPro4N30Fixture(
        $tenant,'tipo_menu_modelo'
    );

    $template->ativo=false;
    $template->save();

    tipoContratoLogin($this,$user);

    $this->withHeaders(tipoContratoHeaders())
        ->getJson('/api/tipos-contrato?menu=1')
        ->assertOk()
        ->assertJsonCount(0,'data');

    expect($type->fresh()->ativo)->toBeTrue();
});

test('4n30 menu omite tipo com workflow sem etapas',function(){
    $tenant=tipoContratoTenant('4N30 Menu Etapas','4n30-menu-etapas');
    $user=tipoContratoUser($tenant,'4n30.menu.etapas@frotapro.test');

    [$type,$template,$workflow]=frotaPro4N30Fixture(
        $tenant,'tipo_menu_sem_etapas'
    );

    $workflow->items()->delete();

    tipoContratoLogin($this,$user);

    $this->withHeaders(tipoContratoHeaders())
        ->getJson('/api/tipos-contrato?menu=1')
        ->assertOk()
        ->assertJsonCount(0,'data');

    expect($type->fresh()->ativo)->toBeTrue();
});
