<?php

use App\Models\Aluguer;
use App\Models\Empresa;
use App\Models\Manutencao;
use App\Models\Motorista;
use App\Models\Multa;
use App\Models\Permission;
use App\Models\Proprietario;
use App\Models\Role;
use App\Models\Sinistro;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserPermission;
use App\Models\UserRole;
use App\Models\Veiculo;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;

uses(RefreshDatabase::class);

beforeEach(function(){
    Carbon::setTestNow(
        '2026-10-05 12:00:00'
    );

    CarbonImmutable::setTestNow(
        '2026-10-05 12:00:00'
    );

    $this->seed([
        RoleSeeder::class,
        PermissionSeeder::class,
    ]);
});

afterEach(function(){
    Carbon::setTestNow();
    CarbonImmutable::setTestNow();
});

function rptHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function rptTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function rptUser(
    Tenant $tenant,
    string $roleCode,
    string $email
): User {
    $user=User::factory()->create([
        'email'=>$email,
        'ativo'=>true,
    ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

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
        'tenant_id'=>$tenant->id,
    ]);

    return $user;
}

function rptGrant(
    User $user,
    Tenant $tenant,
    string $nivel='visualizar'
): void {
    $permission=
        Permission::query()
            ->where(
                'codigo',
                'relatorios'
            )
            ->firstOrFail();

    UserPermission::updateOrCreate(
        [
            'user_id'=>$user->id,
            'permission_id'=>$permission->id,
            'tenant_id'=>$tenant->id,
        ],
        [
            'nivel'=>$nivel,
        ]
    );
}

function rptActAs(
    $test,
    User $user,
    Tenant $tenant
): void {
    $test->flushSession();

    Auth::forgetGuards();

    $test->withHeaders(
        rptHeaders()
    );

    $test->actingAs(
        $user,
        'web'
    );

    $test->withSession([
        'tenant_id'=>$tenant->id,
    ]);
}

function rptEmpresa(
    Tenant $tenant,
    string $nome,
    array $overrides=[]
): Empresa {
    $empresa=
        new Empresa(
            array_merge(
                [
                    'nome_empresa'=>$nome,
                    'nif'=>'500000001',
                ],
                $overrides
            )
        );

    $empresa->tenant_id=
        $tenant->id;

    $empresa->save();

    return $empresa;
}

function rptProprietario(
    Tenant $tenant,
    string $nome,
    array $overrides=[]
): Proprietario {
    $proprietario=
        new Proprietario(
            array_merge(
                [
                    'tipo'=>'pessoa_fisica',
                    'nome_completo'=>$nome,
                    'nif'=>
                        '2'.
                        random_int(
                            10000000,
                            99999999
                        ),
                ],
                $overrides
            )
        );

    $proprietario->tenant_id=
        $tenant->id;

    $proprietario->save();

    return $proprietario;
}

function rptMotorista(
    Tenant $tenant,
    string $nome,
    array $overrides=[]
): Motorista {
    $attributes=
        array_merge(
            [
                'nome_completo'=>$nome,
                'nif'=>
                    '2'.
                    random_int(
                        10000000,
                        99999999
                    ),
            ],
            $overrides
        );

    $ativo=
        array_key_exists(
            'ativo',
            $attributes
        )
            ?(bool)$attributes['ativo']
            :true;

    $status=
        $attributes[
            'status_cadastro'
        ] ?? 'ativo';

    unset(
        $attributes['ativo'],
        $attributes['status_cadastro']
    );

    $motorista=
        new Motorista(
            $attributes
        );

    $motorista->tenant_id=
        $tenant->id;

    $motorista->ativo=
        $ativo;

    $motorista->status_cadastro=
        $status;

    $motorista->save();

    return $motorista;
}

