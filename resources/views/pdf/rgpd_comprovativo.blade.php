<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="utf-8">
    <title>Comprovativo RGPD assinado</title>

    <style>
        @page {
            margin: 19mm 17mm 18mm;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            color: #172033;
            font-size: 9pt;
            line-height: 1.45;
        }

        h1 {
            font-size: 17pt;
            color: #26377f;
            margin: 0 0 4mm;
        }

        h2 {
            font-size: 11pt;
            color: #26377f;
            margin: 7mm 0 2mm;
        }

        p {
            margin: 1mm 0;
        }

        .subtitle {
            color: #536076;
            font-size: 8.5pt;
            margin-bottom: 6mm;
        }

        .meta {
            width: 100%;
            border-collapse: collapse;
            margin: 3mm 0;
        }

        .meta th,
        .meta td {
            border: 1px solid #d7dfe9;
            padding: 2mm 2.3mm;
            vertical-align: top;
            text-align: left;
        }

        .meta th {
            background: #f0f3f9;
            width: 28%;
        }

        .texto {
            margin: 2mm 0;
            padding: 4mm;
            border: 1px solid #d7dfe9;
            word-wrap: break-word;
        }

        .hash {
            font-family: DejaVu Sans Mono, monospace;
            font-size: 7pt;
            word-wrap: break-word;
        }

        .assinatura {
            max-width: 67mm;
            max-height: 30mm;
            margin: 3mm 0 1mm;
        }

        .nota {
            font-size: 8pt;
            color: #536076;
            margin-top: 4mm;
        }

        .keep {
            page-break-inside: avoid;
        }
    </style>
</head>

<body>
    <h1>Comprovativo RGPD — documento assinado</h1>

    <p class="subtitle">
        Cópia histórica do texto e das escolhas assinadas.
        O estado atual das autorizações pode ter mudado
        após esta emissão.
    </p>

    <table class="meta">
        <tr>
            <th>Titular</th>
            <td>{{ $registo->titular_nome }}</td>
        </tr>

        <tr>
            <th>Tipo</th>
            <td>{{ $registo->titular_tipo }}</td>
        </tr>

        <tr>
            <th>Modelo / versão</th>
            <td>
                {{ $registo->modelo_codigo }}
                —
                {{ $registo->versao_documento }}
            </td>
        </tr>

        <tr>
            <th>Assinatura</th>
            <td>
                {{ $assinatura->modo }}
                —
                {{ \Carbon\Carbon::parse($assinatura->assinado_em)->timezone('Europe/Lisbon')->format('d/m/Y H:i:s') }}
                (Lisboa)
            </td>
        </tr>

        <tr>
            <th>Emitido em</th>
            <td>
                {{ $emitidoEm->timezone('Europe/Lisbon')->format('d/m/Y H:i:s') }}
                (Lisboa)
            </td>
        </tr>
    </table>

    <h2>Texto exato do documento apresentado</h2>

    <div class="texto">
        {!! nl2br(e($registo->documento_texto_snapshot)) !!}
    </div>

    <h2>Finalidades específicas declaradas</h2>

    <table class="meta">
        @forelse(($registo->finalidades_especificas ?? []) as $chave => $valor)
            <tr>
                <th>{{ $chave }}</th>
                <td>
                    {{ is_scalar($valor) ? $valor : json_encode($valor, JSON_UNESCAPED_UNICODE) }}
                </td>
            </tr>
        @empty
            <tr>
                <td>Não foram indicadas finalidades adicionais.</td>
            </tr>
        @endforelse
    </table>

    <h2>Histórico de decisões e revogações até à emissão</h2>

    <table class="meta">
        <tr>
            <th>Finalidade</th>
            <th>Evento</th>
            <th>Escolha</th>
            <th>Data</th>
        </tr>

        @foreach ($eventos as $evento)
            <tr>
                <td>{{ $evento->finalidade }}</td>
                <td>{{ $evento->tipo }}</td>
                <td>{{ $evento->escolha }}</td>
                <td>
                    {{ \Carbon\Carbon::parse($evento->ocorrido_em)->timezone('Europe/Lisbon')->format('d/m/Y H:i:s') }}
                </td>
            </tr>
        @endforeach
    </table>

    <div class="keep">
        <h2>Assinatura recolhida</h2>

        <p>Nome: {{ $assinatura->signatario_nome }}</p>

        <img
            class="assinatura"
            src="data:image/png;base64,{{ $imagemBase64 }}"
            alt="Assinatura"
        />

        <p class="nota">
            Modo de confirmação: {{ $assinatura->modo }}.
            Esta imagem constitui evidência técnica e
            não substitui a verificação da identidade
            do signatário.
        </p>
    </div>

    <h2>Integridade criptográfica</h2>

    <p>Documento SHA-256:</p>
    <p class="hash">{{ $registo->documento_sha256 }}</p>

    <p>Escolhas SHA-256:</p>
    <p class="hash">{{ $assinatura->escolhas_sha256 }}</p>

    <p>Imagem de assinatura SHA-256:</p>
    <p class="hash">{{ $assinatura->assinatura_sha256 }}</p>

    <p>
        Registo:
        <span class="hash">{{ $registo->id }}</span>
    </p>

    <p class="nota">
        O comprovativo original não é reescrito
        após uma revogação. Para conhecer o estado
        atual, consulte os consentimentos no portal RGPD.
    </p>
</body>
</html>
