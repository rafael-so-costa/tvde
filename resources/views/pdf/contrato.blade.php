<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<title>{{ $contrato->tipoContrato?->nome ?? $contrato->template?->nome ?? 'Contrato' }}</title>
<style>
/* FrotaProPaginatedLayoutV4I2 */

@page{margin:25mm 21mm 32mm 21mm}

*{box-sizing:border-box}



body{
    font-family:"DejaVu Serif",Georgia,serif;
    font-size:10.3pt;
    line-height:1.46;
    color:#1f2937;
    background:#fff
}

/* Cabeçalho reservado na margem superior do PDF. */
.running-header{
    position:static;
    height:auto;
    min-height:12mm;
    margin:0 0 8mm;
    padding:0 0 3mm;
    border-bottom:.45pt solid #30465b;
    text-align:right;
    font-family:"DejaVu Sans",Arial,sans-serif
}

.running-header .contract-number{
    font-size:8.5pt;
    line-height:1.35;
    font-weight:700;
    color:#20364c
}

.running-header .contract-number-status{
    margin-top:1mm;
    font-size:6.8pt;
    line-height:1.3;
    color:#64748b
}

/* O preview HTML mantém a mesma largura útil. */
body.preview-mode{
    width:210mm;
    min-height:297mm;
    padding:25mm 21mm 32mm;
    margin:0 auto;
    background:#fff
}

body.preview-mode .running-header{
    position:static;
    height:auto;
    min-height:12mm;
    margin:0 0 9mm;
    padding-bottom:2mm
}

/* Títulos dos documentos. */
.document .doc-title{
    margin:2mm 0 8mm;
    font-size:15pt;
    line-height:1.3;
    font-weight:700;
    text-align:center;
    text-transform:uppercase;
    color:#1a3048;
    page-break-after:avoid
}

/* Identificação das partes. */
.document .doc-section-label{
    margin:5mm 0 3mm;
    font-weight:700;
    color:#1a3048;
    page-break-after:avoid
}

.document .contract-party-divider{
    margin:3mm 0;
    font-weight:700;
    text-align:center
}

/* Cláusulas estruturadas. */
.document .clause-heading{
    margin:6mm 0 3mm;
    padding:2mm 0 1.5mm;
    border-top:.35pt solid #b6c4d2;
    text-align:center;
    page-break-inside:avoid;
    page-break-after:avoid
}

.document .clause-heading h2{
    margin:0 0 1mm;
    font-family:"DejaVu Serif",Georgia,serif;
    font-size:10.4pt;
    line-height:1.3;
    font-weight:700;
    color:#19324a
}

.document .clause-heading h3{
    margin:0;
    font-family:"DejaVu Serif",Georgia,serif;
    font-size:10pt;
    line-height:1.3;
    font-weight:600;
    color:#32485e
}

/* Compatibilidade com templates anteriores. */
.document .clause-title{
    margin:6mm 0 1mm;
    font-size:10.4pt;
    font-weight:700;
    text-align:center;
    color:#19324a;
    page-break-after:avoid
}

.document .clause-subtitle{
    margin:0 0 3mm;
    font-size:10pt;
    font-weight:700;
    text-align:center;
    color:#32485e;
    page-break-after:avoid
}

.document .doc-paragraph{
    margin:0 0 2.7mm;
    text-align:justify;
    line-height:1.46;
    orphans:2;
    widows:2
}

.document .doc-numbered{
    padding-left:4mm
}

.document .field-line{
    margin:0 0 1.5mm;
    text-align:left
}

.document .bullet{
    margin:0 0 2.5mm 7mm
}

/* Quadros de identificação. */
.document .contract-detail-table{
    width:100%;
    margin:4mm 0 6mm;
    border-collapse:collapse;
    table-layout:fixed;
    font-family:"DejaVu Sans",Arial,sans-serif;
    font-size:8pt;
    line-height:1.3;
    page-break-inside:avoid
}

.document .contract-detail-table th,
.document .contract-detail-table td{
    border:.3pt solid #bdcbd8;
    padding:2mm 2.2mm;
    vertical-align:top;
    text-align:left;
    word-wrap:break-word
}

.document .contract-detail-table th{
    background:#f0f4f8;
    color:#33465d;
    font-weight:700;
    width:21%
}

.document .contract-detail-table td{
    width:29%
}