function rptVeiculo(
    Tenant $tenant,
    string $matricula,
    ?Proprietario $proprietario=null,
    array $overrides=[]
): Veiculo {
    $attributes=
        array_merge(
            [
                'matricula'=>$matricula,
                'marca'=>'Tesla',
                'modelo'=>'Model 3',
                'proprietario_id'=>
                    $proprietario?->id,
            ],
            $overrides
        );

    $ativo=
        array_key_exists(
            'ativo',
            $attributes
        )
            ?(bool)$attributes['ativo']
            :true;

    $status=
        $attributes[
            'status_cadastro'
        ] ?? 'ativo';

    $disponibilidade=
        $attributes[
            'disponibilidade'
        ] ?? 'disponivel';

    $kmAtual=
        $attributes[
            'km_atual'
        ] ?? null;

    unset(
        $attributes['ativo'],
        $attributes['status_cadastro'],
        $attributes['disponibilidade'],
        $attributes['km_atual']
    );

    $veiculo=
        new Veiculo(
            $attributes
        );

    $veiculo->tenant_id=
        $tenant->id;

    $veiculo->ativo=
        $ativo;

    $veiculo->status_cadastro=
        $status;

    $veiculo->disponibilidade=
        $disponibilidade;

    $veiculo->km_atual=
        $kmAtual;

    $veiculo->save();

    return $veiculo;
}

function rptMulta(
    Tenant $tenant,
    Veiculo $veiculo,
    ?Motorista $motorista=null,
    array $overrides=[]
): Multa {
    $multa=
        new Multa(
            array_merge(
                [
                    'veiculo_id'=>
                        $veiculo->id,

                    'motorista_id'=>
                        $motorista?->id,

                    'numero_notificacao'=>
                        'REL-'.
                        strtoupper(
                            substr(
                                md5(
                                    uniqid(
                                        '',
                                        true
                                    )
                                ),
                                0,
                                8
                            )
                        ),

                    'data_multa'=>
                        '2026-10-03',

                    'tipo'=>
                        'excesso_velocidade',

                    'valor'=>
                        100,

                    'status'=>
                        'pendente',

                    'descricao'=>
                        'Multa para relatório.',
                ],
                $overrides
            )
        );

    $multa->tenant_id=
        $tenant->id;

    $multa->save();

    return $multa;
}

function rptSinistro(
    Tenant $tenant,
    Veiculo $veiculo,
    ?Motorista $motorista=null,
    array $overrides=[]
): Sinistro {
    $sinistro=
        new Sinistro(
            array_merge(
                [
                    'veiculo_id'=>
                        $veiculo->id,

                    'motorista_id'=>
                        $motorista?->id,

                    'data_sinistro'=>
                        '2026-10-04',

                    'status'=>'aberto',

                    'peritagem_realizada'=>
                        false,

                    'teve_testemunha'=>
                        false,

                    'descricao'=>
                        'Sinistro para relatório.',
                ],
                $overrides
            )
        );

    $sinistro->tenant_id=
        $tenant->id;

    $sinistro->save();

    return $sinistro;
}

function rptManutencao(
    Tenant $tenant,
    Veiculo $veiculo,
    array $overrides=[]
): Manutencao {
    $attributes=
        array_merge(
            [
                'veiculo_id'=>
                    $veiculo->id,

                'origem'=>'manual',

                'tipo_servico'=>
                    'Revisão geral',

                'prioridade'=>'normal',

                'data_solicitacao'=>
                    '2026-10-02',
            ],
            $overrides
        );

    $status=
        $attributes[
            'status'
        ] ?? 'rascunho';

    $custoTotal=
        $attributes[
            'custo_total'
        ] ?? 0;

    unset(
        $attributes['status'],
        $attributes['custo_total']
    );

    $manutencao=
        new Manutencao(
            $attributes
        );

    $manutencao->tenant_id=
        $tenant->id;

    $manutencao->numero_ordem=
        'MAN-'.
        strtoupper(
            substr(
                md5(
                    uniqid(
                        '',
                        true
                    )
                ),
                0,
                10
            )
        );

    $manutencao->status=
        $status;

    $manutencao->custo_total=
        $custoTotal;

    $manutencao->save();

    return $manutencao;
}

function rptAluguer(
    Tenant $tenant,
    ?Motorista $motorista,
    ?Veiculo $veiculo,
    array $overrides=[]
): Aluguer {
    $attributes=
        array_merge(
            [
                'motorista_id'=>
                    $motorista?->id,

                'veiculo_id'=>
                    $veiculo?->id,

                'data_inicio'=>
                    '2026-10-01',

                'data_fim'=>
                    '2026-10-31',
            ],
            $overrides
        );

    $status=
        $attributes[
            'status'
        ] ?? 'ativo';

    $devolucaoTotal=
        $attributes[
            'devolucao_total_pagar'
        ] ?? 0;

    unset(
        $attributes['status'],
        $attributes[
            'devolucao_total_pagar'
        ]
    );

    $aluguer=
        new Aluguer(
            $attributes
        );

    $aluguer->tenant_id=
        $tenant->id;

    $aluguer->status=
        $status;

    $aluguer
        ->devolucao_total_pagar=
        $devolucaoTotal;

    $aluguer->save();

    return $aluguer;
}

