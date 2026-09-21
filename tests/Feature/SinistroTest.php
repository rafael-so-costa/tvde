<?php

use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Proprietario;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Sinistro;
use App\Models\SinistroDocumento;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function stHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function stTenant(string $nome,string $slug): Tenant
{
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function stLogin($test,User $user): void
{
    $test->postJson('/login',[
        'email'=>$user->email,
        'password'=>'SenhaTeste123!',
    ])->assertOk();
}

function stFuncionario(
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
        ['codigo'=>'sinistros'],
        [
            'modulo'=>'sinistros',
            'nome'=>'Sinistros',
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

function stRoleUser(
    Tenant $tenant,
    string $email,
    string $roleCode
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
        ['codigo'=>$roleCode],
        [
            'nome'=>ucfirst($roleCode),
            'sistema'=>true,
        ]
    );

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>$tenant->id,
    ]);

    return $user;
}

function stMotorista(
    Tenant $tenant,
    string $nome,
    string $nif,
    ?User $user=null
): Motorista {
    $motorista=new Motorista([
        'nome_completo'=>$nome,
        'nif'=>$nif,
        'email'=>$nif.'@sinistros.test',
    ]);

    $motorista->tenant_id=$tenant->id;
    $motorista->user_id=$user?->id;
    $motorista->save();

    return $motorista;
}

function stProprietario(
    Tenant $tenant,
    string $nome,
    string $nif,
    ?User $user=null
): Proprietario {
    $proprietario=new Proprietario([
        'tipo'=>'pessoa_fisica',
        'nome_completo'=>$nome,
        'nif'=>$nif,
        'email'=>$nif.'@proprietario.sinistros.test',
    ]);

    $proprietario->tenant_id=$tenant->id;
    $proprietario->user_id=$user?->id;
    $proprietario->save();

    return $proprietario;
}

function stVeiculo(
    Tenant $tenant,
    string $matricula,
    ?Proprietario $proprietario=null
): Veiculo {
    $veiculo=new Veiculo([
        'matricula'=>$matricula,
        'marca'=>'Tesla',
        'modelo'=>'Model 3',
        'proprietario_id'=>$proprietario?->id,
    ]);

    $veiculo->tenant_id=$tenant->id;
    $veiculo->save();

    return $veiculo;
}

function stPayload(
    Veiculo $veiculo,
    ?Motorista $motorista=null,
    array $overrides=[]
): array {
    return array_merge([
        'veiculo_id'=>$veiculo->id,
        'motorista_id'=>$motorista?->id,
        'data_sinistro'=>now()
            ->subDays(5)
            ->toDateString(),
        'status'=>'aberto',
        'data_peritagem'=>now()
            ->addDays(2)
            ->toDateString(),
        'peritagem_realizada'=>false,
        'seguradora'=>'Fidelidade',
        'apolice'=>'POL-2026-001',
        'numero_processo'=>'PROC-2026-001',
        'itens_danificados'=>[
            'Para-choques dianteiro',
            'Farol esquerdo',
        ],
        'descricao'=>'Colisão com danos materiais.',
        'teve_testemunha'=>true,
        'nome_testemunha'=>'Testemunha Exemplo',
        'telemovel_testemunha'=>'+351912345678',
    ],$overrides);
}

function stSinistro(
    Tenant $tenant,
    Veiculo $veiculo,
    ?Motorista $motorista=null,
    ?User $user=null,
    array $overrides=[]
): Sinistro {
    $sinistro=new Sinistro(array_merge([
        'veiculo_id'=>$veiculo->id,
        'motorista_id'=>$motorista?->id,
        'data_sinistro'=>now()
            ->subDays(5)
            ->toDateString(),
        'status'=>'aberto',
        'data_peritagem'=>now()
            ->addDays(2)
            ->toDateString(),
        'peritagem_realizada'=>false,
        'seguradora'=>'Fidelidade',
        'apolice'=>'POL-TESTE',
        'numero_processo'=>
            'PROC-'.
            substr(md5((string)microtime(true)),0,10),
        'itens_danificados'=>[
            'Para-choques',
        ],
        'descricao'=>'Sinistro de teste.',
        'teve_testemunha'=>false,
        'nome_testemunha'=>null,
        'telemovel_testemunha'=>null,
    ],$overrides));

    $sinistro->tenant_id=$tenant->id;
    $sinistro->created_by=$user?->id;
    $sinistro->updated_by=$user?->id;
    $sinistro->save();

    return $sinistro;
}

