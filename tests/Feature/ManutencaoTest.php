<?php

use App\Models\ChecklistRecord;
use App\Models\EstoqueMovimento;
use App\Models\Manutencao;
use App\Models\ManutencaoDocumento;
use App\Models\ManutencaoGarantia;
use App\Models\Motorista;
use App\Models\Peca;
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
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function mntHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function mntTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function mntLogin(
    $test,
    User $user
): void {
    $test->postJson('/login',[
        'email'=>$user->email,
        'password'=>'SenhaTeste123!',
    ])->assertOk();
}

function mntFuncionario(
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
        ['codigo'=>'manutencao'],
        [
            'modulo'=>'manutencao',
            'nome'=>'Manutenção',
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

function mntRoleUser(
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

function mntMotorista(
    Tenant $tenant,
    string $nome,
    string $nif,
    ?User $user=null
): Motorista {
    $motorista=new Motorista([
        'nome_completo'=>$nome,
        'nif'=>$nif,
        'email'=>$nif.'@manutencao.test',
    ]);

    $motorista->tenant_id=$tenant->id;
    $motorista->user_id=$user?->id;
    $motorista->save();

    return $motorista;
}

function mntProprietario(
    Tenant $tenant,
    string $nome,
    string $nif,
    ?User $user=null
): Proprietario {
    $proprietario=new Proprietario([
        'tipo'=>'pessoa_fisica',
        'nome_completo'=>$nome,
        'nif'=>$nif,
        'email'=>$nif.
            '@proprietario.manutencao.test',
    ]);

    $proprietario->tenant_id=$tenant->id;
    $proprietario->user_id=$user?->id;
    $proprietario->save();

    return $proprietario;
}

function mntVeiculo(
    Tenant $tenant,
    string $matricula,
    ?Proprietario $proprietario=null,
    ?int $km=null
): Veiculo {
    $veiculo=new Veiculo([
        'matricula'=>$matricula,
        'marca'=>'Tesla',
        'modelo'=>'Model 3',
        'proprietario_id'=>$proprietario?->id,
    ]);

    $veiculo->tenant_id=$tenant->id;
    $veiculo->km_atual=$km;
    $veiculo->disponibilidade='disponivel';
    $veiculo->save();

    return $veiculo;
}

function mntPeca(
    Tenant $tenant,
    string $codigo,
    string $nome,
    float $estoque=0,
    float $custoMedio=0
): Peca {
    $peca=new Peca([
        'codigo'=>$codigo,
        'nome'=>$nome,
        'unidade'=>'un',
        'estoque_minimo'=>2,
        'ativo'=>true,
    ]);

    $peca->tenant_id=$tenant->id;
    $peca->estoque_atual=$estoque;
    $peca->custo_medio=$custoMedio;
    $peca->save();

    return $peca;
}

function mntPayload(
    Veiculo $veiculo,
    ?Motorista $motorista=null,
    array $overrides=[]
): array {
    return array_merge([
        'veiculo_id'=>$veiculo->id,
        'motorista_id'=>$motorista?->id,
        'origem'=>'manual',
        'tipo_servico'=>'Revisão geral',
        'prioridade'=>'normal',
        'problema_reportado'=>
            'Revisão periódica da viatura.',
        'km'=>$veiculo->km_atual ?? 50000,
        'data_solicitacao'=>
            now()->toDateString(),
        'data_agendada'=>null,
        'aprovacao_obrigatoria'=>false,
        'indisponibiliza_veiculo'=>true,
        'valor_orcamento'=>null,
        'observacoes'=>'Manutenção de teste.',
    ],$overrides);
}

function mntManutencao(
    Tenant $tenant,
    Veiculo $veiculo,
    ?Motorista $motorista=null,
    ?User $user=null,
    array $overrides=[]
): Manutencao {
    $manutencao=new Manutencao([
        'veiculo_id'=>$veiculo->id,
        'motorista_id'=>$motorista?->id,
        'origem'=>'manual',
        'tipo_servico'=>'Manutenção teste',
        'prioridade'=>'normal',
        'problema_reportado'=>'Teste',
        'km'=>$veiculo->km_atual,
        'data_solicitacao'=>
            now()->toDateString(),
        'aprovacao_obrigatoria'=>false,
        'indisponibiliza_veiculo'=>true,
    ]);

    $manutencao->tenant_id=$tenant->id;

    $manutencao->numero_ordem=
        'MAN-TEST-'.
        Str::upper(
            Str::random(10)
        );

    $manutencao->status=
        $overrides['status']
        ?? 'rascunho';

    $manutencao->custo_pecas=
        $overrides['custo_pecas']
        ?? 0;

    $manutencao->custo_mao_obra=
        $overrides['custo_mao_obra']
        ?? 0;

    $manutencao->custo_outros=
        $overrides['custo_outros']
        ?? 0;

    $manutencao->custo_total=
        $overrides['custo_total']
        ?? 0;

    $manutencao->created_by=
        $user?->id;

    $manutencao->updated_by=
        $user?->id;

    foreach($overrides as $field=>$value){
        if(in_array(
            $field,
            [
                'status',
                'custo_pecas',
                'custo_mao_obra',
                'custo_outros',
                'custo_total',
            ],
            true
        )){
            continue;
        }

        $manutencao->{$field}=$value;
    }

    $manutencao->save();

    return $manutencao;
}

test('rotas de manutencao exigem autenticacao',function(){
    $this
        ->withHeaders(mntHeaders())
        ->getJson('/api/manutencoes')
        ->assertUnauthorized();
});

test('gestor cria manutencao com tenant autoria e numero de ordem definidos pelo servidor',function(){
    $tenant=mntTenant(
        'Tenant Criar Manutenção',
        'tenant-criar-manutencao'
    );

    $user=mntFuncionario(
        $tenant,
        'criar@manutencao.test'
    );

    $motorista=mntMotorista(
        $tenant,
        'Motorista Manutenção',
        '291000001'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'AA-31-AA',
        null,
        50000
    );

    mntLogin($this,$user);

    $response=$this
        ->withHeaders(mntHeaders())
        ->postJson(
            '/api/manutencoes',
            mntPayload(
                $veiculo,
                $motorista
            )
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
            'rascunho'
        )
        ->assertJsonPath(
            'data.origem',
            'manual'
        );

    $manutencao=Manutencao::findOrFail(
        $response->json('data.id')
    );

    expect($manutencao->created_by)
        ->toBe($user->id);

    expect($manutencao->updated_by)
        ->toBe($user->id);

    expect($manutencao->numero_ordem)
        ->toStartWith(
            'MAN-'.
            now()->format('Ymd').
            '-'
        );
});

test('campos controlados pelo servidor sao rejeitados',function(){
    $tenant=mntTenant(
        'Tenant Segurança Manutenção',
        'tenant-seguranca-manutencao'
    );

    $user=mntFuncionario(
        $tenant,
        'seguranca@manutencao.test'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'BB-31-BB'
    );

    mntLogin($this,$user);

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            '/api/manutencoes',
            mntPayload(
                $veiculo,
                null,
                [
                    'tenant_id'=>
                        Str::uuid()->toString(),
                    'status'=>'concluida',
                    'custo_total'=>1,
                    'created_by'=>
                        Str::uuid()->toString(),
                ]
            )
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'tenant_id',
            'status',
            'custo_total',
            'created_by',
        ]);

    expect(Manutencao::count())
        ->toBe(0);
});

test('manutencao nao aceita veiculo de outro tenant',function(){
    $tenantA=mntTenant(
        'Tenant Manutenção A',
        'tenant-manutencao-a'
    );

    $tenantB=mntTenant(
        'Tenant Manutenção B',
        'tenant-manutencao-b'
    );

    $user=mntFuncionario(
        $tenantA,
        'cross.tenant@manutencao.test'
    );

    $veiculoB=mntVeiculo(
        $tenantB,
        'CC-31-CC'
    );

    mntLogin($this,$user);

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            '/api/manutencoes',
            mntPayload($veiculoB)
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'veiculo_id'
        );

    expect(Manutencao::count())
        ->toBe(0);
});

