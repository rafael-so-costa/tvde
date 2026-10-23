<?php

use App\Services\FrotaProContractBillingIntegration;
use App\Services\FrotaProDocumentCatalog;

test('4n15 reconhece cobranca nos tres tipos financeiros reais',function(){
    $billing=app(
        FrotaProContractBillingIntegration::class
    );

    $catalog=app(
        FrotaProDocumentCatalog::class
    );

    $cases=[
        'contrato_de_prestacao_de_servicos'=>
            'prestacao_servicos_motorista',

        'aluguer_tvde_pessoa_singular'=>
            'aluguer_veiculo_pessoa_singular',

        'aluguer_tvde_pessoa_coletiva'=>
            'aluguer_veiculo_pessoa_coletiva',
    ];

    foreach($cases as $code=>$model){
        $content=$catalog->content($model);

        expect(
            $billing->supports($code,$content)
        )->toBeTrue();
    }
});

test('4n15 modelo antigo sem marcadores nao ativa cobranca',function(){
    $billing=app(
        FrotaProContractBillingIntegration::class
    );

    expect(
        $billing->supports(
            'contrato_de_prestacao_de_servicos',
            'Contrato antigo sem campos financeiros.'
        )
    )->toBeFalse();
});

test('4n15 outros documentos nao recebem cobranca',function(){
    $billing=app(
        FrotaProContractBillingIntegration::class
    );

    $content=app(
        FrotaProDocumentCatalog::class
    )->content(
        'aluguer_veiculo_pessoa_singular'
    );

    expect(
        $billing->supports(
            'comodato_proprietario_nif',
            $content
        )
    )->toBeFalse();
});
