<!DOCTYPE html>
<html lang="pt">

<head>
    <meta charset="UTF-8">

    <title>
        {{ $contrato->tipoContrato?->nome ?? $contrato->template?->nome ?? 'Contrato' }}
    </title>

    <style>
        @page {
            margin: 20mm 18mm 24mm
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
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin-bottom: 22px
        }

        .meta {
            font-size: 8pt;
            color: #94a3b8;
            text-align: right
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
            bottom: -17mm;
            left: 0;
            right: 0;
            border-top: 1px solid #e2e8f0;
            padding-top: 5px;
            color: #94a3b8
        }

        .footer-company {
            font-size: 7pt;
            line-height: 1.35
        }

        .footer-document {
            margin-top: 3px;
            font-size: 6.8pt;
            color: #a8b1bf
        }

        .footer-right {
            float: right
        }
    </style>
</head>

<body>
    <header class="header">
        <div class="meta">
            Contrato n.º
            {{ $contrato->documento?->codigo ?? $contrato->id }}
            · Versão {{ $contrato->versao_atual }}
        </div>
    </header>

    <h1 class="title">
        {{ $contrato->tipoContrato?->nome ?? $contrato->template?->nome ?? 'Contrato' }}
    </h1>

    <main class="document">
        {!! $documentHtml !!}
    </main>

    <footer class="footer">
        @if($empresa)
            <div class="footer-company">
                <strong>{{ $empresa->nome_empresa }}</strong>

                @if($empresa->nif)
                    · NIF {{ $empresa->nif }}
                @endif

                @if($empresa->telemovel)
                    · {{ $empresa->telemovel }}
                @endif

                @if($empresa->email)
                    · {{ $empresa->email }}
                @endif
            </div>
        @endif

        <div class="footer-document">
            Gerado pelo FrotaPRO em
            {{ $generatedAt->format('d/m/Y H:i') }}

            <span class="footer-right">
                @if($contrato->documento?->codigo)
                    {{ $contrato->documento->codigo }} ·
                @endif

                Versão {{ $contrato->versao_atual }}
            </span>
        </div>
    </footer>
</body>

</html>