test('custos da manutencao sao calculados pelo servidor a partir dos itens',function(){
    $tenant=mntTenant(
        'Tenant Custos Manutenção',
        'tenant-custos-manutencao'
    );

    $user=mntFuncionario(
        $tenant,
        'custos@manutencao.test'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'DD-31-DD'
    );

    $peca=mntPeca(
        $tenant,
        'FLT-001',
        'Filtro habitáculo'
    );

    mntLogin($this,$user);

    $response=$this
        ->withHeaders(mntHeaders())
        ->postJson(
            '/api/manutencoes',
            mntPayload(
                $veiculo,
                null,
                [
                    'itens'=>[
                        [
                            'peca_id'=>$peca->id,
                            'tipo'=>'peca',
                            'descricao'=>'Filtro',
                            'quantidade'=>1,
                            'valor_unitario'=>15,
                            'consome_estoque'=>false,
                        ],
                        [
                            'tipo'=>'mao_obra',
                            'descricao'=>'Mão de obra',
                            'quantidade'=>2,
                            'unidade'=>'hora',
                            'valor_unitario'=>35.50,
                            'consome_estoque'=>false,
                        ],
                        [
                            'tipo'=>'outro',
                            'descricao'=>'Consumíveis',
                            'quantidade'=>1,
                            'valor_unitario'=>10,
                            'consome_estoque'=>false,
                        ],
                    ],
                ]
            )
        )
        ->assertCreated();

    $manutencao=Manutencao::findOrFail(
        $response->json('data.id')
    );

    expect((float)$manutencao->custo_pecas)
        ->toBe(15.0);

    expect((float)$manutencao->custo_mao_obra)
        ->toBe(71.0);

    expect((float)$manutencao->custo_outros)
        ->toBe(10.0);

    expect((float)$manutencao->custo_total)
        ->toBe(96.0);
});