test(
    'relatórios exigem autenticação',
    function(){
        $this
            ->withHeaders(
                rptHeaders()
            )
            ->getJson(
                '/api/relatorios/resumo'
            )
            ->assertUnauthorized();
    }
);

test(
    'funcionário precisa de permissão para consultar relatórios',
    function(){
        $tenant=
            rptTenant(
                'Frota Permissão Relatórios',
                'frota-permissao-relatorios'
            );

        $semPermissao=
            rptUser(
                $tenant,
                'funcionario',
                'sem.relatorios@frotapro.test'
            );

        rptActAs(
            $this,
            $semPermissao,
            $tenant
        );

        $this
            ->getJson(
                '/api/relatorios/resumo'
            )
            ->assertForbidden();

        $comPermissao=
            rptUser(
                $tenant,
                'funcionario',
                'com.relatorios@frotapro.test'
            );

        rptGrant(
            $comPermissao,
            $tenant
        );

        rptActAs(
            $this,
            $comPermissao,
            $tenant
        );

        $this
            ->getJson(
                '/api/relatorios/resumo'
            )
            ->assertOk();
    }
);

test(
    'relatório de documentos classifica vencidos a vencer e válidos',
    function(){
        $tenant=
            rptTenant(
                'Frota Documentos',
                'frota-relatorio-documentos'
            );

        $outroTenant=
            rptTenant(
                'Outra Frota Documentos',
                'outra-frota-relatorio-documentos'
            );

        $user=
            rptUser(
                $tenant,
                'admin_empresa',
                'gestor.documentos@frotapro.test'
            );

        rptMotorista(
            $tenant,
            'João Documentos',
            [
                'documento_valid_until'=>
                    '2026-10-04',

                'carta_valid_until'=>
                    '2026-10-20',

                'registo_criminal_valid_until'=>
                    '2027-01-15',
            ]
        );

        rptMotorista(
            $outroTenant,
            'Motorista Outra Frota',
            [
                'documento_valid_until'=>
                    '2026-09-01',
            ]
        );

        rptActAs(
            $this,
            $user,
            $tenant
        );

        $response=
            $this
                ->getJson(
                    '/api/relatorios/documentos?dias=30&entidade=motorista'
                )
                ->assertOk()
                ->assertJsonPath(
                    'data.kpis.total',
                    3
                )
                ->assertJsonPath(
                    'data.kpis.vencidos',
                    1
                )
                ->assertJsonPath(
                    'data.kpis.a_vencer',
                    1
                )
                ->assertJsonPath(
                    'data.kpis.validos',
                    1
                )
                ->assertJsonCount(
                    3,
                    'data.data'
                );

        expect(
            collect(
                $response->json(
                    'data.data'
                )
            )
                ->pluck('nome')
                ->all()
        )->not->toContain(
            'Motorista Outra Frota'
        );

        $this
            ->getJson(
                '/api/relatorios/documentos?dias=30&entidade=motorista&situacao=a_vencer'
            )
            ->assertOk()
            ->assertJsonCount(
                1,
                'data.data'
            )
            ->assertJsonPath(
                'data.data.0.documento',
                'carta_conducao'
            );
    }
);

