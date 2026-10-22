<?php

use App\Services\FrotaProContractBillingTerms;
use Illuminate\Validation\ValidationException;

uses(\Tests\TestCase::class);

function billingTerms():FrotaProContractBillingTerms
{
    return new FrotaProContractBillingTerms();
}

test('4n2 cobrança fixa normalizada',function(){
    $result=billingTerms()->normalize([
        'TIPO_COBRANCA'=>'fixa',
        'VALOR_FIXO_COBRANCA'=>'100,50',
        'PERIODICIDADE_PAGAMENTO'=>'semanal',
        'PERCENTAGEM_COBRANCA'=>'5',
    ]);

    expect($result['VALOR_FIXO_COBRANCA'])->toBe('100.50')
        ->and($result['PERIODICIDADE_PAGAMENTO'])->toBe('semanal')
        ->and(array_key_exists('PERCENTAGEM_COBRANCA',$result))->toBeFalse();
});

test('4n2 cobrança variável normalizada',function(){
    $result=billingTerms()->normalize([
        'TIPO_COBRANCA'=>'variavel',
        'PERCENTAGEM_COBRANCA'=>'10',
        'BASE_CALCULO_COBRANCA'=>'faturação líquida',
        'PERIODICIDADE_PAGAMENTO'=>'mensal',
    ]);

    expect($result['PERCENTAGEM_COBRANCA'])->toBe('10.00')
        ->and($result['BASE_CALCULO_COBRANCA'])->toBe('faturação líquida');
});

test('4n2 cobrança mista normalizada',function(){
    $result=billingTerms()->normalize([
        'TIPO_COBRANCA'=>'mista',
        'VALOR_FIXO_COBRANCA'=>'25',
        'PERCENTAGEM_COBRANCA'=>'5',
        'BASE_CALCULO_COBRANCA'=>'faturação bruta',
        'PERIODICIDADE_PAGAMENTO'=>'quinzenal',
    ]);

    expect($result['VALOR_FIXO_COBRANCA'])->toBe('25.00')
        ->and($result['PERCENTAGEM_COBRANCA'])->toBe('5.00');
});

test('4n2 gera descrição da cobrança mista',function(){
    $data=[
        'TIPO_COBRANCA'=>'mista',
        'VALOR_FIXO_COBRANCA'=>'25',
        'PERCENTAGEM_COBRANCA'=>'5',
        'BASE_CALCULO_COBRANCA'=>'faturação bruta',
        'PERIODICIDADE_PAGAMENTO'=>'quinzenal',
    ];

    expect(billingTerms()->description($data))
        ->toBe('uma quantia fixa de 25,00 € acrescida de 5% sobre faturação bruta')
        ->and(billingTerms()->periodicityLabel($data))
        ->toBe('quinzenal');
});

test('4n2 rejeita modalidade inválida',function(){
    expect(fn()=>billingTerms()->normalize([
        'TIPO_COBRANCA'=>'outra',
        'PERIODICIDADE_PAGAMENTO'=>'mensal',
    ]))->toThrow(ValidationException::class);
});

test('4n2 rejeita valor fixo vazio',function(){
    expect(fn()=>billingTerms()->normalize([
        'TIPO_COBRANCA'=>'fixa',
        'VALOR_FIXO_COBRANCA'=>'',
        'PERIODICIDADE_PAGAMENTO'=>'mensal',
    ]))->toThrow(ValidationException::class);
});

test('4n2 rejeita percentagem acima de 100',function(){
    expect(fn()=>billingTerms()->normalize([
        'TIPO_COBRANCA'=>'variavel',
        'PERCENTAGEM_COBRANCA'=>'101',
        'BASE_CALCULO_COBRANCA'=>'faturação bruta',
        'PERIODICIDADE_PAGAMENTO'=>'mensal',
    ]))->toThrow(ValidationException::class);
});

test('4n2 rejeita ausência de base de cálculo',function(){
    expect(fn()=>billingTerms()->normalize([
        'TIPO_COBRANCA'=>'mista',
        'VALOR_FIXO_COBRANCA'=>'25',
        'PERCENTAGEM_COBRANCA'=>'5',
        'PERIODICIDADE_PAGAMENTO'=>'mensal',
    ]))->toThrow(ValidationException::class);
});

test('4n2 rejeita periodicidade inválida',function(){
    expect(fn()=>billingTerms()->normalize([
        'TIPO_COBRANCA'=>'fixa',
        'VALOR_FIXO_COBRANCA'=>'100',
        'PERIODICIDADE_PAGAMENTO'=>'cada 17 dias',
    ]))->toThrow(ValidationException::class);
});

test('4n2 aceita todas as periodicidades',function(){
    foreach(array_keys(FrotaProContractBillingTerms::PERIODICIDADES) as $periodo){
        $result=billingTerms()->normalize([
            'TIPO_COBRANCA'=>'fixa',
            'VALOR_FIXO_COBRANCA'=>'100',
            'PERIODICIDADE_PAGAMENTO'=>$periodo,
        ]);

        expect($result['PERIODICIDADE_PAGAMENTO'])->toBe($periodo);
    }
});
