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

/*
 * FROTAPRO_4Q2_A4_AUDIT
 *
 * PDF gerado em memoria a partir da view formal.
 * Verifica A4, paginas e rodape de paginacao.
 */
test('4q2 pdf formal a4 apresenta tres paginas corretas',function(){
    $contrato=formalContrato();

    $sections=[];

    foreach([1,2,3] as $number){
        $pageBreak=$number===1
            ? ''
            : 'page-break-before:always;';

        $sections[]=
            '<section style="'.$pageBreak.'">'.
            '<h1 class="doc-title">'.
            'AUDITORIA A4 SECAO '.$number.
            '</h1>'.
            '<p class="doc-paragraph">'.
            'Conteudo de verificacao da pagina '.
            $number.'. Documento de teste sem dados reais.'.
            '</p>'.
            '</section>';
    }

    $html=view('pdf.contrato',[
        'contrato'=>$contrato,
        'empresa'=>null,
        'documentHtml'=>implode("\n",$sections),
        'generatedAt'=>now(),
        'previewMode'=>false,
    ])->render();

    $pdf=Pdf::loadHTML($html)
        ->setPaper('a4','portrait')
        ->setOptions([
            'isRemoteEnabled'=>false,
            'isPhpEnabled'=>false,
            'defaultFont'=>'DejaVu Serif',
        ]);

    app(FrotaProPdfPageDecorator::class)
        ->apply($pdf,$contrato,null,$html);

    /*
     * Dimensoes A4 em pontos PDF.
     * 210 x 297 mm = aproximadamente
     * 595,28 x 841,89 pontos.
     */
    $canvas=$pdf->getDomPDF()->getCanvas();

    expect(
        abs((float)$canvas->get_width()-595.28)
    )->toBeLessThan(1.0);

    expect(
        abs((float)$canvas->get_height()-841.89)
    )->toBeLessThan(1.0);

    $binary=$pdf->output();

    expect($binary)->toStartWith('%PDF-');
    expect(strlen($binary))->toBeGreaterThan(1000);

    /*
     * Verificar tambem a dimensao registada
     * no ficheiro PDF, quando MediaBox existe.
     */
    if(preg_match(
        '/\/MediaBox\s*\[([^\]]+)\]/',
        $binary,
        $mediaBox
    )){
        preg_match_all(
            '/-?\d+(?:\.\d+)?/',
            $mediaBox[1],
            $coordinates
        );

        if(count($coordinates[0])===4){
            $values=array_map(
                'floatval',
                $coordinates[0]
            );

            expect(
                abs(($values[2]-$values[0])-595.28)
            )->toBeLessThan(1.0);

            expect(
                abs(($values[3]-$values[1])-841.89)
            )->toBeLessThan(1.0);
        }
    }

    $pages=(new \Smalot\PdfParser\Parser())
        ->parseContent($binary)
        ->getPages();

    /*
     * Tres secoes forcadas devem produzir
     * exatamente tres paginas.
     */
    expect($pages)->toHaveCount(3);

    foreach([1,2,3] as $number){
        $pageText=preg_replace(
            '/\s+/u',
            ' ',
            (string)$pages[$number-1]->getText()
        );

        expect($pageText)
            ->toContain('AUDITORIA A4 SECAO '.$number);

        expect($pageText)->toMatch(
            '/P[áa]gina\s*'.$number.'\s+de\s+3/u'
        );
    }

    /*
     * PDF de amostra fora do repositorio.
     * Apenas quando solicitado pelo script.
     */
    $output=getenv('FROTAPRO_AUDIT_PDF_FILE');

    if(is_string($output) && $output!==''){
        expect(
            file_put_contents($output,$binary)
        )->toBe(strlen($binary));
    }
});
