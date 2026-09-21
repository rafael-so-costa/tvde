<?php

use App\Models\Motorista;
use App\Models\Multa;
use App\Models\MultaDocumento;
use App\Models\Permission;
use App\Models\Proprietario;
use App\Models\Role;
use App\Models\RolePermission;
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

function mtHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function mtTenant(string $nome,string $slug): Tenant
{
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function mtLogin($test,User $user): void
{
    $test->postJson('/login',[
        'email'=>$user->email,
        'password'=>'SenhaTeste123!',
    ])->assertOk();
}

function mtFuncionario(
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
        ['codigo'=>'multas'],
        [
            'modulo'=>'multas',
            'nome'=>'Multas',
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

function mtUserRole(
    Tenant $tenant,
    string $email,
    string $roleCode
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

function mtMotorista(
    Tenant $tenant,
    string $nome,
    string $nif,
    ?User $user=null
): Motorista {
    $motorista=new Motorista([
        'nome_completo'=>$nome,
        'nif'=>$nif,
        'email'=>$nif.'@multas.test',
    ]);

    $motorista->tenant_id=$tenant->id;
    $motorista->user_id=$user?->id;
    $motorista->save();

    return $motorista;
}

function mtProprietario(
    Tenant $tenant,
    string $nome,
    string $nif,
    ?User $user=null
): Proprietario {
    $proprietario=new Proprietario([
        'tipo'=>'pessoa_fisica',
        'nome_completo'=>$nome,
        'nif'=>$nif,
        'email'=>$nif.'@proprietario.multas.test',
    ]);

    $proprietario->tenant_id=$tenant->id;
    $proprietario->user_id=$user?->id;
    $proprietario->save();

    return $proprietario;
}

function mtVeiculo(
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

function mtPayload(
    Veiculo $veiculo,
    ?Motorista $motorista=null,
    array $overrides=[]
): array {
    return array_merge([
        'veiculo_id'=>$veiculo->id,
        'motorista_id'=>$motorista?->id,
        'numero_notificacao'=>'NOT-2026-001',
        'data_multa'=>now()->subDay()->toDateString(),
        'tipo'=>'excesso_velocidade',
        'valor'=>'120.50',
        'status'=>'pendente',
        'localizacao'=>'A1, km 45',
        'descricao'=>'Excesso de velocidade registado.',
    ],$overrides);
}

function mtMulta(
    Tenant $tenant,
    Veiculo $veiculo,
    ?Motorista $motorista=null,
    ?User $user=null,
    array $overrides=[]
): Multa {
    $multa=new Multa(array_merge([
        'veiculo_id'=>$veiculo->id,
        'motorista_id'=>$motorista?->id,
        'numero_notificacao'=>'NOT-'.substr(md5((string)microtime(true)),0,10),
        'data_multa'=>now()->subDay()->toDateString(),
        'tipo'=>'excesso_velocidade',
        'valor'=>'100.00',
        'status'=>'pendente',
        'localizacao'=>'Lisboa',
        'descricao'=>'Multa de teste.',
    ],$overrides));

    $multa->tenant_id=$tenant->id;
    $multa->created_by=$user?->id;
    $multa->updated_by=$user?->id;
    $multa->save();

    return $multa;
}

test('rotas de multas exigem autenticação',function(){
    $this
        ->withHeaders(mtHeaders())
        ->getJson('/api/multas')
        ->assertUnauthorized();
});

test('gestor cria multa no tenant atual e campos protegidos pertencem ao servidor',function(){
    $tenant=mtTenant(
        'Tenant Criar Multa',
        'tenant-criar-multa'
    );

    $outroTenant=mtTenant(
        'Tenant Malicioso',
        'tenant-malicioso-multa'
    );

    $user=mtFuncionario(
        $tenant,
        'criar.multa@frotapro.test'
    );

    $motorista=mtMotorista(
        $tenant,
        'Motorista Multa',
        '245678901'
    );

    $veiculo=mtVeiculo(
        $tenant,
        'AA-11-AA'
    );

    mtLogin($this,$user);

    $payload=mtPayload(
        $veiculo,
        $motorista,
        [
            'tenant_id'=>$outroTenant->id,
            'created_by'=>User::factory()->create()->id,
            'updated_by'=>User::factory()->create()->id,
        ]
    );

    $response=$this
        ->withHeaders(mtHeaders())
        ->postJson('/api/multas',$payload)
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
            'pendente'
        )
        ->assertJsonPath(
            'data.valor',
            '120.50'
        );

    $multa=Multa::findOrFail(
        $response->json('data.id')
    );

    expect($multa->tenant_id)
        ->toBe($tenant->id);

    expect($multa->created_by)
        ->toBe($user->id);

    expect($multa->updated_by)
        ->toBe($user->id);
});

test('multa não aceita veículo pertencente a outro tenant',function(){
    $tenantA=mtTenant(
        'Tenant A Veículo',
        'multa-veiculo-a'
    );

    $tenantB=mtTenant(
        'Tenant B Veículo',
        'multa-veiculo-b'
    );

    $user=mtFuncionario(
        $tenantA,
        'veiculo.outro@multas.test'
    );

    $veiculoB=mtVeiculo(
        $tenantB,
        'BB-11-BB'
    );

    mtLogin($this,$user);

    $this
        ->withHeaders(mtHeaders())
        ->postJson(
            '/api/multas',
            mtPayload($veiculoB)
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'veiculo_id'
        );

    expect(Multa::count())->toBe(0);
});

test('multa não aceita motorista pertencente a outro tenant',function(){
    $tenantA=mtTenant(
        'Tenant A Motorista',
        'multa-motorista-a'
    );

    $tenantB=mtTenant(
        'Tenant B Motorista',
        'multa-motorista-b'
    );

    $user=mtFuncionario(
        $tenantA,
        'motorista.outro@multas.test'
    );

    $veiculo=mtVeiculo(
        $tenantA,
        'CC-11-CC'
    );

    $motoristaB=mtMotorista(
        $tenantB,
        'Motorista Tenant B',
        '245678902'
    );

    mtLogin($this,$user);

    $this
        ->withHeaders(mtHeaders())
        ->postJson(
            '/api/multas',
            mtPayload(
                $veiculo,
                $motoristaB
            )
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'motorista_id'
        );

    expect(Multa::count())->toBe(0);
});

test('data futura e valores inválidos são rejeitados',function(){
    $tenant=mtTenant(
        'Tenant Validação Multa',
        'tenant-validacao-multa'
    );

    $user=mtFuncionario(
        $tenant,
        'validacao@multas.test'
    );

    $veiculo=mtVeiculo(
        $tenant,
        'DD-11-DD'
    );

    mtLogin($this,$user);

    $this
        ->withHeaders(mtHeaders())
        ->postJson('/api/multas',[
            'veiculo_id'=>$veiculo->id,
            'data_multa'=>now()
                ->addDay()
                ->toDateString(),
            'tipo'=>'invalido',
            'valor'=>0,
            'status'=>'invalido',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'data_multa',
            'tipo',
            'valor',
            'status',
        ]);

    expect(Multa::count())->toBe(0);
});

test('listagem de multas respeita isolamento por tenant e filtros',function(){
    $tenantA=mtTenant(
        'Tenant Lista A',
        'multas-lista-a'
    );

    $tenantB=mtTenant(
        'Tenant Lista B',
        'multas-lista-b'
    );

    $user=mtFuncionario(
        $tenantA,
        'lista@multas.test',
        'visualizar'
    );

    $motoristaA=mtMotorista(
        $tenantA,
        'Motorista Lisboa',
        '245678903'
    );

    $veiculoA=mtVeiculo(
        $tenantA,
        'EE-11-EE'
    );

    $veiculoB=mtVeiculo(
        $tenantB,
        'FF-11-FF'
    );

    mtMulta(
        $tenantA,
        $veiculoA,
        $motoristaA,
        null,
        [
            'numero_notificacao'=>'LISBOA-001',
            'tipo'=>'estacionamento',
            'status'=>'pendente',
        ]
    );

    mtMulta(
        $tenantA,
        $veiculoA,
        $motoristaA,
        null,
        [
            'numero_notificacao'=>'LISBOA-002',
            'tipo'=>'excesso_velocidade',
            'status'=>'paga',
        ]
    );

    mtMulta(
        $tenantB,
        $veiculoB,
        null,
        null,
        [
            'numero_notificacao'=>'OUTRO-TENANT',
        ]
    );

    mtLogin($this,$user);

    $response=$this
        ->withHeaders(mtHeaders())
        ->getJson(
            '/api/multas?status=pendente&tipo=estacionamento&search=LISBOA'
        )
        ->assertOk()
        ->assertJsonCount(1,'data')
        ->assertJsonPath(
            'data.0.numero_notificacao',
            'LISBOA-001'
        );

    expect(
        collect($response->json('data'))
            ->pluck('numero_notificacao')
    )->not->toContain('OUTRO-TENANT');
});

test('gestor atualiza e elimina multa do próprio tenant',function(){
    $tenant=mtTenant(
        'Tenant CRUD Multa',
        'tenant-crud-multa'
    );

    $user=mtFuncionario(
        $tenant,
        'crud@multas.test'
    );

    $motorista=mtMotorista(
        $tenant,
        'Motorista CRUD',
        '245678904'
    );

    $veiculo=mtVeiculo(
        $tenant,
        'GG-11-GG'
    );

    $multa=mtMulta(
        $tenant,
        $veiculo,
        $motorista,
        $user
    );

    mtLogin($this,$user);

    $this
        ->withHeaders(mtHeaders())
        ->patchJson(
            "/api/multas/{$multa->id}",
            [
                'status'=>'paga',
                'valor'=>'175.90',
                'tipo'=>'avanco_sinal',
                'localizacao'=>'Avenida da República',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'paga'
        )
        ->assertJsonPath(
            'data.valor',
            '175.90'
        )
        ->assertJsonPath(
            'data.tipo',
            'avanco_sinal'
        )
        ->assertJsonPath(
            'data.localizacao',
            'Avenida da República'
        );

    $multa->refresh();

    expect($multa->updated_by)
        ->toBe($user->id);

    $this
        ->withHeaders(mtHeaders())
        ->deleteJson(
            "/api/multas/{$multa->id}"
        )
        ->assertOk();

    $this->assertDatabaseMissing(
        'multas',
        [
            'id'=>$multa->id,
        ]
    );
});

test('multas de outro tenant não podem ser consultadas alteradas ou eliminadas',function(){
    $tenantA=mtTenant(
        'Tenant Isolamento A',
        'multas-isolamento-a'
    );

    $tenantB=mtTenant(
        'Tenant Isolamento B',
        'multas-isolamento-b'
    );

    $user=mtFuncionario(
        $tenantA,
        'isolamento@multas.test'
    );

    $veiculoB=mtVeiculo(
        $tenantB,
        'HH-11-HH'
    );

    $multaB=mtMulta(
        $tenantB,
        $veiculoB
    );

    mtLogin($this,$user);

    $this
        ->withHeaders(mtHeaders())
        ->getJson(
            "/api/multas/{$multaB->id}"
        )
        ->assertNotFound();

    $this
        ->withHeaders(mtHeaders())
        ->patchJson(
            "/api/multas/{$multaB->id}",
            [
                'status'=>'paga',
            ]
        )
        ->assertNotFound();

    $this
        ->withHeaders(mtHeaders())
        ->deleteJson(
            "/api/multas/{$multaB->id}"
        )
        ->assertNotFound();

    $this->assertDatabaseHas(
        'multas',
        [
            'id'=>$multaB->id,
            'status'=>'pendente',
        ]
    );
});

test('permissão visualizar permite leitura mas bloqueia escrita',function(){
    $tenant=mtTenant(
        'Tenant Visualizar Multas',
        'tenant-visualizar-multas'
    );

    $user=mtFuncionario(
        $tenant,
        'visualizar@multas.test',
        'visualizar'
    );

    $veiculo=mtVeiculo(
        $tenant,
        'II-11-II'
    );

    $multa=mtMulta(
        $tenant,
        $veiculo
    );

    mtLogin($this,$user);

    $this
        ->withHeaders(mtHeaders())
        ->getJson('/api/multas')
        ->assertOk();

    $this
        ->withHeaders(mtHeaders())
        ->getJson(
            "/api/multas/{$multa->id}"
        )
        ->assertOk();

    $this
        ->withHeaders(mtHeaders())
        ->postJson(
            '/api/multas',
            mtPayload(
                $veiculo,
                null,
                [
                    'numero_notificacao'=>'BLOQUEADA',
                ]
            )
        )
        ->assertForbidden();

    $this
        ->withHeaders(mtHeaders())
        ->patchJson(
            "/api/multas/{$multa->id}",
            [
                'status'=>'paga',
            ]
        )
        ->assertForbidden();

    $this
        ->withHeaders(mtHeaders())
        ->deleteJson(
            "/api/multas/{$multa->id}"
        )
        ->assertForbidden();
});

test('motorista consulta apenas as próprias multas e não pode alterar',function(){
    $tenant=mtTenant(
        'Tenant Motorista Multas',
        'tenant-motorista-multas'
    );

    $user=mtUserRole(
        $tenant,
        'motorista@multas.test',
        'motorista'
    );

    $motorista=mtMotorista(
        $tenant,
        'Motorista Próprio',
        '245678905',
        $user
    );

    $outroMotorista=mtMotorista(
        $tenant,
        'Motorista Alheio',
        '245678906'
    );

    $veiculo=mtVeiculo(
        $tenant,
        'JJ-11-JJ'
    );

    $propria=mtMulta(
        $tenant,
        $veiculo,
        $motorista
    );

    $alheia=mtMulta(
        $tenant,
        $veiculo,
        $outroMotorista
    );

    mtLogin($this,$user);

    $this
        ->withHeaders(mtHeaders())
        ->getJson('/api/multas')
        ->assertOk()
        ->assertJsonCount(1,'data')
        ->assertJsonPath(
            'data.0.id',
            $propria->id
        );

    $this
        ->withHeaders(mtHeaders())
        ->getJson(
            "/api/multas/{$propria->id}"
        )
        ->assertOk();

    $this
        ->withHeaders(mtHeaders())
        ->getJson(
            "/api/multas/{$alheia->id}"
        )
        ->assertNotFound();

    $this
        ->withHeaders(mtHeaders())
        ->patchJson(
            "/api/multas/{$propria->id}",
            [
                'status'=>'paga',
            ]
        )
        ->assertForbidden();

    $this
        ->withHeaders(mtHeaders())
        ->deleteJson(
            "/api/multas/{$propria->id}"
        )
        ->assertForbidden();
});

test('proprietário consulta apenas multas dos próprios veículos e não pode alterar',function(){
    $tenant=mtTenant(
        'Tenant Proprietário Multas',
        'tenant-proprietario-multas'
    );

    $user=mtUserRole(
        $tenant,
        'proprietario@multas.test',
        'proprietario'
    );

    $proprietario=mtProprietario(
        $tenant,
        'Proprietário Próprio',
        '245678907',
        $user
    );

    $outroProprietario=mtProprietario(
        $tenant,
        'Outro Proprietário',
        '245678908'
    );

    $veiculoProprio=mtVeiculo(
        $tenant,
        'KK-11-KK',
        $proprietario
    );

    $veiculoAlheio=mtVeiculo(
        $tenant,
        'LL-11-LL',
        $outroProprietario
    );

    $propria=mtMulta(
        $tenant,
        $veiculoProprio
    );

    $alheia=mtMulta(
        $tenant,
        $veiculoAlheio
    );

    mtLogin($this,$user);

    $this
        ->withHeaders(mtHeaders())
        ->getJson('/api/multas')
        ->assertOk()
        ->assertJsonCount(1,'data')
        ->assertJsonPath(
            'data.0.id',
            $propria->id
        );

    $this
        ->withHeaders(mtHeaders())
        ->getJson(
            "/api/multas/{$propria->id}"
        )
        ->assertOk();

    $this
        ->withHeaders(mtHeaders())
        ->getJson(
            "/api/multas/{$alheia->id}"
        )
        ->assertNotFound();

    $this
        ->withHeaders(mtHeaders())
        ->patchJson(
            "/api/multas/{$propria->id}",
            [
                'status'=>'paga',
            ]
        )
        ->assertForbidden();
});

test('gestor adiciona visualiza descarrega e elimina documento privado',function(){
    Storage::fake('local');

    $tenant=mtTenant(
        'Tenant Documento Multa',
        'tenant-documento-multa'
    );

    $user=mtFuncionario(
        $tenant,
        'documento@multas.test'
    );

    $veiculo=mtVeiculo(
        $tenant,
        'MM-11-MM'
    );

    $multa=mtMulta(
        $tenant,
        $veiculo,
        null,
        $user
    );

    mtLogin($this,$user);

    $response=$this
        ->withHeaders(mtHeaders())
        ->post(
            "/api/multas/{$multa->id}/documentos",
            [
                'tipo'=>'folha_multa',
                'arquivo'=>UploadedFile::fake()
                    ->create(
                        'folha-multa.pdf',
                        100,
                        'application/pdf'
                    ),
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.tipo',
            'folha_multa'
        );

    $documento=MultaDocumento::findOrFail(
        $response->json('data.id')
    );

    expect($documento->tenant_id)
        ->toBe($tenant->id);

    expect($documento->multa_id)
        ->toBe($multa->id);

    expect($documento->created_by)
        ->toBe($user->id);

    expect($documento->hash_arquivo)
        ->toMatch('/^[a-f0-9]{64}$/');

    expect($documento->arquivo_path)
        ->toStartWith(
            "multas/{$tenant->id}/{$multa->id}/"
        );

    Storage::disk('local')
        ->assertExists(
            $documento->arquivo_path
        );

    $this
        ->withHeaders(mtHeaders())
        ->get(
            "/api/multas/{$multa->id}/documentos/{$documento->id}/arquivo"
        )
        ->assertOk()
        ->assertHeader(
            'content-type',
            'application/pdf'
        );

    $this
        ->withHeaders(mtHeaders())
        ->get(
            "/api/multas/{$multa->id}/documentos/{$documento->id}/arquivo/download"
        )
        ->assertOk()
        ->assertHeader(
            'content-type',
            'application/pdf'
        );

    $path=$documento->arquivo_path;

    $this
        ->withHeaders(mtHeaders())
        ->deleteJson(
            "/api/multas/{$multa->id}/documentos/{$documento->id}"
        )
        ->assertOk();

    $this->assertDatabaseMissing(
        'multa_documentos',
        [
            'id'=>$documento->id,
        ]
    );

    Storage::disk('local')
        ->assertMissing($path);
});

test('motorista pode visualizar documento apenas da própria multa',function(){
    Storage::fake('local');

    $tenant=mtTenant(
        'Tenant Documento Motorista',
        'tenant-documento-motorista'
    );

    $user=mtUserRole(
        $tenant,
        'motorista.documento@multas.test',
        'motorista'
    );

    $motorista=mtMotorista(
        $tenant,
        'Motorista Documento',
        '245678909',
        $user
    );

    $outro=mtMotorista(
        $tenant,
        'Outro Motorista Documento',
        '245678910'
    );

    $veiculo=mtVeiculo(
        $tenant,
        'NN-11-NN'
    );

    $propria=mtMulta(
        $tenant,
        $veiculo,
        $motorista
    );

    $alheia=mtMulta(
        $tenant,
        $veiculo,
        $outro
    );

    $documentoProprio=new MultaDocumento([
        'tipo'=>'folha_multa',
    ]);

    $documentoProprio->tenant_id=$tenant->id;
    $documentoProprio->multa_id=$propria->id;
    $documentoProprio->arquivo_nome='propria.pdf';
    $documentoProprio->arquivo_path='multas/testes/propria.pdf';
    $documentoProprio->arquivo_mime='application/pdf';
    $documentoProprio->arquivo_tamanho=10;
    $documentoProprio->hash_arquivo=str_repeat('a',64);
    $documentoProprio->save();

    Storage::disk('local')->put(
        $documentoProprio->arquivo_path,
        'pdf'
    );

    $documentoAlheio=new MultaDocumento([
        'tipo'=>'folha_multa',
    ]);

    $documentoAlheio->tenant_id=$tenant->id;
    $documentoAlheio->multa_id=$alheia->id;
    $documentoAlheio->arquivo_nome='alheia.pdf';
    $documentoAlheio->arquivo_path='multas/testes/alheia.pdf';
    $documentoAlheio->arquivo_mime='application/pdf';
    $documentoAlheio->arquivo_tamanho=10;
    $documentoAlheio->hash_arquivo=str_repeat('b',64);
    $documentoAlheio->save();

    Storage::disk('local')->put(
        $documentoAlheio->arquivo_path,
        'pdf'
    );

    mtLogin($this,$user);

    $this
        ->withHeaders(mtHeaders())
        ->get(
            "/api/multas/{$propria->id}/documentos/{$documentoProprio->id}/arquivo"
        )
        ->assertOk();

    $this
        ->withHeaders(mtHeaders())
        ->get(
            "/api/multas/{$alheia->id}/documentos/{$documentoAlheio->id}/arquivo"
        )
        ->assertNotFound();

    $this
        ->withHeaders(mtHeaders())
        ->deleteJson(
            "/api/multas/{$propria->id}/documentos/{$documentoProprio->id}"
        )
        ->assertForbidden();
});

test('eliminar multa remove também os documentos privados',function(){
    Storage::fake('local');

    $tenant=mtTenant(
        'Tenant Eliminar Multa',
        'tenant-eliminar-multa'
    );

    $user=mtFuncionario(
        $tenant,
        'eliminar@multas.test'
    );

    $veiculo=mtVeiculo(
        $tenant,
        'OO-11-OO'
    );

    $multa=mtMulta(
        $tenant,
        $veiculo,
        null,
        $user
    );

    $documento=new MultaDocumento([
        'tipo'=>'folha_multa',
    ]);

    $documento->tenant_id=$tenant->id;
    $documento->multa_id=$multa->id;
    $documento->arquivo_nome='multa.pdf';
    $documento->arquivo_path="multas/{$tenant->id}/{$multa->id}/multa.pdf";
    $documento->arquivo_mime='application/pdf';
    $documento->arquivo_tamanho=10;
    $documento->hash_arquivo=str_repeat('c',64);
    $documento->created_by=$user->id;
    $documento->save();

    Storage::disk('local')->put(
        $documento->arquivo_path,
        'pdf'
    );

    mtLogin($this,$user);

    $this
        ->withHeaders(mtHeaders())
        ->deleteJson(
            "/api/multas/{$multa->id}"
        )
        ->assertOk();

    $this->assertDatabaseMissing(
        'multas',
        [
            'id'=>$multa->id,
        ]
    );

    $this->assertDatabaseMissing(
        'multa_documentos',
        [
            'id'=>$documento->id,
        ]
    );

    Storage::disk('local')
        ->assertMissing(
            $documento->arquivo_path
        );
});
