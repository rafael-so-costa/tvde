export type ManutencaoOrigem=
    |'preventiva'
    |'avaria'
    |'checklist'
    |'sinistro'
    |'diagnostico'
    |'manual';

export type ManutencaoPrioridade=
    |'baixa'
    |'normal'
    |'alta'
    |'critica';

export type ManutencaoStatus=
    |'rascunho'
    |'aguardando_aprovacao'
    |'aprovada'
    |'agendada'
    |'em_andamento'
    |'aguardando_pecas'
    |'concluida'
    |'cancelada';

export type ManutencaoItemTipo=
    |'peca'
    |'mao_obra'
    |'outro';

export type ManutencaoDocumentoTipo=
    |'orcamento'
    |'fatura'
    |'ordem_servico'
    |'relatorio_diagnostico'
    |'fotografia'
    |'garantia'
    |'outro';

export type ManutencaoAprovacaoStatus=
    |'pendente'
    |'aprovada'
    |'rejeitada'
    |'expirada';

export interface ManutencaoVeiculo {
    id:string;
    matricula:string;
    marca:string|null;
    modelo:string|null;
    km_atual?:number|null;
    disponibilidade?:string|null;
}

export interface ManutencaoMotorista {
    id:string;
    nome_completo:string;
    nif?:string|null;
}

export type FornecedorTipo=
    |'oficina'
    |'pecas'
    |'geral';

export interface ManutencaoFornecedor {
    id:string;
    tenant_id?:string;
    tipo:FornecedorTipo;
    nome:string;
    nif:string|null;
    email:string|null;
    telemovel:string|null;
    morada:string|null;
    contacto_responsavel:string|null;
    observacoes:string|null;
    ativo:boolean;
    created_at?:string;
    updated_at?:string;
    pecas_preferenciais_count?:number;
    compras_count?:number;
    manutencoes_count?:number;
    garantias_count?:number;
}

export interface FornecedorPayload {
    tipo:FornecedorTipo;
    nome:string;
    nif:string|null;
    email:string|null;
    telemovel:string|null;
    morada:string|null;
    contacto_responsavel:string|null;
    observacoes:string|null;
    ativo:boolean;
}

export interface ManutencaoPeca {
    id:string;
    codigo:string;
    nome:string;
    fabricante:string|null;
    unidade:string;
    fornecedor_preferencial_id:string|null;
    estoque_atual:number|string;
    estoque_minimo:number|string;
    custo_medio:number|string;
    ativo:boolean;
    fornecedor_preferencial?:ManutencaoFornecedor|null;
}

export type EstoqueMovimentoTipo=
    |'entrada'
    |'saida'
    |'ajuste_entrada'
    |'ajuste_saida';

export type EstoqueMovimentoOrigem=
    |'compra'
    |'manutencao'
    |'ajuste'
    |'devolucao';

export interface EstoqueMovimento {
    id:string;
    tenant_id:string;
    peca_id:string;
    tipo:EstoqueMovimentoTipo;
    origem:EstoqueMovimentoOrigem;
    quantidade:number|string;
    valor_unitario:number|string;
    saldo_anterior:number|string;
    saldo_posterior:number|string;
    compra_id:string|null;
    manutencao_id:string|null;
    manutencao_item_id:string|null;
    observacoes:string|null;
    created_at:string;
    updated_at:string;
    peca?:{
        id:string;
        codigo:string;
        nome:string;
        unidade:string;
    }|null;
    compra?:{
        id:string;
        numero_documento:string;
    }|null;
    manutencao?:{
        id:string;
        numero_ordem:string;
    }|null;
}

export interface PecaPayload {
    fornecedor_preferencial_id:string|null;
    codigo:string;
    nome:string;
    fabricante:string|null;
    unidade:string;
    estoque_minimo:number;
    ativo:boolean;
}

export interface ManutencaoItem {
    id:string;
    tenant_id:string;
    manutencao_id:string;
    peca_id:string|null;
    tipo:ManutencaoItemTipo;
    descricao:string;
    quantidade:number|string;
    unidade:string;
    valor_unitario:number|string;
    valor_total:number|string;
    consome_estoque:boolean;
    garantia_meses:number|null;
    garantia_km:number|null;
    estoque_consumido_em:string|null;
    created_at:string;
    updated_at:string;
    peca?:ManutencaoPeca|null;
}

export interface ManutencaoItemPayload {
    peca_id:string|null;
    tipo:ManutencaoItemTipo;
    descricao:string|null;
    quantidade:number;
    unidade:string|null;
    valor_unitario:number|null;
    consome_estoque:boolean;
    garantia_meses:number|null;
    garantia_km:number|null;
}