test(
    'relatório de veículos agrega manutenção multas e sinistros do período',
    function(){
        $tenant=
            rptTenant(
                'Frota Veículos',
                'frota-relatorio-veiculos'
            );

        $outroTenant=
            rptTenant(
                'Outra Frota Veículos',
                'outra-frota-relatorio-veiculos'
            );

        $user=
            rptUser(
                $tenant,
                'admin_empresa',
                'gestor.veiculos.relatorio@frotapro.test'
            );

        $proprietario=
            rptProprietario(
                $tenant,
                'Proprietário Relatório'
            );

        $motorista=
            rptMotorista(
                $tenant,
                'Motorista Veículo'
            );

        $veiculo=
            rptVeiculo(
                $tenant,
                'AA-10-AA',
                $proprietario,
                [
                    'km_atual'=>125000,
                    'disponibilidade'=>
                        'manutencao',
                ]
            );

        rptManutencao(
            $tenant,
            $veiculo,
            [
                'data_solicitacao'=>
                    '2026-10-02',

                'status'=>
                    'em_execucao',

                'custo_total'=>250.50,
            ]
        );

        rptManutencao(
            $tenant,
            $veiculo,
            [
                'data_solicitacao'=>
                    '2026-09-01',

                'status'=>'concluida',

                'custo_total'=>900,
            ]
        );

        rptMulta(
            $tenant,
            $veiculo,
            $motorista,
            [
                'data_multa'=>
                    '2026-10-03',

                'valor'=>125.75,
            ]
        );

        rptSinistro(
            $tenant,
            $veiculo,
            $motorista,
            [
                'data_sinistro'=>
                    '2026-10-04',
            ]
        );

        $outroVeiculo=
            rptVeiculo(
                $outroTenant,
                'BB-20-BB'
            );

        rptManutencao(
            $outroTenant,
            $outroVeiculo,
            [
                'custo_total'=>9999,
            ]
        );

        rptActAs(
            $this,
            $user,
            $tenant
        );

        $this
            ->getJson(
                '/api/relatorios/veiculos?inicio=2026-10-01&fim=2026-10-05'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.kpis.total',
                1
            )
            ->assertJsonPath(
                'data.kpis.indisponiveis',
                1
            )
            ->assertJsonPath(
                'data.kpis.custo_manutencao',
                250.5
            )
            ->assertJsonPath(
                'data.kpis.valor_multas',
                125.75
            )
            ->assertJsonPath(
                'data.kpis.sinistros',
                1
            )
            ->assertJsonPath(
                'data.data.0.matricula',
                'AA-10-AA'
            )
            ->assertJsonPath(
                'data.data.0.km_atual',
                125000
            )
            ->assertJsonPath(
                'data.data.0.manutencoes_periodo',
                1
            )
            ->assertJsonPath(
                'data.data.0.manutencoes_abertas',
                1
            )
            ->assertJsonPath(
                'data.data.0.multas_periodo',
                1
            )
            ->assertJsonPath(
                'data.data.0.sinistros_periodo',
                1
            );
    }
);

test(
    'relatório de motoristas agrega estado documental e ocorrências',
    function(){
        $tenant=
            rptTenant(
                'Frota Motoristas',
                'frota-relatorio-motoristas'
            );

        $user=
            rptUser(
                $tenant,
                'admin_empresa',
                'gestor.motoristas.relatorio@frotapro.test'
            );

        $motorista=
            rptMotorista(
                $tenant,
                'Motorista Incompleto',
                [
                    'ativo'=>false,

                    'status_cadastro'=>
                        'incompleto',

                    'documento_valid_until'=>
                        '2026-10-01',

                    'carta_valid_until'=>
                        '2026-10-15',

                    'registo_criminal_valid_until'=>
                        '2027-05-01',
                ]
            );

        $veiculo=
            rptVeiculo(
                $tenant,
                'CC-30-CC'
            );

        rptMulta(
            $tenant,
            $veiculo,
            $motorista,
            [
                'valor'=>75,
            ]
        );

        rptSinistro(
            $tenant,
            $veiculo,
            $motorista
        );

        rptActAs(
            $this,
            $user,
            $tenant
        );

        $this
            ->getJson(
                '/api/relatorios/motoristas?inicio=2026-10-01&fim=2026-10-05&dias=30&ativo=0'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.kpis.total',
                1
            )
            ->assertJsonPath(
                'data.kpis.ativos',
                0
            )
            ->assertJsonPath(
                'data.kpis.inativos',
                1
            )
            ->assertJsonPath(
                'data.kpis.cadastros_incompletos',
                1
            )
            ->assertJsonPath(
                'data.kpis.documentos_vencidos',
                1
            )
            ->assertJsonPath(
                'data.kpis.documentos_a_vencer',
                1
            )
            ->assertJsonPath(
                'data.kpis.valor_multas',
                75
            )
            ->assertJsonPath(
                'data.kpis.sinistros',
                1
            )
            ->assertJsonPath(
                'data.data.0.nome',
                'Motorista Incompleto'
            );
    }
);

