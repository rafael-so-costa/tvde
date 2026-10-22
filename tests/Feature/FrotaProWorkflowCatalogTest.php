<?php

use App\Services\ChecklistProcessPresetService;
use App\Services\FrotaProWorkflowCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

test(
    'catalogo recomendado preserva presets existentes e disponibiliza workflows documentais',
    function(){
        $catalog=
            app(
                FrotaProWorkflowCatalog::class
            );

        $workflows=
            $catalog->all();

        expect($workflows)
            ->toHaveCount(12);

        $codes=
            collect($workflows)
                ->pluck('codigo');

        expect(
            $codes->unique()
        )->toHaveCount(
            12
        );

        foreach([
            'aluguer_completo_tvde',
            'aluguer_essencial',
            'prestacao_servicos_motorista',
            'entrega_recolha_veiculo',
            'onboarding_motorista',

            'denuncia_prestacao_servicos',
            'comodato_proprietario_nif',
            'comodato_proprietario_documento',
            'autorizacao_tvde_motorista_proprietario',
            'autorizacao_tvde_proprietario_terceiro',
            'aluguer_tvde_pessoa_singular',
            'aluguer_tvde_pessoa_coletiva',
        ] as $code){
            expect(
                $codes->contains(
                    $code
                )
            )->toBeTrue();
        }
    }
);

test(
    'oito modelos documentais possuem workflow recomendado',
    function(){
        $map=
            app(
                FrotaProWorkflowCatalog::class
            )->documentWorkflowMap();

        expect($map)
            ->toHaveCount(8);

        expect(
            array_keys($map)
        )->toBe([
            'prestacao_servicos_motorista',
            'denuncia_prestacao_servicos',
            'comodato_proprietario_nif',
            'comodato_proprietario_documento',
            'autorizacao_tvde_motorista_proprietario',
            'autorizacao_tvde_proprietario_terceiro',
            'aluguer_veiculo_pessoa_singular',
            'aluguer_veiculo_pessoa_coletiva',
        ]);

        $workflowCodes=
            collect(
                app(
                    FrotaProWorkflowCatalog::class
                )->all()
            )
                ->pluck('codigo');

        foreach($map as $workflow){
            expect(
                $workflowCodes->contains(
                    $workflow
                )
            )->toBeTrue();
        }
    }
);

test(
    'todos workflows possuem etapas validas e ordenadas',
    function(){
        $allowedTypes=[
            'tarefa',
            'preenchimento',
            'assinatura',
            'upload',
            'aprovacao',
            'gerar_documento',
            'contrato_relacionado',
            'checklist_veiculo',
            'validacao',
            'acao_sistema',
        ];

        $signaturePlaceholders=[
            'ASSINATURA_MOTORISTA',
            'ASSINATURA_PROPRIETARIO',
            'ASSINATURA_EMPRESA',
            'ASSINATURA_TESTEMUNHA',
        ];

        foreach(
            app(
                FrotaProWorkflowCatalog::class
            )->all()
            as $workflow
        ){
            expect(
                $workflow['items']
            )->not->toBeEmpty();

            $codes=
                collect(
                    $workflow['items']
                )
                    ->pluck(
                        'codigo'
                    );

            expect(
                $codes->unique()->count()
            )->toBe(
                $codes->count()
            );

            $orders=
                collect(
                    $workflow['items']
                )
                    ->pluck(
                        'ordem'
                    )
                    ->values()
                    ->all();

            $sorted=$orders;

            sort($sorted);

            expect(
                $orders
            )->toBe(
                $sorted
            );

            foreach(
                $workflow['items']
                as $item
            ){
                expect(
                    in_array(
                        $item['tipo'],
                        $allowedTypes,
                        true
                    )
                )->toBeTrue();

                if(
                    $item['tipo']===
                    'assinatura'
                ){
                    expect(
                        data_get(
                            $item,
                            'configuracao.placeholder'
                        )
                    )->toBeIn(
                        $signaturePlaceholders
                    );
                }

                if(
                    $item['tipo']===
                    'checklist_veiculo'
                ){
                    expect(
                        data_get(
                            $item,
                            'configuracao.checklist_tipo'
                        )
                    )->toBeIn([
                        'entrega',
                        'recolha',
                    ]);
                }

                if(
                    $item['tipo']===
                    'contrato_relacionado'
                ){
                    expect(
                        data_get(
                            $item,
                            'configuracao.tipo_contrato_codigo'
                        )
                    )->not->toBeEmpty();

                    expect(
                        data_get(
                            $item,
                            'configuracao.status_conclusao'
                        )
                    )->toBeIn([
                        'criado',
                        'assinado',
                        'encerrado',
                    ]);
                }

                if(
                    $item['tipo']===
                    'acao_sistema'
                ){
                    expect(
                        data_get(
                            $item,
                            'configuracao.action'
                        )
                    )->not->toBeEmpty();
                }

                if(
                    in_array(
                        $item['tipo'],
                        [
                            'validacao',
                            'aprovacao',
                        ],
                        true
                    )
                ){
                    expect(
                        data_get(
                            $item,
                            'configuracao.regra'
                        )
                    )->not->toBeEmpty();
                }
            }
        }
    }
);

test(
    'servico de presets utiliza catalogo central',
    function(){
        $result=
            app(
                ChecklistProcessPresetService::class
            )->catalog(
                Str::uuid()->toString()
            );

        expect($result)
            ->toHaveCount(12);

        expect(
            collect($result)
                ->firstWhere(
                    'codigo',
                    'denuncia_prestacao_servicos'
                )
        )->not->toBeNull();

        expect(
            collect($result)
                ->firstWhere(
                    'codigo',
                    'aluguer_tvde_pessoa_singular'
                )
        )->not->toBeNull();

        expect(
            collect($result)
                ->firstWhere(
                    'codigo',
                    'aluguer_tvde_pessoa_coletiva'
                )
        )->not->toBeNull();
    }
);
test(
    'empresa do tenant e usada nas validacoes dos workflows',
    function(){
        $workflows=
            collect(
                app(
                    FrotaProWorkflowCatalog::class
                )->all()
            );

        $rules=
            $workflows
                ->flatMap(
                    fn(array $workflow)=>
                        collect(
                            $workflow['items']
                        )
                            ->pluck(
                                'configuracao.regra'
                            )
                )
                ->filter()
                ->values();

        expect(
            $rules->contains(
                'empresa_tenant_tvde_valida'
            )
        )->toBeTrue();

        expect(
            $rules->contains(
                'empresa_tvde_valida'
            )
        )->toBeFalse();
    }
);
