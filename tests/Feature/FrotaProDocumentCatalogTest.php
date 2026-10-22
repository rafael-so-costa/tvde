<?php

use App\Services\FrotaProDocumentCatalog;
use App\Services\FrotaProWorkflowCatalog;
use App\Services\TemplateTextAnalyzerService;

test(
    'catalogo documental FrotaPRO possui oito modelos recomendados',
    function(){
        $catalog=
            app(
                FrotaProDocumentCatalog::class
            );

        $documents=
            $catalog->all();

        expect($documents)
            ->toHaveCount(8);

        expect(
            collect($documents)
                ->pluck('codigo')
                ->unique()
        )->toHaveCount(8);

        expect(
            collect($documents)
                ->pluck('slug')
                ->unique()
        )->toHaveCount(8);
    }
);

test(
    'todos modelos possuem ficheiro e workflow recomendado valido',
    function(){
        $catalog=
            app(
                FrotaProDocumentCatalog::class
            );

        $workflowCodes=
            collect(
                app(
                    FrotaProWorkflowCatalog::class
                )->all()
            )
                ->pluck(
                    'codigo'
                );

        foreach(
            $catalog->all()
            as $document
        ){
            expect(
                $workflowCodes->contains(
                    $document[
                        'workflow_codigo'
                    ]
                )
            )->toBeTrue();

            $content=
                $catalog->content(
                    $document
                );

            expect(
                mb_strlen(
                    $content
                )
            )->toBeGreaterThan(
                100
            );

            expect(
                $document[
                    'juridicamente_revisto'
                ]
            )->toBeFalse();
        }
    }
);

test(
    'modelos usam placeholders canonicos reconhecidos pelo analisador',
    function(){
        $catalog=
            app(
                FrotaProDocumentCatalog::class
            );

        $analyzer=
            app(
                TemplateTextAnalyzerService::class
            );

        foreach(
            $catalog->all()
            as $document
        ){
            $analysis=
                $analyzer->analyze(
                    $catalog->content(
                        $document
                    )
                );

            $unknown=
                collect(
                    $analysis[
                        'warnings'
                    ] ?? []
                )
                    ->where(
                        'code',
                        'UNKNOWN_PLACEHOLDER'
                    );

            expect(
                $unknown->all(),
                "Placeholders desconhecidos em {$document['codigo']}"
            )->toBe([]);

            expect(
                $analysis[
                    'campos_detectados'
                ] ?? []
            )->not->toBeEmpty();

            expect(
                $analysis[
                    'conteudo_parametrizado'
                ] ?? ''
            )->not->toBeEmpty();
        }
    }
);

test(
    'empresa dos modelos e sempre tratada como entidade empresa do contexto',
    function(){
        $catalog=
            app(
                FrotaProDocumentCatalog::class
            );

        $analyzer=
            app(
                TemplateTextAnalyzerService::class
            );

        foreach(
            $catalog->all()
            as $document
        ){
            $analysis=
                $analyzer->analyze(
                    $catalog->content(
                        $document
                    )
                );

            $mappings=
                collect(
                    $analysis[
                        'campos_mapeados'
                    ] ?? []
                );

            $companyMappings=
                $mappings
                    ->filter(
                        fn(
                            array $mapping,
                            string $field
                        )=>
                            str_starts_with(
                                $field,
                                'EMPRESA_'
                            )
                    );

            if(
                $companyMappings
                    ->isEmpty()
            ){
                continue;
            }

            foreach(
                $companyMappings
                as $mapping
            ){
                expect(
                    $mapping[
                        'origem'
                    ] ?? null
                )->toBe(
                    'empresa'
                );
            }
        }
    }
);

test(
    'modelos documentais possuem assinaturas coerentes com os workflows',
    function(){
        $catalog=
            app(
                FrotaProDocumentCatalog::class
            );

        $analyzer=
            app(
                TemplateTextAnalyzerService::class
            );

        $expected=[
            'prestacao_servicos_motorista'=>[
                'ASSINATURA_EMPRESA',
                'ASSINATURA_MOTORISTA',
            ],

            'denuncia_prestacao_servicos'=>[
                'ASSINATURA_EMPRESA',
                'ASSINATURA_MOTORISTA',
            ],

            'comodato_proprietario_nif'=>[
                'ASSINATURA_PROPRIETARIO',
                'ASSINATURA_EMPRESA',
            ],

            'comodato_proprietario_documento'=>[
                'ASSINATURA_PROPRIETARIO',
                'ASSINATURA_EMPRESA',
            ],

            'autorizacao_tvde_motorista_proprietario'=>[
                'ASSINATURA_MOTORISTA',
            ],

            'autorizacao_tvde_proprietario_terceiro'=>[
                'ASSINATURA_PROPRIETARIO',
                'ASSINATURA_MOTORISTA',
            ],

            'aluguer_veiculo_pessoa_singular'=>[
                'ASSINATURA_PROPRIETARIO',
                'ASSINATURA_MOTORISTA',
            ],

            'aluguer_veiculo_pessoa_coletiva'=>[
                'ASSINATURA_PROPRIETARIO',
                'ASSINATURA_MOTORISTA',
            ],
        ];

        foreach(
            $catalog->all()
            as $document
        ){
            $analysis=
                $analyzer->analyze(
                    $catalog->content(
                        $document
                    )
                );

            $signatures=
                collect(
                    $analysis[
                        'campos_mapeados'
                    ] ?? []
                )
                    ->filter(
                        fn(
                            array $mapping,
                            string $field
                        )=>
                            str_starts_with(
                                $field,
                                'ASSINATURA_'
                            )
                    )
                    ->keys()
                    ->sort()
                    ->values()
                    ->all();

            $wanted=
                collect(
                    $expected[
                        $document[
                            'codigo'
                        ]
                    ]
                )
                    ->sort()
                    ->values()
                    ->all();

            expect(
                $signatures,
                "Assinaturas incorretas em {$document['codigo']}"
            )->toBe(
                $wanted
            );
        }
    }
);
