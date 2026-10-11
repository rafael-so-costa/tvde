import api from "./api";

import type {
    ModeloDocumentoSaas,
    ModeloDocumentoSaasCategoria,
    ModeloDocumentoSaasCategoriaPayload,
    ModeloDocumentoSaasListResponse,
    ModeloDocumentoSaasPayload,
    ModeloDocumentoSaasVersao,
    ModeloDocumentoRecomendado,
    ModeloDocumentoRecomendadoAtualizacao,
    ModeloDocumentoRecomendadoComparacao,
    ModelosDocumentoRecomendadosResponse,
    UsarModeloDocumentoRecomendadoPayload,
    ModeloDocumentoSaasMetricas,

} from "../types/modelos-documento-saas";



export async function fetchBackofficeModelosDocumento(
    params: Record<string, unknown>,
): Promise<ModeloDocumentoSaasListResponse> {
    const response = await api.get("/api/backoffice/modelos-documento", {
        params,
    });

    return response.data;
}

export async function fetchBackofficeModeloDocumento(
    id: string,
): Promise<ModeloDocumentoSaas> {
    const response = await api.get(
        `/api/backoffice/modelos-documento/${id}`,
    );

    return response.data.data;
}

export async function saveBackofficeModeloDocumento(
    id: string | null,
    payload: ModeloDocumentoSaasPayload,
): Promise<ModeloDocumentoSaas> {
    const response = id
        ? await api.patch(
            `/api/backoffice/modelos-documento/${id}`,
            payload,
        )
        : await api.post("/api/backoffice/modelos-documento", payload);

    return response.data.data;
}

export async function publishBackofficeModeloDocumento(
    id: string,
): Promise<ModeloDocumentoSaasVersao> {
    const response = await api.post(
        `/api/backoffice/modelos-documento/${id}/publicar`,
    );

    return response.data.data;
}

export async function archiveBackofficeModeloDocumento(
    id: string,
): Promise<ModeloDocumentoSaas> {
    const response = await api.post(
        `/api/backoffice/modelos-documento/${id}/arquivar`,
    );

    return response.data.data;
}

export async function fetchBackofficeModeloDocumentoCategorias(): Promise<
    ModeloDocumentoSaasCategoria[]
> {
    const response = await api.get(
        "/api/backoffice/modelos-documento/categorias",
    );

    return response.data.data;
}

export async function saveBackofficeModeloDocumentoCategoria(
    id: string | null,
    payload: ModeloDocumentoSaasCategoriaPayload,
): Promise<ModeloDocumentoSaasCategoria> {
    const response = id
        ? await api.patch(
            `/api/backoffice/modelos-documento/categorias/${id}`,
            payload,
        )
        : await api.post(
            "/api/backoffice/modelos-documento/categorias",
            payload,
        );

    return response.data.data;
}

export async function deleteBackofficeModeloDocumentoCategoria(
    id: string,
): Promise<void> {
    await api.delete(`/api/backoffice/modelos-documento/categorias/${id}`);
}


export async function fetchModelosDocumentoRecomendados(
    params: Record<string, unknown> = {},
): Promise<ModelosDocumentoRecomendadosResponse> {
    const response = await api.get(
        "/api/modelos-recomendados",
        {
            params,
        },
    );

    return response.data;
}

export async function fetchModeloDocumentoRecomendado(
    id: string,
): Promise<ModeloDocumentoRecomendado> {
    const response = await api.get(
        `/api/modelos-recomendados/${id}`,
    );

    return response.data.data;
}

export async function usarModeloDocumentoRecomendado(
    id: string,
    payload: UsarModeloDocumentoRecomendadoPayload,
) {
    const response = await api.post(
        `/api/modelos-recomendados/${id}/usar`,
        payload,
    );

    return response.data.data;
}


export async function fetchBackofficeModeloDocumentoMetricas(): Promise<
    ModeloDocumentoSaasMetricas
> {
    const response = await api.get(
        "/api/backoffice/modelos-documento/metricas",
    );

    return response.data.data;
}

export async function compararModeloDocumentoRecomendado(
    templateId: string,
): Promise<ModeloDocumentoRecomendadoComparacao> {
    const response = await api.get(
        `/api/modelos-recomendados/templates/${templateId}/comparar`,
    );

    return response.data.data;
}

export async function atualizarModeloDocumentoRecomendado(
    templateId: string,
): Promise<ModeloDocumentoRecomendadoAtualizacao> {
    const response = await api.post(
        `/api/modelos-recomendados/templates/${templateId}/atualizar`,
    );

    return response.data.data;
}