test('rotas de sinistros exigem autenticação',function(){
    $this
        ->withHeaders(stHeaders())
        ->getJson('/api/sinistros')
        ->assertUnauthorized();
});

test('gestor cria sinistro com tenant e autoria definidos pelo servidor',function(){
    $tenant=stTenant(
        'Tenant Criar Sinistro',
        'tenant-criar-sinistro'
    );

    $outroTenant=stTenant(
        'Tenant Malicioso Sinistro',
        'tenant-malicioso-sinistro'
    );

    $user=stFuncionario(
        $tenant,
        'criar@sinistros.test'
    );

    $motorista=stMotorista(
        $tenant,
        'Motorista Sinistro',
        '245678921'
    );

    $veiculo=stVeiculo(
        $tenant,
        'AA-21-AA'
    );

    stLogin($this,$user);

    $payload=stPayload(
        $veiculo,
        $motorista,
        [
            'tenant_id'=>$outroTenant->id,
            'created_by'=>User::factory()
                ->create()
                ->id,
            'updated_by'=>User::factory()
                ->create()
                ->id,
        ]
    );

    $response=$this
        ->withHeaders(stHeaders())
        ->postJson(
            '/api/sinistros',
            $payload
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.tenant_id',
            $tenant->id
        )
        ->assertJsonPath(
            'data.veiculo_id',
            $veiculo->id
        )
        ->assertJsonPath(
            'data.motorista_id',
            $motorista->id
        )
        ->assertJsonPath(
            'data.status',
            'aberto'
        )
        ->assertJsonPath(
            'data.peritagem_realizada',
            false
        );

    $sinistro=Sinistro::findOrFail(
        $response->json('data.id')
    );

    expect($sinistro->tenant_id)
        ->toBe($tenant->id);

    expect($sinistro->created_by)
        ->toBe($user->id);

    expect($sinistro->updated_by)
        ->toBe($user->id);
});

test('sinistro não aceita veículo de outro tenant',function(){
    $tenantA=stTenant(
        'Tenant A Veículo Sinistro',
        'sinistro-veiculo-a'
    );

    $tenantB=stTenant(
        'Tenant B Veículo Sinistro',
        'sinistro-veiculo-b'
    );

    $user=stFuncionario(
        $tenantA,
        'veiculo.outro@sinistros.test'
    );

    $veiculoB=stVeiculo(
        $tenantB,
        'BB-21-BB'
    );

    stLogin($this,$user);

    $this
        ->withHeaders(stHeaders())
        ->postJson(
            '/api/sinistros',
            stPayload($veiculoB)
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'veiculo_id'
        );

    expect(Sinistro::count())
        ->toBe(0);
});

test('sinistro não aceita motorista de outro tenant',function(){
    $tenantA=stTenant(
        'Tenant A Motorista Sinistro',
        'sinistro-motorista-a'
    );

    $tenantB=stTenant(
        'Tenant B Motorista Sinistro',
        'sinistro-motorista-b'
    );

    $user=stFuncionario(
        $tenantA,
        'motorista.outro@sinistros.test'
    );

    $veiculo=stVeiculo(
        $tenantA,
        'CC-21-CC'
    );

    $motoristaB=stMotorista(
        $tenantB,
        'Motorista Tenant B',
        '245678922'
    );

    stLogin($this,$user);

    $this
        ->withHeaders(stHeaders())
        ->postJson(
            '/api/sinistros',
            stPayload(
                $veiculo,
                $motoristaB
            )
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'motorista_id'
        );

    expect(Sinistro::count())
        ->toBe(0);
});

test('data futura do sinistro e estado inválido são rejeitados',function(){
    $tenant=stTenant(
        'Tenant Validação Sinistro',
        'tenant-validacao-sinistro'
    );

    $user=stFuncionario(
        $tenant,
        'validacao@sinistros.test'
    );

    $veiculo=stVeiculo(
        $tenant,
        'DD-21-DD'
    );

    stLogin($this,$user);

    $payload=stPayload(
        $veiculo,
        null,
        [
            'data_sinistro'=>now()
                ->addDay()
                ->toDateString(),
            'status'=>'estado_invalido',
        ]
    );

    $this
        ->withHeaders(stHeaders())
        ->postJson(
            '/api/sinistros',
            $payload
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'data_sinistro',
            'status',
        ]);

    expect(Sinistro::count())
        ->toBe(0);
});

