export type ChecklistProcessItemType =
    | 'tarefa'
    | 'preenchimento'
    | 'assinatura'
    | 'upload'
    | 'aprovacao'
    | 'gerar_documento'
    | 'checklist_veiculo'
    | 'validacao'
    | 'acao_sistema';

export type SignaturePlaceholder =
    | 'ASSINATURA_MOTORISTA'
    | 'ASSINATURA_PROPRIETARIO'
    | 'ASSINATURA_EMPRESA'
    | 'ASSINATURA_TESTEMUNHA';

export type ChecklistSystemAction =
    | 'motorista_acesso';

export type ChecklistVehicleType =
    | 'entrega'
    | 'recolha';

export interface ChecklistProcessItemConfiguration {
    placeholder?: SignaturePlaceholder;
    action?: ChecklistSystemAction;
    checklist_tipo?: ChecklistVehicleType;
    [key: string]: unknown;
}

export interface ChecklistProcessTemplateItem {
    id: string;
    template_id: string;

    codigo: string;
    ordem: number;

    titulo: string;
    descricao: string | null;

    tipo: ChecklistProcessItemType;
    obrigatorio: boolean;

    configuracao:
        ChecklistProcessItemConfiguration;
}

export interface ChecklistProcessTemplate {
    id: string;
    tenant_id: string;

    codigo: string;
    nome: string;
    descricao: string | null;

    ativo: boolean;
    versao: number;

    items:
        ChecklistProcessTemplateItem[];

    created_at: string;
    updated_at: string;
}

export interface ChecklistProcessItemPayload {
    codigo: string;
    ordem: number;

    titulo: string;
    descricao: string | null;

    tipo: ChecklistProcessItemType;
    obrigatorio: boolean;

    configuracao:
        ChecklistProcessItemConfiguration;
}

export interface ChecklistProcessTemplatePayload {
    codigo: string;
    nome: string;
    descricao: string | null;

    ativo: boolean;

    items:
        ChecklistProcessItemPayload[];
}

export interface PerfilTemplate {
    id: string;
    tenant_id: string;

    nome: string;
    descricao: string | null;

    ordem: number;

    templates_count?: number;
}

export interface TemplateField {
    id: string;
    name: string;
    label: string;

    type: string;

    required: boolean;

    value?: string | null;

    placeholder?: string | null;

    validation?: string | null;
}

export interface TemplateContrato {
    id: string;
    tenant_id: string;

    perfil_id: string | null;

    checklist_process_template_id:
        string | null;

    nome: string;

    arquivo_url: string | null;
    tipo_arquivo: string;

    conteudo_original:
        string | null;

    campos_detectados:
        TemplateField[];

    campos_mapeados:
        Record<string, unknown>;

    ativo: boolean;
    arquivado_em: string | null;
    arquivado_por: string | null;

    perfil?:
        PerfilTemplate | null;

    checklist_process_template?:
        ChecklistProcessTemplate | null;

    created_at: string;
    updated_at: string;
}
