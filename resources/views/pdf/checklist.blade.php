<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Checklist {{ $documento->codigo }}</title>
<style>
@page{margin:16mm 16mm 18mm}
*{box-sizing:border-box}
body{font-family:"DejaVu Sans",sans-serif;color:#1e293b;font-size:9.5pt;line-height:1.45}
.header{border-bottom:2px solid #4f46e5;padding-bottom:12px;margin-bottom:18px}
.brand{font-size:18pt;font-weight:700;color:#0f172a}
.brand span{color:#4f46e5}
.title{font-size:15pt;font-weight:700;margin-top:8px}
.code{font-size:11pt;color:#4f46e5;font-weight:700}
.grid{width:100%;border-collapse:collapse;margin-bottom:14px}
.grid td,.grid th{border:1px solid #e2e8f0;padding:7px;vertical-align:top}
.grid th{background:#f8fafc;text-align:left;font-size:8pt;color:#64748b}
.section{margin-top:18px}
.section-title{font-size:11pt;font-weight:700;color:#0f172a;border-bottom:1px solid #cbd5e1;padding-bottom:5px;margin-bottom:8px}
.badge{display:inline-block;padding:3px 7px;background:#eef2ff;color:#4338ca;font-size:8pt;font-weight:700}
.damage{margin-bottom:5px;padding:6px;background:#fef2f2;border-left:3px solid #dc2626}
.photo{display:inline-block;width:47%;margin:1%;vertical-align:top;border:1px solid #e2e8f0;padding:5px}
.photo img{width:100%;max-height:145px;object-fit:contain}
.photo-title{font-size:7.5pt;margin-top:4px;color:#475569}
.signature{display:inline-block;width:47%;margin:1%;vertical-align:top;text-align:center}
.signature img{max-width:100%;max-height:90px}
.signature-line{border-top:1px solid #64748b;margin-top:8px;padding-top:4px;font-size:8pt}
.hash{font-family:"DejaVu Sans Mono",monospace;font-size:6.5pt;color:#64748b;word-break:break-all}
.footer{position:fixed;bottom:-10mm;left:0;right:0;border-top:1px solid #e2e8f0;padding-top:5px;font-size:7pt;color:#94a3b8}
</style>
</head>
<body>

<header class="header">
    <div class="brand">Frota<span>PRO</span></div>

    <div class="title">
        Checklist de
        {{ $checklist->tipo==='entrega' ? 'Entrega' : 'Recolha' }}
    </div>

    <div class="code">
        Código documental: {{ $documento->codigo }}
    </div>

    @if($checklist->tipo==='recolha' && $entregaDocumento)
        <div style="margin-top:4px">
            Relacionado com a entrega:
            <strong>{{ $entregaDocumento->codigo }}</strong>
        </div>
    @endif
</header>

<table class="grid">
<tr>
    <th>Veículo</th>
    <th>Motorista</th>
    <th>Operação</th>
</tr>
<tr>
    <td>
        <strong>{{ $checklist->matricula_snapshot }}</strong><br>
        {{ $checklist->modelo_snapshot }}
    </td>

    <td>
        <strong>{{ $checklist->motorista_nome_snapshot }}</strong>
        @if($checklist->motorista?->nif)
            <br>NIF {{ $checklist->motorista->nif }}
        @endif
    </td>

    <td>
        {{ optional($checklist->data_operacao)->format('d/m/Y') }}
        @if($checklist->hora_operacao)
            · {{ substr($checklist->hora_operacao,0,5) }}
        @endif
        <br>
        {{ number_format((int)$checklist->quilometragem,0,',','.') }} km
        <br>
        Combustível/carga:
        {{ $checklist->nivel_combustivel }}
    </td>
</tr>
</table>

@if($checklist->tipo==='recolha' && $checklist->entregaVinculada)
<table class="grid">
<tr>
    <th colspan="3">Comparação com a entrega</th>
</tr>
<tr>
    <td>
        <strong>KM entrega</strong><br>
        {{ number_format((int)$checklist->entregaVinculada->quilometragem,0,',','.') }}
    </td>

    <td>
        <strong>KM recolha</strong><br>
        {{ number_format((int)$checklist->quilometragem,0,',','.') }}
    </td>

    <td>
        <strong>Utilização</strong><br>
        {{ number_format(max(0,(int)$checklist->quilometragem-(int)$checklist->entregaVinculada->quilometragem),0,',','.') }} km
    </td>
</tr>
</table>
@endif

<div class="section">
    <div class="section-title">
        Estado exterior do veículo
    </div>

    @php
        $danos=$checklist->tipo==='entrega'
            ?($checklist->danos??[])
            :($checklist->novos_danos??[]);
    @endphp

    @forelse($danos as $dano)
        <div class="damage">
            <strong>{{ $dano['part']??'Zona do veículo' }}</strong>
            · {{ implode(', ',$dano['types']??[]) }}

            @if(isset($dano['value']) && $dano['value']!==null)
                · € {{ number_format((float)$dano['value'],2,',','.') }}
            @endif
        </div>
    @empty
        <span class="badge">Sem danos registados nesta inspeção</span>
    @endforelse
</div>

@if($checklist->tipo==='recolha')
<div class="section">
    <div class="section-title">
        Penalizações
    </div>

    <strong>
        Total:
        € {{ number_format((float)$checklist->penalizacao_total,2,',','.') }}
    </strong>

    @if(count(array_filter($checklist->itens_faltantes??[]))>0)
        <div style="margin-top:8px">
            Itens em falta:
            {{ implode(', ',array_keys(array_filter($checklist->itens_faltantes??[]))) }}
        </div>
    @endif
</div>
@endif

@if($checklist->observacoes)
<div class="section">
    <div class="section-title">
        Observações
    </div>

    {!! nl2br(e($checklist->observacoes)) !!}
</div>
@endif

@if(count($photos)>0)
<div class="section">
    <div class="section-title">
        Evidências fotográficas
    </div>

    @foreach($photos as $photo)
        <div class="photo">
            <img src="{{ $photo['data_uri'] }}">

            <div class="photo-title">
                {{ $photo['titulo'] }}

                @if($photo['parte'])
                    · {{ $photo['parte'] }}
                @endif
            </div>

            <div class="hash">
                SHA-256 {{ $photo['hash'] }}
            </div>
        </div>
    @endforeach
</div>
@endif

@if(count($videos)>0)
<div class="section">
    <div class="section-title">
        Evidências em vídeo
    </div>

    @foreach($videos as $video)
        <div style="margin-bottom:6px">
            <strong>{{ $video['titulo'] }}</strong>
            <div class="hash">
                SHA-256 {{ $video['hash'] }}
            </div>
        </div>
    @endforeach
</div>
@endif

@if($assinaturaEmpresa || $assinaturaMotorista)
<div class="section">
    <div class="section-title">
        Assinaturas
    </div>

    @if($assinaturaEmpresa)
        <div class="signature">
            <img src="{{ $assinaturaEmpresa }}">

            <div class="signature-line">
                Empresa / Gestor
            </div>
        </div>
    @endif

    @if($assinaturaMotorista)
        <div class="signature">
            <img src="{{ $assinaturaMotorista }}">

            <div class="signature-line">
                Motorista
            </div>
        </div>
    @endif
</div>
@endif

<div class="section">
    <div class="section-title">
        Integridade e rastreabilidade
    </div>

    <div>
        ID do checklist:
        <strong>{{ $checklist->id }}</strong>
    </div>

    @if($checklist->contrato_id)
        <div>
            Contrato associado:
            <strong>{{ $checklist->contrato_id }}</strong>
        </div>
    @endif

    <div>
        Finalizado em:
        {{ optional($checklist->finalizado_em)->format('d/m/Y H:i') }}
    </div>
</div>

<footer class="footer">
    Documento gerado pelo FrotaPRO em {{ $generatedAt->format('d/m/Y H:i') }}
    <span style="float:right">
        {{ $documento->codigo }}
    </span>
</footer>

</body>
</html>