export interface ManutencaoDocumento {
    id:string;
    tenant_id:string;
    manutencao_id:string;
    tipo:ManutencaoDocumentoTipo;
    arquivo_nome:string;
    arquivo_mime:string;
    arquivo_tamanho:number;
    created_at:string;
    updated_at:string;
}

export interface ManutencaoAprovacao {
    id:string;
    manutencao_id:string;
    status:ManutencaoAprovacaoStatus;
    valor_orcamento:number|string|null;
    aprovador_nome:string|null;
    aprovador_email:string|null;
    expires_at:string|null;
    respondido_em:string|null;
    observacoes:string|null;
    created_at:string;
    updated_at:string;
    solicitado_por?:string|null;
    aprovado_por?:string|null;
}

export interface ManutencaoGarantia {
    id:string;
    manutencao_id:string;
    manutencao_item_id:string;
    peca_id:string|null;
    fornecedor_id:string|null;
    descricao:string;
    data_inicio:string;
    data_fim:string|null;
    km_limite:number|null;
    status:'ativa'|'expirada'|'utilizada'|'cancelada';
    created_at:string;
    updated_at:string;
}

export interface Manutencao {
    id:string;
    tenant_id:string;
    numero_ordem:string;

    veiculo_id:string;
    motorista_id:string|null;
    fornecedor_id:string|null;
    plano_id:string|null;
    checklist_record_id:string|null;
    sinistro_id:string|null;
    diagnostico_id:string|null;

    origem:ManutencaoOrigem;
    prioridade:ManutencaoPrioridade;
    status:ManutencaoStatus;

    tipo_servico:string;
    problema_reportado:string|null;
    observacoes:string|null;

    km:number|null;

    data_solicitacao:string|null;
    data_agendada:string|null;
    data_entrada:string|null;
    data_conclusao:string|null;

    aprovacao_obrigatoria:boolean;
    indisponibiliza_veiculo:boolean;

    valor_orcamento:number|string|null;

    custo_pecas:number|string;
    custo_mao_obra:number|string;
    custo_outros:number|string;
    custo_total:number|string;

    proxima_revisao_km:number|null;
    proxima_revisao_data:string|null;

    created_by:string|null;
    updated_by:string|null;
    created_at:string;
    updated_at:string;

    veiculo?:ManutencaoVeiculo|null;
    motorista?:ManutencaoMotorista|null;
    fornecedor?:ManutencaoFornecedor|null;

    itens?:ManutencaoItem[];
    documentos?:ManutencaoDocumento[];
    aprovacoes?:ManutencaoAprovacao[];
    garantias?:ManutencaoGarantia[];
}

export interface ManutencaoPayload {
    veiculo_id:string;
    motorista_id:string|null;
    fornecedor_id:string|null;
    origem:ManutencaoOrigem;
    tipo_servico:string;
    prioridade:ManutencaoPrioridade;
    problema_reportado:string|null;
    km:number|null;
    data_solicitacao:string|null;
    data_agendada:string|null;
    aprovacao_obrigatoria:boolean;
    indisponibiliza_veiculo:boolean;
    valor_orcamento:number|null;
    proxima_revisao_km:number|null;
    proxima_revisao_data:string|null;
    observacoes:string|null;
}

export type ManutencaoUpdatePayload=
    Omit<ManutencaoPayload,'origem'>;

export interface ManutencaoListResponse {
    data:Manutencao[];
}

export interface ManutencaoDetailResponse {
    data:Manutencao;
}

export type CompraStatus=
    |'rascunho'
    |'encomendada'
    |'parcialmente_recebida'
    |'recebida'
    |'cancelada';

export interface CompraItem {
    id:string;
    compra_id?:string;
    peca_id:string|null;
    descricao:string;
    quantidade:number|string;
    quantidade_recebida:number|string;
    valor_unitario:number|string;
    valor_total:number|string;
    peca?:ManutencaoPeca|null;
}

export interface Compra {
    id:string;
    fornecedor_id:string|null;
    numero_documento:string|null;
    status:CompraStatus;
    data_encomenda:string|null;
    data_prevista:string|null;
    data_recebimento:string|null;
    subtotal:number|string;
    impostos:number|string;
    total:number|string;
    observacoes:string|null;
    itens_count?:number;
    fornecedor?:ManutencaoFornecedor|null;
    itens?:CompraItem[];
    created_at?:string;
    updated_at?:string;
}