test(
    'relatório de ocorrências combina multas e sinistros e respeita filtros',
    function(){
        $tenant=
            rptTenant(
                'Frota Ocorrências',
                'frota-relatorio-ocorrencias'
            );

        $outroTenant=
            rptTenant(
                'Outra Frota Ocorrências',
                'outra-frota-relatorio-ocorrencias'
            );

        $user=
            rptUser(
                $tenant,
                'admin_empresa',
                'gestor.ocorrencias@frotapro.test'
            );

        $motorista=
            rptMotorista(
                $tenant,
                'Motorista Ocorrências'
            );

        $veiculo=
            rptVeiculo(
                $tenant,
                'DD-40-DD'
            );

        rptMulta(
            $tenant,
            $veiculo,
            $motorista,
            [
                'numero_notificacao'=>
                    'MULTA-PENDENTE',

                'data_multa'=>
                    '2026-10-02',

                'valor'=>100,

                'status'=>'pendente',
            ]
        );

        rptMulta(
            $tenant,
            $veiculo,
            $motorista,
            [
                'numero_notificacao'=>
                    'MULTA-PAGA',

                'data_multa'=>
                    '2026-10-03',

                'valor'=>50,

                'status'=>'paga',
            ]
        );

        rptSinistro(
            $tenant,
            $veiculo,
            $motorista,
            [
                'data_sinistro'=>
                    '2026-10-04',

                'status'=>'aberto',
            ]
        );

        rptMulta(
            $tenant,
            $veiculo,
            $motorista,
            [
                'data_multa'=>
                    '2026-09-01',

                'valor'=>500,
            ]
        );

        $outroVeiculo=
            rptVeiculo(
                $outroTenant,
                'EE-50-EE'
            );

        rptMulta(
            $outroTenant,
            $outroVeiculo,
            null,
            [
                'data_multa'=>
                    '2026-10-02',

                'valor'=>999,
            ]
        );

        rptActAs(
            $this,
            $user,
            $tenant
        );

        $this
            ->getJson(
                '/api/relatorios/ocorrencias?inicio=2026-10-01&fim=2026-10-05'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.kpis.total',
                3
            )
            ->assertJsonPath(
                'data.kpis.multas',
                2
            )
            ->assertJsonPath(
                'data.kpis.multas_pendentes',
                1
            )
            ->assertJsonPath(
                'data.kpis.valor_multas',
                150
            )
            ->assertJsonPath(
                'data.kpis.sinistros',
                1
            )
            ->assertJsonPath(
                'data.kpis.sinistros_abertos',
                1
            );

        $this
            ->getJson(
                '/api/relatorios/ocorrencias?inicio=2026-10-01&fim=2026-10-05&tipo=multa&status=pendente'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.kpis.total',
                1
            )
            ->assertJsonCount(
                1,
                'data.data'
            )
            ->assertJsonPath(
                'data.data.0.referencia',
                'MULTA-PENDENTE'
            );
    }
);

test(
    'relatório de alugueres respeita período e apresenta estados',
    function(){
        $tenant=
            rptTenant(
                'Frota Alugueres Relatório',
                'frota-relatorio-alugueres'
            );

        $user=
            rptUser(
                $tenant,
                'admin_empresa',
                'gestor.alugueres.relatorio@frotapro.test'
            );

        $motorista=
            rptMotorista(
                $tenant,
                'Motorista Aluguer'
            );

        $veiculo=
            rptVeiculo(
                $tenant,
                'FF-60-FF',
                null,
                [
                    'valor_aluguel'=>250,
                    'valor_caucao'=>300,
                ]
            );

        rptAluguer(
            $tenant,
            $motorista,
            $veiculo,
            [
                'status'=>'ativo',
                'data_inicio'=>
                    '2026-09-25',
                'data_fim'=>
                    '2026-10-20',
            ]
        );

        rptAluguer(
            $tenant,
            $motorista,
            $veiculo,
            [
                'status'=>'finalizado',
                'data_inicio'=>
                    '2026-10-01',
                'data_fim'=>
                    '2026-10-03',
                'devolucao_total_pagar'=>
                    35.50,
            ]
        );

        rptAluguer(
            $tenant,
            $motorista,
            $veiculo,
            [
                'status'=>'finalizado',
                'data_inicio'=>
                    '2026-08-01',
                'data_fim'=>
                    '2026-08-31',
                'devolucao_total_pagar'=>
                    100,
            ]
        );

        rptActAs(
            $this,
            $user,
            $tenant
        );

        $this
            ->getJson(
                '/api/relatorios/alugueres?inicio=2026-10-01&fim=2026-10-05'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.kpis.total',
                2
            )
            ->assertJsonPath(
                'data.kpis.ativos',
                1
            )
            ->assertJsonPath(
                'data.kpis.finalizados',
                1
            )
            ->assertJsonPath(
                'data.kpis.rascunhos',
                0
            )
            ->assertJsonPath(
                'data.kpis.cancelados',
                0
            )
            ->assertJsonPath(
                'data.kpis.total_devolucoes',
                35.5
            )
            ->assertJsonCount(
                2,
                'data.data'
            );
    }
);

