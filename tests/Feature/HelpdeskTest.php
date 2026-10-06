<?php

use App\Models\HelpdeskTicket;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function(){
    $this->seed(
        RoleSeeder::class
    );

    Storage::fake(
        'local'
    );
});

function hdHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function hdTenant(
    string $name,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$name,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function hdUser(
    string $email,
    string $roleCode,
    ?Tenant $tenant=null
): User {
    $user=
        User::factory()->create([
            'email'=>$email,
            'ativo'=>true,
        ]);

    if($tenant){
        TenantUser::create([
            'tenant_id'=>$tenant->id,
            'user_id'=>$user->id,
            'status'=>'ativo',
            'principal'=>true,
        ]);
    }

    $role=
        Role::query()
            ->where(
                'codigo',
                $roleCode
            )
            ->firstOrFail();

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>
            $roleCode==='super_admin'
                ?null
                :$tenant?->id,
    ]);

    return $user;
}

function hdActTenant(
    $test,
    User $user,
    Tenant $tenant
): void {
    $test->flushSession();
    Auth::forgetGuards();

    $test
        ->withHeaders(
            hdHeaders()
        )
        ->actingAs(
            $user,
            'web'
        )
        ->withSession([
            'tenant_id'=>$tenant->id,
        ]);
}

function hdActBackoffice(
    $test,
    User $user
): void {
    $test->flushSession();
    Auth::forgetGuards();

    $test
        ->withHeaders(
            hdHeaders()
        )
        ->actingAs(
            $user,
            'web'
        );
}

function hdPayload(
    array $extra=[]
): array {
    return [
        'type'=>'support',
        'category'=>'technical',
        'priority'=>'normal',
        'subject'=>'Erro ao gerar contrato',
        'body'=>'Ao gerar o contrato aparece um erro.',
        'feature_key'=>'contratos',
        ...$extra,
    ];
}

test('helpdesk exige autenticacao',function(){
    $this
        ->withHeaders(
            hdHeaders()
        )
        ->getJson(
            '/api/helpdesk'
        )
        ->assertUnauthorized();
});

test('apenas gestor da frota pode usar helpdesk do tenant',function(){
    $tenant=
        hdTenant(
            'Frota A',
            'frota-helpdesk-a'
        );

    foreach([
        'funcionario',
        'motorista',
        'proprietario',
    ] as $role){
        $user=
            hdUser(
                "{$role}@helpdesk.test",
                $role,
                $tenant
            );

        hdActTenant(
            $this,
            $user,
            $tenant
        );

        $this
            ->getJson(
                '/api/helpdesk'
            )
            ->assertForbidden();
    }
});

test('gestor abre chamado no proprio tenant',function(){
    $tenant=
        hdTenant(
            'Frota Gestor',
            'frota-helpdesk-gestor'
        );

    $manager=
        hdUser(
            'gestor@helpdesk.test',
            'admin_empresa',
            $tenant
        );

    hdActTenant(
        $this,
        $manager,
        $tenant
    );

    $response=
        $this
            ->postJson(
                '/api/helpdesk',
                hdPayload()
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.tenant.id',
                $tenant->id
            )
            ->assertJsonPath(
                'data.type',
                'support'
            )
            ->assertJsonPath(
                'data.status',
                'open'
            );

    expect(
        $response->json(
            'data.number'
        )
    )->toStartWith(
        'SUP-'
    );

    expect(
        HelpdeskTicket::query()
            ->where(
                'tenant_id',
                $tenant->id
            )
            ->count()
    )->toBe(1);
});

test('sugestao inicia como recebida',function(){
    $tenant=
        hdTenant(
            'Frota Ideias',
            'frota-helpdesk-ideias'
        );

    $manager=
        hdUser(
            'gestor.ideias@helpdesk.test',
            'admin_empresa',
            $tenant
        );

    hdActTenant(
        $this,
        $manager,
        $tenant
    );

    $this
        ->postJson(
            '/api/helpdesk',
            hdPayload([
                'type'=>'suggestion',
                'subject'=>'Melhorar dashboard',
                'body'=>'Gostaria de um novo indicador.',
            ])
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.status',
            'received'
        )
        ->assertJsonPath(
            'data.workflow',
            'idea'
        );
});

test('gestor nao consulta chamado de outro tenant',function(){
    $tenantA=
        hdTenant(
            'Frota A',
            'helpdesk-isolamento-a'
        );

    $tenantB=
        hdTenant(
            'Frota B',
            'helpdesk-isolamento-b'
        );

    $managerA=
        hdUser(
            'gestor.a@helpdesk.test',
            'admin_empresa',
            $tenantA
        );

    $managerB=
        hdUser(
            'gestor.b@helpdesk.test',
            'admin_empresa',
            $tenantB
        );

    hdActTenant(
        $this,
        $managerA,
        $tenantA
    );

    $ticketId=
        $this
            ->postJson(
                '/api/helpdesk',
                hdPayload()
            )
            ->assertCreated()
            ->json(
                'data.id'
            );

    hdActTenant(
        $this,
        $managerB,
        $tenantB
    );

    $this
        ->getJson(
            "/api/helpdesk/{$ticketId}"
        )
        ->assertNotFound();
});

