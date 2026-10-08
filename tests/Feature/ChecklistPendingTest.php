<?php

use App\Models\ChecklistProcessTemplate;
use App\Models\ChecklistProcessTemplateItem;
use App\Models\ChecklistRecord;
use App\Models\Contrato;
use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use App\Services\ChecklistProcessService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function pendingHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function pendingTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function pendingAdmin(
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

    $permission=Permission::firstOrCreate(
        [
            'codigo'=>'checklist',
        ],
        [
            'modulo'=>'checklist',
            'nome'=>'Checklists',
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

function pendingLogin(
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

function pendingMotorista(
    Tenant $tenant,
    string $suffix
): Motorista {
    $motorista=new Motorista([
        'nome_completo'=>
            "Motorista {$suffix}",

        'email'=>
            strtolower($suffix).
            '@pending.test',
    ]);

    $motorista->tenant_id=
        $tenant->id;

    $motorista->save();

    return $motorista;
}

function pendingVeiculo(
    Tenant $tenant,
    string $matricula
): Veiculo {
    $veiculo=new Veiculo([
        'matricula'=>$matricula,
        'marca'=>'Tesla',
        'modelo'=>'Model 3',
        'cor'=>'Preto',
    ]);

    $veiculo->tenant_id=
        $tenant->id;

    $veiculo->save();

    return $veiculo;
}

function pendingContrato(
    Tenant $tenant,
    Motorista $motorista,
    Veiculo $veiculo,
    string $status='assinado'
): Contrato {
    $contrato=new Contrato([
        'tipo'=>'aluguer',
        'motorista_id'=>$motorista->id,
        'veiculo_id'=>$veiculo->id,
    ]);

    $contrato->tenant_id=
        $tenant->id;

    $contrato->status=
        $status;

    if($status==='assinado'){
        $contrato->data_assinatura=
            now();
    }

    $contrato->save();

    return $contrato;
}

function pendingProcess(
    Tenant $tenant,
    Contrato $contrato,
    bool $withPrevious=false
): array {
    $template=new ChecklistProcessTemplate([
        'codigo'=>
            'workflow_checklist_'.
            substr(
                $contrato->id,
                0,
                8
            ),

        'nome'=>
            'Workflow checklist',

        'ativo'=>true,
        'versao'=>1,
    ]);

    $template->tenant_id=
        $tenant->id;

    $template->save();

    $ordem=1;

    if($withPrevious){
        $previous=
            new ChecklistProcessTemplateItem([
                'codigo'=>
                    'validar_dados',

                'ordem'=>$ordem++,

                'titulo'=>
                    'Validar dados',

                'tipo'=>
                    'tarefa',

                'obrigatorio'=>true,

                'configuracao'=>[],
            ]);

        $previous->template_id=
            $template->id;

        $previous->save();
    }

    $checklist=
        new ChecklistProcessTemplateItem([
            'codigo'=>
                'checklist_entrega',

            'ordem'=>$ordem,

            'titulo'=>
                'Checklist de entrega',

            'descricao'=>
                'Realizar inspeção física do veículo.',

            'tipo'=>
                'checklist_veiculo',

            'obrigatorio'=>true,

            'configuracao'=>[
                'checklist_tipo'=>
                    'entrega',
            ],
        ]);

    $checklist->template_id=
        $template->id;

    $checklist->save();

    $run=app(
        ChecklistProcessService::class
    )->start(
        $tenant->id,
        $template,
        ChecklistProcessService::ENTITY_CONTRATO,
        $contrato->id
    );

    return [
        $run,
        $run->items
            ->firstWhere(
                'codigo',
                'checklist_entrega'
            ),
        $run->items
            ->firstWhere(
                'codigo',
                'validar_dados'
            ),
    ];
}

function pendingSignature(): string
{
    return
        'data:image/png;base64,'.
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZrUQAAAAASUVORK5CYII=';
}

test(
    'fila de checklists pendentes exige autenticação',
    function(){
        $this
            ->withHeaders(
                pendingHeaders()
            )
            ->getJson(
                '/api/checklists/pendentes'
            )
            ->assertUnauthorized();
    }
);

test(
    'etapa disponível aparece na fila de checklists pendentes',
    function(){
        $tenant=pendingTenant(
            'Tenant Fila',
            'tenant-fila'
        );

        $admin=pendingAdmin(
            $tenant,
            'admin.fila@frotapro.test'
        );

        $motorista=pendingMotorista(
            $tenant,
            'Fila'
        );

        $veiculo=pendingVeiculo(
            $tenant,
            'AA-10-AA'
        );

        $contrato=pendingContrato(
            $tenant,
            $motorista,
            $veiculo
        );

        [, $item]=pendingProcess(
            $tenant,
            $contrato
        );

        pendingLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                pendingHeaders()
            )
            ->getJson(
                '/api/checklists/pendentes'
            )
            ->assertOk()
            ->assertJsonCount(
                1,
                'data'
            )
            ->assertJsonPath(
                'data.0.item_id',
                $item->id
            )
            ->assertJsonPath(
                'data.0.contrato_id',
                $contrato->id
            )
            ->assertJsonPath(
                'data.0.checklist_tipo',
                'entrega'
            )
            ->assertJsonPath(
                'data.0.status',
                'pendente'
            )
            ->assertJsonPath(
                'data.0.motorista.id',
                $motorista->id
            )
            ->assertJsonPath(
                'data.0.veiculo.matricula',
                'AA-10-AA'
            )
            ->assertJsonPath(
                'meta.pendentes',
                1
            );
    }
);

test(
    'checklist fica bloqueado enquanto existir etapa obrigatória anterior',
    function(){
        $tenant=pendingTenant(
            'Tenant Bloqueado',
            'tenant-bloqueado'
        );

        $admin=pendingAdmin(
            $tenant,
            'admin.bloqueado@frotapro.test'
        );

        $motorista=pendingMotorista(
            $tenant,
            'Bloqueado'
        );

        $veiculo=pendingVeiculo(
            $tenant,
            'BB-20-BB'
        );

        $contrato=pendingContrato(
            $tenant,
            $motorista,
            $veiculo
        );

        [, $item]=pendingProcess(
            $tenant,
            $contrato,
            true
        );

        pendingLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                pendingHeaders()
            )
            ->getJson(
                '/api/checklists/pendentes'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.0.status',
                'bloqueado'
            )
            ->assertJsonPath(
                'meta.bloqueados',
                1
            );

        $this
            ->withHeaders(
                pendingHeaders()
            )
            ->postJson(
                "/api/checklists/pendentes/{$item->id}/iniciar"
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'checklist'
            );

        expect(
            ChecklistRecord::count()
        )->toBe(0);
    }
);

test(
    'checklist pode ser iniciado após concluir etapas anteriores',
    function(){
        $tenant=pendingTenant(
            'Tenant Iniciar',
            'tenant-iniciar'
        );

        $admin=pendingAdmin(
            $tenant,
            'admin.iniciar@frotapro.test'
        );

        $motorista=pendingMotorista(
            $tenant,
            'Iniciar'
        );

        $veiculo=pendingVeiculo(
            $tenant,
            'CC-30-CC'
        );

        $contrato=pendingContrato(
            $tenant,
            $motorista,
            $veiculo
        );

        [$run,$item,$previous]=
            pendingProcess(
                $tenant,
                $contrato,
                true
            );

        app(
            ChecklistProcessService::class
        )->completeItem(
            $tenant->id,
            $run->id,
            $previous->id,
            $admin->id,
            [
                'validado'=>true,
            ]
        );

        pendingLogin(
            $this,
            $admin
        );

        $response=$this
            ->withHeaders(
                pendingHeaders()
            )
            ->postJson(
                "/api/checklists/pendentes/{$item->id}/iniciar"
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.contrato_id',
                $contrato->id
            )
            ->assertJsonPath(
                'data.process_run_item_id',
                $item->id
            )
            ->assertJsonPath(
                'data.tipo',
                'entrega'
            )
            ->assertJsonPath(
                'data.origem',
                'workflow'
            )
            ->assertJsonPath(
                'data.motorista_id',
                $motorista->id
            )
            ->assertJsonPath(
                'data.veiculo_id',
                $veiculo->id
            );

        $id=$response->json(
            'data.id'
        );

        $this->assertDatabaseHas(
            'checklist_records',
            [
                'id'=>$id,
                'tenant_id'=>$tenant->id,
                'contrato_id'=>$contrato->id,
                'process_run_item_id'=>$item->id,
                'tipo'=>'entrega',
                'origem'=>'workflow',
                'estado'=>'rascunho',
            ]
        );

        $this
            ->withHeaders(
                pendingHeaders()
            )
            ->getJson(
                '/api/checklists/pendentes'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.0.status',
                'iniciado'
            )
            ->assertJsonPath(
                'meta.iniciados',
                1
            );
    }
);

test(
    'iniciar mesma etapa novamente reutiliza checklist existente',
    function(){
        $tenant=pendingTenant(
            'Tenant Idempotente',
            'tenant-idempotente'
        );

        $admin=pendingAdmin(
            $tenant,
            'admin.idempotente@frotapro.test'
        );

        $motorista=pendingMotorista(
            $tenant,
            'Idempotente'
        );

        $veiculo=pendingVeiculo(
            $tenant,
            'DD-40-DD'
        );

        $contrato=pendingContrato(
            $tenant,
            $motorista,
            $veiculo
        );

        [, $item]=pendingProcess(
            $tenant,
            $contrato
        );

        pendingLogin(
            $this,
            $admin
        );

        $primeiro=$this
            ->withHeaders(
                pendingHeaders()
            )
            ->postJson(
                "/api/checklists/pendentes/{$item->id}/iniciar"
            )
            ->assertCreated();

        $segundo=$this
            ->withHeaders(
                pendingHeaders()
            )
            ->postJson(
                "/api/checklists/pendentes/{$item->id}/iniciar"
            )
            ->assertCreated();

        expect(
            $segundo->json('data.id')
        )->toBe(
            $primeiro->json('data.id')
        );

        expect(
            ChecklistRecord::query()
                ->where(
                    'process_run_item_id',
                    $item->id
                )
                ->count()
        )->toBe(1);
    }
);

test(
    'checklist de workflow não pode iniciar antes de contrato assinado',
    function(){
        $tenant=pendingTenant(
            'Tenant Não Assinado',
            'tenant-nao-assinado'
        );

        $admin=pendingAdmin(
            $tenant,
            'admin.nao.assinado@frotapro.test'
        );

        $motorista=pendingMotorista(
            $tenant,
            'NaoAssinado'
        );

        $veiculo=pendingVeiculo(
            $tenant,
            'EE-50-EE'
        );

        $contrato=pendingContrato(
            $tenant,
            $motorista,
            $veiculo,
            'rascunho'
        );

        [, $item]=pendingProcess(
            $tenant,
            $contrato
        );

        pendingLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                pendingHeaders()
            )
            ->postJson(
                "/api/checklists/pendentes/{$item->id}/iniciar"
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'contrato'
            );

        expect(
            ChecklistRecord::count()
        )->toBe(0);
    }
);

test(
    'fila de checklists é isolada por tenant',
    function(){
        $tenantA=pendingTenant(
            'Tenant Pending A',
            'tenant-pending-a'
        );

        $tenantB=pendingTenant(
            'Tenant Pending B',
            'tenant-pending-b'
        );

        $adminA=pendingAdmin(
            $tenantA,
            'admin.pending.a@frotapro.test'
        );

        $motoristaA=pendingMotorista(
            $tenantA,
            'TenantA'
        );

        $veiculoA=pendingVeiculo(
            $tenantA,
            'FF-60-FF'
        );

        $contratoA=pendingContrato(
            $tenantA,
            $motoristaA,
            $veiculoA
        );

        [, $itemA]=pendingProcess(
            $tenantA,
            $contratoA
        );

        $motoristaB=pendingMotorista(
            $tenantB,
            'TenantB'
        );

        $veiculoB=pendingVeiculo(
            $tenantB,
            'GG-70-GG'
        );

        $contratoB=pendingContrato(
            $tenantB,
            $motoristaB,
            $veiculoB
        );

        pendingProcess(
            $tenantB,
            $contratoB
        );

        pendingLogin(
            $this,
            $adminA
        );

        $response=$this
            ->withHeaders(
                pendingHeaders()
            )
            ->getJson(
                '/api/checklists/pendentes'
            )
            ->assertOk()
            ->assertJsonCount(
                1,
                'data'
            );

        expect(
            $response->json(
                'data.0.item_id'
            )
        )->toBe($itemA->id);
    }
);

test(
    'finalizar checklist conclui automaticamente etapa e processo',
    function(){
        Storage::fake('local');

        $tenant=pendingTenant(
            'Tenant Finalização',
            'tenant-finalizacao'
        );

        $admin=pendingAdmin(
            $tenant,
            'admin.finalizacao@frotapro.test'
        );

        $motorista=pendingMotorista(
            $tenant,
            'Finalizacao'
        );

        $veiculo=pendingVeiculo(
            $tenant,
            'HH-80-HH'
        );

        $contrato=pendingContrato(
            $tenant,
            $motorista,
            $veiculo
        );

        [$run,$item]=pendingProcess(
            $tenant,
            $contrato
        );

        pendingLogin(
            $this,
            $admin
        );

        $response=$this
            ->withHeaders(
                pendingHeaders()
            )
            ->postJson(
                "/api/checklists/pendentes/{$item->id}/iniciar"
            )
            ->assertCreated();

        $checklistId=
            $response->json(
                'data.id'
            );

        $this
            ->withHeaders(
                pendingHeaders()
            )
            ->postJson(
                "/api/checklists/{$checklistId}/finalizar",
                [
                    'assinatura_empresa'=>
                        pendingSignature(),

                    'assinatura_motorista'=>
                        pendingSignature(),
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.estado',
                'finalizado'
            );

        expect(
            $item
                ->fresh()
                ->status
        )->toBe('concluido');

        expect(
            $run
                ->fresh()
                ->status
        )->toBe('concluido');

        $this
            ->withHeaders(
                pendingHeaders()
            )
            ->getJson(
                '/api/checklists/pendentes'
            )
            ->assertOk()
            ->assertJsonCount(
                0,
                'data'
            );
    }
);
