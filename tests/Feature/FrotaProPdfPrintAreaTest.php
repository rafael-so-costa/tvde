<?php

use App\Models\Contrato;
use App\Models\Documento;
use App\Models\TemplateContrato;

function paginatedTestContract(?string $codigo=null): Contrato
{
    $contrato=new Contrato();

    $contrato->id=
        '00000000-0000-4000-8000-000000000001';

    $contrato->tipo='aluguer';
    $contrato->versao_atual=1;

    $contrato->setRelation(
        'template',
        new TemplateContrato([
            'nome'=>'Contrato de Exemplo',
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

test('layout utiliza uma unica declaracao A4',function(){
    $source=file_get_contents(
        resource_path('views/pdf/contrato.blade.php')
    );

    preg_match_all(
        '/@page\s*\{/u',
        $source,
        $matches
    );

    expect(count($matches[0]))->toBe(1);

    expect($source)
        ->toContain('FrotaProPaginatedLayoutV4I2')
        ->toContain('margin:25mm 21mm 32mm 21mm');

    expect(
        preg_match(
            '/class="contract-sheet"/u',
            $source
        )
    )->toBe(0);

    expect(
        preg_match(
            '/class="contract-page-frame"/u',
            $source
        )
    )->toBe(0);
});

test('preview renderiza modo proprio e numero provisório',function(){
    $html=view('pdf.contrato',[
        'contrato'=>paginatedTestContract(),
        'empresa'=>null,
        'documentHtml'=>'<p class="doc-paragraph">Documento em revisão.</p>',
        'generatedAt'=>now(),
        'previewMode'=>true,
    ])->render();

    expect($html)
        ->toContain('preview-mode')
        ->toContain('Contrato n.º A ATRIBUIR')
        ->toContain('Documento em revisão.');
});

test('pdf definitivo apresenta identificador existente',function(){
    $html=view('pdf.contrato',[
        'contrato'=>paginatedTestContract('G000123'),
        'empresa'=>null,
        'documentHtml'=>'<p class="doc-paragraph">Documento definitivo.</p>',
        'generatedAt'=>now(),
        'previewMode'=>false,
    ])->render();

    expect($html)
        ->toContain('document pdf-mode')
        ->toContain('Contrato n.º G000123')
        ->not->toContain('Contrato n.º A ATRIBUIR');
});

test('view preserva classes usadas pelos modelos antigos',function(){
    $source=file_get_contents(
        resource_path('views/pdf/contrato.blade.php')
    );

    expect($source)
        ->toContain('.document .clause-title')
        ->toContain('.document .clause-subtitle')
        ->toContain('.document .field-line')
        ->toContain('.document .contract-signatures');
});
