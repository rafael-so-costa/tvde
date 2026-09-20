<!DOCTYPE html>
<html lang="pt">

<head>
    <meta charset="UTF-8">
    <title>{{ $declaracao->titulo }}</title>
    <style>
        @page {
            margin: 22mm 20mm 20mm
        }

        * {
            box-sizing: border-box
        }

        body {
            font-family: "DejaVu Sans", sans-serif;
            font-size: 11pt;
            line-height: 1.65;
            color: #1e293b
        }

        .header {
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 14px;
            margin-bottom: 28px
        }

        .company {
            font-size: 15pt;
            font-weight: 700;
            color: #0f172a
        }

        .meta {
            margin-top: 4px;
            font-size: 9pt;
            color: #64748b
        }

        .title {
            text-align: center;
            font-size: 16pt;
            margin: 0 0 28px;
            color: #0f172a
        }

        .recipient {
            margin-bottom: 22px;
            font-size: 10pt
        }

        .content {
            text-align: justify;
            white-space: normal
        }

        .entity {
            margin-top: 28px;
            padding: 12px 14px;
            background: #f8fafc;
            border: 1px solid #e2e8f0
        }

        .entity-title {
            font-weight: 700;
            margin-bottom: 5px
        }

        .footer {
            position: fixed;
            left: 0;
            right: 0;
            bottom: -12mm;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            font-size: 7.5pt;
            color: #94a3b8
        }

        .hash {
            font-family: "DejaVu Sans Mono", monospace
        }
    </style>
</head>

<body>
    <header class="header">
        <div class="company">{{ $declaracao->empresa?->nome_empresa ?? 'FrotaPRO' }}</div>
        @if($declaracao->empresa)
        <div class="meta">
            @if($declaracao->empresa->nif)NIF {{ $declaracao->empresa->nif }}@endif
            @if($declaracao->empresa->email) · {{ $declaracao->empresa->email }}@endif
            @if($declaracao->empresa->telemovel) · {{ $declaracao->empresa->telemovel }}@endif
        </div>
        @endif
    </header>

    <h1 class="title">{{ $declaracao->titulo }}</h1>

    @if($declaracao->destinatario)
    <div class="recipient"><strong>Destinatário:</strong> {{ $declaracao->destinatario }}</div>
    @endif

    <main class="content">
        {!! nl2br(e($declaracao->conteudo)) !!}
    </main>

    @if($declaracao->motorista)
    <div class="entity">
        <div class="entity-title">Motorista</div>
        {{ $declaracao->motorista->nome_completo }}
        @if($declaracao->motorista->nif) · NIF {{ $declaracao->motorista->nif }}@endif
    </div>
    @endif

    @if($declaracao->veiculo)
    <div class="entity">
        <div class="entity-title">Veículo</div>
        {{ $declaracao->veiculo->matricula }} · {{ $declaracao->veiculo->marca }} {{ $declaracao->veiculo->modelo }}
    </div>
    @endif

    @if($declaracao->proprietario)
    <div class="entity">
        <div class="entity-title">Proprietário</div>
        {{ $declaracao->proprietario->nome_empresa ?: $declaracao->proprietario->nome_completo }}
        @if($declaracao->proprietario->nif) · NIF {{ $declaracao->proprietario->nif }}@endif
    </div>
    @endif

    <footer class="footer">
        Emitido pelo FrotaPRO em {{ $generatedAt->format('d/m/Y H:i') }}
        <span style="float:right">ID {{ substr($declaracao->id,0,8) }}</span>
    </footer>
</body>

</html>
