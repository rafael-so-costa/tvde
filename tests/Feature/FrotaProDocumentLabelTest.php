<?php

use App\Models\Contrato;
use App\Models\TemplateContrato;
use App\Services\FrotaProDocumentLabelResolver;

function labelTestContract(string $name): Contrato
{
    $contrato=new Contrato();
    $contrato->versao_atual=1;

    $contrato->setRelation('documento',null);
    $contrato->setRelation('tipoContrato',null);

    $contrato->setRelation(
        'template',
        new TemplateContrato(['nome'=>$name])
    );

    return $contrato;
}

test('contratos comerciais mantem denominacao contrato',function(){
    $resolver=app(FrotaProDocumentLabelResolver::class);

    foreach([
        'Prestação de Serviços',
        'Comodato — proprietário por NIF',
        'Aluguer de Veículo — Pessoa Singular',
        'Aluguer de Veículo — Pessoa Coletiva',
    ] as $name){
        expect(
            $resolver->resolve(labelTestContract($name))
        )->toBe('Contrato');
    }
});

test('autorizacoes tvde sao identificadas como declaracoes',function(){
    $resolver=app(FrotaProDocumentLabelResolver::class);

    expect(
        $resolver->resolve(
            labelTestContract(
                'Autorização TVDE — motorista proprietário'
            )
        )
    )->toBe('Declaração');

    expect(
        $resolver->resolve(
            labelTestContract(
                'Autorização TVDE — proprietário terceiro'
            )
        )
    )->toBe('Declaração');
});

test('denuncia possui denominacao propria',function(){
    $resolver=app(FrotaProDocumentLabelResolver::class);

    expect(
        $resolver->resolve(
            labelTestContract(
                'Denúncia de Prestação de Serviços'
            )
        )
    )->toBe('Denúncia');
});

test('preview identifica documento pelo titulo html',function(){
    $resolver=app(FrotaProDocumentLabelResolver::class);

    $contrato=new Contrato();

    expect(
        $resolver->resolve(
            $contrato,
            '<html><head><title>Contrato</title></head>'.
            '<body><h1>DECLARAÇÃO DE AUTORIZAÇÃO TVDE</h1></body></html>'
        )
    )->toBe('Declaração');

    expect(
        $resolver->resolve(
            $contrato,
            '<p>DENÚNCIA DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS</p>'
        )
    )->toBe('Denúncia');
});

test('view e rodape utilizam classificador central',function(){
    $view=file_get_contents(
        resource_path('views/pdf/contrato.blade.php')
    );

    $decorator=file_get_contents(
        app_path('Services/FrotaProPdfPageDecorator.php')
    );

    expect($view)
        ->toContain('FrotaProDocumentLabelResolver')
        ->toContain('margin:25mm 21mm 32mm 21mm')
        ->toContain('FrotaProSignatureRuleV4L4');

    expect($decorator)
        ->toContain('FrotaProDocumentLabelResolver')
        ->toContain('$documentLabel');

    // O cifrão foi escapado para não interpolar
    // a variável no próprio teste.
    expect($decorator)
        ->not->toContain("'Contrato '.\$codigo");
});

test('cabecalho usa o nome correto para cada documento',function(){
    $cases=[
        ['Prestação de Serviços','Contrato'],
        ['Autorização TVDE — motorista proprietário','Declaração'],
        ['Denúncia de Prestação de Serviços','Denúncia'],
    ];

    foreach($cases as [$name,$label]){
        $html=view('pdf.contrato',[
            'contrato'=>labelTestContract($name),
            'empresa'=>null,
            'documentHtml'=>'<p>Documento de teste.</p>',
            'generatedAt'=>now(),
            'previewMode'=>false,
        ])->render();

        expect($html)
            ->toContain($label.' n.º A ATRIBUIR');
    }
});
