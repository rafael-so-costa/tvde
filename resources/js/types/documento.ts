export type DocumentoOrigem =
    | "gerado"
    | "anexado";

export interface DocumentoEntidadeResumo {
    id: string;
}

export interface DocumentoEmpresa extends DocumentoEntidadeResumo {
    nome_empresa: string;
}

export interface DocumentoPessoa extends DocumentoEntidadeResumo {
    nome_completo?: string | null;
    nome_empresa?: string | null;
}

export interface DocumentoVeiculo extends DocumentoEntidadeResumo {
    matricula: string;
    marca?: string | null;
    modelo?: string | null;
}

export interface DocumentoCriador extends DocumentoEntidadeResumo {
    name: string;
}

export interface Documento {
    id: string;
    numero_global: number;
    codigo: string;
    origem: DocumentoOrigem;

    tenant_id: string;

    empresa_id: string | null;
    motorista_id: string | null;
    proprietario_id: string | null;
    veiculo_id: string | null;

    categoria: string;
    tipo: string;
    titulo: string;

    entidade_tipo: string;
    entidade_id: string;

    arquivo_nome: string | null;
    arquivo_path: string | null;
    arquivo_mime: string | null;
    arquivo_tamanho: number | null;
    hash_arquivo: string | null;

    status: string;

    metadados:
        Record<string, unknown> |
        null;

    created_by: string | null;

    finalizado_em: string | null;
    created_at: string;
    updated_at: string;

    empresa?: DocumentoEmpresa | null;
    motorista?: DocumentoPessoa | null;
    proprietario?: DocumentoPessoa | null;
    veiculo?: DocumentoVeiculo | null;
    criador?: DocumentoCriador | null;
}

export interface DocumentoPagination {
    current_page: number;
    data: Documento[];
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export interface DocumentoSummary {
    total: number;
    gerados: number;
    anexados: number;
    com_arquivo: number;
    finalizados: number;
    ultimos_30_dias: number;
}

export interface DocumentoMetaOption {
    value: string;
    label: string;
    total: number;
}

export interface DocumentoMeta {
    origens: DocumentoMetaOption[];
    categorias: DocumentoMetaOption[];
    tipos: DocumentoMetaOption[];
    status: DocumentoMetaOption[];
}