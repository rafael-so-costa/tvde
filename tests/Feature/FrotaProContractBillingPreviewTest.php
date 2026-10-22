<?php

use App\Models\Contrato;
use App\Models\TemplateContrato;
use App\Models\TipoContrato;
use App\Services\ContratoPdfService;
use App\Services\FrotaProContractBillingIntegration;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function b4n4Contrato(
    string $codigo,
    array $campos,
    string $conteudo
):Contrato{
    $tipo=new TipoContrato([
        'codigo'=>$codigo,
        'nome'=>'Contrato de teste',
    ]);

    $template=new TemplateContrato([
        'nome'=>'Template de teste financeiro',
        'tipo_arquivo'=>'txt',
        'conteudo_original'=>$conteudo,
    ]);

    $data=app(FrotaProContractBillingIntegration::class)
        ->forRequest(
            ['campos_preenchidos'=>$campos],
            $tipo,
            $template
        );

    $contrato=new Contrato([
        'tipo'=>$codigo,
        'campos_preenchidos'=>$data['campos_preenchidos'],
        'versao_atual'=>1,
    ]);

    $contrato->setRelation('tipoContrato',$tipo);
    $contrato->setRelation('template',$template);
    $contrato->setRelation('documento',null);
    $contrato->setRelation('empresa',null);
    $contrato->setRelation('motorista',null);
    $contrato->setRelation('proprietario',null);
    $contrato->setRelation('veiculo',null);
    $contrato->setRelation('assinaturas',collect());

    return $contrato;
}

function b4n4Template():string
{
    return "CONTRATO DE TESTE\n\n".
        "CLÁUSULA PRIMEIRA\n".
        "Condições financeiras\n\n".
        "A cobrança corresponde a {{CONDICOES_COBRANCA}}.\n".
        "A periodicidade de pagamento é ".
        "{{PERIODICIDADE_PAGAMENTO_TEXTO}}.";
}

test('4n4 preview de cobranca fixa',function(){
    $contrato=b4n4Contrato(
        'prestacao_servico',
        [
            'TIPO_COBRANCA'=>'fixa',
            'VALOR_FIXO_COBRANCA'=>'100',
            'PERIODICIDADE_PAGAMENTO'=>'semanal',
        ],
        b4n4Template()
    );

    $html=app(ContratoPdfService::class)
        ->renderHtml($contrato,null,true);

    expect($html)
        ->toContain('uma quantia fixa de 100,00 €')
        ->toContain('semanal')
        ->not->toContain('{{CONDICOES_COBRANCA}}')
        ->not->toContain('{{PERIODICIDADE_PAGAMENTO_TEXTO}}');

    expect($contrato->exists)->toBeFalse();
    expect($contrato->documento)->toBeNull();
});

test('4n4 preview de cobranca variavel',function(){
    $contrato=b4n4Contrato(
        'aluguer_tvde_pessoa_singular',
        [
            'TIPO_COBRANCA'=>'variavel',
            'PERCENTAGEM_COBRANCA'=>'7,5',
            'BASE_CALCULO_COBRANCA'=>'faturação bruta',
            'PERIODICIDADE_PAGAMENTO'=>'mensal',
        ],
        b4n4Template()
    );

    $html=app(ContratoPdfService::class)
        ->renderHtml($contrato,null,true);

    expect($html)
        ->toContain('7,5%')
        ->toContain('faturação bruta')
        ->toContain('mensal')
        ->not->toContain('{{CONDICOES_COBRANCA}}');

    expect($contrato->exists)->toBeFalse();
});

test('4n4 preview de cobranca mista',function(){
    $contrato=b4n4Contrato(
        'aluguer_tvde_pessoa_coletiva',
        [
            'TIPO_COBRANCA'=>'mista',
            'VALOR_FIXO_COBRANCA'=>'25',
            'PERCENTAGEM_COBRANCA'=>'5',
            'BASE_CALCULO_COBRANCA'=>'faturação líquida',
            'PERIODICIDADE_PAGAMENTO'=>'quinzenal',
        ],
        b4n4Template()
    );

    $html=app(ContratoPdfService::class)
        ->renderHtml($contrato,null,true);

    expect($html)
        ->toContain('25,00 €')
        ->toContain('5%')
        ->toContain('faturação líquida')
        ->toContain('quinzenal')
        ->not->toContain('{{CONDICOES_COBRANCA}}');

    expect($contrato->exists)->toBeFalse();
});

test('4n4 modelo antigo continua sem novos campos',function(){
    $contrato=b4n4Contrato(
        'prestacao_servico',
        ['PERCENTAGEM_CONTRATO'=>'10%'],
        "CONTRATO ANTIGO\n\nPercentagem: {{PERCENTAGEM_CONTRATO}}."
    );

    $html=app(ContratoPdfService::class)
        ->renderHtml($contrato,null,true);

    expect($html)
        ->toContain('10%')
        ->not->toContain('{{PERCENTAGEM_CONTRATO}}');

    expect($contrato->exists)->toBeFalse();
});
