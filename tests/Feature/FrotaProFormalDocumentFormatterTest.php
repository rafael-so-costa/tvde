<?php

use App\Services\FrotaProFormalDocumentFormatter;

test('formatter promove titulos clausulas campos e assinaturas',function(){
    $raw=
        '<p>CONTRATO DE ALUGUER</p>'.
        '<p>CLÁUSULA PRIMEIRA<br>Objeto</p>'.
        '<p>Matrícula: AA-00-AA<br>Marca: Toyota<br>Modelo: Corolla</p>'.
        '<p>A LOCADORA</p>'.
        '<p>__________________________</p>'.
        '<p>O LOCATÁRIO</p>'.
        '<p>__________________________</p>';

    $result=app(
        FrotaProFormalDocumentFormatter::class
    )->format($raw);

    expect($result)
        ->toContain('class="doc-title"')
        ->toContain('class="clause-heading"')
        ->toContain('class="contract-detail-table"')
        ->toContain('class="contract-signatures"')
        ->not->toContain('<script');
});

test('formatter preserva templates com tabelas e imagens',function(){
    $raw='<table><tr><td>Texto</td></tr></table>';

    expect(
        app(
            FrotaProFormalDocumentFormatter::class
        )->format($raw)
    )->toBe($raw);
});

test('formatter protege texto contra injecao de html',function(){
    $raw=
        '<p>CLÁUSULA PRIMEIRA<br>Objeto</p>'.
        '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>';

    $result=app(
        FrotaProFormalDocumentFormatter::class
    )->format($raw);

    expect($result)
        ->not->toContain('<script>')
        ->toContain('&lt;script&gt;');
});