test('status nao pode ser alterado diretamente por patch',function(){
    $tenant=mntTenant(
        'Tenant Estado Manutenção',
        'tenant-estado-manutencao'
    );

    $user=mntFuncionario(
        $tenant,
        'estado@manutencao.test'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'EE-31-EE'
    );

    $manutencao=mntManutencao(
        $tenant,
        $veiculo,
        null,
        $user
    );

    mntLogin($this,$user);

    $this
        ->withHeaders(mntHeaders())
        ->patchJson(
            "/api/manutencoes/{$manutencao->id}",
            [
                'status'=>'concluida',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'status'
        );

    expect(
        $manutencao->fresh()->status
    )->toBe('rascunho');
});

test('iniciar manutencao torna o veiculo indisponivel por manutencao',function(){
    $tenant=mntTenant(
        'Tenant Iniciar Manutenção',
        'tenant-iniciar-manutencao'
    );

    $user=mntFuncionario(
        $tenant,
        'iniciar@manutencao.test'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'FF-31-FF',
        null,
        60000
    );

    $manutencao=mntManutencao(
        $tenant,
        $veiculo,
        null,
        $user
    );

    mntLogin($this,$user);

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/{$manutencao->id}/iniciar"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'em_andamento'
        );

    $manutencao->refresh();
    $veiculo->refresh();

    expect($manutencao->data_entrada)
        ->not->toBeNull();

    expect($veiculo->disponibilidade)
        ->toBe('manutencao');

    expect($veiculo->indisponibilidade_motivo)
        ->toContain(
            $manutencao->numero_ordem
        );
});