/* Assinaturas. */
.document .contract-signatures{
    width:100%;
    margin:10mm 0 3mm;
    border:0;
    border-collapse:collapse;
    table-layout:fixed;
    page-break-inside:avoid
}

.document .contract-signatures td{
    width:50%;
    padding:12mm 6mm 2mm;
    border:0;
    text-align:center;
    vertical-align:bottom
}

.document .contract-signature-line{
    width:100%;
    height:1px;
    border-top:.5pt solid #27384a;
    margin:0 auto 2.5mm
}

.document .contract-signature-name{
    font-family:"DejaVu Sans",Arial,sans-serif;
    font-size:8pt;
    font-weight:700;
    line-height:1.3;
    text-transform:uppercase;
    color:#34485e
}

.document .signature-label{
    margin:8mm 0 2mm;
    text-align:center;
    font-weight:700;
    page-break-after:avoid
}

.document .signature{
    display:inline-block;
    max-width:48mm;
    max-height:20mm;
    vertical-align:middle
}

.document .signature-pending{
    display:inline-block;
    min-width:55mm;
    padding:6mm 4mm 2mm;
    border-bottom:.3mm solid #111827;
    font-family:"DejaVu Sans",Arial,sans-serif;
    font-size:8pt;
    text-align:center;
    color:#6b7280
}

/* Regras gerais dos modelos HTML. */
.document p{
    orphans:2;
    widows:2
}

.document h1,
.document h2,
.document h3{
    page-break-after:avoid
}

.document table{
    max-width:100%;
    border-collapse:collapse
}

.document img{
    max-width:100%;
    height:auto
}
/* FrotaProSignatureRuleV4L4 */

.document .contract-signature-rule{
    display:block;
    width:75mm;
    max-width:100%;
    height:14mm;
    margin:1mm 0 7mm;
    padding:0;
    border:0;
    border-bottom:.5pt solid #27384a;
    page-break-inside:avoid;
}

.document .contract-signature-rule + .doc-paragraph{
    page-break-before:auto;
}

/* FROTAPRO_4R14B5I: tipografia da declaracao RGPD 1.2 */
.document .rgpd-v12-document .rgpd-v12-title{
    margin:1mm 0 7mm;
    padding:0 0 3mm;
    border-bottom:.5pt solid #b7c6d5;
    font-family:"DejaVu Sans",Arial,sans-serif;
    font-size:12.7pt;
    line-height:1.35;
    color:#183047;
    font-weight:700;
    text-align:center;
    text-transform:uppercase;
    page-break-inside:avoid;
    page-break-after:avoid
}

.document .rgpd-v12-section{
    margin:5mm 0 2mm;
    padding:0 0 1mm;
    font-family:"DejaVu Sans",Arial,sans-serif;
    font-size:10pt;
    font-weight:700;
    line-height:1.35;
    color:#1a3048;
    border-bottom:.3pt solid #d9e2eb;
    page-break-inside:avoid;
    page-break-after:avoid
}

.document .rgpd-v12-subsection{
    margin:3.5mm 0 1.5mm;
    font-family:"DejaVu Sans",Arial,sans-serif;
    font-size:9.3pt;
    font-weight:700;
    line-height:1.3;
    color:#30465b;
    page-break-after:avoid
}

.document .rgpd-v12-document .doc-paragraph{
    margin:0 0 2.7mm;
    text-align:left;
    line-height:1.44
}
</style>
</head>
@php
    $isDocumentPreview =
        !empty($previewMode) ||
        !empty($isPreview) ||
        request()->is('api/contratos/preview');
@endphp
<body class="document {{ $isDocumentPreview ? 'preview-mode' : 'pdf-mode' }}">
<header class="running-header">
    <div class="contract-number">
        {{ app(\App\Services\FrotaProDocumentLabelResolver::class)->resolve($contrato,(string)$documentHtml) }} n.º {{ $contrato->documento?->codigo ?: 'A ATRIBUIR' }}
    </div>
    <div class="contract-number-status">
        @if($contrato->documento?->codigo)
            Número sequencial definitivo
        @else
            Pré-visualização · Número ainda não atribuído
        @endif
        · Versão {{ $contrato->versao_atual }}
    </div>
</header>
{!! app(\App\Services\FrotaProFormalDocumentFormatter::class)->format((string)$documentHtml) !!}
</body>
</html>
