<?php

declare(strict_types=1);

use App\Models\Contrato;
use App\Models\TemplateContrato;
use App\Services\FrotaProDocumentLabelResolver;
use App\Services\FrotaProRgpdV12PdfFormatter;

test('4r14b5i insere titulo e formata secoes RGPD 1.2', function (): void {
    $input = '<div class="doc-title">1. RESPONSÁVEL PELO TRATAMENTO DE DADOS</div>' . "\n"
        . '<p class="doc-paragraph">2. Dados Pessoais Recolhidos</p>' . "\n"
        . '<p class="doc-paragraph">7.1 — Utilização de Imagem</p>' . "\n"
        . '<p class="doc-paragraph">Parágrafo normal.</p>';

    $html = app(FrotaProRgpdV12PdfFormatter::class)->format($input);

    expect($html)
        ->toContain('rgpd-v12-document')
        ->toContain('<h1 class="doc-title rgpd-v12-title">DECLARAÇÃO DE PROTEÇÃO DE DADOS E PRIVACIDADE</h1>')
        ->toContain('<h2 class="rgpd-v12-section">1. RESPONSÁVEL PELO TRATAMENTO DE DADOS</h2>')
        ->toContain('<h2 class="rgpd-v12-section">2. Dados Pessoais Recolhidos</h2>')
        ->toContain('<h3 class="rgpd-v12-subsection">7.1 — Utilização de Imagem</h3>')
        ->toContain('<p class="doc-paragraph">Parágrafo normal.</p>')
        ->not->toContain('<div class="doc-title">1. RESPONSÁVEL');
});

test('4r14b5i nao duplica titulo e formata uma unica vez', function (): void {
    $input = '<div class="doc-title">DECLARAÇÃO DE PROTEÇÃO DE DADOS E PRIVACIDADE</div>'
        . '<p class="doc-paragraph">1. Responsável pelo Tratamento</p>';

    $formatter = app(FrotaProRgpdV12PdfFormatter::class);
    $result = $formatter->format($input);

    expect(substr_count($result, 'DECLARAÇÃO DE PROTEÇÃO DE DADOS E PRIVACIDADE'))
        ->toBe(1);
    expect($formatter->format($result))->toBe($result);
});

test('4r14b5i preserva escolhas e imagem de assinatura', function (): void {
    $input = '<p class="doc-paragraph">Decisão: NÃO AUTORIZO</p>'
        . '<p class="doc-paragraph">Assinatura do titular:</p>'
        . '<img alt="assinatura" src="data:image/png;base64,AA==">';

    $html = app(FrotaProRgpdV12PdfFormatter::class)->format($input);

    expect($html)
        ->toContain('Decisão: NÃO AUTORIZO')
        ->toContain('Assinatura do titular:')
        ->toContain('src="data:image/png;base64,AA=="');
});

test('4r14b5i utiliza declaracao como rotulo do documento', function (): void {
    $documentHtml = app(FrotaProRgpdV12PdfFormatter::class)
        ->format('<div class="doc-title">1. RESPONSÁVEL PELO TRATAMENTO DE DADOS</div>');

    $contrato = new Contrato();
    $contrato->setRelation('template', new TemplateContrato(['nome' => 'RGPD']));
    $contrato->setRelation('tipoContrato', null);

    expect(app(FrotaProDocumentLabelResolver::class)->resolve($contrato, $documentHtml))
        ->toBe('Declaração');
});