test('concluir manutencao baixa estoque usa custo medio atualiza km e cria garantia',function(){
    $tenant=mntTenant(
        'Tenant Conclusão Manutenção',
        'tenant-conclusao-manutencao'
    );

    $user=mntFuncionario(
        $tenant,
        'concluir@manutencao.test'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'GG-31-GG',
        null,
        70000
    );

    $peca=mntPeca(
        $tenant,
        'OLEO-001',
        'Filtro de óleo',
        10,
        12.50
    );

    mntLogin($this,$user);

    $response=$this
        ->withHeaders(mntHeaders())
        ->postJson(
            '/api/manutencoes',
            mntPayload(
                $veiculo,
                null,
                [
                    'km'=>70500,
                    'itens'=>[
                        [
                            'peca_id'=>$peca->id,
                            'tipo'=>'peca',
                            'descricao'=>
                                'Filtro de óleo',
                            'quantidade'=>2,
                            /*
                             * Este valor deve ser
                             * substituído pelo custo
                             * médio no consumo.
                             */
                            'valor_unitario'=>99,
                            'consome_estoque'=>true,
                            'garantia_meses'=>6,
                            'garantia_km'=>5000,
                        ],
                    ],
                ]
            )
        )
        ->assertCreated();

    $manutencao=Manutencao::findOrFail(
        $response->json('data.id')
    );

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/{$manutencao->id}/iniciar"
        )
        ->assertOk();

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/{$manutencao->id}/concluir"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'concluida'
        );

    $manutencao->refresh();
    $veiculo->refresh();
    $peca->refresh();

    $item=$manutencao
        ->itens()
        ->firstOrFail();

        expect($item->estoque_consumido_em)
    ->not->toBeNull();

    expect((float)$peca->estoque_atual)
        ->toBe(8.0);

    expect((float)$item->valor_unitario)
        ->toBe(12.5);

    expect((float)$item->valor_total)
        ->toBe(25.0);

    expect((float)$manutencao->custo_pecas)
        ->toBe(25.0);

    expect((float)$manutencao->custo_total)
        ->toBe(25.0);

    expect($veiculo->km_atual)
        ->toBe(70500);

    expect($veiculo->disponibilidade)
        ->toBe('disponivel');

    $this->assertDatabaseHas(
        'estoque_movimentos',
        [
            'tenant_id'=>$tenant->id,
            'peca_id'=>$peca->id,
            'manutencao_id'=>$manutencao->id,
            'manutencao_item_id'=>$item->id,
            'tipo'=>'saida',
            'origem'=>'manutencao',
        ]
    );

    $movimento=EstoqueMovimento::query()
        ->where(
            'manutencao_item_id',
            $item->id
        )
        ->firstOrFail();

    expect((float)$movimento->valor_unitario)
        ->toBe(12.5);

    $garantia=ManutencaoGarantia::query()
        ->where(
            'manutencao_item_id',
            $item->id
        )
        ->firstOrFail();

    expect($garantia->status)
        ->toBe('ativa');

    expect($garantia->km_limite)
        ->toBe(75500);
});

test('alterar orcamento invalida aprovacao anterior',function(){
    $tenant=mntTenant(
        'Tenant Alteração Orçamento',
        'tenant-alteracao-orcamento'
    );

    $user=mntFuncionario(
        $tenant,
        'alterar.orcamento@manutencao.test'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'JA-31-JA'
    );

    mntLogin($this,$user);

    $response=$this
        ->withHeaders(mntHeaders())
        ->postJson(
            '/api/manutencoes',
            mntPayload(
                $veiculo,
                null,
                [
                    'aprovacao_obrigatoria'=>true,
                    'valor_orcamento'=>250,
                ]
            )
        )
        ->assertCreated();

    $id=$response->json('data.id');

    $aprovacaoResponse=$this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/{$id}/aprovacoes",
            [
                'valor_orcamento'=>250,
                'aprovador_nome'=>
                    'Responsável Orçamento',
                'aprovador_email'=>
                    'orcamento@example.test',
                'validade_dias'=>7,
            ]
        )
        ->assertCreated();

    $token=$aprovacaoResponse->json('token');

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/aprovacoes/{$token}/responder",
            [
                'decisao'=>'aprovar',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'aprovada'
        );

    $aprovacao=\App\Models\ManutencaoAprovacao::query()
        ->where(
            'manutencao_id',
            $id
        )
        ->where(
            'token_hash',
            hash('sha256',$token)
        )
        ->firstOrFail();

    expect($aprovacao->status)
        ->toBe('aprovada');

    expect(
        Manutencao::findOrFail($id)
            ->status
    )->toBe('aprovada');

    $this
        ->withHeaders(mntHeaders())
        ->patchJson(
            "/api/manutencoes/{$id}",
            [
                'valor_orcamento'=>300,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.valor_orcamento',
            '300.00'
        );

    $manutencao=Manutencao::findOrFail(
        $id
    );

    $aprovacao->refresh();

    expect($manutencao->status)
        ->toBe('rascunho');

    expect((float)$manutencao->valor_orcamento)
        ->toBe(300.0);

    expect($aprovacao->status)
        ->toBe('expirada');

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/{$id}/iniciar"
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'aprovacao'
        );
});