test('super admin consulta chamados de todos os tenants',function(){
    $tenantA=
        hdTenant(
            'Frota A',
            'helpdesk-backoffice-a'
        );

    $tenantB=
        hdTenant(
            'Frota B',
            'helpdesk-backoffice-b'
        );

    $managerA=
        hdUser(
            'manager.a@helpdesk.test',
            'admin_empresa',
            $tenantA
        );

    $managerB=
        hdUser(
            'manager.b@helpdesk.test',
            'admin_empresa',
            $tenantB
        );

    hdActTenant(
        $this,
        $managerA,
        $tenantA
    );

    $this->postJson(
        '/api/helpdesk',
        hdPayload([
            'subject'=>'Chamado A',
        ])
    )->assertCreated();

    hdActTenant(
        $this,
        $managerB,
        $tenantB
    );

    $this->postJson(
        '/api/helpdesk',
        hdPayload([
            'subject'=>'Chamado B',
        ])
    )->assertCreated();

    $admin=
        hdUser(
            'admin@helpdesk.test',
            'super_admin'
        );

    hdActBackoffice(
        $this,
        $admin
    );

    $this
        ->getJson(
            '/api/backoffice/helpdesk'
        )
        ->assertOk()
        ->assertJsonCount(
            2,
            'data'
        );
});

