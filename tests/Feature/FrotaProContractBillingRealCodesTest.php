<?php

use App\Models\Contrato;
use App\Models\TemplateContrato;
use App\Models\TipoContrato;
use App\Services\FrotaProContractBillingIntegration;
use Illuminate\Validation\ValidationException;

function b4n10Type(string $code):TipoContrato
{
    return new TipoContrato([
        'codigo'=>$code,
        'nome'=>'Tipo de teste',
    ]);
}

function b4n10Template(bool $financial):TemplateContrato
{
    return new TemplateContrato([
        'nome'=>'Modelo de teste',
        'tipo_arquivo'=>'txt',
        'conteudo_original'=>$financial
            ?'Cobrança: {{CONDICOES_COBRANCA}}. '.
                'Pagamento: {{PERIODICIDADE_PAGAMENTO_TEXTO}}.'
            :'Modelo antigo: {{PERCENTAGEM_CONTRATO}}.',
    ]);
}

function b4n10Fields():array
{
    return [
        'TIPO_COBRANCA'=>'mista',
        'VALOR_FIXO_COBRANCA'=>'35',
        'PERCENTAGEM_COBRANCA'=>'6',
        'BASE_CALCULO_COBRANCA'=>'faturação bruta',
        'PERIODICIDADE_PAGAMENTO'=>'mensal',
    ];
}

test('4n10 reconhece os dois codigos ativos reais',function(){
    $service=app(FrotaProContractBillingIntegration::class);
    $template=b4n10Template(true);

    foreach([
        'contrato_de_prestacao_de_servicos',
        'contrato_de_aluguer',
    ] as $code){
        expect(
            $service->supports(
                $code,
                $template->conteudo_original
            )
        )->toBeTrue();
    }
});

test('4n10 preserva os codigos anteriores',function(){
    $service=app(FrotaProContractBillingIntegration::class);
    $template=b4n10Template(true);

    foreach([
        'prestacao_servico',
        'prestacao_de_servicos',
        'prestacao_servicos_motorista',
        'aluguer_tvde_pessoa_singular',
        'aluguer_tvde_pessoa_coletiva',
        'aluguer_veiculo_pessoa_singular',
        'aluguer_veiculo_pessoa_coletiva',
    ] as $code){
        expect(
            $service->supports(
                $code,
                $template->conteudo_original
            )
        )->toBeTrue();
    }
});

test('4n10 contratos antigos continuam sem cobranca nova',function(){
    $service=app(FrotaProContractBillingIntegration::class);
    $oldTemplate=b4n10Template(false);

    $data=[
        'campos_preenchidos'=>[
            'PERCENTAGEM_CONTRATO'=>'10',
        ],
    ];

    foreach([
        'contrato_de_prestacao_de_servicos',
        'contrato_de_aluguer',
    ] as $code){
        expect(
            $service->supports(
                $code,
                $oldTemplate->conteudo_original
            )
        )->toBeFalse();

        expect(
            $service->forRequest(
                $data,
                b4n10Type($code),
                $oldTemplate
            )
        )->toBe($data);
    }
});

test('4n10 gera e valida cobranca nos tipos reais',function(){
    $service=app(FrotaProContractBillingIntegration::class);
    $template=b4n10Template(true);

    foreach([
        'contrato_de_prestacao_de_servicos',
        'contrato_de_aluguer',
    ] as $code){
        $type=b4n10Type($code);

        $data=$service->forRequest(
            [
                'campos_preenchidos'=>b4n10Fields(),
            ],
            $type,
            $template
        );

        $fields=$data['campos_preenchidos'];

        expect($fields['CONDICOES_COBRANCA'])
            ->toContain('35,00 €')
            ->toContain('6%');

        expect(
            $fields['PERIODICIDADE_PAGAMENTO_TEXTO']
        )->toBe('mensal');

        $contract=new Contrato([
            'campos_preenchidos'=>$fields,
        ]);

        $contract->setRelation('tipoContrato',$type);
        $contract->setRelation('template',$template);

        $service->assertSnapshot($contract);
    }
});

test('4n10 nao autoriza tipos fora da lista',function(){
    $service=app(FrotaProContractBillingIntegration::class);
    $template=b4n10Template(true);

    foreach([
        'comodato',
        'declaracao',
        'contrato_de_aluguer_nao_autorizado',
    ] as $code){
        expect(
            $service->supports(
                $code,
                $template->conteudo_original
            )
        )->toBeFalse();

        expect(
            fn()=>$service->forRequest(
                [
                    'campos_preenchidos'=>b4n10Fields(),
                ],
                b4n10Type($code),
                $template
            )
        )->toThrow(ValidationException::class);
    }
});
