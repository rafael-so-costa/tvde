<?php

use App\Models\ChatAttachment;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\ChatParticipant;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function(){
    $this->seed([
        RoleSeeder::class,
        PermissionSeeder::class,
    ]);
});

function chatHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function chatTenant(string $nome,string $slug): Tenant
{
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function chatUser(string $email,string $nome): User
{
    return User::factory()->create([
        'name'=>$nome,
        'email'=>$email,
        'password'=>Hash::make('SenhaTeste123!'),
        'ativo'=>true,
    ]);
}

function chatRole(User $user,string $codigo,?Tenant $tenant=null): void
{
    $role=Role::query()
        ->where('codigo',$codigo)
        ->firstOrFail();

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>$tenant?->id,
    ]);
}

function chatMembership(User $user,Tenant $tenant,bool $principal=true): void
{
    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>$principal,
    ]);
}

function chatTenantUser(
    Tenant $tenant,
    string $codigo,
    string $email,
    string $nome
): User {
    $user=chatUser($email,$nome);

    chatMembership($user,$tenant);
    chatRole($user,$codigo,$tenant);

    return $user;
}

function chatSuperAdmin(): User
{
    $user=chatUser(
        'superadmin.chat@frotapro.test',
        'Super Admin Chat'
    );

    chatRole($user,'super_admin');

    return $user;
}

function chatLogin($test,User $user,?Tenant $tenant=null): void
{
    $test->flushSession();

    Auth::forgetGuards();

    $test->withHeaders(
        chatHeaders()
    );

    $test->actingAs(
        $user,
        'web'
    );

    if($tenant){
        $test->withSession([
            'tenant_id'=>$tenant->id,
        ]);
    }
}

test('rotas do chat exigem autenticação',function(){
    $this->withHeaders(chatHeaders())
        ->getJson('/api/chat')
        ->assertUnauthorized();

    $this->withHeaders(chatHeaders())
        ->getJson('/api/chat/resumo')
        ->assertUnauthorized();

    $this->withHeaders(chatHeaders())
        ->getJson('/api/backoffice/chat')
        ->assertUnauthorized();
});

test('gestor envia mensagem direta para motorista da própria frota',function(){
    $tenant=chatTenant(
        'Frota Chat',
        'frota-chat'
    );

    $gestor=chatTenantUser(
        $tenant,
        'admin_empresa',
        'gestor.chat@frotapro.test',
        'Gestor Chat'
    );

    $motorista=chatTenantUser(
        $tenant,
        'motorista',
        'motorista.chat@frotapro.test',
        'Motorista Chat'
    );

    chatLogin(
        $this,
        $gestor,
        $tenant
    );

    $response=$this->postJson('/api/chat',[
        'type'=>'direct',
        'subject'=>'Mensagem ao motorista',
        'recipient_ids'=>[
            $motorista->id,
        ],
        'body'=>'Olá motorista.',
    ])
        ->assertCreated()
        ->assertJsonPath(
            'data.type',
            'direct'
        )
        ->assertJsonPath(
            'data.reply_enabled',
            true
        );

    $id=$response->json('data.id');

    $this->assertDatabaseHas(
        'chat_conversations',
        [
            'id'=>$id,
            'tenant_id'=>$tenant->id,
            'source'=>'tenant',
            'type'=>'direct',
            'allow_replies'=>1,
        ]
    );

    $this->assertDatabaseHas(
        'chat_participants',
        [
            'conversation_id'=>$id,
            'user_id'=>$gestor->id,
        ]
    );

    $this->assertDatabaseHas(
        'chat_participants',
        [
            'conversation_id'=>$id,
            'user_id'=>$motorista->id,
        ]
    );

    $this->assertDatabaseHas(
        'chat_messages',
        [
            'conversation_id'=>$id,
            'sender_user_id'=>$gestor->id,
            'body'=>'Olá motorista.',
        ]
    );
});

