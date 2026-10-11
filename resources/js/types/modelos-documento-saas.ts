export type ModeloDocumentoSaasStatus =
    | "rascunho"
    | "publicado"
    | "arquivado";

export interface ModeloDocumentoSaasCategoria {
    id: string;
    nome: string;
    slug: string;
    descricao: string | null;
    ordem: number;
    ativo: boolean;
    modelos_count?: number;
}

export interface ModeloDocumentoSaasWarning {
    code: string;
    severity: string;
    message: string;
    field?: string | null;
    context?: Record<string, unknown>;
}

export interface ModeloDocumentoSaasVersao {
    id: string;
    modelo_documento_saas_id: string;
    versao: string;
    conteudo_original: string;
    conteudo_parametrizado: string;
    campos_detectados: Array<Record<string, unknown>>;
    campos_mapeados: Record<string, unknown>;
    entidades_requeridas: string[];
    assinaturas_requeridas: string[];
    checksum: string;
    juridicamente_revisto: boolean;
    publicado_em: string;
    created_at?: string;
}

export interface ModeloDocumentoSaas {
    id: string;
    categoria_id: string;
    categoria: ModeloDocumentoSaasCategoria;
    nome: string;
    slug: string;
    resumo: string | null;
    descricao: string | null;
    tipo_documento: string | null;
    pais: string;
    idioma: string;
    conteudo: string | null;
    conteudo_parametrizado: string | null;
    campos_detectados: Array<Record<string, unknown>>;
    campos_mapeados: Record<string, unknown>;
    entidades_requeridas: string[];
    assinaturas_requeridas: string[];
    warnings: ModeloDocumentoSaasWarning[];
    status: ModeloDocumentoSaasStatus;
    versao: string;
    versao_publicada: string | null;
    tecnicamente_validado: boolean;
    juridicamente_revisto: boolean;
    destaque: boolean;
    ativo: boolean;
    ordem: number;
    publicado_em: string | null;
    versoes_count?: number;
    templates_tenant_count?: number;
    versoes?: ModeloDocumentoSaasVersao[];
    created_at?: string;
    updated_at?: string;
}

export interface ModeloDocumentoSaasListResponse {
    data: ModeloDocumentoSaas[];
    categories: ModeloDocumentoSaasCategoria[];
}

export interface ModeloDocumentoSaasPayload {
    categoria_id: string;
    nome: string;
    slug?: string | null;
    resumo?: string | null;
    descricao?: string | null;
    tipo_documento?: string | null;
    pais?: string;
    idioma?: string;
    conteudo: string;
    versao?: string;
    juridicamente_revisto?: boolean;
    destaque?: boolean;
    ativo?: boolean;
    ordem?: number;
}

export interface ModeloDocumentoSaasCategoriaPayload {
    nome: string;
    slug?: string | null;
    descricao?: string | null;
    ordem?: number;
    ativo?: boolean;
}
