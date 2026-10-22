import type {
    ChecklistProcessTemplate,
    SignaturePlaceholder,
    TemplateContrato,
} from "./template";

export type TipoContratoEntidade =
    | "empresa"
    | "proprietario"
    | "motorista"
    | "veiculo";

export type TipoContratoCampoOrigem =
    | "automatico"
    | "manual";

export type TipoContratoSignatureMode =
    | "presencial"
    | "remota";

export interface TipoContratoEntidades {
    empresa?: boolean;
    proprietario?: boolean;
    motorista?: boolean;
    veiculo?: boolean;
}

export interface TipoContratoCampoConfiguracao {
    campo: string;
    origem: TipoContratoCampoOrigem;
    fonte?: string | null;
    tipo?: string | null;
    obrigatorio?: boolean;
    opcoes?: unknown[] | null;
}

export interface TipoContratoAssinaturaConfiguracao {
    placeholder: SignaturePlaceholder;
    obrigatoria: boolean;
    modos: TipoContratoSignatureMode[];
}

export interface TipoContratoTemplateSummary {
    id: string;
    nome: string;
    tipo_arquivo: string;
    ativo: boolean;
}

export interface TipoContratoWorkflowSummary {
    id: string;
    codigo: string;
    nome: string;
    ativo: boolean;
    versao: number;
}

export interface TipoContrato {
    id: string;
    tenant_id: string;

    nome: string;
    slug: string;
    codigo: string;
    descricao: string | null;

    template_id: string | null;
    checklist_process_template_id: string | null;

    entidades: TipoContratoEntidades;
    campos_configuracao: TipoContratoCampoConfiguracao[];
    assinaturas_configuracao: TipoContratoAssinaturaConfiguracao[];
    configuracao: Record<string, unknown>;
    cobranca_habilitada?: boolean;

    ativo: boolean;
    mostrar_menu: boolean;
    ordem: number;

    created_by?: string | null;
    updated_by?: string | null;

    contratos_count?: number;

    template?: TipoContratoTemplateSummary | TemplateContrato | null;

    checklist_process_template?:
        | TipoContratoWorkflowSummary
        | ChecklistProcessTemplate
        | null;

    created_at?: string;
    updated_at?: string;
}

export interface ContractWizardForm {
    tipo_contrato_id: string;

    empresa_id: string;
    proprietario_id: string;
    motorista_id: string;
    veiculo_id: string;

    data_inicio: string;
    data_fim: string;

    valor_diaria: string;
    valor_caucao: string;
    valor_total: string;

    campos_preenchidos: Record<
        string,
        string | number | boolean | null
    >;
}

export interface ContractWizardSignatureState {
    enabled: boolean;
    modo: TipoContratoSignatureMode;
    assinatura_url: string;
    signatario_nome: string;
    signatario_email: string;
}

export type ContractWizardSignatures = Partial<
    Record<
        SignaturePlaceholder,
        ContractWizardSignatureState
    >
>;
