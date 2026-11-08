<?php

use App\Models\Contrato;
use App\Models\TemplateContrato;
use App\Models\TipoContrato;
use App\Services\FrotaProContractBillingIntegration;
use App\Services\FrotaProDocumentCatalog;
use App\Services\FrotaProDocumentCatalogSyncService;
use App\Services\TemplateSourceCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

function b4n34Type(string $code):TipoContrato
{
    return new TipoContrato(['codigo'=>$code]);
}

function b4n34Template(bool $new):TemplateContrato
{
    return new TemplateContrato([
        'conteudo_original'=>$new
            ?'{{CONDICOES_COBRANCA}} | {{PERIODICIDADE_PAGAMENTO_TEXTO}}'
            :'{{PERCENTAGEM_CONTRATO}}',
    ]);
}

function b4n34Fields():array
{
    return [
        'TIPO_COBRANCA'=>'mista',
        'VALOR_FIXO_COBRANCA'=>'25',
        'PERCENTAGEM_COBRANCA'=>'5',
        'BASE_CALCULO_COBRANCA'=>'faturação bruta',
        'PERIODICIDADE_PAGAMENTO'=>'quinzenal',
    ];
}

test('4n34 fontes financeiras reconhecidas',function(){
    $catalog=app(TemplateSourceCatalog::class);

    expect($catalog->allowed(
        'contrato','contrato.condicoes_cobranca'
    ))->toBeTrue();

    expect($catalog->allowed(
        'contrato','contrato.periodicidade_pagamento_texto'
    ))->toBeTrue();
});

test('4n34 apenas prestacao e aluguer podem usar cobranca',function(){
    $service=app(FrotaProContractBillingIntegration::class);
    $template=b4n34Template(true)->conteudo_original;

    foreach([
        'prestacao_servico',
        'prestacao_de_servicos',
        'aluguer_tvde_pessoa_singular',
        'aluguer_tvde_pessoa_coletiva',
    ] as $code){
        expect($service->supports($code,$template))->toBeTrue();
    }

    foreach([
        'comodato',
        'declaracao',
        'denuncia_prestacao_servicos',
    ] as $code){
        expect($service->supports($code,$template))->toBeFalse();
    }

    expect($service->supports(
        'prestacao_servico',
        b4n34Template(false)->conteudo_original
    ))->toBeFalse();
});

test('4n34 backend gera as condicoes financeiras',function(){
    $service=app(FrotaProContractBillingIntegration::class);

    $data=$service->forRequest(
        ['campos_preenchidos'=>b4n34Fields()],
        b4n34Type('prestacao_servico'),
        b4n34Template(true)
    );

    expect($data['campos_preenchidos']['CONDICOES_COBRANCA'])
        ->toBe('uma quantia fixa de 25,00 € acrescida de 5% sobre faturação bruta');

    expect($data['campos_preenchidos']['PERIODICIDADE_PAGAMENTO_TEXTO'])
        ->toBe('quinzenal');

    $contract=new Contrato([
        'campos_preenchidos'=>$data['campos_preenchidos'],
    ]);

    $contract->setRelation('tipoContrato',b4n34Type('prestacao_servico'));
    $contract->setRelation('template',b4n34Template(true));

    $service->assertSnapshot($contract);
});

test('4n34 impede alteracao indevida das condicoes',function(){
    $service=app(FrotaProContractBillingIntegration::class);

    $data=$service->forRequest(
        ['campos_preenchidos'=>b4n34Fields()],
        b4n34Type('prestacao_servico'),
        b4n34Template(true)
    );

    $data['campos_preenchidos']['CONDICOES_COBRANCA']='valor incorreto';

    $contract=new Contrato([
        'campos_preenchidos'=>$data['campos_preenchidos'],
    ]);

    $contract->setRelation('tipoContrato',b4n34Type('prestacao_servico'));
    $contract->setRelation('template',b4n34Template(true));

    expect(fn()=>$service->assertSnapshot($contract))
        ->toThrow(ValidationException::class);
});

test('4n34 exige os campos financeiros da modalidade',function(){
    $service=app(FrotaProContractBillingIntegration::class);

    expect(fn()=>$service->forRequest(
        ['campos_preenchidos'=>[
            'TIPO_COBRANCA'=>'mista',
            'VALOR_FIXO_COBRANCA'=>'25',
            'PERIODICIDADE_PAGAMENTO'=>'mensal',
        ]],
        b4n34Type('prestacao_servico'),
        b4n34Template(true)
    ))->toThrow(ValidationException::class);
});

test('4n34 preserva contratos legados',function(){
    $service=app(FrotaProContractBillingIntegration::class);

    $data=['campos_preenchidos'=>[
        'PERCENTAGEM_CONTRATO'=>'10',
    ]];

    expect($service->forRequest(
        $data,
        b4n34Type('prestacao_servico'),
        b4n34Template(false)
    ))->toBe($data);
});

test('4n34 modelos do catalogo possuem marcadores',function(){
    $catalog=app(FrotaProDocumentCatalog::class);

    foreach([
        'prestacao_servicos_motorista',
        'aluguer_veiculo_pessoa_singular',
        'aluguer_veiculo_pessoa_coletiva',
    ] as $code){
        $content=$catalog->content($code);

        expect($content)
            ->toContain('{{CONDICOES_COBRANCA}}')
            ->toContain('{{PERIODICIDADE_PAGAMENTO_TEXTO}}');
    }
});

test('4n34 dry run do catalogo sem bloqueios',function(){
    $plan=app(FrotaProDocumentCatalogSyncService::class)->plan();

    expect($plan['summary']['create'])->toBe(9);
    expect($plan['summary']['blocked'])->toBe(0);
    expect($plan['blockers'])->toBe([]);
});

test('4n34 impede usar modelo financeiro com tipo nao elegivel',function(){
    $service=app(FrotaProContractBillingIntegration::class);

    expect(fn()=>$service->forRequest(
        ['campos_preenchidos'=>b4n34Fields()],
        b4n34Type('comodato'),
        b4n34Template(true)
    ))->toThrow(ValidationException::class);
});