test('aprovacao externa expirada permanece marcada como expirada',function(){
    $tenant=mntTenant(
        'Tenant Aprovação Expirada',
        'tenant-aprovacao-expirada'
    );

    $user=mntFuncionario(
        $tenant,
        'aprovacao.expirada@manutencao.test'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'JB-31-JB'
    );

    mntLogin($this,$user);

    $response=$this
        ->withHeaders(mntHeaders())
        ->postJson(
            '/api/manutencoes',
            mntPayload(
                $veiculo,
                null,
                [
                    'aprovacao_obrigatoria'=>true,
                    'valor_orcamento'=>400,
                ]
            )
        )
        ->assertCreated();

    $id=$response->json('data.id');

    $aprovacaoResponse=$this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/{$id}/aprovacoes",
            [
                'valor_orcamento'=>400,
                'aprovador_nome'=>
                    'Responsável Expiração',
                'aprovador_email'=>
                    'expiracao@example.test',
                'validade_dias'=>7,
            ]
        )
        ->assertCreated();

    $token=$aprovacaoResponse->json('token');

    $aprovacao=\App\Models\ManutencaoAprovacao::query()
        ->where(
            'manutencao_id',
            $id
        )
        ->where(
            'token_hash',
            hash('sha256',$token)
        )
        ->firstOrFail();

    $aprovacao->expires_at=
        now()->subMinute();

    $aprovacao->save();

    expect($aprovacao->status)
        ->toBe('pendente');

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/aprovacoes/{$token}/responder",
            [
                'decisao'=>'aprovar',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'token'
        );

    $aprovacao->refresh();

    expect($aprovacao->status)
        ->toBe('expirada');

    expect(
        Manutencao::findOrFail($id)
            ->status
    )->toBe('aguardando_aprovacao');
});

test('quilometragem historica nunca reduz km atual do veiculo',function(){
    $tenant=mntTenant(
        'Tenant KM Histórico',
        'tenant-km-historico'
    );

    $user=mntFuncionario(
        $tenant,
        'km@manutencao.test'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'HH-31-HH',
        null,
        90000
    );

    mntLogin($this,$user);

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            '/api/manutencoes',
            mntPayload(
                $veiculo,
                null,
                [
                    'km'=>60000,
                ]
            )
        )
        ->assertCreated();

    expect(
        $veiculo->fresh()->km_atual
    )->toBe(90000);
});

test('veiculo permanece em manutencao enquanto existir outra manutencao ativa',function(){
    $tenant=mntTenant(
        'Tenant Dupla Manutenção',
        'tenant-dupla-manutencao'
    );

    $user=mntFuncionario(
        $tenant,
        'dupla@manutencao.test'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'II-31-II'
    );

    $primeira=mntManutencao(
        $tenant,
        $veiculo,
        null,
        $user
    );

    $segunda=mntManutencao(
        $tenant,
        $veiculo,
        null,
        $user
    );

    mntLogin($this,$user);

    foreach([
        $primeira,
        $segunda,
    ] as $manutencao){
        $this
            ->withHeaders(mntHeaders())
            ->postJson(
                "/api/manutencoes/{$manutencao->id}/iniciar"
            )
            ->assertOk();
    }

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/{$primeira->id}/concluir"
        )
        ->assertOk();

    expect(
        $veiculo
            ->fresh()
            ->disponibilidade
    )->toBe('manutencao');

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/{$segunda->id}/concluir"
        )
        ->assertOk();

    expect(
        $veiculo
            ->fresh()
            ->disponibilidade
    )->toBe('disponivel');
});

test('manutencao com aprovacao obrigatoria nao inicia antes da aprovacao',function(){
    $tenant=mntTenant(
        'Tenant Aprovação',
        'tenant-aprovacao-manutencao'
    );

    $user=mntFuncionario(
        $tenant,
        'aprovacao@manutencao.test'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'JJ-31-JJ'
    );

    mntLogin($this,$user);

    $response=$this
        ->withHeaders(mntHeaders())
        ->postJson(
            '/api/manutencoes',
            mntPayload(
                $veiculo,
                null,
                [
                    'aprovacao_obrigatoria'=>true,
                    'valor_orcamento'=>250,
                ]
            )
        )
        ->assertCreated();

    $id=$response->json('data.id');

    $this
    ->withHeaders(mntHeaders())
    ->postJson(
        "/api/manutencoes/{$id}/agendar",
        [
            'data_agendada'=>
                now()
                    ->addDay()
                    ->toDateTimeString(),
        ]
    )
    ->assertUnprocessable()
    ->assertJsonValidationErrors(
        'aprovacao'
    );

expect(
    Manutencao::findOrFail($id)
        ->status
)->toBe('rascunho');

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/{$id}/iniciar"
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'aprovacao'
        );

    $aprovacao=$this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/{$id}/aprovacoes",
            [
                'valor_orcamento'=>250,
                'aprovador_nome'=>
                    'Responsável Frota',
                'aprovador_email'=>
                    'responsavel@example.test',
                'validade_dias'=>7,
            ]
        )
        ->assertCreated();

    $token=$aprovacao->json('token');

    expect($token)
        ->toBeString()
        ->not->toBe('');

    expect(
        $aprovacao->json(
            'data.token_hash'
        )
    )->toBeNull();

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/aprovacoes/{$token}/responder",
            [
                'decisao'=>'aprovar',
                'observacoes'=>'Aprovado.',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'aprovada'
        );

    expect(
        Manutencao::findOrFail($id)
            ->status
    )->toBe('aprovada');

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/{$id}/iniciar"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'em_andamento'
        );
});

