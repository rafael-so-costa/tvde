import type {
    ChecklistRecord,
} from './checklist';
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

export type AluguerStatus =
    | 'rascunho'
    | 'ativo'
    | 'finalizado'
    | 'cancelado';

export type ContratoStatus =
    | 'rascunho'
    | 'enviado'
    | 'assinado'
    | 'cancelado'
    | 'renovado'
    | 'expirado'
    | 'encerrado';

export type ProcessRunStatus =
    | 'pendente'
    | 'em_andamento'
    | 'concluido'
    | 'cancelado';

export type ProcessItemStatus =
    | 'pendente'
    | 'em_andamento'
    | 'concluido'
    | 'dispensado';

export interface ChecklistProcessRunItem {
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
    status: ProcessItemStatus;
    resultado: Record<
        string,
        unknown
    > | null;
    concluido_por: string | null;
    concluido_em: string | null;
}

export interface ChecklistProcessRun {
    id: string;
    tenant_id: string;
    template_id: string | null;
    template_codigo_snapshot: string;
    template_nome_snapshot: string;
    template_versao_snapshot: number;
    entidade_tipo: string;
    entidade_id: string;
    status: ProcessRunStatus;
    contexto: Record<
        string,
        unknown
    >;
    iniciado_em: string | null;
    concluido_em: string | null;
    items: ChecklistProcessRunItem[];
}

export interface Contrato {
    id: string;
    tenant_id: string;
    template_id: string | null;
    tipo:
        | 'aluguer'
        | 'prestacao_servico'
        | 'checklist_entrega'
        | 'checklist_devolucao';
    motorista_id: string | null;
    veiculo_id: string | null;
    proprietario_id: string | null;
    data_inicio: string | null;
    data_fim: string | null;
    status: ContratoStatus;
    valor_diaria: string | number | null;
    valor_semanal: string | number | null;
    valor_caucao: string | number | null;
    valor_total: string | number | null;
    versao_atual: number;
    bloqueado: boolean;
    template?: TemplateContrato | null;
    motorista?: Motorista | null;
    proprietario?: Proprietario | null;
    veiculo?: Veiculo | null;
    checklist_process_run?: ChecklistProcessRun | null;
}

export interface Aluguer {
    id: string;
    tenant_id: string;
    status: AluguerStatus;
    created_by: string;

    motorista_id: string | null;
    veiculo_id: string | null;
    proprietario_id: string | null;

    contrato_aluguer_id: string | null;
    contrato_prestacao_id: string | null;

    checklist_entrega_id: string | null;
    checklist_devolucao_id: string | null;

    data_inicio: string | null;
    data_fim: string | null;
    data_finalizacao: string | null;

    rascunho_passo: number;
    rascunho_dados: Record<
        string,
        unknown
    >;

    observacoes: string | null;

    motorista?: Pick<
        Motorista,
        'id' | 'nome_completo'
    > | null;

    veiculo?: Pick<
        Veiculo,
        | 'id'
        | 'matricula'
        | 'marca'
        | 'modelo'
    > | null;

    proprietario?: Pick<
        Proprietario,
        | 'id'
        | 'tipo'
        | 'nome_completo'
        | 'nome_empresa'
    > | null;

    contrato_aluguer?: Contrato | null;
    contrato_prestacao?: Contrato | null;

    checklist_entrega?: ChecklistRecord | null;
    checklist_devolucao?: ChecklistRecord | null;

    created_at: string;
    updated_at: string;
}
