<?php

use App\Models\Contrato;
use App\Models\Empresa;
use App\Models\TemplateContrato;
use App\Services\FrotaProPdfPageDecorator;
use Barryvdh\DomPDF\Facade\Pdf;

test('view possui linhas de assinatura formais',function(){
    $source=file_get_contents(
        resource_path('views/pdf/contrato.blade.php')
    );

    expect($source)
        ->toContain('FrotaProSignatureRuleV4L4')
        ->toContain('.document .contract-signature-rule')
        ->toContain('border-bottom:.5pt solid #27384a');

    expect(
        preg_match_all('/@page\s*\{/',$source)
    )->toBe(1);

    expect($source)
        ->toContain('margin:25mm 21mm 32mm 21mm');
});

test('pdf com assinaturas gera documento valido',function(){
    $contrato=new Contrato();
    $contrato->versao_atual=1;

    $contrato->setRelation('documento',null);
    $contrato->setRelation('tipoContrato',null);

    $contrato->setRelation(
        'template',
        new TemplateContrato([
            'nome'=>'Documento de teste de assinaturas',
        ])
    );

    $empresa=new Empresa([
        'nome_empresa'=>'Empresa Exemplo TVDE, Lda.',
        'nif'=>'500000000',
    ]);

    $documentHtml=
        '<h1 class="doc-title">TESTE DE ASSINATURAS</h1>'.
        '<p class="doc-paragraph">Documento demonstrativo.</p>'.
        '<p class="doc-paragraph">PELO PRIMEIRO CONTRATANTE</p>'.
        '<div class="contract-signature-rule"></div>'.
        '<p class="doc-paragraph">PELO SEGUNDO CONTRATANTE</p>'.
        '<div class="contract-signature-rule"></div>';

    $html=view('pdf.contrato',[
        'contrato'=>$contrato,
        'empresa'=>$empresa,
        'documentHtml'=>$documentHtml,
        'generatedAt'=>now(),
        'previewMode'=>false,
    ])->render();

    expect($html)
        ->toContain('FrotaProSignatureRuleV4L4')
        ->toContain('contract-signature-rule');

    $pdf=Pdf::loadHTML($html)
        ->setPaper('a4','portrait')
        ->setOptions([
            'isRemoteEnabled'=>false,
            'isPhpEnabled'=>false,
            'defaultFont'=>'DejaVu Serif',
        ]);

    app(FrotaProPdfPageDecorator::class)
        ->apply($pdf,$contrato,$empresa);

    $binary=$pdf->output();

    expect($binary)->toStartWith('%PDF-');
    expect(strlen($binary))->toBeGreaterThan(1000);
});
