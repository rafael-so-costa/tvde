<?php

use App\Models\Contrato;
use App\Models\Documento;
use App\Models\TemplateContrato;
use App\Services\FrotaProPdfPageDecorator;
use Barryvdh\DomPDF\Facade\Pdf;

function formalContrato(?string $codigo=null): Contrato
{
    $contrato=new Contrato();

    $contrato->id=
        '00000000-0000-4000-8000-000000000001';

    $contrato->tipo='aluguer';
    $contrato->versao_atual=1;

    $contrato->setRelation(
        'template',
        new TemplateContrato([
            'nome'=>'Contrato de Aluguer de Veículo',
        ])
    );

    $contrato->setRelation('tipoContrato',null);

    $documento=null;

    if($codigo!==null){
        $documento=new Documento();
        $documento->codigo=$codigo;
    }

    $contrato->setRelation('documento',$documento);

    return $contrato;
}

test('preview mostra numero ainda nao atribuido',function(){
    $html=view('pdf.contrato',[
        'contrato'=>formalContrato(),
        'empresa'=>null,
        'documentHtml'=>'<p>Documento de teste.</p>',
        'generatedAt'=>now(),
    ])->render();

    expect($html)
        ->toContain('Contrato n.º')
        ->toContain('A ATRIBUIR')
        ->toContain('Número ainda não atribuído');
});

test('documento definitivo mostra numero global real',function(){
    $html=view('pdf.contrato',[
        'contrato'=>formalContrato('G000123'),
        'empresa'=>null,
        'documentHtml'=>'<p>Documento de teste.</p>',
        'generatedAt'=>now(),
    ])->render();

    expect($html)
        ->toContain('G000123')
        ->toContain('Número sequencial definitivo')
        ->not->toContain('A ATRIBUIR');
});

test('moldura dompdf produz pdf multipagina valido',function(){
    $html=
        '<html><body>'.
        '<h1>Pagina um</h1>'.
        '<div style="page-break-before:always">'.
        '<h1>Pagina dois</h1>'.
        '</div>'.
        '</body></html>';

    $pdf=Pdf::loadHTML($html)
        ->setPaper('a4','portrait')
        ->setOptions([
            'isRemoteEnabled'=>false,
            'isPhpEnabled'=>false,
        ]);

    app(FrotaProPdfPageDecorator::class)
        ->apply($pdf);

    $binary=$pdf->output();

    expect($binary)->toStartWith('%PDF-');
    expect(strlen($binary))->toBeGreaterThan(1000);
});
