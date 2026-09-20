<!DOCTYPE html>
<html lang="pt">

<head>
    <meta charset="UTF-8">
    <title>{{ $contrato->template?->nome ?? 'Contrato' }}</title>
    <style>
        @page {
            margin: 22mm 18mm 20mm
        }

        * {
            box-sizing: border-box
        }

        body {
            font-family: "DejaVu Sans", sans-serif;
            font-size: 10.5pt;
            line-height: 1.55;
            color: #1e293b
        }

        .header {
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 12px;
            margin-bottom: 24px
        }

        .brand {
            font-size: 16pt;
            font-weight: 700;
            color: #111827
        }

        .company {
            font-size: 9pt;
            color: #64748b;
            margin-top: 3px
        }

        .meta {
            margin-top: 10px;
            font-size: 8.5pt;
            color: #64748b
        }

        .title {
            text-align: center;
            font-size: 15pt;
            font-weight: 700;
            margin: 0 0 24px;
            color: #0f172a
        }

        .document {
            white-space: normal;
            text-align: justify
        }

        .document p {
            margin: 0 0 10px
        }

        .document h1,
        .document h2,
        .document h3 {
            color: #0f172a
        }

        .document table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0
        }

        .document th,
        .document td {
            border: 1px solid #cbd5e1;
            padding: 6px
        }

        .signature {
            display: inline-block;
            max-width: 180px;
            max-height: 70px;
            vertical-align: middle
        }

        .footer {
            position: fixed;
            bottom: -12mm;
            left: 0;
            right: 0;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            font-size: 7.5pt;
            color: #94a3b8
        }

        .footer-right {
            float: right
        }
    </style>
</head>

<body>
    <header class="header">
        <div class="brand">{{ $empresa?->nome_empresa ?? 'FrotaPRO' }}</div>
        @if($empresa)
        <div class="company">
            @if($empresa->nif)NIF {{ $empresa->nif }}@endif
            @if($empresa->email) · {{ $empresa->email }}@endif
            @if($empresa->telemovel) · {{ $empresa->telemovel }}@endif
        </div>
        @endif
        <div class="meta">
            Documento {{ $contrato->id }} · Versão {{ $contrato->versao_atual }}
        </div>
    </header>

    <h1 class="title">{{ $contrato->template?->nome ?? 'Contrato' }}</h1>

    <main class="document">
        {!! $documentHtml !!}
    </main>

    <footer class="footer">
        Gerado pelo FrotaPRO em {{ $generatedAt->format('d/m/Y H:i') }}
        <span class="footer-right">Versão {{ $contrato->versao_atual }}</span>
    </footer>
</body>

</html>
