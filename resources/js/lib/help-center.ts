import api from "./api";
import type{
    HelpCategory,
    HelpContent,
    HelpListResponse,
    HelpMeta,
    HelpSummary,
}from "../types/help-center";

export async function fetchHelpMeta():Promise<HelpMeta>{
    const response=await api.get("/api/ajuda/meta");
    return response.data.data;
}

export async function fetchHelpContents(
    params:Record<string,unknown>
):Promise<HelpListResponse>{
    const response=await api.get("/api/ajuda",{params});
    return response.data;
}

export async function fetchHelpContent(
    slug:string
):Promise<HelpContent>{
    const response=await api.get(`/api/ajuda/conteudos/${slug}`);
    return response.data.data;
}

export async function recordHelpView(id:string){
    const response=await api.post(`/api/ajuda/conteudos/${id}/visualizacao`);
    return response.data.data;
}

export async function fetchBackofficeHelpMeta():Promise<HelpMeta>{
    const response=await api.get("/api/backoffice/ajuda/meta");
    return response.data.data;
}

export async function fetchBackofficeHelpSummary():Promise<HelpSummary>{
    const response=await api.get("/api/backoffice/ajuda/resumo");
    return response.data.data;
}

export async function fetchBackofficeHelpContents(
    params:Record<string,unknown>
):Promise<HelpListResponse>{
    const response=await api.get("/api/backoffice/ajuda/conteudos",{params});
    return response.data;
}

export async function fetchBackofficeHelpContent(id:string):Promise<HelpContent>{
    const response=await api.get(`/api/backoffice/ajuda/conteudos/${id}`);
    return response.data.data;
}

export async function saveBackofficeHelpContent(
    id:string|null,
    payload:Record<string,unknown>
):Promise<HelpContent>{
    const response=id
        ?await api.patch(`/api/backoffice/ajuda/conteudos/${id}`,payload)
        :await api.post("/api/backoffice/ajuda/conteudos",payload);

    return response.data.data;
}

export async function deleteBackofficeHelpContent(id:string){
    await api.delete(`/api/backoffice/ajuda/conteudos/${id}`);
}

export async function fetchHelpCategories():Promise<HelpCategory[]>{
    const response=await api.get("/api/backoffice/ajuda/categorias");
    return response.data.data;
}

export async function saveHelpCategory(
    id:string|null,
    payload:Record<string,unknown>
):Promise<HelpCategory>{
    const response=id
        ?await api.patch(`/api/backoffice/ajuda/categorias/${id}`,payload)
        :await api.post("/api/backoffice/ajuda/categorias",payload);

    return response.data.data;
}

export async function deleteHelpCategory(id:string){
    await api.delete(`/api/backoffice/ajuda/categorias/${id}`);
}