test('peritagem não pode ser anterior ao sinistro',function(){
    $tenant=stTenant(
        'Tenant Data Peritagem',
        'tenant-data-peritagem'
    );

    $user=stFuncionario(
        $tenant,
        'peritagem@sinistros.test'
    );

    $veiculo=stVeiculo(
        $tenant,
        'EE-21-EE'
    );

    stLogin($this,$user);

    $dataSinistro=now()
        ->subDays(5)
        ->toDateString();

    $dataPeritagem=now()
        ->subDays(6)
        ->toDateString();

    $this
        ->withHeaders(stHeaders())
        ->postJson(
            '/api/sinistros',
            stPayload(
                $veiculo,
                null,
                [
                    'data_sinistro'=>$dataSinistro,
                    'data_peritagem'=>$dataPeritagem,
                ]
            )
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'data_peritagem'
        );

    expect(Sinistro::count())
        ->toBe(0);
});

test('patch parcial não permite tornar peritagem anterior ao sinistro',function(){
    $tenant=stTenant(
        'Tenant Patch Peritagem',
        'tenant-patch-peritagem'
    );

    $user=stFuncionario(
        $tenant,
        'patch.peritagem@sinistros.test'
    );

    $veiculo=stVeiculo(
        $tenant,
        'FF-21-FF'
    );

    $sinistro=stSinistro(
        $tenant,
        $veiculo,
        null,
        $user,
        [
            'data_sinistro'=>'2026-09-10',
            'data_peritagem'=>'2026-09-15',
        ]
    );

    stLogin($this,$user);

    $this
        ->withHeaders(stHeaders())
        ->patchJson(
            "/api/sinistros/{$sinistro->id}",
            [
                'data_sinistro'=>'2026-09-16',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'data_peritagem'
        );

    $sinistro->refresh();

    expect(
        $sinistro->data_sinistro
            ->toDateString()
    )->toBe('2026-09-10');
});

test('itens danificados são normalizados e duplicados removidos',function(){
    $tenant=stTenant(
        'Tenant Danos Sinistro',
        'tenant-danos-sinistro'
    );

    $user=stFuncionario(
        $tenant,
        'danos@sinistros.test'
    );

    $veiculo=stVeiculo(
        $tenant,
        'GG-21-GG'
    );

    stLogin($this,$user);

    $response=$this
        ->withHeaders(stHeaders())
        ->postJson(
            '/api/sinistros',
            stPayload(
                $veiculo,
                null,
                [
                    'itens_danificados'=>[
                        ' Para-choques ',
                        'Farol esquerdo',
                        'para-choques',
                        '   ',
                    ],
                ]
            )
        )
        ->assertCreated();

    expect(
        $response->json(
            'data.itens_danificados'
        )
    )->toBe([
        'Para-choques',
        'Farol esquerdo',
    ]);
});

test('desmarcar testemunha remove nome e telemóvel associados',function(){
    $tenant=stTenant(
        'Tenant Testemunha',
        'tenant-testemunha'
    );

    $user=stFuncionario(
        $tenant,
        'testemunha@sinistros.test'
    );

    $veiculo=stVeiculo(
        $tenant,
        'HH-21-HH'
    );

    $sinistro=stSinistro(
        $tenant,
        $veiculo,
        null,
        $user,
        [
            'teve_testemunha'=>true,
            'nome_testemunha'=>
                'Maria Testemunha',
            'telemovel_testemunha'=>
                '+351912345678',
        ]
    );

    stLogin($this,$user);

    $this
        ->withHeaders(stHeaders())
        ->patchJson(
            "/api/sinistros/{$sinistro->id}",
            [
                'teve_testemunha'=>false,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.teve_testemunha',
            false
        )
        ->assertJsonPath(
            'data.nome_testemunha',
            null
        )
        ->assertJsonPath(
            'data.telemovel_testemunha',
            null
        );

    $sinistro->refresh();

    expect($sinistro->nome_testemunha)
        ->toBeNull();

    expect($sinistro->telemovel_testemunha)
        ->toBeNull();
});

test('listagem respeita tenant pesquisa estado e peritagem',function(){
    $tenantA=stTenant(
        'Tenant Lista Sinistro A',
        'sinistros-lista-a'
    );

    $tenantB=stTenant(
        'Tenant Lista Sinistro B',
        'sinistros-lista-b'
    );

    $user=stFuncionario(
        $tenantA,
        'lista@sinistros.test',
        'visualizar'
    );

    $motorista=stMotorista(
        $tenantA,
        'Motorista Lisboa',
        '245678923'
    );

    $veiculoA=stVeiculo(
        $tenantA,
        'II-21-II'
    );

    $veiculoB=stVeiculo(
        $tenantB,
        'JJ-21-JJ'
    );

    stSinistro(
        $tenantA,
        $veiculoA,
        $motorista,
        null,
        [
            'numero_processo'=>
                'PROC-LISBOA-001',
            'seguradora'=>'Fidelidade',
            'status'=>'aberto',
            'peritagem_realizada'=>false,
        ]
    );

    stSinistro(
        $tenantA,
        $veiculoA,
        $motorista,
        null,
        [
            'numero_processo'=>
                'PROC-LISBOA-002',
            'seguradora'=>'Outra',
            'status'=>'encerrado',
            'peritagem_realizada'=>true,
        ]
    );

    stSinistro(
        $tenantB,
        $veiculoB,
        null,
        null,
        [
            'numero_processo'=>
                'PROC-OUTRO-TENANT',
            'seguradora'=>'Fidelidade',
        ]
    );

    stLogin($this,$user);

    $response=$this
        ->withHeaders(stHeaders())
        ->getJson(
            '/api/sinistros?status=aberto&peritagem_realizada=0&search=Fidelidade'
        )
        ->assertOk()
        ->assertJsonCount(
            1,
            'data'
        )
        ->assertJsonPath(
            'data.0.numero_processo',
            'PROC-LISBOA-001'
        );

    expect(
        collect(
            $response->json('data')
        )->pluck('numero_processo')
    )->not->toContain(
        'PROC-OUTRO-TENANT'
    );
});

test('gestor atualiza e elimina sinistro do próprio tenant',function(){
    $tenant=stTenant(
        'Tenant CRUD Sinistro',
        'tenant-crud-sinistro'
    );

    $user=stFuncionario(
        $tenant,
        'crud@sinistros.test'
    );

    $motorista=stMotorista(
        $tenant,
        'Motorista CRUD',
        '245678924'
    );

    $veiculo=stVeiculo(
        $tenant,
        'KK-21-KK'
    );

    $sinistro=stSinistro(
        $tenant,
        $veiculo,
        $motorista,
        $user
    );

    stLogin($this,$user);

    $this
        ->withHeaders(stHeaders())
        ->patchJson(
            "/api/sinistros/{$sinistro->id}",
            [
                'status'=>'em_andamento',
                'seguradora'=>'Ageas',
                'numero_processo'=>
                    'PROC-ALTERADO',
                'peritagem_realizada'=>true,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'em_andamento'
        )
        ->assertJsonPath(
            'data.seguradora',
            'Ageas'
        )
        ->assertJsonPath(
            'data.numero_processo',
            'PROC-ALTERADO'
        )
        ->assertJsonPath(
            'data.peritagem_realizada',
            true
        );

    $sinistro->refresh();

    expect($sinistro->updated_by)
        ->toBe($user->id);

    $this
        ->withHeaders(stHeaders())
        ->deleteJson(
            "/api/sinistros/{$sinistro->id}"
        )
        ->assertOk();

    $this->assertDatabaseMissing(
        'sinistros',
        [
            'id'=>$sinistro->id,
        ]
    );
});

test('sinistro de outro tenant não pode ser consultado alterado ou eliminado',function(){
    $tenantA=stTenant(
        'Tenant Isolamento Sinistro A',
        'sinistro-isolamento-a'
    );

    $tenantB=stTenant(
        'Tenant Isolamento Sinistro B',
        'sinistro-isolamento-b'
    );

    $user=stFuncionario(
        $tenantA,
        'isolamento@sinistros.test'
    );

    $veiculoB=stVeiculo(
        $tenantB,
        'LL-21-LL'
    );

    $sinistroB=stSinistro(
        $tenantB,
        $veiculoB
    );

    stLogin($this,$user);

    $this
        ->withHeaders(stHeaders())
        ->getJson(
            "/api/sinistros/{$sinistroB->id}"
        )
        ->assertNotFound();

    $this
        ->withHeaders(stHeaders())
        ->patchJson(
            "/api/sinistros/{$sinistroB->id}",
            [
                'status'=>'encerrado',
            ]
        )
        ->assertNotFound();

    $this
        ->withHeaders(stHeaders())
        ->deleteJson(
            "/api/sinistros/{$sinistroB->id}"
        )
        ->assertNotFound();

    $this->assertDatabaseHas(
        'sinistros',
        [
            'id'=>$sinistroB->id,
            'status'=>'aberto',
        ]
    );
});

test('permissão visualizar permite leitura mas bloqueia escrita',function(){
    $tenant=stTenant(
        'Tenant Visualizar Sinistro',
        'tenant-visualizar-sinistro'
    );

    $user=stFuncionario(
        $tenant,
        'visualizar@sinistros.test',
        'visualizar'
    );

    $veiculo=stVeiculo(
        $tenant,
        'MM-21-MM'
    );

    $sinistro=stSinistro(
        $tenant,
        $veiculo
    );

    stLogin($this,$user);

    $this
        ->withHeaders(stHeaders())
        ->getJson('/api/sinistros')
        ->assertOk();

    $this
        ->withHeaders(stHeaders())
        ->getJson(
            "/api/sinistros/{$sinistro->id}"
        )
        ->assertOk();

    $this
        ->withHeaders(stHeaders())
        ->postJson(
            '/api/sinistros',
            stPayload($veiculo)
        )
        ->assertForbidden();

    $this
        ->withHeaders(stHeaders())
        ->patchJson(
            "/api/sinistros/{$sinistro->id}",
            [
                'status'=>'encerrado',
            ]
        )
        ->assertForbidden();

    $this
        ->withHeaders(stHeaders())
        ->deleteJson(
            "/api/sinistros/{$sinistro->id}"
        )
        ->assertForbidden();
});

test('motorista consulta apenas os próprios sinistros e não pode alterar',function(){
    $tenant=stTenant(
        'Tenant Motorista Sinistro',
        'tenant-motorista-sinistro'
    );

    $user=stRoleUser(
        $tenant,
        'motorista@sinistros.test',
        'motorista'
    );

    $motorista=stMotorista(
        $tenant,
        'Motorista Próprio',
        '245678925',
        $user
    );

    $outro=stMotorista(
        $tenant,
        'Motorista Alheio',
        '245678926'
    );

    $veiculo=stVeiculo(
        $tenant,
        'NN-21-NN'
    );

    $proprio=stSinistro(
        $tenant,
        $veiculo,
        $motorista
    );

    $alheio=stSinistro(
        $tenant,
        $veiculo,
        $outro
    );

    stLogin($this,$user);

    $this
        ->withHeaders(stHeaders())
        ->getJson('/api/sinistros')
        ->assertOk()
        ->assertJsonCount(
            1,
            'data'
        )
        ->assertJsonPath(
            'data.0.id',
            $proprio->id
        );

    $this
        ->withHeaders(stHeaders())
        ->getJson(
            "/api/sinistros/{$proprio->id}"
        )
        ->assertOk();

    $this
        ->withHeaders(stHeaders())
        ->getJson(
            "/api/sinistros/{$alheio->id}"
        )
        ->assertNotFound();

    $this
        ->withHeaders(stHeaders())
        ->patchJson(
            "/api/sinistros/{$proprio->id}",
            [
                'status'=>'encerrado',
            ]
        )
        ->assertForbidden();

    $this
        ->withHeaders(stHeaders())
        ->deleteJson(
            "/api/sinistros/{$proprio->id}"
        )
        ->assertForbidden();
});

test('proprietário consulta apenas sinistros dos próprios veículos',function(){
    $tenant=stTenant(
        'Tenant Proprietário Sinistro',
        'tenant-proprietario-sinistro'
    );

    $user=stRoleUser(
        $tenant,
        'proprietario@sinistros.test',
        'proprietario'
    );

    $proprietario=stProprietario(
        $tenant,
        'Proprietário Próprio',
        '245678927',
        $user
    );

    $outroProprietario=stProprietario(
        $tenant,
        'Outro Proprietário',
        '245678928'
    );

    $veiculoProprio=stVeiculo(
        $tenant,
        'OO-21-OO',
        $proprietario
    );

    $veiculoAlheio=stVeiculo(
        $tenant,
        'PP-21-PP',
        $outroProprietario
    );

    $proprio=stSinistro(
        $tenant,
        $veiculoProprio
    );

    $alheio=stSinistro(
        $tenant,
        $veiculoAlheio
    );

    stLogin($this,$user);

    $this
        ->withHeaders(stHeaders())
        ->getJson('/api/sinistros')
        ->assertOk()
        ->assertJsonCount(
            1,
            'data'
        )
        ->assertJsonPath(
            'data.0.id',
            $proprio->id
        );

    $this
        ->withHeaders(stHeaders())
        ->getJson(
            "/api/sinistros/{$proprio->id}"
        )
        ->assertOk();

    $this
        ->withHeaders(stHeaders())
        ->getJson(
            "/api/sinistros/{$alheio->id}"
        )
        ->assertNotFound();

    $this
        ->withHeaders(stHeaders())
        ->patchJson(
            "/api/sinistros/{$proprio->id}",
            [
                'status'=>'encerrado',
            ]
        )
        ->assertForbidden();
});

test('gestor adiciona visualiza descarrega e elimina documento privado',function(){
    Storage::fake('local');

    $tenant=stTenant(
        'Tenant Documento Sinistro',
        'tenant-documento-sinistro'
    );

    $user=stFuncionario(
        $tenant,
        'documento@sinistros.test'
    );

    $veiculo=stVeiculo(
        $tenant,
        'QQ-21-QQ'
    );

    $sinistro=stSinistro(
        $tenant,
        $veiculo,
        null,
        $user
    );

    stLogin($this,$user);

    $response=$this
        ->withHeaders(stHeaders())
        ->post(
            "/api/sinistros/{$sinistro->id}/documentos",
            [
                'tipo'=>'declaracao_amigavel',
                'arquivo'=>UploadedFile::fake()
                    ->create(
                        'declaracao-amigavel.pdf',
                        100,
                        'application/pdf'
                    ),
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.tipo',
            'declaracao_amigavel'
        );

    $documento=
        SinistroDocumento::findOrFail(
            $response->json('data.id')
        );

    expect($documento->tenant_id)
        ->toBe($tenant->id);

    expect($documento->sinistro_id)
        ->toBe($sinistro->id);

    expect($documento->created_by)
        ->toBe($user->id);

    expect($documento->hash_arquivo)
        ->toMatch(
            '/^[a-f0-9]{64}$/'
        );

    expect($documento->arquivo_path)
        ->toStartWith(
            "sinistros/{$tenant->id}/{$sinistro->id}/"
        );

    Storage::disk('local')
        ->assertExists(
            $documento->arquivo_path
        );

    $this
        ->withHeaders(stHeaders())
        ->get(
            "/api/sinistros/{$sinistro->id}/documentos/{$documento->id}/arquivo"
        )
        ->assertOk()
        ->assertHeader(
            'content-type',
            'application/pdf'
        );

    $this
        ->withHeaders(stHeaders())
        ->get(
            "/api/sinistros/{$sinistro->id}/documentos/{$documento->id}/arquivo/download"
        )
        ->assertOk()
        ->assertHeader(
            'content-type',
            'application/pdf'
        );

    $path=$documento->arquivo_path;

    $this
        ->withHeaders(stHeaders())
        ->deleteJson(
            "/api/sinistros/{$sinistro->id}/documentos/{$documento->id}"
        )
        ->assertOk();

    $this->assertDatabaseMissing(
        'sinistro_documentos',
        [
            'id'=>$documento->id,
        ]
    );

    Storage::disk('local')
        ->assertMissing($path);
});

test('motorista visualiza documento apenas do próprio sinistro',function(){
    Storage::fake('local');

    $tenant=stTenant(
        'Tenant Documento Motorista Sinistro',
        'tenant-documento-motorista-sinistro'
    );

    $user=stRoleUser(
        $tenant,
        'motorista.documento@sinistros.test',
        'motorista'
    );

    $motorista=stMotorista(
        $tenant,
        'Motorista Documento',
        '245678929',
        $user
    );

    $outro=stMotorista(
        $tenant,
        'Outro Motorista Documento',
        '245678930'
    );

    $veiculo=stVeiculo(
        $tenant,
        'RR-21-RR'
    );

    $proprio=stSinistro(
        $tenant,
        $veiculo,
        $motorista
    );

    $alheio=stSinistro(
        $tenant,
        $veiculo,
        $outro
    );

    $documentoProprio=
        new SinistroDocumento([
            'tipo'=>'folha_peritagem',
        ]);

    $documentoProprio->tenant_id=
        $tenant->id;

    $documentoProprio->sinistro_id=
        $proprio->id;

    $documentoProprio->arquivo_nome=
        'proprio.pdf';

    $documentoProprio->arquivo_path=
        'sinistros/testes/proprio.pdf';

    $documentoProprio->arquivo_mime=
        'application/pdf';

    $documentoProprio->arquivo_tamanho=10;

    $documentoProprio->hash_arquivo=
        str_repeat('a',64);

    $documentoProprio->save();

    Storage::disk('local')->put(
        $documentoProprio->arquivo_path,
        'pdf'
    );

    $documentoAlheio=
        new SinistroDocumento([
            'tipo'=>'folha_peritagem',
        ]);

    $documentoAlheio->tenant_id=
        $tenant->id;

    $documentoAlheio->sinistro_id=
        $alheio->id;

    $documentoAlheio->arquivo_nome=
        'alheio.pdf';

    $documentoAlheio->arquivo_path=
        'sinistros/testes/alheio.pdf';

    $documentoAlheio->arquivo_mime=
        'application/pdf';

    $documentoAlheio->arquivo_tamanho=10;

    $documentoAlheio->hash_arquivo=
        str_repeat('b',64);

    $documentoAlheio->save();

    Storage::disk('local')->put(
        $documentoAlheio->arquivo_path,
        'pdf'
    );

    stLogin($this,$user);

    $this
        ->withHeaders(stHeaders())
        ->get(
            "/api/sinistros/{$proprio->id}/documentos/{$documentoProprio->id}/arquivo"
        )
        ->assertOk();

    $this
        ->withHeaders(stHeaders())
        ->get(
            "/api/sinistros/{$alheio->id}/documentos/{$documentoAlheio->id}/arquivo"
        )
        ->assertNotFound();

    $this
        ->withHeaders(stHeaders())
        ->deleteJson(
            "/api/sinistros/{$proprio->id}/documentos/{$documentoProprio->id}"
        )
        ->assertForbidden();
});

test('eliminar sinistro remove também os documentos privados',function(){
    Storage::fake('local');

    $tenant=stTenant(
        'Tenant Eliminar Sinistro',
        'tenant-eliminar-sinistro'
    );

    $user=stFuncionario(
        $tenant,
        'eliminar@sinistros.test'
    );

    $veiculo=stVeiculo(
        $tenant,
        'SS-21-SS'
    );

    $sinistro=stSinistro(
        $tenant,
        $veiculo,
        null,
        $user
    );

    $documento=
        new SinistroDocumento([
            'tipo'=>'boletim_ocorrencia',
        ]);

    $documento->tenant_id=
        $tenant->id;

    $documento->sinistro_id=
        $sinistro->id;

    $documento->arquivo_nome=
        'boletim.pdf';

    $documento->arquivo_path=
        "sinistros/{$tenant->id}/{$sinistro->id}/boletim.pdf";

    $documento->arquivo_mime=
        'application/pdf';

    $documento->arquivo_tamanho=10;

    $documento->hash_arquivo=
        str_repeat('c',64);

    $documento->created_by=
        $user->id;

    $documento->save();

    Storage::disk('local')->put(
        $documento->arquivo_path,
        'pdf'
    );

    $path=$documento->arquivo_path;

    stLogin($this,$user);

    $this
        ->withHeaders(stHeaders())
        ->deleteJson(
            "/api/sinistros/{$sinistro->id}"
        )
        ->assertOk();

    $this->assertDatabaseMissing(
        'sinistros',
        [
            'id'=>$sinistro->id,
        ]
    );

    $this->assertDatabaseMissing(
        'sinistro_documentos',
        [
            'id'=>$documento->id,
        ]
    );

    Storage::disk('local')
        ->assertMissing($path);
});