test('motorista pode iniciar conversa apenas com gestor da própria frota',function(){
    $tenant=chatTenant(
        'Frota Motorista',
        'frota-motorista'
    );

    $gestor=chatTenantUser(
        $tenant,
        'admin_empresa',
        'gestor.motorista@frotapro.test',
        'Gestor Motorista'
    );

    $motorista=chatTenantUser(
        $tenant,
        'motorista',
        'motorista.gestor@frotapro.test',
        'Motorista Gestor'
    );

    $outro=chatTenantUser(
        $tenant,
        'motorista',
        'outro.motorista@frotapro.test',
        'Outro Motorista'
    );

    chatLogin(
        $this,
        $motorista,
        $tenant
    );

    $this->postJson('/api/chat',[
        'type'=>'direct',
        'subject'=>'Dúvida',
        'recipient_ids'=>[
            $gestor->id,
        ],
        'body'=>'Tenho uma dúvida.',
    ])->assertCreated();

    $this->postJson('/api/chat',[
        'type'=>'direct',
        'subject'=>'Mensagem indevida',
        'recipient_ids'=>[
            $outro->id,
        ],
        'body'=>'Mensagem.',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'recipient_ids'
        );
});

test('proprietario pode iniciar conversa com gestor da própria frota',function(){
    $tenant=chatTenant(
        'Frota Proprietário',
        'frota-proprietario'
    );

    $gestor=chatTenantUser(
        $tenant,
        'admin_empresa',
        'gestor.proprietario@frotapro.test',
        'Gestor Proprietário'
    );

    $proprietario=chatTenantUser(
        $tenant,
        'proprietario',
        'proprietario.chat@frotapro.test',
        'Proprietário Chat'
    );

    chatLogin(
        $this,
        $proprietario,
        $tenant
    );

    $this->postJson('/api/chat',[
        'type'=>'direct',
        'subject'=>'Questão da viatura',
        'recipient_ids'=>[
            $gestor->id,
        ],
        'body'=>'Gostaria de falar sobre a viatura.',
    ])->assertCreated();
});

test('gestor pode fazer broadcast apenas para utilizadores da própria frota',function(){
    $tenantA=chatTenant(
        'Frota A',
        'chat-frota-a'
    );

    $tenantB=chatTenant(
        'Frota B',
        'chat-frota-b'
    );

    $gestor=chatTenantUser(
        $tenantA,
        'admin_empresa',
        'gestor.a@frotapro.test',
        'Gestor A'
    );

    $funcionario=chatTenantUser(
        $tenantA,
        'funcionario',
        'funcionario.a@frotapro.test',
        'Funcionário A'
    );

    $motorista=chatTenantUser(
        $tenantA,
        'motorista',
        'motorista.a@frotapro.test',
        'Motorista A'
    );

    $proprietario=chatTenantUser(
        $tenantA,
        'proprietario',
        'proprietario.a@frotapro.test',
        'Proprietário A'
    );

    $outroTenant=chatTenantUser(
        $tenantB,
        'motorista',
        'motorista.b@frotapro.test',
        'Motorista B'
    );

    chatLogin(
        $this,
        $gestor,
        $tenantA
    );

    $response=$this->postJson('/api/chat',[
        'type'=>'broadcast',
        'audience'=>'all',
        'subject'=>'Aviso da frota',
        'body'=>'Mensagem para todos.',
    ])
        ->assertCreated()
        ->assertJsonPath(
            'data.type',
            'broadcast'
        )
        ->assertJsonPath(
            'data.reply_enabled',
            false
        );

    $id=$response->json('data.id');

    foreach([
        $funcionario,
        $motorista,
        $proprietario,
    ] as $recipient){
        $this->assertDatabaseHas(
            'chat_participants',
            [
                'conversation_id'=>$id,
                'user_id'=>$recipient->id,
            ]
        );
    }

    $this->assertDatabaseMissing(
        'chat_participants',
        [
            'conversation_id'=>$id,
            'user_id'=>$outroTenant->id,
        ]
    );
});

test('broadcast não aceita respostas',function(){
    $tenant=chatTenant(
        'Frota Broadcast',
        'frota-broadcast'
    );

    $gestor=chatTenantUser(
        $tenant,
        'admin_empresa',
        'gestor.broadcast@frotapro.test',
        'Gestor Broadcast'
    );

    $motorista=chatTenantUser(
        $tenant,
        'motorista',
        'motorista.broadcast@frotapro.test',
        'Motorista Broadcast'
    );

    chatLogin(
        $this,
        $gestor,
        $tenant
    );

    $response=$this->postJson('/api/chat',[
        'type'=>'broadcast',
        'audience'=>'drivers',
        'subject'=>'Comunicado',
        'body'=>'Informação importante.',
    ])->assertCreated();

    $id=$response->json('data.id');

    chatLogin(
        $this,
        $motorista,
        $tenant
    );

    $this->postJson(
        "/api/chat/{$id}/mensagens",
        [
            'body'=>'Resposta indevida.',
        ]
    )->assertForbidden();

    expect(
        ChatMessage::query()
            ->where(
                'conversation_id',
                $id
            )
            ->count()
    )->toBe(1);
});

test('funcionario recebe mensagem do gestor e pode responder',function(){
    $tenant=chatTenant(
        'Frota Funcionário',
        'frota-funcionario'
    );

    $gestor=chatTenantUser(
        $tenant,
        'admin_empresa',
        'gestor.funcionario@frotapro.test',
        'Gestor Funcionário'
    );

    $funcionario=chatTenantUser(
        $tenant,
        'funcionario',
        'funcionario.resposta@frotapro.test',
        'Funcionário Resposta'
    );

    chatLogin(
        $this,
        $gestor,
        $tenant
    );

    $response=$this->postJson('/api/chat',[
        'type'=>'direct',
        'subject'=>'Mensagem ao funcionário',
        'recipient_ids'=>[
            $funcionario->id,
        ],
        'body'=>'Pode verificar este assunto?',
    ])->assertCreated();

    $id=$response->json('data.id');

    chatLogin(
        $this,
        $funcionario,
        $tenant
    );

    $this->getJson(
        "/api/chat/{$id}"
    )
        ->assertOk()
        ->assertJsonPath(
            'data.subject',
            'Mensagem ao funcionário'
        );

    $this->postJson(
        "/api/chat/{$id}/mensagens",
        [
            'body'=>'Sim, vou verificar.',
        ]
    )
        ->assertCreated()
        ->assertJsonPath(
            'data.body',
            'Sim, vou verificar.'
        );

    $this->assertDatabaseHas(
        'chat_messages',
        [
            'conversation_id'=>$id,
            'sender_user_id'=>$funcionario->id,
            'body'=>'Sim, vou verificar.',
        ]
    );
});

test('utilizador de outra frota não consegue ver nem responder conversa alheia',function(){
    $tenantA=chatTenant(
        'Tenant Isolado A',
        'tenant-isolado-a'
    );

    $tenantB=chatTenant(
        'Tenant Isolado B',
        'tenant-isolado-b'
    );

    $gestorA=chatTenantUser(
        $tenantA,
        'admin_empresa',
        'gestor.isolado.a@frotapro.test',
        'Gestor Isolado A'
    );

    $motoristaA=chatTenantUser(
        $tenantA,
        'motorista',
        'motorista.isolado.a@frotapro.test',
        'Motorista Isolado A'
    );

    $motoristaB=chatTenantUser(
        $tenantB,
        'motorista',
        'motorista.isolado.b@frotapro.test',
        'Motorista Isolado B'
    );

    chatLogin(
        $this,
        $gestorA,
        $tenantA
    );

    $response=$this->postJson('/api/chat',[
        'type'=>'direct',
        'subject'=>'Privada',
        'recipient_ids'=>[
            $motoristaA->id,
        ],
        'body'=>'Mensagem privada.',
    ])->assertCreated();

    $id=$response->json('data.id');

    chatLogin(
        $this,
        $motoristaB,
        $tenantB
    );

    $this->getJson(
        "/api/chat/{$id}"
    )->assertNotFound();

    $this->postJson(
        "/api/chat/{$id}/mensagens",
        [
            'body'=>'Tentativa indevida.',
        ]
    )->assertNotFound();
});

test('saas pode enviar broadcast global para todos os utilizadores',function(){
    $tenantA=chatTenant(
        'SaaS Tenant A',
        'saas-tenant-a'
    );

    $tenantB=chatTenant(
        'SaaS Tenant B',
        'saas-tenant-b'
    );

    $superAdmin=
        chatSuperAdmin();

    $gestor=chatTenantUser(
        $tenantA,
        'admin_empresa',
        'gestor.saas@frotapro.test',
        'Gestor SaaS'
    );

    $motorista=chatTenantUser(
        $tenantA,
        'motorista',
        'motorista.saas@frotapro.test',
        'Motorista SaaS'
    );

    $proprietario=chatTenantUser(
        $tenantB,
        'proprietario',
        'proprietario.saas@frotapro.test',
        'Proprietário SaaS'
    );

    chatLogin(
        $this,
        $superAdmin
    );

    $response=$this->postJson(
        '/api/backoffice/chat',
        [
            'type'=>'broadcast',
            'audience'=>'all',
            'subject'=>'Feliz Natal',
            'body'=>
                'O FrotaPro deseja um Feliz Natal a todos.',
        ]
    )
        ->assertCreated()
        ->assertJsonPath(
            'data.source',
            'saas'
        )
        ->assertJsonPath(
            'data.tenant_id',
            null
        );

    $id=$response->json('data.id');

    foreach([
        $gestor,
        $motorista,
        $proprietario,
    ] as $recipient){
        $this->assertDatabaseHas(
            'chat_participants',
            [
                'conversation_id'=>$id,
                'user_id'=>$recipient->id,
            ]
        );
    }

    $this->assertDatabaseHas(
        'chat_conversations',
        [
            'id'=>$id,
            'tenant_id'=>null,
            'source'=>'saas',
            'type'=>'broadcast',
        ]
    );
});

test('broadcast saas recebido aparece no chat do utilizador do tenant',function(){
    $tenant=chatTenant(
        'Frota SaaS Inbox',
        'frota-saas-inbox'
    );

    $superAdmin=
        chatSuperAdmin();

    $motorista=chatTenantUser(
        $tenant,
        'motorista',
        'motorista.inbox@frotapro.test',
        'Motorista Inbox'
    );

    chatLogin(
        $this,
        $superAdmin
    );

    $response=$this->postJson(
        '/api/backoffice/chat',
        [
            'type'=>'broadcast',
            'audience'=>'all',
            'subject'=>'Novidade FrotaPro',
            'body'=>'Temos novidades no sistema.',
        ]
    )->assertCreated();

    $id=$response->json('data.id');

    chatLogin(
        $this,
        $motorista,
        $tenant
    );

    $this->getJson('/api/chat')
        ->assertOk()
        ->assertJsonFragment([
            'id'=>$id,
            'subject'=>'Novidade FrotaPro',
            'source'=>'saas',
        ]);
});

test('contador de não lidas diminui quando conversa é aberta',function(){
    $tenant=chatTenant(
        'Frota Leitura',
        'frota-leitura'
    );

    $gestor=chatTenantUser(
        $tenant,
        'admin_empresa',
        'gestor.leitura@frotapro.test',
        'Gestor Leitura'
    );

    $motorista=chatTenantUser(
        $tenant,
        'motorista',
        'motorista.leitura@frotapro.test',
        'Motorista Leitura'
    );

    chatLogin(
        $this,
        $gestor,
        $tenant
    );

    $response=$this->postJson('/api/chat',[
        'type'=>'direct',
        'subject'=>'Mensagem não lida',
        'recipient_ids'=>[
            $motorista->id,
        ],
        'body'=>'Leia esta mensagem.',
    ])->assertCreated();

    $id=$response->json('data.id');

    chatLogin(
        $this,
        $motorista,
        $tenant
    );

    $this->getJson(
        '/api/chat/resumo'
    )
        ->assertOk()
        ->assertJsonPath(
            'unread',
            1
        );

    $this->getJson(
        "/api/chat/{$id}"
    )->assertOk();

    $this->getJson(
        '/api/chat/resumo'
    )
        ->assertOk()
        ->assertJsonPath(
            'unread',
            0
        );

    expect(
        ChatParticipant::query()
            ->where(
                'conversation_id',
                $id
            )
            ->where(
                'user_id',
                $motorista->id
            )
            ->value(
                'last_read_at'
            )
    )->not->toBeNull();
});

test('imagem e pdf ficam privados e apenas participantes podem aceder',function(){
    Storage::fake('local');

    $tenant=chatTenant(
        'Frota Anexos',
        'frota-anexos'
    );

    $gestor=chatTenantUser(
        $tenant,
        'admin_empresa',
        'gestor.anexos@frotapro.test',
        'Gestor Anexos'
    );

    $motorista=chatTenantUser(
        $tenant,
        'motorista',
        'motorista.anexos@frotapro.test',
        'Motorista Anexos'
    );

    $estranho=chatTenantUser(
        $tenant,
        'proprietario',
        'estranho.anexos@frotapro.test',
        'Estranho Anexos'
    );

    chatLogin(
        $this,
        $gestor,
        $tenant
    );

    $response=$this->post(
        '/api/chat',
        [
            'type'=>'direct',
            'subject'=>'Documentos',
            'recipient_ids'=>[
                $motorista->id,
            ],
            'body'=>'Seguem os documentos.',
            'attachments'=>[
                UploadedFile::fake()
                    ->image(
                        'imagem.jpg',
                        300,
                        200
                    ),

                UploadedFile::fake()
                    ->create(
                        'documento.pdf',
                        100,
                        'application/pdf'
                    ),
            ],
        ]
    )->assertCreated();

    $id=$response->json('data.id');

    expect(
        ChatAttachment::query()
            ->count()
    )->toBe(2);

    $attachments=
        ChatAttachment::query()
            ->get();

    foreach(
        $attachments
        as $attachment
    ){
        Storage::disk(
            'local'
        )->assertExists(
            $attachment->path
        );

        $sha=data_get(
            $attachment->metadata,
            'sha256'
        );

        expect($sha)
            ->toBeString()
            ->toMatch(
                '/^[a-f0-9]{64}$/'
            );
    }

    $image=$attachments
        ->firstWhere(
            'kind',
            'image'
        );

    $pdf=$attachments
        ->firstWhere(
            'kind',
            'pdf'
        );

    expect($image)
        ->not
        ->toBeNull();

    expect($pdf)
        ->not
        ->toBeNull();

    chatLogin(
        $this,
        $motorista,
        $tenant
    );

    $this->get(
        "/api/chat/anexos/{$image->id}/arquivo"
    )->assertOk();

    $this->get(
        "/api/chat/anexos/{$pdf->id}/download"
    )->assertOk();

    chatLogin(
        $this,
        $estranho,
        $tenant
    );

    $this->get(
        "/api/chat/anexos/{$image->id}/arquivo"
    )->assertNotFound();

    $this->get(
        "/api/chat/anexos/{$pdf->id}/download"
    )->assertNotFound();

    expect(
        ChatConversation::query()
            ->findOrFail($id)
            ->tenant_id
    )->toBe(
        $tenant->id
    );
});

test('funcionario não pode iniciar conversa por conta própria',function(){
    $tenant=chatTenant(
        'Frota Funcionário Restrito',
        'frota-funcionario-restrito'
    );

    $funcionario=chatTenantUser(
        $tenant,
        'funcionario',
        'funcionario.restrito@frotapro.test',
        'Funcionário Restrito'
    );

    $gestor=chatTenantUser(
        $tenant,
        'admin_empresa',
        'gestor.restrito@frotapro.test',
        'Gestor Restrito'
    );

    chatLogin(
        $this,
        $funcionario,
        $tenant
    );

    $this->postJson('/api/chat',[
        'type'=>'direct',
        'subject'=>'Tentativa',
        'recipient_ids'=>[
            $gestor->id,
        ],
        'body'=>'Mensagem.',
    ])->assertForbidden();
});