test('permissao visualizar permite leitura mas bloqueia escrita',function(){
    $tenant=mntTenant(
        'Tenant Visualizar Manutenção',
        'tenant-visualizar-manutencao'
    );

    $user=mntFuncionario(
        $tenant,
        'visualizar@manutencao.test',
        'visualizar'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'KK-31-KK'
    );

    $manutencao=mntManutencao(
        $tenant,
        $veiculo
    );

    mntLogin($this,$user);

    $this
        ->withHeaders(mntHeaders())
        ->getJson('/api/manutencoes')
        ->assertOk();

    $this
        ->withHeaders(mntHeaders())
        ->getJson(
            "/api/manutencoes/{$manutencao->id}"
        )
        ->assertOk();

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            '/api/manutencoes',
            mntPayload($veiculo)
        )
        ->assertForbidden();

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/{$manutencao->id}/iniciar"
        )
        ->assertForbidden();
});

test('motorista consulta apenas as proprias manutencoes e nao pode alterar',function(){
    $tenant=mntTenant(
        'Tenant Motorista Manutenção',
        'tenant-motorista-manutencao'
    );

    $user=mntRoleUser(
        $tenant,
        'motorista@manutencao.test',
        'motorista'
    );

    $motorista=mntMotorista(
        $tenant,
        'Motorista Próprio',
        '291000010',
        $user
    );

    $outro=mntMotorista(
        $tenant,
        'Motorista Alheio',
        '291000011'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'LL-31-LL'
    );

    $propria=mntManutencao(
        $tenant,
        $veiculo,
        $motorista
    );

    $alheia=mntManutencao(
        $tenant,
        $veiculo,
        $outro
    );

    mntLogin($this,$user);

    $this
        ->withHeaders(mntHeaders())
        ->getJson('/api/manutencoes')
        ->assertOk()
        ->assertJsonCount(1,'data')
        ->assertJsonPath(
            'data.0.id',
            $propria->id
        );

    $this
        ->withHeaders(mntHeaders())
        ->getJson(
            "/api/manutencoes/{$propria->id}"
        )
        ->assertOk();

    $this
        ->withHeaders(mntHeaders())
        ->getJson(
            "/api/manutencoes/{$alheia->id}"
        )
        ->assertNotFound();

    $this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/manutencoes/{$propria->id}/iniciar"
        )
        ->assertForbidden();
});

test('proprietario consulta apenas manutencoes dos proprios veiculos',function(){
    $tenant=mntTenant(
        'Tenant Proprietário Manutenção',
        'tenant-proprietario-manutencao'
    );

    $user=mntRoleUser(
        $tenant,
        'proprietario@manutencao.test',
        'proprietario'
    );

    $proprietario=mntProprietario(
        $tenant,
        'Proprietário Próprio',
        '291000020',
        $user
    );

    $outro=mntProprietario(
        $tenant,
        'Proprietário Alheio',
        '291000021'
    );

    $veiculoProprio=mntVeiculo(
        $tenant,
        'MM-31-MM',
        $proprietario
    );

    $veiculoAlheio=mntVeiculo(
        $tenant,
        'NN-31-NN',
        $outro
    );

    $propria=mntManutencao(
        $tenant,
        $veiculoProprio
    );

    $alheia=mntManutencao(
        $tenant,
        $veiculoAlheio
    );

    mntLogin($this,$user);

    $this
        ->withHeaders(mntHeaders())
        ->getJson('/api/manutencoes')
        ->assertOk()
        ->assertJsonCount(1,'data')
        ->assertJsonPath(
            'data.0.id',
            $propria->id
        );

    $this
        ->withHeaders(mntHeaders())
        ->getJson(
            "/api/manutencoes/{$propria->id}"
        )
        ->assertOk();

    $this
        ->withHeaders(mntHeaders())
        ->getJson(
            "/api/manutencoes/{$alheia->id}"
        )
        ->assertNotFound();
});

