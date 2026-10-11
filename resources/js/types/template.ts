export type ChecklistProcessItemType =
    | 'tarefa'
    | 'preenchimento'
    | 'assinatura'
    | 'upload'
    | 'aprovacao'
    | 'gerar_documento'
    | 'contrato_relacionado'
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
    tipo_contrato_codigo?: string;
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

    preset_codigo?: string | null;
    preset_versao?: number | null;

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

    modelo_documento_saas_id:
    string | null;

    modelo_documento_saas_versao_id:
    string | null;

    modelo_documento_saas_versao:
    string | null;

    modelo_documento_saas?: {
        id: string;
        nome: string;
        slug: string;
        versao_publicada: string | null;
        status: "rascunho" | "publicado" | "arquivado";
        ativo: boolean;
    } | null;

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

export interface ChecklistProcessPresetItem {
    codigo: string;
    ordem: number;
    titulo: string;
    descricao?: string | null;
    tipo: ChecklistProcessItemType;
    obrigatorio: boolean;
    configuracao?: ChecklistProcessItemConfiguration;
}

export interface ChecklistProcessPreset {
    codigo: string;
    nome: string;
    categoria: string;
    descricao: string;
    versao: number;
    destaque: boolean;
    items: ChecklistProcessPresetItem[];
    copias: number;
    ja_utilizado: boolean;
}
