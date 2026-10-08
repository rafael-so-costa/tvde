<?php

use App\Models\ChecklistProcessTemplate;
use App\Models\ChecklistProcessTemplateItem;
use App\Models\Contrato;
use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Services\ChecklistProcessService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function workflowActionHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function workflowActionTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function workflowActionMotoristaRole(): Role
{
    return Role::firstOrCreate(
        [
            'codigo'=>'motorista',
        ],
        [
            'nome'=>'Motorista',
            'sistema'=>true,
        ]
    );
}

function workflowActionAdmin(
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

    foreach([
        'contratos'=>'Contratos',
        'motoristas'=>'Motoristas',
    ] as $codigo=>$nome){
        $permission=Permission::firstOrCreate(
            [
                'codigo'=>$codigo,
            ],
            [
                'modulo'=>$codigo,
                'nome'=>$nome,
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
    }

    return $user;
}

function workflowActionLogin(
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

function workflowActionMotorista(
    Tenant $tenant,
    string $sufixo
): Motorista {
    $motorista=new Motorista([
        'nome_completo'=>
            "Motorista {$sufixo}",

        'nif'=>
            '2'.str_pad(
                (string)abs(
                    crc32($sufixo)
                ),
                8,
                '0',
                STR_PAD_LEFT
            ),

        'email'=>
            strtolower($sufixo).
            '@motorista.test',

        'telemovel'=>
            '+351910000001',

        'data_nascimento'=>
            '1990-01-01',
    ]);

    $motorista->tenant_id=
        $tenant->id;

    $motorista->save();

    return $motorista;
}

function workflowActionContrato(
    Tenant $tenant,
    Motorista $motorista
): Contrato {
    $contrato=new Contrato([
        'tipo'=>'aluguer',
        'motorista_id'=>$motorista->id,
    ]);

    $contrato->tenant_id=
        $tenant->id;

    $contrato->status=
        'rascunho';

    $contrato->save();

    return $contrato;
}

function workflowActionProcess(
    Tenant $tenant,
    Contrato $contrato
): array {
    $template=new ChecklistProcessTemplate([
        'codigo'=>
            'workflow_acesso_motorista',

        'nome'=>
            'Workflow acesso motorista',

        'ativo'=>true,
        'versao'=>1,
    ]);

    $template->tenant_id=
        $tenant->id;

    $template->save();

    $templateItem=
        new ChecklistProcessTemplateItem([
            'codigo'=>
                'criar_acesso_motorista',

            'ordem'=>1,

            'titulo'=>
                'Criar acesso do motorista',

            'tipo'=>
                'acao_sistema',

            'obrigatorio'=>true,

            'configuracao'=>[
                'action'=>
                    'motorista_acesso',
            ],
        ]);

    $templateItem->template_id=
        $template->id;

    $templateItem->save();

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
        $run->items->first(),
    ];
}

test(
    'ação de workflow exige autenticação',
    function(){
        $uuid=
            '00000000-0000-0000-0000-000000000000';

        $this
            ->withHeaders(
                workflowActionHeaders()
            )
            ->getJson(
                "/api/contratos/{$uuid}/workflow/items/{$uuid}/acao"
            )
            ->assertUnauthorized();
    }
);

test(
    'ação informa que motorista ainda não possui conta',
    function(){
        $tenant=workflowActionTenant(
            'Tenant Estado Acesso',
            'tenant-estado-acesso'
        );

        $admin=workflowActionAdmin(
            $tenant,
            'admin.estado@frotapro.test'
        );

        $motorista=
            workflowActionMotorista(
                $tenant,
                'estado'
            );

        $contrato=
            workflowActionContrato(
                $tenant,
                $motorista
            );

        [, $item]=
            workflowActionProcess(
                $tenant,
                $contrato
            );

        workflowActionLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                workflowActionHeaders()
            )
            ->getJson(
                "/api/contratos/{$contrato->id}/workflow/items/{$item->id}/acao"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.conta_vinculada',
                false
            )
            ->assertJsonPath(
                'data.conta_criada',
                false
            )
            ->assertJsonPath(
                'data.pode_criar',
                true
            )
            ->assertJsonPath(
                'data.acesso_ativo',
                false
            )
            ->assertJsonPath(
                'data.item_status',
                'pendente'
            );
    }
);

test(
    'criação do acesso exige senha inicial',
    function(){
        $tenant=workflowActionTenant(
            'Tenant Senha Workflow',
            'tenant-senha-workflow'
        );

        $admin=workflowActionAdmin(
            $tenant,
            'admin.senha.workflow@frotapro.test'
        );

        workflowActionMotoristaRole();

        $motorista=
            workflowActionMotorista(
                $tenant,
                'senha'
            );

        $contrato=
            workflowActionContrato(
                $tenant,
                $motorista
            );

        [, $item]=
            workflowActionProcess(
                $tenant,
                $contrato
            );

        workflowActionLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                workflowActionHeaders()
            )
            ->postJson(
                "/api/contratos/{$contrato->id}/workflow/items/{$item->id}/acao",
                []
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'password'
            );

        expect(
            $motorista
                ->fresh()
                ->user_id
        )->toBeNull();
    }
);

