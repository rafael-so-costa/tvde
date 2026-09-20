<?php

use App\Models\Declaracao;
use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function declaracaoHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function declaracaoTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function declaracaoUser(
    Tenant $tenant,
    string $email,
    string $nivel='configurar'
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
            'codigo'=>'declaracoes',
        ],
        [
            'modulo'=>'declaracoes',
            'nome'=>'Declarações',
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

function declaracaoLogin(
    $test,
    User $user
): void {
    $test->postJson('/login',[
        'email'=>$user->email,
        'password'=>'SenhaTeste123!',
    ])->assertOk();
}

function declaracaoMotorista(
    Tenant $tenant,
    string $nome
): Motorista {
    $motorista=new Motorista([
        'nome_completo'=>$nome,
        'nif'=>'123456789',
        'email'=>'motorista@declaracao.test',
    ]);

    $motorista->tenant_id=$tenant->id;
    $motorista->save();

    return $motorista;
}

function declaracaoVeiculo(
    Tenant $tenant,
    string $matricula
): Veiculo {
    $veiculo=new Veiculo([
        'matricula'=>$matricula,
        'marca'=>'Tesla',
        'modelo'=>'Model 3',
    ]);

    $veiculo->tenant_id=$tenant->id;
    $veiculo->save();

    return $veiculo;
}

test('rotas de declarações exigem autenticação',function(){
    $this
        ->withHeaders(declaracaoHeaders())
        ->getJson('/api/declaracoes')
        ->assertUnauthorized();
});

test('declaração é criada no tenant atual e campos protegidos pertencem ao servidor',function(){
    $tenant=declaracaoTenant(
        'Tenant Declaração',
        'tenant-declaracao'
    );

    $user=declaracaoUser(
        $tenant,
        'declaracao@frotapro.test'
    );

    $motorista=declaracaoMotorista(
        $tenant,
        'Motorista Declaração'
    );

    declaracaoLogin($this,$user);

    $this
        ->withHeaders(declaracaoHeaders())
        ->postJson('/api/declaracoes',[
            'tipo'=>'vinculo_motorista',
            'titulo'=>'Declaração de vínculo',
            'motorista_id'=>$motorista->id,
            'conteudo'=>'Declaramos que o motorista possui vínculo com a organização.',
        ])
        ->assertCreated()
        ->assertJsonPath(
            'data.status',
            'rascunho'
        )
        ->assertJsonPath(
            'data.tenant_id',
            $tenant->id
        );

    $declaracao=Declaracao::firstOrFail();

    expect($declaracao->created_by)
        ->toBe($user->id);

    expect($declaracao->pdf_url)
        ->toBeNull();
});

test('declaração não aceita entidades de outro tenant',function(){
    $tenantA=declaracaoTenant(
        'Tenant A',
        'declaracao-a'
    );

    $tenantB=declaracaoTenant(
        'Tenant B',
        'declaracao-b'
    );

    $user=declaracaoUser(
        $tenantA,
        'declaracao.a@frotapro.test'
    );

    $motorista=declaracaoMotorista(
        $tenantB,
        'Motorista B'
    );

    declaracaoLogin($this,$user);

    $this
        ->withHeaders(declaracaoHeaders())
        ->postJson('/api/declaracoes',[
            'tipo'=>'vinculo_motorista',
            'titulo'=>'Teste',
            'motorista_id'=>$motorista->id,
            'conteudo'=>'Conteúdo teste.',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'motorista_id'
        );
});

test('declaração emitida gera pdf privado hash e torna-se imutável',function(){
    Storage::fake('local');

    $tenant=declaracaoTenant(
        'Tenant Emissão',
        'declaracao-emissao'
    );

    $user=declaracaoUser(
        $tenant,
        'declaracao.emissao@frotapro.test'
    );

    $motorista=declaracaoMotorista(
        $tenant,
        'Motorista Emitido'
    );

    declaracaoLogin($this,$user);

    $response=$this
        ->withHeaders(declaracaoHeaders())
        ->postJson('/api/declaracoes',[
            'tipo'=>'vinculo_motorista',
            'titulo'=>'Declaração de vínculo profissional',
            'motorista_id'=>$motorista->id,
            'conteudo'=>'Declaramos para os devidos efeitos que existe vínculo profissional.',
        ])
        ->assertCreated();

    $id=$response->json('data.id');

    $this
        ->withHeaders(declaracaoHeaders())
        ->postJson(
            "/api/declaracoes/{$id}/emitir"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'emitida'
        );

    $declaracao=Declaracao::findOrFail($id);

    expect($declaracao->pdf_url)
        ->not->toBeNull();

    expect($declaracao->hash_documento)
        ->toMatch('/^[a-f0-9]{64}$/');

    expect($declaracao->emitted_by)
        ->toBe($user->id);

    Storage::disk('local')
        ->assertExists(
            $declaracao->pdf_url
        );

    $binary=Storage::disk('local')
        ->get(
            $declaracao->pdf_url
        );

    expect($binary)
        ->toStartWith('%PDF-');

    expect(hash('sha256',$binary))
        ->toBe(
            $declaracao->hash_documento
        );

    $this
        ->withHeaders(declaracaoHeaders())
        ->patchJson(
            "/api/declaracoes/{$id}",
            [
                'titulo'=>'Alteração indevida',
            ]
        )
        ->assertUnprocessable();

    $this
        ->withHeaders(declaracaoHeaders())
        ->deleteJson(
            "/api/declaracoes/{$id}"
        )
        ->assertUnprocessable();
});

test('pdf da declaração pode ser visualizado e descarregado',function(){
    Storage::fake('local');

    $tenant=declaracaoTenant(
        'Tenant Download',
        'declaracao-download'
    );

    $user=declaracaoUser(
        $tenant,
        'declaracao.download@frotapro.test'
    );

    declaracaoLogin($this,$user);

    $response=$this
        ->withHeaders(declaracaoHeaders())
        ->postJson('/api/declaracoes',[
            'tipo'=>'livre',
            'titulo'=>'Declaração livre',
            'conteudo'=>'Conteúdo da declaração.',
        ])
        ->assertCreated();

    $id=$response->json('data.id');

    $this
        ->withHeaders(declaracaoHeaders())
        ->postJson(
            "/api/declaracoes/{$id}/emitir"
        )
        ->assertOk();

    $this
        ->withHeaders(declaracaoHeaders())
        ->get(
            "/api/declaracoes/{$id}/pdf"
        )
        ->assertOk()
        ->assertHeader(
            'content-type',
            'application/pdf'
        );

    $this
        ->withHeaders(declaracaoHeaders())
        ->get(
            "/api/declaracoes/{$id}/pdf/download"
        )
        ->assertOk()
        ->assertHeader(
            'content-type',
            'application/pdf'
        );
});

test('permissão visualizar permite leitura mas não escrita',function(){
    $tenant=declaracaoTenant(
        'Tenant Visualizar',
        'declaracao-visualizar'
    );

    $user=declaracaoUser(
        $tenant,
        'declaracao.visualizar@frotapro.test',
        'visualizar'
    );

    $declaracao=new Declaracao([
        'tipo'=>'livre',
        'titulo'=>'Somente leitura',
        'conteudo'=>'Conteúdo.',
    ]);

    $declaracao->tenant_id=$tenant->id;
    $declaracao->created_by=$user->id;
    $declaracao->save();

    declaracaoLogin($this,$user);

    $this
        ->withHeaders(declaracaoHeaders())
        ->getJson('/api/declaracoes')
        ->assertOk();

    $this
        ->withHeaders(declaracaoHeaders())
        ->postJson('/api/declaracoes',[
            'tipo'=>'livre',
            'titulo'=>'Bloqueada',
            'conteudo'=>'Conteúdo.',
        ])
        ->assertForbidden();
});
