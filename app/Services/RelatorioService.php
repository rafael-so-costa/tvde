<?php

namespace App\Services;

use App\Models\Aluguer;
use App\Models\Contrato;
use App\Models\ContratoAtivoVeiculo;
use App\Models\Empresa;
use App\Models\Manutencao;
use App\Models\Motorista;
use App\Models\Multa;
use App\Models\Proprietario;
use App\Models\Sinistro;
use App\Models\Veiculo;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class RelatorioService
{
    public function resumo(
        string $tenantId,
        array $filters
    ): array {
        [
            $inicio,
            $fim,
        ]=$this->periodo(
            $filters
        );

        $multas=
            Multa::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->whereBetween(
                    'data_multa',
                    [
                        $inicio->toDateString(),
                        $fim->toDateString(),
                    ]
                );

        $sinistros=
            Sinistro::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->whereBetween(
                    'data_sinistro',
                    [
                        $inicio->toDateString(),
                        $fim->toDateString(),
                    ]
                );

        $manutencoes=
            Manutencao::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->whereBetween(
                    'data_solicitacao',
                    [
                        $inicio->toDateString(),
                        $fim->toDateString(),
                    ]
                );

        $documentos=
            $this->documentos(
                $tenantId,
                [
                    'dias'=>30,
                ]
            );

        return [
            'periodo'=>
                $this->periodoArray(
                    $inicio,
                    $fim
                ),

            'kpis'=>[
                'empresas'=>
                    Empresa::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->count(),

                'proprietarios'=>
                    Proprietario::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->count(),

                'motoristas_total'=>
                    Motorista::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->count(),

                'motoristas_ativos'=>
                    Motorista::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'ativo',
                            true
                        )
                        ->count(),

                'veiculos_total'=>
                    Veiculo::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->count(),

                'veiculos_ativos'=>
                    Veiculo::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'ativo',
                            true
                        )
                        ->count(),

                'contratos_ativos'=>
                    Contrato::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'status',
                            'assinado'
                        )
                        ->count(),

                'alugueres_ativos'=>
                    Aluguer::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'status',
                            'ativo'
                        )
                        ->count(),

                'multas_periodo'=>
                    (clone $multas)
                        ->count(),

                'valor_multas_periodo'=>
                    round(
                        (float)(
                            (clone $multas)
                                ->sum('valor')
                        ),
                        2
                    ),

                'sinistros_periodo'=>
                    (clone $sinistros)
                        ->count(),

                'manutencoes_periodo'=>
                    (clone $manutencoes)
                        ->count(),

                'custo_manutencoes_periodo'=>
                    round(
                        (float)(
                            (clone $manutencoes)
                                ->sum(
                                    'custo_total'
                                )
                        ),
                        2
                    ),

                'manutencoes_abertas'=>
                    Manutencao::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->whereNotIn(
                            'status',
                            [
                                'concluida',
                                'cancelada',
                            ]
                        )
                        ->count(),

                'documentos_vencidos'=>
                    $documentos[
                        'kpis'
                    ][
                        'vencidos'
                    ],

                'documentos_a_vencer'=>
                    $documentos[
                        'kpis'
                    ][
                        'a_vencer'
                    ],
            ],
        ];
    }

    public function documentos(
        string $tenantId,
        array $filters
    ): array {
        $dias=
            (int)(
                $filters[
                    'dias'
                ] ?? 30
            );

        $today=
            CarbonImmutable::today();

        $limit=
            $today->addDays(
                $dias
            );

        $rows=collect();

        $entity=
            $filters[
                'entidade'
            ] ?? null;

        if(
            !$entity ||
            $entity==='empresa'
        ){
            Empresa::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->get([
                    'id',
                    'nome_empresa',
                    'certificado_tvde_valid_until',
                ])
                ->each(
                    function(
                        Empresa $empresa
                    ) use(
                        $rows,
                        $today,
                        $limit
                    ){
                        $this->pushDocumento(
                            $rows,
                            'empresa',
                            $empresa->id,
                            $empresa->nome_empresa,
                            'certificado_tvde',
                            'Certificado TVDE',
                            $empresa
                                ->certificado_tvde_valid_until,
                            $today,
                            $limit
                        );
                    }
                );
        }

        if(
            !$entity ||
            $entity==='proprietario'
        ){
            Proprietario::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->get([
                    'id',
                    'tipo',
                    'nome_completo',
                    'nome_empresa',
                    'documento_valid_until',
                    'certidao_valid_until',
                    'certificado_tvde_valid_until',
                ])
                ->each(
                    function(
                        Proprietario $proprietario
                    ) use(
                        $rows,
                        $today,
                        $limit
                    ){
                        $nome=
                            $proprietario
                                ->tipo==='empresa'
                                ?$proprietario
                                    ->nome_empresa
                                :$proprietario
                                    ->nome_completo;

                        $this->pushDocumento(
                            $rows,
                            'proprietario',
                            $proprietario->id,
                            $nome ?? 'Proprietário',
                            'documento_identificacao',
                            'Documento de identificação',
                            $proprietario
                                ->documento_valid_until,
                            $today,
                            $limit
                        );

                        $this->pushDocumento(
                            $rows,
                            'proprietario',
                            $proprietario->id,
                            $nome ?? 'Proprietário',
                            'certidao_permanente',
                            'Certidão permanente',
                            $proprietario
                                ->certidao_valid_until,
                            $today,
                            $limit
                        );

                        $this->pushDocumento(
                            $rows,
                            'proprietario',
                            $proprietario->id,
                            $nome ?? 'Proprietário',
                            'certificado_tvde',
                            'Certificado TVDE',
                            $proprietario
                                ->certificado_tvde_valid_until,
                            $today,
                            $limit
                        );
                    }
                );
        }

        if(
            !$entity ||
            $entity==='motorista'
        ){
            $query=
                Motorista::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    );

            if(
                !empty(
                    $filters[
                        'motorista_id'
                    ]
                )
            ){
                $query->whereKey(
                    $filters[
                        'motorista_id'
                    ]
                );
            }

            $query
                ->get([
                    'id',
                    'nome_completo',
                    'documento_valid_until',
                    'carta_valid_until',
                    'registo_criminal_valid_until',
                    'certificado_tvde_valid_until',
                ])
                ->each(
                    function(
                        Motorista $motorista
                    ) use(
                        $rows,
                        $today,
                        $limit
                    ){
                        $documents=[
                            [
                                'documento_identificacao',
                                'Documento de identificação',
                                $motorista
                                    ->documento_valid_until,
                            ],
                            [
                                'carta_conducao',
                                'Carta de condução',
                                $motorista
                                    ->carta_valid_until,
                            ],
                            [
                                'registo_criminal',
                                'Registo criminal',
                                $motorista
                                    ->registo_criminal_valid_until,
                            ],
                            [
                                'certificado_tvde',
                                'Certificado TVDE',
                                $motorista
                                    ->certificado_tvde_valid_until,
                            ],
                        ];

                        foreach(
                            $documents
                            as [
                                $code,
                                $label,
                                $date,
                            ]
                        ){
                            $this->pushDocumento(
                                $rows,
                                'motorista',
                                $motorista->id,
                                $motorista
                                    ->nome_completo,
                                $code,
                                $label,
                                $date,
                                $today,
                                $limit
                            );
                        }
                    }
                );
        }

        if(
            !$entity ||
            $entity==='veiculo'
        ){
            $query=
                Veiculo::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    );

            if(
                !empty(
                    $filters[
                        'veiculo_id'
                    ]
                )
            ){
                $query->whereKey(
                    $filters[
                        'veiculo_id'
                    ]
                );
            }

            $query
                ->get([
                    'id',
                    'matricula',
                    'marca',
                    'modelo',
                    'carta_verde_valid_until',
                    'inspecao_tvde_valid_until',
                    'uber_valid_until',
                    'bolt_valid_until',
                    'extintor_valid_until',
                ])
                ->each(
                    function(
                        Veiculo $veiculo
                    ) use(
                        $rows,
                        $today,
                        $limit
                    ){
                        $nome=trim(
                            implode(
                                ' ',
                                array_filter([
                                    $veiculo->matricula,
                                    $veiculo->marca,
                                    $veiculo->modelo,
                                ])
                            )
                        );

                        $documents=[
                            [
                                'carta_verde',
                                'Carta Verde / Seguro',
                                $veiculo
                                    ->carta_verde_valid_until,
                            ],
                            [
                                'inspecao_tvde',
                                'Inspeção TVDE',
                                $veiculo
                                    ->inspecao_tvde_valid_until,
                            ],
                            [
                                'uber',
                                'Validade Uber',
                                $veiculo
                                    ->uber_valid_until,
                            ],
                            [
                                'bolt',
                                'Validade Bolt',
                                $veiculo
                                    ->bolt_valid_until,
                            ],
                            [
                                'extintor',
                                'Extintor',
                                $veiculo
                                    ->extintor_valid_until,
                            ],
                        ];

                        foreach(
                            $documents
                            as [
                                $code,
                                $label,
                                $date,
                            ]
                        ){
                            $this->pushDocumento(
                                $rows,
                                'veiculo',
                                $veiculo->id,
                                $nome,
                                $code,
                                $label,
                                $date,
                                $today,
                                $limit
                            );
                        }
                    }
                );
        }

        $kpis=[
            'total'=>$rows->count(),

            'vencidos'=>
                $rows
                    ->where(
                        'situacao',
                        'vencido'
                    )
                    ->count(),

            'a_vencer'=>
                $rows
                    ->where(
                        'situacao',
                        'a_vencer'
                    )
                    ->count(),

            'validos'=>
                $rows
                    ->where(
                        'situacao',
                        'valido'
                    )
                    ->count(),
        ];

        if(
            !empty(
                $filters[
                    'situacao'
                ]
            )
        ){
            $rows=
                $rows
                    ->where(
                        'situacao',
                        $filters[
                            'situacao'
                        ]
                    );
        }

        return [
            'dias'=>$dias,
            'kpis'=>$kpis,
            'data'=>$rows
                ->sortBy(
                    'validade'
                )
                ->values()
                ->all(),
        ];
    }

    public function veiculos(
        string $tenantId,
        array $filters
    ): array {
        [
            $inicio,
            $fim,
        ]=$this->periodo(
            $filters
        );

        $query=
            Veiculo::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->with([
                    'proprietario:id,tipo,nome_completo,nome_empresa',
                ])
                ->withCount([
                    'manutencoes as manutencoes_periodo'=>
                        fn($query)=>
                            $query
                                ->whereBetween(
                                    'data_solicitacao',
                                    [
                                        $inicio
                                            ->toDateString(),
                                        $fim
                                            ->toDateString(),
                                    ]
                                ),

                    'manutencoes as manutencoes_abertas'=>
                        fn($query)=>
                            $query
                                ->whereNotIn(
                                    'status',
                                    [
                                        'concluida',
                                        'cancelada',
                                    ]
                                ),

                    'multas as multas_periodo'=>
                        fn($query)=>
                            $query
                                ->whereBetween(
                                    'data_multa',
                                    [
                                        $inicio
                                            ->toDateString(),
                                        $fim
                                            ->toDateString(),
                                    ]
                                ),

                    'sinistros as sinistros_periodo'=>
                        fn($query)=>
                            $query
                                ->whereBetween(
                                    'data_sinistro',
                                    [
                                        $inicio
                                            ->toDateString(),
                                        $fim
                                            ->toDateString(),
                                    ]
                                ),
                ])
                ->withSum(
                    [
                        'manutencoes as custo_manutencao_periodo'=>
                            fn($query)=>
                                $query
                                    ->whereBetween(
                                        'data_solicitacao',
                                        [
                                            $inicio
                                                ->toDateString(),
                                            $fim
                                                ->toDateString(),
                                        ]
                                    ),
                    ],
                    'custo_total'
                )
                ->withSum(
                    [
                        'multas as valor_multas_periodo'=>
                            fn($query)=>
                                $query
                                    ->whereBetween(
                                        'data_multa',
                                        [
                                            $inicio
                                                ->toDateString(),
                                            $fim
                                                ->toDateString(),
                                        ]
                                    ),
                    ],
                    'valor'
                );

        if(
            !empty(
                $filters[
                    'veiculo_id'
                ]
            )
        ){
            $query->whereKey(
                $filters[
                    'veiculo_id'
                ]
            );
        }

        if(
            !empty(
                $filters[
                    'proprietario_id'
                ]
            )
        ){
            $query->where(
                'proprietario_id',
                $filters[
                    'proprietario_id'
                ]
            );
        }

        if(
            array_key_exists(
                'ativo',
                $filters
            ) &&
            $filters[
                'ativo'
            ]!==null
        ){
            $query->where(
                'ativo',
                (bool)$filters[
                    'ativo'
                ]
            );
        }

        if(
            !empty(
                $filters[
                    'disponibilidade'
                ]
            )
        ){
            $query->where(
                'disponibilidade',
                $filters[
                    'disponibilidade'
                ]
            );
        }

        $vehicles=
            $query
                ->orderBy(
                    'matricula'
                )
                ->get();

        $rows=
            $vehicles
                ->map(
                    function(
                        Veiculo $veiculo
                    ){
                        $proprietario=
                            $veiculo
                                ->proprietario;

                        $proprietarioNome=
                            !$proprietario
                                ?null
                                :(
                                    $proprietario
                                        ->tipo==='empresa'
                                        ?$proprietario
                                            ->nome_empresa
                                        :$proprietario
                                            ->nome_completo
                                );

                        return [
                            'id'=>$veiculo->id,
                            'matricula'=>$veiculo->matricula,
                            'marca'=>$veiculo->marca,
                            'modelo'=>$veiculo->modelo,
                            'ativo'=>
                                (bool)$veiculo
                                    ->ativo,
                            'status_cadastro'=>
                                $veiculo
                                    ->status_cadastro,
                            'disponibilidade'=>
                                $veiculo
                                    ->disponibilidade,
                            'indisponibilidade_motivo'=>
                                $veiculo
                                    ->indisponibilidade_motivo,
                            'km_atual'=>
                                $veiculo
                                    ->km_atual,
                            'proprietario'=>[
                                'id'=>$proprietario
                                    ?->id,
                                'nome'=>
                                    $proprietarioNome,
                            ],
                            'manutencoes_periodo'=>
                                (int)$veiculo
                                    ->manutencoes_periodo,
                            'manutencoes_abertas'=>
                                (int)$veiculo
                                    ->manutencoes_abertas,
                            'custo_manutencao_periodo'=>
                                round(
                                    (float)(
                                        $veiculo
                                            ->custo_manutencao_periodo
                                        ?? 0
                                    ),
                                    2
                                ),
                            'multas_periodo'=>
                                (int)$veiculo
                                    ->multas_periodo,
                            'valor_multas_periodo'=>
                                round(
                                    (float)(
                                        $veiculo
                                            ->valor_multas_periodo
                                        ?? 0
                                    ),
                                    2
                                ),
                            'sinistros_periodo'=>
                                (int)$veiculo
                                    ->sinistros_periodo,
                        ];
                    }
                );

        return [
            'periodo'=>
                $this->periodoArray(
                    $inicio,
                    $fim
                ),

            'kpis'=>[
                'total'=>$rows->count(),

                'ativos'=>
                    $rows
                        ->where(
                            'ativo',
                            true
                        )
                        ->count(),

                'inativos'=>
                    $rows
                        ->where(
                            'ativo',
                            false
                        )
                        ->count(),

                'indisponiveis'=>
                    $rows
                        ->filter(
                            fn(array $row)=>
                                $row[
                                    'disponibilidade'
                                ]!=='disponivel'
                        )
                        ->count(),

                'custo_manutencao'=>
                    round(
                        (float)$rows
                            ->sum(
                                'custo_manutencao_periodo'
                            ),
                        2
                    ),

                'valor_multas'=>
                    round(
                        (float)$rows
                            ->sum(
                                'valor_multas_periodo'
                            ),
                        2
                    ),

                'sinistros'=>
                    (int)$rows
                        ->sum(
                            'sinistros_periodo'
                        ),
            ],

            'data'=>$rows
                ->values()
                ->all(),
        ];
    }

    public function motoristas(
        string $tenantId,
        array $filters
    ): array {
        [
            $inicio,
            $fim,
        ]=$this->periodo(
            $filters
        );

        $dias=
            (int)(
                $filters[
                    'dias'
                ] ?? 30
            );

        $query=
            Motorista::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->withCount([
                    'multas as multas_periodo'=>
                        fn($query)=>
                            $query
                                ->whereBetween(
                                    'data_multa',
                                    [
                                        $inicio
                                            ->toDateString(),
                                        $fim
                                            ->toDateString(),
                                    ]
                                ),

                    'sinistros as sinistros_periodo'=>
                        fn($query)=>
                            $query
                                ->whereBetween(
                                    'data_sinistro',
                                    [
                                        $inicio
                                            ->toDateString(),
                                        $fim
                                            ->toDateString(),
                                    ]
                                ),
                ])
                ->withSum(
                    [
                        'multas as valor_multas_periodo'=>
                            fn($query)=>
                                $query
                                    ->whereBetween(
                                        'data_multa',
                                        [
                                            $inicio
                                                ->toDateString(),
                                            $fim
                                                ->toDateString(),
                                        ]
                                    ),
                    ],
                    'valor'
                );

        if(
            !empty(
                $filters[
                    'motorista_id'
                ]
            )
        ){
            $query->whereKey(
                $filters[
                    'motorista_id'
                ]
            );
        }

        if(
            array_key_exists(
                'ativo',
                $filters
            ) &&
            $filters[
                'ativo'
            ]!==null
        ){
            $query->where(
                'ativo',
                (bool)$filters[
                    'ativo'
                ]
            );
        }

        if(
            !empty(
                $filters[
                    'status_cadastro'
                ]
            )
        ){
            $query->where(
                'status_cadastro',
                $filters[
                    'status_cadastro'
                ]
            );
        }

        $drivers=
            $query
                ->orderBy(
                    'nome_completo'
                )
                ->get();

        $assignments=
            ContratoAtivoVeiculo::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'ativo',
                    true
                )
                ->whereIn(
                    'motorista_id',
                    $drivers
                        ->pluck('id')
                )
                ->with([
                    'veiculo:id,matricula,marca,modelo',
                ])
                ->get()
                ->groupBy(
                    'motorista_id'
                );

        $rows=
            $drivers
                ->map(
                    function(
                        Motorista $motorista
                    ) use(
                        $dias,
                        $assignments
                    ){
                        $documentos=
                            $this
                                ->motoristaDocumentos(
                                    $motorista,
                                    $dias
                                );

                        return [
                            'id'=>$motorista->id,
                            'nome'=>$motorista
                                ->nome_completo,
                            'nif'=>$motorista->nif,
                            'email'=>$motorista->email,
                            'telemovel'=>
                                $motorista
                                    ->telemovel,
                            'ativo'=>
                                (bool)$motorista
                                    ->ativo,
                            'status_cadastro'=>
                                $motorista
                                    ->status_cadastro,

                            'documentos_vencidos'=>
                                $documentos[
                                    'vencidos'
                                ],

                            'documentos_a_vencer'=>
                                $documentos[
                                    'a_vencer'
                                ],

                            'multas_periodo'=>
                                (int)$motorista
                                    ->multas_periodo,

                            'valor_multas_periodo'=>
                                round(
                                    (float)(
                                        $motorista
                                            ->valor_multas_periodo
                                        ?? 0
                                    ),
                                    2
                                ),

                            'sinistros_periodo'=>
                                (int)$motorista
                                    ->sinistros_periodo,

                            'veiculos_ativos'=>
                                collect(
                                    $assignments[
                                        $motorista->id
                                    ] ?? []
                                )
                                    ->map(
                                        fn(
                                            ContratoAtivoVeiculo $item
                                        )=>[
                                            'id'=>$item
                                                ->veiculo
                                                ?->id,
                                            'matricula'=>
                                                $item
                                                    ->veiculo
                                                    ?->matricula,
                                            'marca'=>
                                                $item
                                                    ->veiculo
                                                    ?->marca,
                                            'modelo'=>
                                                $item
                                                    ->veiculo
                                                    ?->modelo,
                                        ]
                                    )
                                    ->filter(
                                        fn(
                                            array $item
                                        )=>
                                            $item[
                                                'id'
                                            ]!==null
                                    )
                                    ->values()
                                    ->all(),
                        ];
                    }
                );

        return [
            'periodo'=>
                $this->periodoArray(
                    $inicio,
                    $fim
                ),

            'dias_documentos'=>$dias,

            'kpis'=>[
                'total'=>$rows->count(),

                'ativos'=>
                    $rows
                        ->where(
                            'ativo',
                            true
                        )
                        ->count(),

                'inativos'=>
                    $rows
                        ->where(
                            'ativo',
                            false
                        )
                        ->count(),

                'cadastros_incompletos'=>
                    $rows
                        ->where(
                            'status_cadastro',
                            'incompleto'
                        )
                        ->count(),

                'documentos_vencidos'=>
                    (int)$rows
                        ->sum(
                            'documentos_vencidos'
                        ),

                'documentos_a_vencer'=>
                    (int)$rows
                        ->sum(
                            'documentos_a_vencer'
                        ),

                'valor_multas'=>
                    round(
                        (float)$rows
                            ->sum(
                                'valor_multas_periodo'
                            ),
                        2
                    ),

                'sinistros'=>
                    (int)$rows
                        ->sum(
                            'sinistros_periodo'
                        ),
            ],

            'data'=>$rows
                ->values()
                ->all(),
        ];
    }

    public function ocorrencias(
        string $tenantId,
        array $filters
    ): array {
        [
            $inicio,
            $fim,
        ]=$this->periodo(
            $filters
        );

        $rows=collect();

        $tipo=
            $filters[
                'tipo'
            ] ?? null;

        $status=
            $filters[
                'status'
            ] ?? null;

        $multaStatuses=[
            'pendente',
            'paga',
            'contestada',
        ];

        $sinistroStatuses=[
            'aberto',
            'em_andamento',
            'encerrado',
        ];

        if(
            (!$tipo || $tipo==='multa') &&
            (
                !$status ||
                in_array(
                    $status,
                    $multaStatuses,
                    true
                )
            )
        ){
            $query=
                Multa::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->whereBetween(
                        'data_multa',
                        [
                            $inicio
                                ->toDateString(),
                            $fim
                                ->toDateString(),
                        ]
                    )
                    ->with([
                        'veiculo:id,matricula,marca,modelo',
                        'motorista:id,nome_completo',
                    ]);

            $this->occurrenceFilters(
                $query,
                $filters
            );

            if($status){
                $query->where(
                    'status',
                    $status
                );
            }

            $query
                ->get()
                ->each(
                    function(
                        Multa $multa
                    ) use(
                        $rows
                    ){
                        $rows->push([
                            'id'=>$multa->id,
                            'tipo'=>'multa',
                            'data'=>
                                $multa
                                    ->data_multa
                                    ?->format(
                                        'Y-m-d'
                                    ),
                            'status'=>
                                $multa->status,
                            'referencia'=>
                                $multa
                                    ->numero_notificacao,
                            'veiculo'=>[
                                'id'=>$multa
                                    ->veiculo
                                    ?->id,
                                'matricula'=>
                                    $multa
                                        ->veiculo
                                        ?->matricula,
                            ],
                            'motorista'=>[
                                'id'=>$multa
                                    ->motorista
                                    ?->id,
                                'nome'=>$multa
                                    ->motorista
                                    ?->nome_completo,
                            ],
                            'valor'=>
                                round(
                                    (float)$multa
                                        ->valor,
                                    2
                                ),
                            'descricao'=>
                                $multa
                                    ->descricao,
                        ]);
                    }
                );
        }

        if(
            (!$tipo || $tipo==='sinistro') &&
            (
                !$status ||
                in_array(
                    $status,
                    $sinistroStatuses,
                    true
                )
            )
        ){
            $query=
                Sinistro::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->whereBetween(
                        'data_sinistro',
                        [
                            $inicio
                                ->toDateString(),
                            $fim
                                ->toDateString(),
                        ]
                    )
                    ->with([
                        'veiculo:id,matricula,marca,modelo',
                        'motorista:id,nome_completo',
                    ]);

            $this->occurrenceFilters(
                $query,
                $filters
            );

            if($status){
                $query->where(
                    'status',
                    $status
                );
            }

            $query
                ->get()
                ->each(
                    function(
                        Sinistro $sinistro
                    ) use(
                        $rows
                    ){
                        $rows->push([
                            'id'=>$sinistro->id,
                            'tipo'=>'sinistro',
                            'data'=>
                                $sinistro
                                    ->data_sinistro
                                    ?->format(
                                        'Y-m-d'
                                    ),
                            'status'=>
                                $sinistro->status,
                            'referencia'=>
                                $sinistro
                                    ->numero_processo,
                            'veiculo'=>[
                                'id'=>$sinistro
                                    ->veiculo
                                    ?->id,
                                'matricula'=>
                                    $sinistro
                                        ->veiculo
                                        ?->matricula,
                            ],
                            'motorista'=>[
                                'id'=>$sinistro
                                    ->motorista
                                    ?->id,
                                'nome'=>$sinistro
                                    ->motorista
                                    ?->nome_completo,
                            ],
                            'valor'=>null,
                            'descricao'=>
                                $sinistro
                                    ->descricao,
                        ]);
                    }
                );
        }

        return [
            'periodo'=>
                $this->periodoArray(
                    $inicio,
                    $fim
                ),

            'kpis'=>[
                'total'=>$rows->count(),

                'multas'=>
                    $rows
                        ->where(
                            'tipo',
                            'multa'
                        )
                        ->count(),

                'multas_pendentes'=>
                    $rows
                        ->where(
                            'tipo',
                            'multa'
                        )
                        ->where(
                            'status',
                            'pendente'
                        )
                        ->count(),

                'valor_multas'=>
                    round(
                        (float)$rows
                            ->where(
                                'tipo',
                                'multa'
                            )
                            ->sum(
                                'valor'
                            ),
                        2
                    ),

                'sinistros'=>
                    $rows
                        ->where(
                            'tipo',
                            'sinistro'
                        )
                        ->count(),

                'sinistros_abertos'=>
                    $rows
                        ->where(
                            'tipo',
                            'sinistro'
                        )
                        ->whereIn(
                            'status',
                            [
                                'aberto',
                                'em_andamento',
                            ]
                        )
                        ->count(),
            ],

            'data'=>$rows
                ->sortByDesc(
                    'data'
                )
                ->values()
                ->all(),
        ];
    }

    public function alugueres(
        string $tenantId,
        array $filters
    ): array {
        [
            $inicio,
            $fim,
        ]=$this->periodo(
            $filters
        );

        $query=
            Aluguer::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->with([
                    'motorista:id,nome_completo',
                    'veiculo:id,matricula,marca,modelo,valor_aluguel,valor_caucao',
                    'proprietario:id,tipo,nome_completo,nome_empresa',
                    'contratoAluguer:id,status,valor_diaria,valor_semanal,valor_caucao,valor_total',
                ])
                ->where(
                    function(
                        $query
                    ) use(
                        $inicio,
                        $fim
                    ){
                        $query
                            ->where(
                                function(
                                    $query
                                ) use(
                                    $inicio,
                                    $fim
                                ){
                                    $query
                                        ->whereNotNull(
                                            'data_inicio'
                                        )
                                        ->whereDate(
                                            'data_inicio',
                                            '<=',
                                            $fim
                                                ->toDateString()
                                        )
                                        ->where(
                                            function(
                                                $query
                                            ) use(
                                                $inicio
                                            ){
                                                $query
                                                    ->whereNull(
                                                        'data_fim'
                                                    )
                                                    ->orWhereDate(
                                                        'data_fim',
                                                        '>=',
                                                        $inicio
                                                            ->toDateString()
                                                    );
                                            }
                                        );
                                }
                            )
                            ->orWhere(
                                function(
                                    $query
                                ) use(
                                    $inicio,
                                    $fim
                                ){
                                    $query
                                        ->whereNull(
                                            'data_inicio'
                                        )
                                        ->whereBetween(
                                            'created_at',
                                            [
                                                $inicio,
                                                $fim,
                                            ]
                                        );
                                }
                            );
                    }
                );

        if(
            !empty(
                $filters[
                    'status'
                ]
            )
        ){
            $query->where(
                'status',
                $filters[
                    'status'
                ]
            );
        }

        if(
            !empty(
                $filters[
                    'motorista_id'
                ]
            )
        ){
            $query->where(
                'motorista_id',
                $filters[
                    'motorista_id'
                ]
            );
        }

        if(
            !empty(
                $filters[
                    'veiculo_id'
                ]
            )
        ){
            $query->where(
                'veiculo_id',
                $filters[
                    'veiculo_id'
                ]
            );
        }

        $rentals=
            $query
                ->latest(
                    'data_inicio'
                )
                ->get();

        $rows=
            $rentals
                ->map(
                    function(
                        Aluguer $aluguer
                    ){
                        $owner=
                            $aluguer
                                ->proprietario;

                        return [
                            'id'=>$aluguer->id,
                            'status'=>$aluguer
                                ->status,

                            'data_inicio'=>
                                $aluguer
                                    ->data_inicio
                                    ?->format(
                                        'Y-m-d'
                                    ),

                            'data_fim'=>
                                $aluguer
                                    ->data_fim
                                    ?->format(
                                        'Y-m-d'
                                    ),

                            'data_finalizacao'=>
                                $aluguer
                                    ->data_finalizacao
                                    ?->toISOString(),

                            'motorista'=>[
                                'id'=>$aluguer
                                    ->motorista
                                    ?->id,
                                'nome'=>$aluguer
                                    ->motorista
                                    ?->nome_completo,
                            ],

                            'veiculo'=>[
                                'id'=>$aluguer
                                    ->veiculo
                                    ?->id,
                                'matricula'=>$aluguer
                                    ->veiculo
                                    ?->matricula,
                                'marca'=>$aluguer
                                    ->veiculo
                                    ?->marca,
                                'modelo'=>$aluguer
                                    ->veiculo
                                    ?->modelo,
                            ],

                            'proprietario'=>[
                                'id'=>$owner?->id,
                                'nome'=>!$owner
                                    ?null
                                    :(
                                        $owner
                                            ->tipo==='empresa'
                                            ?$owner
                                                ->nome_empresa
                                            :$owner
                                                ->nome_completo
                                    ),
                            ],

                            'valor_aluguel_veiculo'=>
                                $aluguer
                                    ->veiculo
                                    ?->valor_aluguel!==null
                                    ?round(
                                        (float)$aluguer
                                            ->veiculo
                                            ->valor_aluguel,
                                        2
                                    )
                                    :null,

                            'valor_caucao_veiculo'=>
                                $aluguer
                                    ->veiculo
                                    ?->valor_caucao!==null
                                    ?round(
                                        (float)$aluguer
                                            ->veiculo
                                            ->valor_caucao,
                                        2
                                    )
                                    :null,

                            'contrato'=>[
                                'id'=>$aluguer
                                    ->contratoAluguer
                                    ?->id,

                                'status'=>$aluguer
                                    ->contratoAluguer
                                    ?->status,

                                'valor_diaria'=>
                                    $this->moneyOrNull(
                                        $aluguer
                                            ->contratoAluguer
                                            ?->valor_diaria
                                    ),

                                'valor_semanal'=>
                                    $this->moneyOrNull(
                                        $aluguer
                                            ->contratoAluguer
                                            ?->valor_semanal
                                    ),

                                'valor_total'=>
                                    $this->moneyOrNull(
                                        $aluguer
                                            ->contratoAluguer
                                            ?->valor_total
                                    ),
                            ],

                            'devolucao_total_pagar'=>
                                round(
                                    (float)$aluguer
                                        ->devolucao_total_pagar,
                                    2
                                ),
                        ];
                    }
                );

        return [
            'periodo'=>
                $this->periodoArray(
                    $inicio,
                    $fim
                ),

            'kpis'=>[
                'total'=>$rows->count(),

                'ativos'=>
                    $rows
                        ->where(
                            'status',
                            'ativo'
                        )
                        ->count(),

                'finalizados'=>
                    $rows
                        ->where(
                            'status',
                            'finalizado'
                        )
                        ->count(),

                'rascunhos'=>
                    $rows
                        ->where(
                            'status',
                            'rascunho'
                        )
                        ->count(),

                'cancelados'=>
                    $rows
                        ->where(
                            'status',
                            'cancelado'
                        )
                        ->count(),

                'valor_contratado'=>
                    round(
                        (float)$rows
                            ->sum(
                                'contrato.valor_total'
                            ),
                        2
                    ),

                'total_devolucoes'=>
                    round(
                        (float)$rows
                            ->sum(
                                'devolucao_total_pagar'
                            ),
                        2
                    ),
            ],

            'data'=>$rows
                ->values()
                ->all(),
        ];
    }

    private function periodo(
        array $filters
    ): array {
        $inicio=
            CarbonImmutable::parse(
                $filters[
                    'inicio'
                ] ??
                now()
                    ->startOfMonth()
                    ->toDateString()
            )
                ->startOfDay();

        $fim=
            CarbonImmutable::parse(
                $filters[
                    'fim'
                ] ??
                now()
                    ->toDateString()
            )
                ->endOfDay();

        return [
            $inicio,
            $fim,
        ];
    }

    private function periodoArray(
        CarbonImmutable $inicio,
        CarbonImmutable $fim
    ): array {
        return [
            'inicio'=>
                $inicio
                    ->toDateString(),

            'fim'=>
                $fim
                    ->toDateString(),
        ];
    }

    private function pushDocumento(
        Collection $rows,
        string $entidade,
        string $entidadeId,
        string $nome,
        string $documento,
        string $documentoLabel,
        mixed $validade,
        CarbonImmutable $today,
        CarbonImmutable $limit
    ): void {
        if(!$validade){
            return;
        }

        $date=
            CarbonImmutable::parse(
                $validade
            )
                ->startOfDay();

        $situacao=
            $date->lt(
                $today
            )
                ?'vencido'
                :(
                    $date->lte(
                        $limit
                    )
                        ?'a_vencer'
                        :'valido'
                );

        $rows->push([
            'entidade'=>$entidade,
            'entidade_id'=>$entidadeId,
            'nome'=>$nome,
            'documento'=>$documento,
            'documento_label'=>
                $documentoLabel,
            'validade'=>
                $date
                    ->toDateString(),
            'dias_restantes'=>
                (int)$today
                    ->diffInDays(
                        $date,
                        false
                    ),
            'situacao'=>$situacao,
        ]);
    }

    private function motoristaDocumentos(
        Motorista $motorista,
        int $dias
    ): array {
        $today=
            CarbonImmutable::today();

        $limit=
            $today->addDays(
                $dias
            );

        $dates=[
            $motorista
                ->documento_valid_until,
            $motorista
                ->carta_valid_until,
            $motorista
                ->registo_criminal_valid_until,
            $motorista
                ->certificado_tvde_valid_until,
        ];

        $vencidos=0;
        $aVencer=0;

        foreach(
            $dates
            as $value
        ){
            if(!$value){
                continue;
            }

            $date=
                CarbonImmutable::parse(
                    $value
                )
                    ->startOfDay();

            if(
                $date->lt(
                    $today
                )
            ){
                $vencidos++;

                continue;
            }

            if(
                $date->lte(
                    $limit
                )
            ){
                $aVencer++;
            }
        }

        return [
            'vencidos'=>$vencidos,
            'a_vencer'=>$aVencer,
        ];
    }

    private function occurrenceFilters(
        $query,
        array $filters
    ): void {
        if(
            !empty(
                $filters[
                    'motorista_id'
                ]
            )
        ){
            $query->where(
                'motorista_id',
                $filters[
                    'motorista_id'
                ]
            );
        }

        if(
            !empty(
                $filters[
                    'veiculo_id'
                ]
            )
        ){
            $query->where(
                'veiculo_id',
                $filters[
                    'veiculo_id'
                ]
            );
        }
    }

    private function moneyOrNull(
        mixed $value
    ): ?float {
        if($value===null){
            return null;
        }

        return round(
            (float)$value,
            2
        );
    }
}