test(
    'ação cria conta completa do motorista e conclui etapa',
    function(){
        $tenant=workflowActionTenant(
            'Tenant Criar Acesso',
            'tenant-criar-acesso'
        );

        $admin=workflowActionAdmin(
            $tenant,
            'admin.criar.acesso@frotapro.test'
        );

        $roleMotorista=
            workflowActionMotoristaRole();

        $motorista=
            workflowActionMotorista(
                $tenant,
                'criar'
            );

        $contrato=
            workflowActionContrato(
                $tenant,
                $motorista
            );

        [$run,$item]=
            workflowActionProcess(
                $tenant,
                $contrato
            );

        workflowActionLogin(
            $this,
            $admin
        );

        $response=$this
            ->withHeaders(
                workflowActionHeaders()
            )
            ->postJson(
                "/api/contratos/{$contrato->id}/workflow/items/{$item->id}/acao",
                [
                    'password'=>
                        'SenhaNova123',

                    'password_confirmation'=>
                        'SenhaNova123',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.conta_criada',
                true
            )
            ->assertJsonPath(
                'data.utilizador_ativo',
                true
            )
            ->assertJsonPath(
                'data.associacao_tenant_ativa',
                true
            )
            ->assertJsonPath(
                'data.role_motorista',
                true
            )
            ->assertJsonPath(
                'data.acesso_ativo',
                true
            )
            ->assertJsonPath(
                'data.concluido',
                true
            )
            ->assertJsonPath(
                'data.item_status',
                'concluido'
            );

        $userId=$response->json(
            'data.user_id'
        );

        expect($userId)
            ->not
            ->toBeNull();

        $user=User::findOrFail(
            $userId
        );

        expect(
            Hash::check(
                'SenhaNova123',
                $user->password
            )
        )->toBeTrue();

        $this->assertDatabaseHas(
            'tenant_users',
            [
                'tenant_id'=>$tenant->id,
                'user_id'=>$userId,
                'status'=>'ativo',
            ]
        );

        $this->assertDatabaseHas(
            'user_roles',
            [
                'tenant_id'=>$tenant->id,
                'user_id'=>$userId,
                'role_id'=>$roleMotorista->id,
            ]
        );

        expect(
            $motorista
                ->fresh()
                ->user_id
        )->toBe($userId);

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
    }
);

test(
    'conta existente sem role motorista não conclui etapa nem cria duplicada',
    function(){
        $tenant=workflowActionTenant(
            'Tenant Acesso Incompleto',
            'tenant-acesso-incompleto'
        );

        $admin=workflowActionAdmin(
            $tenant,
            'admin.incompleto@frotapro.test'
        );

        workflowActionMotoristaRole();

        $motorista=
            workflowActionMotorista(
                $tenant,
                'incompleto'
            );

        $user=User::factory()->create([
            'email'=>
                'incompleto.user@frotapro.test',

            'password'=>
                'SenhaExistente123',

            'ativo'=>true,
        ]);

        TenantUser::create([
            'tenant_id'=>$tenant->id,
            'user_id'=>$user->id,
            'status'=>'ativo',
            'principal'=>true,
        ]);

        $motorista->user_id=
            $user->id;

        $motorista->save();

        $contrato=
            workflowActionContrato(
                $tenant,
                $motorista
            );

        [, $item]=
            workflowActionProcess(
                $tenant,
                $contrato
            );

        workflowActionLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                workflowActionHeaders()
            )
            ->getJson(
                "/api/contratos/{$contrato->id}/workflow/items/{$item->id}/acao"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.conta_vinculada',
                true
            )
            ->assertJsonPath(
                'data.utilizador_ativo',
                true
            )
            ->assertJsonPath(
                'data.associacao_tenant_ativa',
                true
            )
            ->assertJsonPath(
                'data.role_motorista',
                false
            )
            ->assertJsonPath(
                'data.acesso_ativo',
                false
            )
            ->assertJsonPath(
                'data.pode_criar',
                false
            );

        $usersBefore=
            User::count();

        $this
            ->withHeaders(
                workflowActionHeaders()
            )
            ->postJson(
                "/api/contratos/{$contrato->id}/workflow/items/{$item->id}/acao",
                [
                    'password'=>
                        'SenhaNova123',

                    'password_confirmation'=>
                        'SenhaNova123',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'acesso'
            );

        expect(
            User::count()
        )->toBe($usersBefore);

        expect(
            $item
                ->fresh()
                ->status
        )->toBe('pendente');
    }
);

test(
    'criação normal da conta do motorista sincroniza workflow pendente',
    function(){
        $tenant=workflowActionTenant(
            'Tenant Sync Conta',
            'tenant-sync-conta'
        );

        $admin=workflowActionAdmin(
            $tenant,
            'admin.sync.conta@frotapro.test'
        );

        workflowActionMotoristaRole();

        $motorista=
            workflowActionMotorista(
                $tenant,
                'sync'
            );

        $contrato=
            workflowActionContrato(
                $tenant,
                $motorista
            );

        [$run,$item]=
            workflowActionProcess(
                $tenant,
                $contrato
            );

        workflowActionLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                workflowActionHeaders()
            )
            ->postJson(
                "/api/motoristas/{$motorista->id}/conta",
                [
                    'password'=>
                        'SenhaNova123',

                    'password_confirmation'=>
                        'SenhaNova123',
                ]
            )
            ->assertCreated();

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

        expect(
            $motorista
                ->fresh()
                ->user_id
        )->not->toBeNull();
    }
);

test(
    'ação de workflow de outro tenant não pode ser consultada',
    function(){
        $tenantA=workflowActionTenant(
            'Tenant Workflow A',
            'tenant-workflow-action-a'
        );

        $tenantB=workflowActionTenant(
            'Tenant Workflow B',
            'tenant-workflow-action-b'
        );

        $adminA=workflowActionAdmin(
            $tenantA,
            'admin.workflow.a@frotapro.test'
        );

        $motoristaB=
            workflowActionMotorista(
                $tenantB,
                'tenantb'
            );

        $contratoB=
            workflowActionContrato(
                $tenantB,
                $motoristaB
            );

        [, $itemB]=
            workflowActionProcess(
                $tenantB,
                $contratoB
            );

        workflowActionLogin(
            $this,
            $adminA
        );

        $this
            ->withHeaders(
                workflowActionHeaders()
            )
            ->getJson(
                "/api/contratos/{$contratoB->id}/workflow/items/{$itemB->id}/acao"
            )
            ->assertNotFound();
    }
);
