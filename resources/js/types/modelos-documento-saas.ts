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

export interface ModeloDocumentoRecomendadoCategoria {
    id: string;
    nome: string;
    slug: string;
    descricao?: string | null;
}

export interface ModeloDocumentoRecomendado {
    id: string;

    categoria: ModeloDocumentoRecomendadoCategoria;

    nome: string;
    slug: string;

    resumo: string | null;
    descricao?: string | null;

    tipo_documento: string | null;

    pais: string;
    idioma: string;

    versao: string;

    tecnicamente_validado: boolean;
    juridicamente_revisto: boolean;

    destaque: boolean;

    entidades_requeridas: string[];
    assinaturas_requeridas: string[];

    publicado_em: string;

    conteudo_parametrizado?: string;

    campos_detectados?: Array<Record<string, unknown>>;
    campos_mapeados?: Record<string, unknown>;

    checksum?: string;
}

export interface ModelosDocumentoRecomendadosResponse {
    data: ModeloDocumentoRecomendado[];

    categories: ModeloDocumentoRecomendadoCategoria[];
}

export interface UsarModeloDocumentoRecomendadoPayload {
    nome?: string;
    perfil_id?: string | null;
}


export interface ModeloDocumentoSaasMetricasResumo {
    modelos_publicados: number;
    organizacoes_aderentes: number;
    copias_totais: number;
    templates_ativos_frotapro: number;
    templates_ativos_proprios: number;
    templates_ativos_total: number;
    taxa_padronizacao: number;
}

export interface ModeloDocumentoSaasMetricasVersao {
    versao: string;
    copias: number;
    organizacoes: number;
}

export interface ModeloDocumentoSaasMetricasModelo {
    id: string;
    nome: string;
    slug: string;

    categoria: {
        id: string;
        nome: string;
        slug: string;
    } | null;

    status: ModeloDocumentoSaasStatus;
    ativo: boolean;

    versao_publicada: string | null;

    copias_totais: number;
    copias_ativas: number;
    organizacoes_aderentes: number;

    versao_mais_usada: string | null;
    versao_mais_usada_copias: number;

    organizacoes_desatualizadas: number;

    versoes_em_uso: ModeloDocumentoSaasMetricasVersao[];
}

export interface ModeloDocumentoSaasMetricas {
    resumo: ModeloDocumentoSaasMetricasResumo;
    modelos: ModeloDocumentoSaasMetricasModelo[];
}

export interface ModeloDocumentoRecomendadoComparacao {
    template: {
        id: string;
        nome: string;
        ativo: boolean;
        versao_origem: string | null;
        personalizado: boolean | null;
    };

    modelo: {
        id: string;
        nome: string;
        versao_publicada: string;
    };

    versao_atual: {
        id: string | null;
        versao: string | null;
        conteudo: string;
    };

    nova_versao: {
        id: string;
        versao: string;
        conteudo: string;
        checksum: string;
        publicado_em: string;
    };

    update_disponivel: boolean;

    tipos_contrato_afetados: Array<{
        id: string;
        nome: string;
        codigo: string;
    }>;
}

export interface ModeloDocumentoRecomendadoAtualizacao {
    template: {
        id: string;
        tenant_id: string;
        nome: string;
        modelo_documento_saas_id: string;
        modelo_documento_saas_versao_id: string;
        modelo_documento_saas_versao: string;
        ativo: boolean;
    };

    template_anterior_id: string;
    versao_anterior: string | null;
    versao_nova: string;
    tipos_contrato_atualizados: number;
}
