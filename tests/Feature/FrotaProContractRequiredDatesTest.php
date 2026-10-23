<?php

use App\Models\Contrato;
use App\Models\TemplateContrato;
use App\Models\TipoContrato;
use App\Services\ContratoPdfService;
use App\Services\FrotaProContractRequiredDates;
use App\Services\FrotaProDocumentReadinessGuard;
use Illuminate\Validation\ValidationException;

function fpdTemplate(string $content):TemplateContrato
{
    $template=new TemplateContrato();

    $template->conteudo_original=$content;

    return $template;
}

function fpdType(string $code):TipoContrato
{
    $type=new TipoContrato();
    $type->codigo=$code;

    return $type;
}

test('4n20 duracao obrigatoria bloqueia datas ausentes',function(){
    $template=fpdTemplate(
        'Duração: {{DURACAO_CONTRATO}}'
    );

    $guard=app(
        FrotaProContractRequiredDates::class
    );

    try{
        $guard->assertValid(
            [],
            $template,
            fpdType('contrato_de_prestacao_de_servicos')
        );

        test()->fail('Datas ausentes foram aceites.');
    }catch(ValidationException $e){
        expect($e->errors())
            ->toHaveKeys([
                'data_inicio',
                'data_fim',
            ]);
    }
});

test('4n20 bloqueia zero dias e datas invertidas',function(){
    $guard=app(FrotaProContractRequiredDates::class);
    $template=fpdTemplate('{{DURACAO_CONTRATO}}');

    foreach([
        [
            'data_inicio'=>'2026-10-23',
            'data_fim'=>'2026-10-23',
        ],
        [
            'data_inicio'=>'2026-10-24',
            'data_fim'=>'2026-10-23',
        ],
    ] as $dates){
        expect(
            fn()=>$guard->assertValid(
                $dates,
                $template
            )
        )->toThrow(ValidationException::class);
    }
});

test('4n20 datas validas permitem duracao',function(){
    app(FrotaProContractRequiredDates::class)
        ->assertValid(
            [
                'data_inicio'=>'2026-10-23',
                'data_fim'=>'2026-11-23',
            ],
            fpdTemplate('{{DURACAO_CONTRATO}}')
        );

    expect(true)->toBeTrue();
});

test('4n20 documento sem intervalo nao exige datas arbitrarias',function(){
    app(FrotaProContractRequiredDates::class)
        ->assertValid(
            [],
            fpdTemplate('Declaração {{NOME_EMPRESA}}')
        );

    expect(true)->toBeTrue();
});

test('4n20 marcador entre parenteses nao passa vazio',function(){
    expect(
        fn()=>app(
            FrotaProDocumentReadinessGuard::class
        )->assertReady(
            'Duração (DURACAO_CONTRATO)',
            []
        )
    )->toThrow(ValidationException::class);
});

test('4n20 pdf preview recusa duracao ausente',function(){
    $contract=new Contrato();

    $contract->setRelation(
        'template',
        fpdTemplate(
            'Contrato com duração {{DURACAO_CONTRATO}}'
        )
    );

    $contract->setRelation(
        'assinaturas',
        collect()
    );

    expect(
        fn()=>app(ContratoPdfService::class)
            ->assertReadyForPdf($contract)
    )->toThrow(ValidationException::class);
});

test('4n20 pdf preview reconhece duracao calculada',function(){
    $contract=new Contrato([
        'data_inicio'=>'2026-10-23',
        'data_fim'=>'2026-11-23',
    ]);

    $contract->setRelation(
        'template',
        fpdTemplate(
            'Contrato com duração {{DURACAO_CONTRATO}}'
        )
    );

    $contract->setRelation(
        'assinaturas',
        collect()
    );

    app(ContratoPdfService::class)
        ->assertReadyForPdf($contract);

    expect(true)->toBeTrue();
});