export interface CompraItemPayload {
    peca_id:string|null;
    descricao:string|null;
    quantidade:number;
    valor_unitario:number;
}

export interface CompraPayload {
    fornecedor_id:string|null;
    numero_documento:string|null;
    status:'rascunho'|'encomendada';
    data_encomenda:string|null;
    data_prevista:string|null;
    impostos:number;
    observacoes:string|null;
    itens:CompraItemPayload[];
}

export type CompraUpdatePayload=
    Omit<CompraPayload,'status'>;

export interface CompraRecebimentoPayload {
    itens:{
        item_id:string;
        quantidade:number;
    }[];
}

export type ManutencaoPlanoSituacao=
    |'vencida'
    |'proxima'
    |'ok';

export interface ManutencaoPlanoVeiculo {
    id:string;
    plano_id:string;
    veiculo_id:string;
    ultimo_km:number|null;
    ultima_data:string|null;
    proximo_km:number|null;
    proxima_data:string|null;
    ativo:boolean;
    situacao:ManutencaoPlanoSituacao;
    veiculo?:{
        id:string;
        matricula:string;
        marca:string|null;
        modelo:string|null;
        km_atual:number|null;
        disponibilidade:string|null;
    }|null;
}

export interface ManutencaoPlano {
    id:string;
    nome:string;
    tipo_servico:string;
    descricao:string|null;
    intervalo_km:number|null;
    intervalo_meses:number|null;
    alerta_antecedencia_km:number;
    alerta_antecedencia_dias:number;
    ativo:boolean;
    veiculos?:ManutencaoPlanoVeiculo[];
    manutencoes?:{
        id:string;
        plano_id:string;
        veiculo_id:string;
        numero_ordem:string;
        status:ManutencaoStatus;
        data_conclusao:string|null;
    }[];
}

export interface ManutencaoPlanoPayload {
    nome:string;
    tipo_servico:string;
    descricao:string|null;
    intervalo_km:number|null;
    intervalo_meses:number|null;
    alerta_antecedencia_km:number;
    alerta_antecedencia_dias:number;
    ativo:boolean;
}

export interface ManutencaoPlanoVeiculoPayload {
    veiculo_id:string;
    ultimo_km:number|null;
    ultima_data:string|null;
    ativo:boolean;
}

export type DiagnosticoFonte=
    |'manual'
    |'obd'
    |'tesla'
    |'geotab'
    |'outro';

export type DiagnosticoSeveridade=
    |'info'
    |'baixa'
    |'media'
    |'alta'
    |'critica';

export type DiagnosticoStatus=
    |'aberto'
    |'resolvido'
    |'ignorado';

export interface VeiculoDiagnostico {
    id:string;
    tenant_id?:string;
    veiculo_id:string;
    manutencao_id:string|null;
    fonte:DiagnosticoFonte;
    external_id:string|null;
    codigo_dtc:string|null;
    severidade:DiagnosticoSeveridade;
    status:DiagnosticoStatus;
    titulo:string;
    descricao:string|null;
    dados_brutos:Record<string,unknown>|null;
    detectado_em:string;
    gerou_manutencao_em:string|null;
    resolvido_em:string|null;
    created_at?:string;
    updated_at?:string;
    veiculo?:{
        id:string;
        matricula:string;
        marca:string|null;
        modelo:string|null;
        km_atual:number|null;
        disponibilidade:string|null;
    }|null;
    manutencao?:{
        id:string;
        numero_ordem:string;
        status:ManutencaoStatus;
        tipo_servico?:string|null;
    }|null;
    created_by?:{
        id:string;
        name:string;
    }|null;
}

export interface VeiculoDiagnosticoPayload {
    veiculo_id:string;
    fonte:DiagnosticoFonte;
    codigo_dtc:string|null;
    severidade:DiagnosticoSeveridade;
    titulo:string;
    descricao:string|null;
    detectado_em:string;
}

export interface ManutencaoAprovacaoPayload {
    valor_orcamento:number|null;
    aprovador_nome:string|null;
    aprovador_email:string|null;
    validade_dias:number|null;
    observacoes:string|null;
}

export interface ManutencaoAprovacaoRespostaPayload {
    decisao:'aprovar'|'rejeitar';
    observacoes:string|null;
}

export interface ManutencaoAprovacaoPublica {
    status:ManutencaoAprovacaoStatus;
    valor_orcamento:number|string|null;
    aprovador_nome:string|null;
    expires_at:string|null;
    respondido_em:string|null;
    manutencao:{
        numero_ordem:string;
        tipo_servico:string;
        problema_reportado:string|null;
    };
}