test(
    'resumo apresenta indicadores consolidados da frota',
    function(){
        $tenant=
            rptTenant(
                'Frota Resumo',
                'frota-relatorio-resumo'
            );

        $user=
            rptUser(
                $tenant,
                'admin_empresa',
                'gestor.resumo@frotapro.test'
            );

        rptEmpresa(
            $tenant,
            'Empresa Resumo'
        );

        rptProprietario(
            $tenant,
            'Proprietário Resumo'
        );

        $motorista=
            rptMotorista(
                $tenant,
                'Motorista Resumo',
                [
                    'certificado_tvde_valid_until'=>
                        '2026-10-15',
                ]
            );

        $veiculo=
            rptVeiculo(
                $tenant,
                'GG-70-GG'
            );

        rptMulta(
            $tenant,
            $veiculo,
            $motorista,
            [
                'valor'=>120,
                'data_multa'=>
                    '2026-10-02',
            ]
        );

        rptSinistro(
            $tenant,
            $veiculo,
            $motorista,
            [
                'data_sinistro'=>
                    '2026-10-03',
            ]
        );

        rptManutencao(
            $tenant,
            $veiculo,
            [
                'data_solicitacao'=>
                    '2026-10-04',

                'status'=>
                    'em_execucao',

                'custo_total'=>350,
            ]
        );

        rptAluguer(
            $tenant,
            $motorista,
            $veiculo,
            [
                'status'=>'ativo',
            ]
        );

        rptActAs(
            $this,
            $user,
            $tenant
        );

        $this
            ->getJson(
                '/api/relatorios/resumo?inicio=2026-10-01&fim=2026-10-05'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.kpis.empresas',
                1
            )
            ->assertJsonPath(
                'data.kpis.proprietarios',
                1
            )
            ->assertJsonPath(
                'data.kpis.motoristas_total',
                1
            )
            ->assertJsonPath(
                'data.kpis.motoristas_ativos',
                1
            )
            ->assertJsonPath(
                'data.kpis.veiculos_total',
                1
            )
            ->assertJsonPath(
                'data.kpis.veiculos_ativos',
                1
            )
            ->assertJsonPath(
                'data.kpis.alugueres_ativos',
                1
            )
            ->assertJsonPath(
                'data.kpis.multas_periodo',
                1
            )
            ->assertJsonPath(
                'data.kpis.valor_multas_periodo',
                120
            )
            ->assertJsonPath(
                'data.kpis.sinistros_periodo',
                1
            )
            ->assertJsonPath(
                'data.kpis.manutencoes_periodo',
                1
            )
            ->assertJsonPath(
                'data.kpis.custo_manutencoes_periodo',
                350
            )
            ->assertJsonPath(
                'data.kpis.manutencoes_abertas',
                1
            )
            ->assertJsonPath(
                'data.kpis.documentos_a_vencer',
                1
            );
    }
);

test(
    'filtros inválidos são rejeitados',
    function(){
        $tenant=
            rptTenant(
                'Frota Validação',
                'frota-relatorio-validacao'
            );

        $user=
            rptUser(
                $tenant,
                'admin_empresa',
                'gestor.validacao.relatorio@frotapro.test'
            );

        rptActAs(
            $this,
            $user,
            $tenant
        );

        $this
            ->getJson(
                '/api/relatorios/ocorrencias?inicio=2026-10-10&fim=2026-10-01&tipo=invalido&status=qualquer'
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'fim',
                'tipo',
                'status',
            ]);

        $this
            ->getJson(
                '/api/relatorios/documentos?dias=42&situacao=desconhecido'
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'dias',
                'situacao',
            ]);
    }
);