test('documento de manutencao fica privado pode ser visualizado descarregado e eliminado',function(){
    Storage::fake('local');

    $tenant=mntTenant(
        'Tenant Documento Manutenção',
        'tenant-documento-manutencao'
    );

    $user=mntFuncionario(
        $tenant,
        'documento@manutencao.test'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'OO-31-OO'
    );

    $manutencao=mntManutencao(
        $tenant,
        $veiculo,
        null,
        $user
    );

    mntLogin($this,$user);

    $response=$this
        ->withHeaders(mntHeaders())
        ->post(
            "/api/manutencoes/{$manutencao->id}/documentos",
            [
                'tipo'=>'fotografia',
                'arquivo'=>UploadedFile::fake()
                    ->create(
                        'manutencao.png',
                        100,
                        'image/png'
                    ),
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.tipo',
            'fotografia'
        );

    $documento=
        ManutencaoDocumento::findOrFail(
            $response->json('data.id')
        );

    expect($documento->tenant_id)
        ->toBe($tenant->id);

    expect($documento->created_by)
        ->toBe($user->id);

    expect($documento->hash_arquivo)
        ->toMatch('/^[a-f0-9]{64}$/');

    expect($documento->arquivo_path)
        ->toStartWith(
            "manutencoes/{$tenant->id}/{$manutencao->id}/"
        );

    Storage::disk('local')
        ->assertExists(
            $documento->arquivo_path
        );

    $this
        ->withHeaders(mntHeaders())
        ->get(
            "/api/manutencoes/{$manutencao->id}/documentos/{$documento->id}/arquivo"
        )
        ->assertOk()
        ->assertHeader(
            'content-type',
            'image/png'
        );

    $this
        ->withHeaders(mntHeaders())
        ->get(
            "/api/manutencoes/{$manutencao->id}/documentos/{$documento->id}/arquivo/download"
        )
        ->assertOk();

    $path=$documento->arquivo_path;

    $this
        ->withHeaders(mntHeaders())
        ->deleteJson(
            "/api/manutencoes/{$manutencao->id}/documentos/{$documento->id}"
        )
        ->assertOk();

    $this->assertDatabaseMissing(
        'manutencao_documentos',
        [
            'id'=>$documento->id,
        ]
    );

    Storage::disk('local')
        ->assertMissing($path);
});

test('checklist pode originar manutencao e transportar quilometragem',function(){
    $tenant=mntTenant(
        'Tenant Checklist Manutenção',
        'tenant-checklist-manutencao'
    );

    $user=mntFuncionario(
        $tenant,
        'checklist@manutencao.test'
    );

    $motorista=mntMotorista(
        $tenant,
        'Motorista Checklist',
        '291000030'
    );

    $veiculo=mntVeiculo(
        $tenant,
        'PP-31-PP',
        null,
        80000
    );

    $checklist=new ChecklistRecord([
        'tipo'=>'entrega',
        'motorista_id'=>$motorista->id,
        'veiculo_id'=>$veiculo->id,
        'data_operacao'=>now()
            ->toDateString(),
        'quilometragem'=>80500,
        'observacoes'=>
            'Ruído anormal na suspensão.',
    ]);

    $checklist->tenant_id=$tenant->id;
    $checklist->estado='finalizado';
    $checklist->realizado_por=$user->id;
    $checklist->save();

    mntLogin($this,$user);

    $response=$this
        ->withHeaders(mntHeaders())
        ->postJson(
            "/api/checklists/{$checklist->id}/manutencao",
            [
                'tipo_servico'=>
                    'Verificação da suspensão',
                'prioridade'=>'alta',
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.origem',
            'checklist'
        )
        ->assertJsonPath(
            'data.checklist_record_id',
            $checklist->id
        )
        ->assertJsonPath(
            'data.veiculo_id',
            $veiculo->id
        )
        ->assertJsonPath(
            'data.km',
            80500
        );

    $manutencao=Manutencao::findOrFail(
        $response->json('data.id')
    );

    expect($manutencao->motorista_id)
        ->toBe($motorista->id);

    expect(
        $veiculo->fresh()->km_atual
    )->toBe(80500);
});