test('resposta do saas altera estado e gera nao lido para gestor',function(){
    $tenant=
        hdTenant(
            'Frota Resposta',
            'helpdesk-resposta'
        );

    $manager=
        hdUser(
            'gestor.resposta@helpdesk.test',
            'admin_empresa',
            $tenant
        );

    hdActTenant(
        $this,
        $manager,
        $tenant
    );

    $ticketId=
        $this
            ->postJson(
                '/api/helpdesk',
                hdPayload()
            )
            ->json(
                'data.id'
            );

    $admin=
        hdUser(
            'admin.resposta@helpdesk.test',
            'super_admin'
        );

    hdActBackoffice(
        $this,
        $admin
    );

    $this
        ->postJson(
            "/api/backoffice/helpdesk/{$ticketId}/mensagens",
            [
                'body'=>
                    'Estamos a verificar.',
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.status',
            'in_progress'
        );

    $ticket=
        HelpdeskTicket::findOrFail(
            $ticketId
        );

    expect(
        $ticket->tenant_unread_count
    )->toBe(1);

    expect(
        $ticket->first_response_at
    )->not->toBeNull();

    hdActTenant(
        $this,
        $manager,
        $tenant
    );

    $this
        ->getJson(
            "/api/helpdesk/{$ticketId}"
        )
        ->assertOk();

    expect(
        $ticket
            ->refresh()
            ->tenant_unread_count
    )->toBe(0);
});

test('resposta do gestor gera nao lido no backoffice',function(){
    $tenant=
        hdTenant(
            'Frota Cliente',
            'helpdesk-cliente-resposta'
        );

    $manager=
        hdUser(
            'gestor.cliente@helpdesk.test',
            'admin_empresa',
            $tenant
        );

    hdActTenant(
        $this,
        $manager,
        $tenant
    );

    $ticketId=
        $this
            ->postJson(
                '/api/helpdesk',
                hdPayload()
            )
            ->json(
                'data.id'
            );

    $admin=
        hdUser(
            'admin.cliente@helpdesk.test',
            'super_admin'
        );

    hdActBackoffice(
        $this,
        $admin
    );

    $this
        ->getJson(
            "/api/backoffice/helpdesk/{$ticketId}"
        )
        ->assertOk();

    hdActTenant(
        $this,
        $manager,
        $tenant
    );

    $this
        ->postJson(
            "/api/helpdesk/{$ticketId}/mensagens",
            [
                'body'=>
                    'Envio mais informações.',
            ]
        )
        ->assertCreated();

    expect(
        HelpdeskTicket::findOrFail(
            $ticketId
        )->saas_unread_count
    )->toBe(1);
});

test('super admin altera prioridade estado e responsavel',function(){
    $tenant=
        hdTenant(
            'Frota Gestão',
            'helpdesk-gestao'
        );

    $manager=
        hdUser(
            'gestor.gestao@helpdesk.test',
            'admin_empresa',
            $tenant
        );

    hdActTenant(
        $this,
        $manager,
        $tenant
    );

    $ticketId=
        $this
            ->postJson(
                '/api/helpdesk',
                hdPayload()
            )
            ->json(
                'data.id'
            );

    $admin=
        hdUser(
            'admin.gestao@helpdesk.test',
            'super_admin'
        );

    hdActBackoffice(
        $this,
        $admin
    );

    $this
        ->patchJson(
            "/api/backoffice/helpdesk/{$ticketId}",
            [
                'priority'=>'high',
                'status'=>'waiting_customer',
                'assigned_to_user_id'=>$admin->id,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.priority',
            'high'
        )
        ->assertJsonPath(
            'data.status',
            'waiting_customer'
        )
        ->assertJsonPath(
            'data.assigned_to.id',
            $admin->id
        );
});

test('estado de sugestao nao pode ser usado em chamado de suporte',function(){
    $tenant=
        hdTenant(
            'Frota Fluxo',
            'helpdesk-fluxo'
        );

    $manager=
        hdUser(
            'gestor.fluxo@helpdesk.test',
            'admin_empresa',
            $tenant
        );

    hdActTenant(
        $this,
        $manager,
        $tenant
    );

    $ticketId=
        $this
            ->postJson(
                '/api/helpdesk',
                hdPayload()
            )
            ->json(
                'data.id'
            );

    $admin=
        hdUser(
            'admin.fluxo@helpdesk.test',
            'super_admin'
        );

    hdActBackoffice(
        $this,
        $admin
    );

    $this
        ->patchJson(
            "/api/backoffice/helpdesk/{$ticketId}",
            [
                'status'=>'planned',
            ]
        )
        ->assertUnprocessable();
});

test('gestor fecha chamado e avalia atendimento',function(){
    $tenant=
        hdTenant(
            'Frota Avaliação',
            'helpdesk-avaliacao'
        );

    $manager=
        hdUser(
            'gestor.avaliacao@helpdesk.test',
            'admin_empresa',
            $tenant
        );

    hdActTenant(
        $this,
        $manager,
        $tenant
    );

    $ticketId=
        $this
            ->postJson(
                '/api/helpdesk',
                hdPayload()
            )
            ->json(
                'data.id'
            );

    $this
        ->postJson(
            "/api/helpdesk/{$ticketId}/avaliacao",
            [
                'rating'=>5,
            ]
        )
        ->assertUnprocessable();

    $this
        ->postJson(
            "/api/helpdesk/{$ticketId}/fechar"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'closed'
        );

    $this
        ->postJson(
            "/api/helpdesk/{$ticketId}/avaliacao",
            [
                'rating'=>5,
                'comment'=>
                    'Atendimento excelente.',
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.rating',
            5
        );

    $this
        ->postJson(
            "/api/helpdesk/{$ticketId}/reabrir"
        )
        ->assertUnprocessable();
});

test('chamado fechado sem avaliacao pode ser reaberto',function(){
    $tenant=
        hdTenant(
            'Frota Reabrir',
            'helpdesk-reabrir'
        );

    $manager=
        hdUser(
            'gestor.reabrir@helpdesk.test',
            'admin_empresa',
            $tenant
        );

    hdActTenant(
        $this,
        $manager,
        $tenant
    );

    $ticketId=
        $this
            ->postJson(
                '/api/helpdesk',
                hdPayload()
            )
            ->json(
                'data.id'
            );

    $this
        ->postJson(
            "/api/helpdesk/{$ticketId}/fechar"
        )
        ->assertOk();

    $this
        ->postJson(
            "/api/helpdesk/{$ticketId}/reabrir"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'open'
        );
});

test('anexo do helpdesk e privado por tenant',function(){
    $tenantA=
        hdTenant(
            'Frota Anexo A',
            'helpdesk-anexo-a'
        );

    $tenantB=
        hdTenant(
            'Frota Anexo B',
            'helpdesk-anexo-b'
        );

    $managerA=
        hdUser(
            'gestor.anexo.a@helpdesk.test',
            'admin_empresa',
            $tenantA
        );

    $managerB=
        hdUser(
            'gestor.anexo.b@helpdesk.test',
            'admin_empresa',
            $tenantB
        );

    hdActTenant(
        $this,
        $managerA,
        $tenantA
    );

    $response=
        $this->post(
            '/api/helpdesk',
            [
                ...hdPayload(),
                'attachments'=>[
                    UploadedFile::fake()
                        ->image(
                            'erro.png'
                        ),
                ],
            ],
            hdHeaders()
        )
        ->assertCreated();

    $attachmentId=
        $response->json(
            'data.messages.0.attachments.0.id'
        );

    $this
        ->get(
            "/api/helpdesk/anexos/{$attachmentId}/arquivo",
            hdHeaders()
        )
        ->assertOk();

    hdActTenant(
        $this,
        $managerB,
        $tenantB
    );

    $this
        ->get(
            "/api/helpdesk/anexos/{$attachmentId}/arquivo",
            hdHeaders()
        )
        ->assertNotFound();
});
