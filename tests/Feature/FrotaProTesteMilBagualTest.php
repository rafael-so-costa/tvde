<?php

use App\Models\Tenant;
use App\Models\TipoContrato;
use App\Services\ChecklistProcessPresetService;
use App\Services\ContratoTipoResolverService;
use App\Services\FrotaProContractBillingIntegration;
use App\Services\FrotaProDocumentCatalog;
use App\Services\FrotaProWorkflowCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

test(
    '1000 BAGUAL protege contratos financeiros workflows assinaturas e isolamento entre tenants',
    function(){
        $billing=app(
            FrotaProContractBillingIntegration::class
        );

        $documents=app(
            FrotaProDocumentCatalog::class
        );

        $workflows=collect(
            app(FrotaProWorkflowCatalog::class)->all()
        )->keyBy('codigo');

        $map=app(
            FrotaProWorkflowCatalog::class
        )->documentWorkflowMap();

        $cases=[
            [
                'type'=>'contrato_de_prestacao_de_servicos',
                'document'=>'prestacao_servicos_motorista',
                'workflow'=>'prestacao_servicos_motorista',
                'steps'=>6,
                'version'=>2,
                'signatures'=>[
                    'ASSINATURA_EMPRESA',
                    'ASSINATURA_MOTORISTA',
                ],
            ],
            [
                'type'=>'aluguer_tvde_pessoa_singular',
                'document'=>'aluguer_veiculo_pessoa_singular',
                'workflow'=>'aluguer_tvde_pessoa_singular',
                'steps'=>12,
                'version'=>1,
                'signatures'=>[
                    'ASSINATURA_PROPRIETARIO',
                    'ASSINATURA_MOTORISTA',
                ],
            ],
            [
                'type'=>'aluguer_tvde_pessoa_coletiva',
                'document'=>'aluguer_veiculo_pessoa_coletiva',
                'workflow'=>'aluguer_tvde_pessoa_coletiva',
                'steps'=>12,
                'version'=>1,
                'signatures'=>[
                    'ASSINATURA_PROPRIETARIO',
                    'ASSINATURA_MOTORISTA',
                ],
            ],
        ];

        $totalSteps=0;

        foreach($cases as $case){
            $document=$documents->find(
                $case['document']
            );

            expect($document)->not->toBeNull();

            $content=$documents->content(
                $case['document']
            );

            expect(trim($content))
                ->not->toBe('');

            expect($content)
                ->toContain('{{CONDICOES_COBRANCA}}');

            expect($content)
                ->toContain('{{PERIODICIDADE_PAGAMENTO_TEXTO}}');

            expect(
                $billing->supports(
                    $case['type'],
                    $content
                )
            )->toBeTrue();

            expect(
                $map[$case['document']]??null
            )->toBe($case['workflow']);

            $workflow=$workflows->get(
                $case['workflow']
            );

            expect($workflow)->not->toBeNull();

            expect($workflow['versao'])
                ->toBe($case['version']);

            expect(count($workflow['items']))
                ->toBe($case['steps']);

            $totalSteps+=count(
                $workflow['items']
            );

            $codes=[];
            $orders=[];
            $signatures=[];

            foreach($workflow['items'] as $step){
                $codes[]=$step['codigo'];
                $orders[]=$step['ordem'];

                expect($step['codigo'])
                    ->not->toBe('');

                expect($step['tipo'])
                    ->not->toBe('');

                expect($step['obrigatorio'])
                    ->toBeTrue();

                if($step['tipo']==='assinatura'){
                    $placeholder=data_get(
                        $step,
                        'configuracao.placeholder'
                    );

                    expect($placeholder)
                        ->toBeIn($case['signatures']);

                    expect($content)
                        ->toContain(
                            '{{'.$placeholder.'}}'
                        );

                    $signatures[]=$placeholder;
                }

                if($step['tipo']==='checklist_veiculo'){
                    expect(
                        data_get(
                            $step,
                            'configuracao.checklist_tipo'
                        )
                    )->toBeIn([
                        'entrega',
                        'recolha',
                    ]);
                }

                if($step['tipo']==='contrato_relacionado'){
                    expect(
                        data_get(
                            $step,
                            'configuracao.tipo_contrato_codigo'
                        )
                    )->toBe(
                        'contrato_de_prestacao_de_servicos'
                    );

                    expect(
                        data_get(
                            $step,
                            'configuracao.status_conclusao'
                        )
                    )->toBe('assinado');
                }
            }

            expect(count(array_unique($codes)))
                ->toBe($case['steps']);

            expect($orders)
                ->toBe(
                    range(1,$case['steps'])
                );

            sort($signatures);

            $expectedSignatures=
                $case['signatures'];

            sort($expectedSignatures);

            expect($signatures)
                ->toBe($expectedSignatures);
        }

        expect($totalSteps)->toBe(30);

        // Um documento nao financeiro nao pode
        // ativar cobranca apenas por receber
        // um conteudo financeiro.

        $content=$documents->content(
            'aluguer_veiculo_pessoa_singular'
        );

        expect(
            $billing->supports(
                'comodato_proprietario_nif',
                $content
            )
        )->toBeFalse();

        expect(
            $billing->supports(
                'contrato_inventado',
                $content
            )
        )->toBeFalse();

        expect(
            $billing->supports(
                'contrato_de_prestacao_de_servicos',
                'Documento legado sem marcadores.'
            )
        )->toBeFalse();

        // Ataque simulado:
        // existe Prestacao de Servicos no
        // tenant B, mas nao no tenant A.
        // O preset copiado para A nao pode
        // associar o contrato de B.

        $tenantA=Tenant::create([
            'nome'=>'Frota Bagual A',
            'slug'=>'frota-bagual-a',
            'ativo'=>true,
        ]);

        $tenantB=Tenant::create([
            'nome'=>'Frota Bagual B',
            'slug'=>'frota-bagual-b',
            'ativo'=>true,
        ]);

        $typeB=new TipoContrato([
            'nome'=>'Prestacao de Servicos B',
            'slug'=>'prestacao-servicos-b',
            'codigo'=>
                'contrato_de_prestacao_de_servicos',
            'ativo'=>true,
        ]);

        $typeB->tenant_id=$tenantB->id;
        $typeB->save();

        $presets=app(
            ChecklistProcessPresetService::class
        );

        $withoutOwnType=$presets->copyToTenant(
            $tenantA->id,
            'aluguer_tvde_pessoa_singular'
        );

        $related=$withoutOwnType->items
            ->firstWhere(
                'codigo',
                'prestacao_servicos'
            );

        expect($related)->not->toBeNull();

        expect(
            data_get(
                $related->configuracao,
                'tipo_contrato_codigo'
            )
        )->toBe(
            'contrato_de_prestacao_de_servicos'
        );

        expect(
            data_get(
                $related->configuracao,
                'tipo_contrato_id'
            )
        )->toBeNull();

        // Tentativa direta de escolher o tipo
        // do tenant B a partir do tenant A.

        expect(
            fn()=>app(
                ContratoTipoResolverService::class
            )->resolve(
                [
                    'tipo_contrato_id'=>$typeB->id,
                ],
                $tenantA->id
            )
        )->toThrow(
            ValidationException::class
        );

        // Agora o tenant A recebe o seu proprio
        // tipo. Uma nova copia deve apontar
        // exclusivamente para esse registo.

        $typeA=new TipoContrato([
            'nome'=>'Prestacao de Servicos A',
            'slug'=>'prestacao-servicos-a',
            'codigo'=>
                'contrato_de_prestacao_de_servicos',
            'ativo'=>true,
        ]);

        $typeA->tenant_id=$tenantA->id;
        $typeA->save();

        $withOwnType=$presets->copyToTenant(
            $tenantA->id,
            'aluguer_tvde_pessoa_coletiva'
        );

        $relatedA=$withOwnType->items
            ->firstWhere(
                'codigo',
                'prestacao_servicos'
            );

        expect($relatedA)->not->toBeNull();

        expect(
            data_get(
                $relatedA->configuracao,
                'tipo_contrato_id'
            )
        )->toBe($typeA->id);

        expect(
            data_get(
                $relatedA->configuracao,
                'tipo_contrato_id'
            )
        )->not->toBe($typeB->id);

        expect($withOwnType->tenant_id)
            ->toBe($tenantA->id);

        expect($withoutOwnType->tenant_id)
            ->toBe($tenantA->id);

        echo "\n";
        echo "TESTE 1000 BAGUAL: INTEGRIDADE PROTEGIDA!";
        echo "\n";
    }
);
