import type {
    Motorista,
} from './motorista';
import type {
    Proprietario,
} from './proprietario';
import type {
    ChecklistProcessItemType,
    TemplateContrato,
} from './template';
import type {
    Veiculo,
} from './veiculo';

export type ContratoTipo =
    | 'prestacao_servico'
    | 'aluguer'
    | 'checklist_entrega'
    | 'checklist_devolucao';

export type ContratoStatus =
    | 'rascunho'
    | 'enviado'
    | 'assinado'
    | 'cancelado'
    | 'renovado'
    | 'expirado'
    | 'encerrado';

export type ChecklistProcessRunStatus =
    | 'pendente'
    | 'em_andamento'
    | 'concluido'
    | 'cancelado';

export type ChecklistProcessItemStatus =
    | 'pendente'
    | 'em_andamento'
    | 'concluido'
    | 'dispensado';

export interface ContratoProcessItem {
    id: string;
    run_id: string;
    template_item_id: string | null;
    codigo: string;
    ordem: number;
    titulo_snapshot: string;
    descricao_snapshot: string | null;
    tipo: ChecklistProcessItemType;
    obrigatorio: boolean;
    configuracao_snapshot: Record<
        string,
        unknown
    >;
    status: ChecklistProcessItemStatus;
    resultado: Record<
        string,
        unknown
    > | null;
    concluido_por: string | null;
    concluido_em: string | null;
}

export interface ContratoProcessRun {
    id: string;
    tenant_id: string;
    template_id: string | null;
    template_codigo_snapshot: string;
    template_nome_snapshot: string;
    template_versao_snapshot: number;
    entidade_tipo: string;
    entidade_id: string;
    status: ChecklistProcessRunStatus;
    contexto: Record<
        string,
        unknown
    >;
    iniciado_em: string | null;
    concluido_em: string | null;
    items: ContratoProcessItem[];
}

export interface ContratoVersao {
    id: string;
    contrato_id: string;
    tenant_id: string;
    versao_numero: number;
    dados_campos: Record<
        string,
        unknown
    >;
    criado_por: string | null;
    observacoes: string | null;
    created_at: string | null;
}

export interface ContratoAssinatura {
    id: string;
    contrato_id: string;
    tenant_id: string;
    signatario_tipo: string;
    signatario_id: string | null;
    signatario_user_id: string | null;
    signatario_nome: string | null;
    signatario_email: string | null;
    assinatura_url: string | null;
    ip_address: string | null;
    user_agent: string | null;
    hash_documento: string | null;
    status: string;
    verificado: boolean;
    solicitado_por: string | null;
    solicitado_em: string | null;
    assinado_em: string | null;
    otp_expira_em: string | null;
    placeholder: string;
}

export interface ContratoAuditLog {
    id: string;
    contrato_id: string;
    tenant_id: string;
    user_id: string | null;
    acao: string;
    detalhes: Record<
        string,
        unknown
    >;
    ip_address: string | null;
    created_at: string | null;
}

export interface Contrato {
    id: string;
    tenant_id: string;
    template_id: string | null;

    tipo: ContratoTipo;
    status: ContratoStatus;

    proprietario_id: string | null;
    motorista_id: string | null;
    veiculo_id: string | null;

    data_inicio: string | null;
    data_fim: string | null;
    data_assinatura: string | null;

    valor_diaria: string | number | null;
    valor_semanal: string | number | null;
    valor_caucao: string | number | null;
    valor_total: string | number | null;

    campos_preenchidos: Record<
        string,
        unknown
    >;

    versao_atual: number;

    pdf_gerado_url?: string | null;

    assinatura_proprietario_url?: string | null;
    assinatura_motorista_url?: string | null;

    renovacao_count?: number;

    hash_documento?: string | null;

    bloqueado: boolean;

    created_at: string;
    updated_at: string;

    template?: TemplateContrato | null;
    motorista?: Motorista | null;
    proprietario?: Proprietario | null;
    veiculo?: Veiculo | null;

    checklist_process_run?: ContratoProcessRun | null;

    versoes?: ContratoVersao[];
    assinaturas?: ContratoAssinatura[];
    logs_auditoria?: ContratoAuditLog[];
}
