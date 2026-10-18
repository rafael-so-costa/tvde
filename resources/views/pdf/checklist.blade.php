<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Checklist {{ $documento->codigo }}</title>

<style>
@page{margin:14mm 15mm 18mm}
*{box-sizing:border-box}
body{font-family:"DejaVu Sans",sans-serif;color:#172033;font-size:9pt;line-height:1.5}
.header{margin-bottom:18px}
.header-top{width:100%;border-collapse:collapse}
.header-top td{vertical-align:top}
.brand{font-size:21pt;font-weight:700;color:#111827;letter-spacing:-.5px}
.brand span{color:#4f46e5}
.doc-label{font-size:7.5pt;text-transform:uppercase;letter-spacing:.8px;color:#64748b;font-weight:700}
.title{font-size:17pt;font-weight:700;color:#111827;margin-top:3px}
.code-box{text-align:right}
.code{display:inline-block;background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;border-radius:6px;padding:7px 11px;font-size:11pt;font-weight:700}
.header-rule{height:3px;background:#4f46e5;margin-top:12px}
.company-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:10px 12px;margin-top:12px}
.company-name{font-size:11pt;font-weight:700;color:#0f172a}
.company-meta{font-size:7.8pt;color:#64748b;margin-top:3px;line-height:1.55}
.grid{width:100%;border-collapse:collapse;margin-bottom:14px}
.grid td,.grid th{border:1px solid #e2e8f0;padding:7px;vertical-align:top}
.grid th{background:#f8fafc;text-align:left;font-size:8pt;color:#64748b}
.section{margin-top:18px}
.section-title{font-size:11pt;font-weight:700;color:#0f172a;border-bottom:1px solid #cbd5e1;padding-bottom:5px;margin-bottom:8px}
.badge{display:inline-block;padding:3px 7px;background:#eef2ff;color:#4338ca;font-size:8pt;font-weight:700}
.badge-ok{background:#ecfdf5;color:#047857}
.badge-no{background:#fef2f2;color:#b91c1c}
.damage{margin-bottom:5px;padding:6px;background:#fef2f2;border-left:3px solid #dc2626}
.photo{display:inline-block;width:47%;margin:1%;vertical-align:top;border:1px solid #e2e8f0;padding:5px;page-break-inside:avoid}
.photo img{width:100%;max-height:180px;object-fit:contain}
.photo-title{font-size:7.5pt;margin-top:4px;color:#475569}
.media-meta{font-size:7pt;color:#64748b;margin-top:2px}
.video{padding:8px;border:1px solid #e2e8f0;margin-bottom:7px;page-break-inside:avoid}
.signature{display:inline-block;width:47%;margin:1%;vertical-align:top;text-align:center;page-break-inside:avoid}
.signature img{max-width:100%;max-height:90px}
.signature-line{border-top:1px solid #64748b;margin-top:8px;padding-top:4px;font-size:8pt}
.hash{font-family:"DejaVu Sans Mono",monospace;font-size:6.5pt;color:#64748b;word-break:break-all}
.footer{position:fixed;bottom:-10mm;left:0;right:0;border-top:1px solid #e2e8f0;padding-top:5px;font-size:7pt;color:#94a3b8}
.small{font-size:7.5pt;color:#64748b}
</style>
</head>

<body>

@php
    $humanize=function($value){
        return \Illuminate\Support\Str::headline(
            str_replace(
                ['-','_'],
                ' ',
                (string)$value
            )
        );
    };

    $empresa=data_get(
        $checklist,
        'contrato.empresa'
    );

    $tenant=$checklist->tenant;

    $empresaNome=
        data_get(
            $empresa,
            'nome_empresa'
        )
        ?:data_get(
            $tenant,
            'nome'
        )
        ?:'Empresa';

    $empresaNif=
        data_get(
            $empresa,
            'nif'
        )
        ?:data_get(
            $tenant,
            'nif'
        );

    $empresaEmail=
        data_get(
            $empresa,
            'email'
        )
        ?:data_get(
            $tenant,
            'email'
        );

    $empresaTelefone=
        data_get(
            $empresa,
            'telemovel'
        )
        ?:data_get(
            $tenant,
            'telefone'
        );

    $empresaGerente=
        data_get(
            $empresa,
            'nome_gerente'
        );

    $empresaContactos=
        array_values(
            array_filter([
                $empresaNif
                    ?'NIF '.$empresaNif
                    :null,

                $empresaEmail
                    ?:null,

                $empresaTelefone
                    ?:null,
            ])
        );

    $empresaMorada=null;

    if($empresa){
        $linhaMorada1=
            trim(
                trim(
                    (string)data_get(
                        $empresa,
                        'endereco_rua',
                        ''
                    )
                ).
                ' '.
                trim(
                    (string)data_get(
                        $empresa,
                        'endereco_numero',
                        ''
                    )
                )
            );

        $linhaMorada2=
            trim(
                (string)data_get(
                    $empresa,
                    'endereco_complemento',
                    ''
                )
            );

        $linhaMorada3=
            trim(
                trim(
                    (string)data_get(
                        $empresa,
                        'endereco_cep',
                        ''
                    )
                ).
                ' '.
                trim(
                    (string)data_get(
                        $empresa,
                        'endereco_cidade',
                        ''
                    )
                )
            );

        $empresaMorada=
            implode(
                ', ',
                array_filter([
                    $linhaMorada1,
                    $linhaMorada2,
                    $linhaMorada3,
                ])
            );

        if($empresaMorada===''){
            $empresaMorada=null;
        }
    }
    $assinaturaEmpresaModo=
        data_get(
            $checklist->metadados_seguranca,
            'assinaturas.empresa.modo',
            'presencial'
        );

    $assinaturaMotoristaModo=
        data_get(
            $checklist->metadados_seguranca,
            'assinaturas.motorista.modo',
            'presencial'
        );
@endphp

<header class="header">
    <table class="header-top">
        <tr>
            <td style="width:65%">
                <div class="brand">Frota<span>PRO</span></div>
                <div class="doc-label">Documento operacional</div>
                <div class="title">
                    Checklist de {{ $checklist->tipo==='entrega' ? 'Entrega' : 'Recolha' }}
                </div>
            </td>

            <td class="code-box">
                <div class="doc-label" style="margin-bottom:5px">
                    Código documental
                </div>

                <div class="code">
                    {{ $documento->codigo }}
                </div>
            </td>
        </tr>
    </table>

    <div class="header-rule"></div>

    <div class="company-card">
        <div class="doc-label">
            Empresa responsável
        </div>

        <div class="company-name">
            {{ $empresaNome }}
        </div>

        <div class="company-meta">
            @if(count($empresaContactos)>0)
                {{ implode(' · ',$empresaContactos) }}
            @endif

            @if($empresaMorada)
                <br>
                {{ $empresaMorada }}
            @endif

            @if($empresaGerente)
                <br>
                Responsável:
                {{ $empresaGerente }}
            @endif
        </div>
    </div>

    @if($checklist->tipo==='recolha' && $entregaDocumento)
        <div style="margin-top:8px;font-size:8pt;color:#64748b">
            Documento de entrega relacionado:
            <strong style="color:#334155">
                {{ $entregaDocumento->codigo }}
            </strong>
        </div>
    @endif
</header>

<div class="section">
    <div class="section-title">
        Identificação da operação
    </div>

    <table class="grid">
        <tr>
            <th>Veículo</th>
            <th>Motorista</th>
            <th>Operação</th>
        </tr>

        <tr>
            <td>
                <strong>
                    {{ $checklist->matricula_snapshot }}
                </strong>

                <br>

                {{ $checklist->modelo_snapshot }}
            </td>

            <td>
                <strong>
                    {{ $checklist->motorista_nome_snapshot }}
                </strong>

                @if($checklist->motorista?->nif)
                    <br>
                    NIF:
                    {{ $checklist->motorista->nif }}
                @endif

                @if($checklist->motorista?->email)
                    <br>
                    {{ $checklist->motorista->email }}
                @endif

                @if($checklist->motorista?->telemovel)
                    <br>
                    {{ $checklist->motorista->telemovel }}
                @endif
            </td>

            <td>
                {{
                    optional(
                        $checklist->data_operacao
                    )->format('d/m/Y')
                }}

                @if($checklist->hora_operacao)
                    ·
                    {{
                        substr(
                            $checklist->hora_operacao,
                            0,
                            5
                        )
                    }}
                @endif

                <br>

                {{
                    number_format(
                        (int)$checklist->quilometragem,
                        0,
                        ',',
                        '.'
                    )
                }}
                km

                <br>

                Combustível/carga:
                {{
                    $checklist->nivel_combustivel
                }}
            </td>
        </tr>
    </table>
</div>

@if(
    $checklist->tipo==='recolha' &&
    $checklist->entregaVinculada
)
<div class="section">
    <div class="section-title">
        Comparação com a entrega
    </div>

    <table class="grid">
        <tr>
            <th>KM entrega</th>
            <th>KM recolha</th>
            <th>Utilização</th>
        </tr>

        <tr>
            <td>
                {{
                    number_format(
                        (int)$checklist
                            ->entregaVinculada
                            ->quilometragem,
                        0,
                        ',',
                        '.'
                    )
                }}
                km
            </td>

            <td>
                {{
                    number_format(
                        (int)$checklist
                            ->quilometragem,
                        0,
                        ',',
                        '.'
                    )
                }}
                km
            </td>

            <td>
                {{
                    number_format(
                        max(
                            0,
                            (int)$checklist
                                ->quilometragem
                            -
                            (int)$checklist
                                ->entregaVinculada
                                ->quilometragem
                        ),
                        0,
                        ',',
                        '.'
                    )
                }}
                km
            </td>
        </tr>
    </table>
</div>
@endif

@if(
    $checklist->tipo==='entrega' &&
    count($checklist->itens??[])>0
)
<div class="section">
    <div class="section-title">
        Itens verificados na entrega
    </div>

    <table class="grid">
        <tr>
            <th>Item</th>
            <th style="width:25%">Estado</th>
        </tr>

        @foreach($checklist->itens as $key=>$value)
            <tr>
                <td>
                    {{ $humanize($key) }}
                </td>

                <td>
                    @if($value)
                        <span class="badge badge-ok">
                            Confirmado
                        </span>
                    @else
                        <span class="badge badge-no">
                            Não confirmado
                        </span>
                    @endif
                </td>
            </tr>
        @endforeach
    </table>
</div>
@endif

@if(
    $checklist->tipo==='entrega' &&
    count($checklist->campos_especiais??[])>0
)
<div class="section">
    <div class="section-title">
        Informações complementares
    </div>

    <table class="grid">
        @foreach($checklist->campos_especiais as $key=>$value)
            <tr>
                <th style="width:40%">
                    {{ $humanize($key) }}
                </th>

                <td>
                    @if(is_bool($value))
                        {{ $value?'Sim':'Não' }}
                    @elseif(is_array($value))
                        {{ implode(', ',$value) }}
                    @else
                        {{ $value?:'—' }}
                    @endif
                </td>
            </tr>
        @endforeach
    </table>
</div>
@endif

<div class="section">
    <div class="section-title">
        Estado exterior do veículo
    </div>

    @php
        $danos=
            $checklist->tipo==='entrega'
                ?($checklist->danos??[])
                :($checklist->novos_danos??[]);
    @endphp

    @forelse($danos as $dano)
        <div class="damage">
            <strong>
                {{
                    $humanize(
                        $dano['part'] ??
                        'Zona do veículo'
                    )
                }}
            </strong>

            @if(
                !empty(
                    $dano['types']
                )
            )
                ·
                {{
                    implode(
                        ', ',
                        array_map(
                            $humanize,
                            $dano['types']
                        )
                    )
                }}
            @endif

            @if(
                isset(
                    $dano['value']
                ) &&
                $dano['value']!==null
            )
                · €
                {{
                    number_format(
                        (float)$dano['value'],
                        2,
                        ',',
                        '.'
                    )
                }}
            @endif
        </div>
    @empty
        <span class="badge badge-ok">
            Sem danos registados nesta inspeção
        </span>
    @endforelse
</div>

@if($checklist->tipo==='recolha')
<div class="section">
    <div class="section-title">
        Itens em falta e penalizações
    </div>

    <table class="grid">
        <tr>
            <th>Penalização total</th>

            <td>
                <strong>
                    €
                    {{
                        number_format(
                            (float)$checklist
                                ->penalizacao_total,
                            2,
                            ',',
                            '.'
                        )
                    }}
                </strong>
            </td>
        </tr>
    </table>

    @if(
        count(
            $checklist->itens_faltantes ??
            []
        )>0
    )
        <table class="grid">
            <tr>
                <th>Item</th>
                <th style="width:25%">Em falta</th>
            </tr>

            @foreach($checklist->itens_faltantes as $key=>$value)
                <tr>
                    <td>
                        {{ $humanize($key) }}
                    </td>

                    <td>
                        {{
                            $value
                                ?'Sim'
                                :'Não'
                        }}
                    </td>
                </tr>
            @endforeach
        </table>
    @endif
</div>
@endif

@if($checklist->observacoes)
<div class="section">
    <div class="section-title">
        Observações
    </div>

    {!! nl2br(
        e(
            $checklist->observacoes
        )
    ) !!}
</div>
@endif

<div class="section">
    <div class="section-title">
        Evidências fotográficas
        ({{ count($photos) }})
    </div>

    @if(count($photos)>0)
        @foreach($photos as $photo)
            <div class="photo">
                <img
                    src="{{ $photo['data_uri'] }}"
                >

                <div class="photo-title">
                    <strong>
                        {{ $photo['titulo'] }}
                    </strong>

                    @if($photo['parte'])
                        <br>
                        Zona:
                        {{ $photo['parte'] }}
                    @endif

                    @if($photo['contexto'])
                        <br>
                        Contexto:
                        {{
                            $humanize(
                                $photo['contexto']
                            )
                        }}
                    @endif

                    @if($photo['capturado_em'])
                        <br>
                        Capturada em:
                        {{
                            $photo[
                                'capturado_em'
                            ]->format(
                                'd/m/Y H:i:s'
                            )
                        }}
                    @endif
                </div>

                <div class="hash">
                    SHA-256:
                    {{ $photo['hash'] }}
                </div>
            </div>
        @endforeach
    @else
        <span class="badge">
            Nenhuma fotografia anexada
        </span>
    @endif
</div>

<div class="section">
    <div class="section-title">
        Evidências em vídeo
        ({{ count($videos) }})
    </div>

    @if(count($videos)>0)
        <p class="small">
            Os ficheiros de vídeo não são incorporados no PDF.
            Permanecem armazenados como evidências digitais vinculadas
            a este checklist e são identificados abaixo pelo respetivo
            hash SHA-256.
        </p>

        @foreach($videos as $video)
            <div class="video">
                <strong>
                    {{ $video['titulo'] }}
                </strong>

                @if($video['contexto'])
                    <br>
                    Contexto:
                    {{
                        $humanize(
                            $video['contexto']
                        )
                    }}
                @endif

                @if($video['arquivo_nome'])
                    <br>
                    Ficheiro:
                    {{ $video['arquivo_nome'] }}
                @endif

                @if($video['capturado_em'])
                    <br>
                    Capturado em:
                    {{
                        $video[
                            'capturado_em'
                        ]->format(
                            'd/m/Y H:i:s'
                        )
                    }}
                @endif

                @if($video['arquivo_tamanho'])
                    <br>
                    Tamanho:
                    {{
                        number_format(
                            $video[
                                'arquivo_tamanho'
                            ]/
                            1024/
                            1024,
                            2,
                            ',',
                            '.'
                        )
                    }}
                    MB
                @endif

                <div class="hash">
                    SHA-256:
                    {{ $video['hash'] }}
                </div>
            </div>
        @endforeach
    @else
        <span class="badge">
            Nenhum vídeo anexado
        </span>
    @endif
</div>

@if(
    $assinaturaEmpresa ||
    $assinaturaMotorista
)
<div class="section">
    <div class="section-title">
        Assinaturas
    </div>

    @if($assinaturaEmpresa)
        <div class="signature">
            <img
                src="{{ $assinaturaEmpresa }}"
            >

            <div class="signature-line">
                Empresa / Gestor

                @if(
                    data_get(
                        $checklist->metadados_seguranca,
                        'assinaturas.empresa.nome'
                    )
                )
                    <br>

                    <strong>
                        {{
                            data_get(
                                $checklist->metadados_seguranca,
                                'assinaturas.empresa.nome'
                            )
                        }}
                    </strong>
                @endif

                @if(
                    data_get(
                        $checklist->metadados_seguranca,
                        'assinaturas.empresa.email'
                    )
                )
                    <br>

                    {{
                        data_get(
                            $checklist->metadados_seguranca,
                            'assinaturas.empresa.email'
                        )
                    }}
                @endif

                <br>

                Assinatura
                {{
                    $assinaturaEmpresaModo==='remota'
                        ?'remota'
                        :'presencial'
                }}

                @if(
                    data_get(
                        $checklist->metadados_seguranca,
                        'assinaturas.empresa.assinado_em'
                    )
                )
                    <br>

                    {{
                        \Illuminate\Support\Carbon::parse(
                            data_get(
                                $checklist->metadados_seguranca,
                                'assinaturas.empresa.assinado_em'
                            )
                        )->format(
                            'd/m/Y H:i:s'
                        )
                    }}
                @endif
            </div>
        </div>
    @endif

    @if($assinaturaMotorista)
        <div class="signature">
            <img
                src="{{ $assinaturaMotorista }}"
            >

            <div class="signature-line">
                Motorista

                @if(
                    data_get(
                        $checklist->metadados_seguranca,
                        'assinaturas.motorista.nome'
                    )
                )
                    <br>

                    <strong>
                        {{
                            data_get(
                                $checklist->metadados_seguranca,
                                'assinaturas.motorista.nome'
                            )
                        }}
                    </strong>
                @endif

                @if(
                    data_get(
                        $checklist->metadados_seguranca,
                        'assinaturas.motorista.email'
                    )
                )
                    <br>

                    {{
                        data_get(
                            $checklist->metadados_seguranca,
                            'assinaturas.motorista.email'
                        )
                    }}
                @endif

                <br>

                Assinatura
                {{
                    $assinaturaMotoristaModo==='remota'
                        ?'remota'
                        :'presencial'
                }}

                @if(
                    data_get(
                        $checklist->metadados_seguranca,
                        'assinaturas.motorista.assinado_em'
                    )
                )
                    <br>

                    {{
                        \Illuminate\Support\Carbon::parse(
                            data_get(
                                $checklist->metadados_seguranca,
                                'assinaturas.motorista.assinado_em'
                            )
                        )->format(
                            'd/m/Y H:i:s'
                        )
                    }}
                @endif
            </div>
        </div>
    @endif
</div>
@endif

<div class="section">
    <div class="section-title">
        Integridade e rastreabilidade
    </div>

    <table class="grid">
        <tr>
            <th>ID do checklist</th>

            <td>
                {{ $checklist->id }}
            </td>
        </tr>

        <tr>
            <th>Código documental</th>

            <td>
                {{ $documento->codigo }}
            </td>
        </tr>


        @if($checklist->contrato_id)
            <tr>
                <th>Contrato associado</th>

                <td>
                    {{ $checklist->contrato_id }}
                </td>
            </tr>
        @endif

        @if(
            $checklist->tipo==='recolha' &&
            $entregaDocumento
        )
            <tr>
                <th>Documento da entrega</th>

                <td>
                    {{ $entregaDocumento->codigo }}
                </td>
            </tr>
        @endif

        <tr>
            <th>Finalizado em</th>

            <td>
                {{
                    optional(
                        $checklist->finalizado_em
                    )->format(
                        'd/m/Y H:i:s'
                    )
                }}
            </td>
        </tr>

        @if($checklist->realizadoPor)
            <tr>
                <th>Registado por</th>

                <td>
                    {{ $checklist->realizadoPor->name }}
                </td>
            </tr>
        @endif
    </table>

    <p class="small">
        O hash SHA-256 do próprio PDF é registado pelo sistema
        após a geração do documento e fica associado ao registo
        documental do FrotaPRO.
    </p>
</div>

<footer class="footer">
    Documento gerado pelo FrotaPRO em
    {{ $generatedAt->format('d/m/Y H:i:s') }}

    <span style="float:right">
        {{ $documento->codigo }}
    </span>
</footer>

</body>
</html>