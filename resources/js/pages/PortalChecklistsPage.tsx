import axios from "axios";

import {
    AlertTriangle,
    Camera,
    Car,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Eye,
    LoaderCircle,
    Search,
    ShieldCheck,
    UserRound,
    X,
} from "lucide-react";

import {
    FormEvent,
    useState,
} from "react";

import {
    useQuery,
} from "@tanstack/react-query";

import api from "../lib/api";

import {
    useTenant,
} from "../contexts/TenantContext";

import {
    CHECKLIST_ITEMS,
} from "../types/checklist";

import type {
    ChecklistRecord,
    DamageRecord,
} from "../types/checklist";

type PortalMode =
    | "motorista"
    | "proprietario";

interface PortalMedia {
    id:string;
    tipo:string;
    contexto:string;
    titulo:string|null;
    arquivo_nome:string;
    arquivo_mime:string;
    arquivo_tamanho:number;
    capturado_em:string|null;
}

interface PortalChecklist
    extends Omit<
        ChecklistRecord,
        "entrega_vinculada" |
        "recolha"
    > {
    origem?:string;

    contrato_id?:
        string |
        null;

    assinaturas:{
        empresa:boolean;
        motorista:boolean;
    };

    entrega_vinculada?:
        Partial<ChecklistRecord> |
        null;

    recolha?:
        Partial<ChecklistRecord> |
        null;

    media_files?:
        PortalMedia[];
}

interface PortalSummary {
    total:number;
    entregas:number;
    recolhas:number;
    com_penalizacao:number;
}

interface PortalPaginator {
    current_page:number;
    data:PortalChecklist[];
    last_page:number;
    per_page:number;
    total:number;
    from:number|null;
    to:number|null;
}

interface PortalResponse {
    data:PortalPaginator;
    summary:PortalSummary;
}

function apiError(
    error:unknown
):string {
    if(
        axios.isAxiosError(
            error
        )
    ){
        return (
            error.response
                ?.data
                ?.message ??
            "Não foi possível concluir a operação."
        );
    }

    return "Não foi possível concluir a operação.";
}

function dateLabel(
    value:
        string |
        null |
        undefined
):string {
    if(!value){
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-PT"
    ).format(
        new Date(
            `${value.slice(
                0,
                10
            )}T12:00:00`
        )
    );
}

function currency(
    value:
        string |
        number |
        null |
        undefined
):string {
    return Number(
        value ||
        0
    ).toLocaleString(
        "pt-PT",
        {
            style:"currency",
            currency:"EUR",
        }
    );
}

function itemName(
    id:string
):string {
    return (
        CHECKLIST_ITEMS.find(
            item=>
                item.id ===
                id
        )?.name ??
        id
    );
}

function damageLabel(
    damage:DamageRecord
):string {
    const types=
        damage.types
            ?.join(
                ", "
            ) ||
        damage.status ||
        "dano";

    return `${damage.part} · ${types}`;
}

export default function PortalChecklistsPage({
    mode,
}:{
    mode:PortalMode;
}){
    const {
        tenant,
    }=useTenant();

    const [
        search,
        setSearch,
    ]=useState("");

    const [
        appliedSearch,
        setAppliedSearch,
    ]=useState("");

    const [
        tipo,
        setTipo,
    ]=useState("");

    const [
        page,
        setPage,
    ]=useState(1);

    const [
        selectedId,
        setSelectedId,
    ]=
        useState<
            string |
            null
        >(null);

    const [
        mediaLoading,
        setMediaLoading,
    ]=
        useState<
            string |
            null
        >(null);

    const listQuery=
        useQuery({
            queryKey:[
                "portal-checklists",
                mode,
                tenant?.id,
                appliedSearch,
                tipo,
                page,
            ],

            enabled:
                Boolean(
                    tenant?.id
                ),

            queryFn:
                async()=>{
                    const response=
                        await api.get(
                            `/api/portal/${mode}/checklists`,
                            {
                                params:{
                                    q:
                                        appliedSearch ||
                                        undefined,

                                    tipo:
                                        tipo ||
                                        undefined,

                                    page,

                                    per_page:20,
                                },
                            }
                        );

                    return response
                        .data as PortalResponse;
                },
        });

    const detailQuery=
        useQuery({
            queryKey:[
                "portal-checklist-detail",
                mode,
                tenant?.id,
                selectedId,
            ],

            enabled:
                Boolean(
                    tenant?.id &&
                    selectedId
                ),

            queryFn:
                async()=>{
                    const response=
                        await api.get(
                            `/api/portal/${mode}/checklists/${selectedId}`
                        );

                    return response
                        .data
                        .data as PortalChecklist;
                },
        });

    function submitSearch(
        event:FormEvent
    ){
        event.preventDefault();

        setPage(
            1
        );

        setAppliedSearch(
            search.trim()
        );
    }

    async function openMedia(
        checklistId:string,
        media:PortalMedia
    ){
        const popup=
            window.open(
                "about:blank",
                "_blank"
            );

        if(!popup){
            window.alert(
                "O navegador bloqueou a abertura da evidência."
            );

            return;
        }

        popup.opener=null;

        setMediaLoading(
            media.id
        );

        try{
            const response=
                await api.get(
                    `/api/portal/${mode}/checklists/${checklistId}/media/${media.id}`,
                    {
                        responseType:
                            "blob",
                    }
                );

            const url=
                URL.createObjectURL(
                    response.data
                );

            popup.location.href=
                url;

            window.setTimeout(
                ()=>
                    URL.revokeObjectURL(
                        url
                    ),
                60000
            );
        }catch(error){
            popup.close();

            window.alert(
                apiError(
                    error
                )
            );
        }finally{
            setMediaLoading(
                null
            );
        }
    }

    const response=
        listQuery.data;

    const records=
        response
            ?.data
            .data ??
        [];

    const summary=
        response
            ?.summary;

    const title=
        mode ===
        "motorista"
            ? "Os meus checklists"
            : "Checklists dos meus veículos";

    const description=
        mode ===
        "motorista"
            ? "Consulte os registos finalizados de entrega e recolha associados à sua atividade."
            : "Consulte os registos finalizados de entrega e recolha dos veículos associados à sua propriedade.";

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    Checklists
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    {title}
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat
                    label="Total"
                    value={
                        summary
                            ?.total ??
                        0
                    }
                />

                <Stat
                    label="Entregas"
                    value={
                        summary
                            ?.entregas ??
                        0
                    }
                />

                <Stat
                    label="Recolhas"
                    value={
                        summary
                            ?.recolhas ??
                        0
                    }
                />

                <Stat
                    label="Com penalização"
                    value={
                        summary
                            ?.com_penalizacao ??
                        0
                    }
                    alert={
                        Boolean(
                            summary
                                ?.com_penalizacao
                        )
                    }
                />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row">
                    <form
                        onSubmit={
                            submitSearch
                        }
                        className="flex flex-1 gap-2"
                    >
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>

                            <input
                                value={
                                    search
                                }
                                onChange={
                                    event=>
                                        setSearch(
                                            event
                                                .target
                                                .value
                                        )
                                }
                                placeholder="Matrícula, veículo, motorista..."
                                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
                            />
                        </div>

                        <button
                            type="submit"
                            className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white"
                        >
                            Pesquisar
                        </button>
                    </form>

                    <select
                        value={
                            tipo
                        }
                        onChange={
                            event=>{
                                setTipo(
                                    event
                                        .target
                                        .value
                                );

                                setPage(
                                    1
                                );
                            }
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    >
                        <option value="">
                            Entregas e recolhas
                        </option>

                        <option value="entrega">
                            Entregas
                        </option>

                        <option value="recolha">
                            Recolhas
                        </option>
                    </select>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {listQuery.isLoading ? (
                    <Loading/>
                ) : listQuery.isError ? (
                    <div className="p-10 text-center text-sm text-red-600">
                        {apiError(
                            listQuery.error
                        )}
                    </div>
                ) : records.length === 0 ? (
                    <div className="p-14 text-center">
                        <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300"/>

                        <p className="mt-3 font-semibold text-slate-700">
                            Nenhum checklist encontrado
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Apenas checklists finalizados são apresentados neste portal.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Operação
                                        </th>

                                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Veículo
                                        </th>

                                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Motorista
                                        </th>

                                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Quilometragem
                                        </th>

                                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Penalização
                                        </th>

                                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Estado
                                        </th>

                                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Ação
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {records.map(
                                        record=>(
                                            <tr
                                                key={
                                                    record.id
                                                }
                                                className="hover:bg-slate-50/70"
                                            >
                                                <td className="px-5 py-4">
                                                    <span
                                                        className={[
                                                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                                            record.tipo ===
                                                            "entrega"
                                                                ? "bg-indigo-50 text-indigo-700"
                                                                : "bg-amber-50 text-amber-700",
                                                        ].join(
                                                            " "
                                                        )}
                                                    >
                                                        {record.tipo ===
                                                        "entrega"
                                                            ? "Entrega"
                                                            : "Recolha"}
                                                    </span>

                                                    <div className="mt-2 text-xs text-slate-500">
                                                        {dateLabel(
                                                            record.data_operacao
                                                        )}

                                                        {record.hora_operacao &&
                                                            ` · ${record.hora_operacao.slice(
                                                                0,
                                                                5
                                                            )}`}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Car className="h-4 w-4 text-slate-400"/>

                                                        <div>
                                                            <div className="font-semibold text-slate-900">
                                                                {record.matricula_snapshot ??
                                                                    "—"}
                                                            </div>

                                                            <div className="text-xs text-slate-500">
                                                                {record.modelo_snapshot ??
                                                                    "—"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                                        <UserRound className="h-4 w-4 text-slate-400"/>

                                                        {record.motorista_nome_snapshot ??
                                                            "—"}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 text-sm text-slate-700">
                                                    {record.quilometragem !==
                                                    null
                                                        ? `${record.quilometragem} km`
                                                        : "—"}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={
                                                            Number(
                                                                record.penalizacao_total
                                                            ) >
                                                            0
                                                                ? "font-semibold text-red-600"
                                                                : "text-sm text-slate-500"
                                                        }
                                                    >
                                                        {currency(
                                                            record.penalizacao_total
                                                        )}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                        <CheckCircle2 className="h-3.5 w-3.5"/>
                                                        Finalizado
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={()=>
                                                            setSelectedId(
                                                                record.id
                                                            )
                                                        }
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                                        title="Ver detalhes"
                                                    >
                                                        <Eye className="h-4 w-4"/>
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
                            <div className="text-xs text-slate-500">
                                {response
                                    ?.data
                                    .from ??
                                0}
                                –
                                {response
                                    ?.data
                                    .to ??
                                0}
                                {" "}de{" "}
                                {response
                                    ?.data
                                    .total ??
                                0}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={
                                        page <=
                                        1
                                    }
                                    onClick={()=>
                                        setPage(
                                            current=>
                                                current-1
                                        )
                                    }
                                    className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4"/>
                                    Anterior
                                </button>

                                <span className="px-2 text-xs text-slate-500">
                                    {response
                                        ?.data
                                        .current_page ??
                                    1}
                                    {" / "}
                                    {response
                                        ?.data
                                        .last_page ??
                                    1}
                                </span>

                                <button
                                    type="button"
                                    disabled={
                                        page >=
                                        (
                                            response
                                                ?.data
                                                .last_page ??
                                            1
                                        )
                                    }
                                    onClick={()=>
                                        setPage(
                                            current=>
                                                current+1
                                        )
                                    }
                                    className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold disabled:opacity-40"
                                >
                                    Seguinte
                                    <ChevronRight className="h-4 w-4"/>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {selectedId && (
                <DetailModal
                    record={
                        detailQuery.data ??
                        null
                    }
                    loading={
                        detailQuery.isLoading
                    }
                    error={
                        detailQuery.isError
                            ? apiError(
                                detailQuery.error
                            )
                            : null
                    }
                    mediaLoading={
                        mediaLoading
                    }
                    onMedia={
                        openMedia
                    }
                    onClose={()=>
                        setSelectedId(
                            null
                        )
                    }
                />
            )}
        </div>
    );
}

function Stat({
    label,
    value,
    alert=false,
}:{
    label:string;
    value:number;
    alert?:boolean;
}){
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
                {label}
            </p>

            <p
                className={[
                    "mt-2 text-2xl font-bold",
                    alert
                        ? "text-red-600"
                        : "text-slate-950",
                ].join(
                    " "
                )}
            >
                {value}
            </p>
        </div>
    );
}

function DetailModal({
    record,
    loading,
    error,
    mediaLoading,
    onMedia,
    onClose,
}:{
    record:PortalChecklist|null;
    loading:boolean;
    error:string|null;
    mediaLoading:string|null;
    onMedia:(
        checklistId:string,
        media:PortalMedia
    )=>Promise<void>;
    onClose:()=>void;
}){
    const delivered=
        record
            ? Object.entries(
                record.itens ??
                {}
            ).filter(
                ([,value])=>
                    Boolean(
                        value
                    )
            )
            : [];

    const missing=
        record
            ? Object.entries(
                record.itens_faltantes ??
                {}
            ).filter(
                ([,value])=>
                    Boolean(
                        value
                    )
            )
            : [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar"
                onClick={
                    onClose
                }
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            <div className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                            Checklist finalizado
                        </p>

                        <h2 className="mt-1 text-xl font-bold text-slate-950">
                            {record
                                ? record.tipo ===
                                  "entrega"
                                    ? "Entrega do veículo"
                                    : "Recolha do veículo"
                                : "Checklist"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200"
                    >
                        <X className="h-4 w-4"/>
                    </button>
                </header>

                {loading ? (
                    <Loading/>
                ) : error ? (
                    <div className="p-8 text-sm text-red-600">
                        {error}
                    </div>
                ) : record ? (
                    <div className="space-y-7 p-6">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Info
                                label="Veículo"
                                value={
                                    [
                                        record.matricula_snapshot,
                                        record.modelo_snapshot,
                                    ]
                                        .filter(
                                            Boolean
                                        )
                                        .join(
                                            " · "
                                        ) ||
                                    "—"
                                }
                            />

                            <Info
                                label="Motorista"
                                value={
                                    record.motorista_nome_snapshot ??
                                    "—"
                                }
                            />

                            <Info
                                label="Data"
                                value={
                                    dateLabel(
                                        record.data_operacao
                                    )
                                }
                            />

                            <Info
                                label="Quilometragem"
                                value={
                                    record.quilometragem !==
                                    null
                                        ? `${record.quilometragem} km`
                                        : "—"
                                }
                            />

                            <Info
                                label="Combustível / carga"
                                value={
                                    record.nivel_combustivel ??
                                    "—"
                                }
                            />

                            <Info
                                label="Penalização"
                                value={
                                    currency(
                                        record.penalizacao_total
                                    )
                                }
                            />

                            <Info
                                label="Assinatura empresa"
                                value={
                                    record
                                        .assinaturas
                                        .empresa
                                        ? "Registada"
                                        : "—"
                                }
                            />

                            <Info
                                label="Assinatura motorista"
                                value={
                                    record
                                        .assinaturas
                                        .motorista
                                        ? "Registada"
                                        : "—"
                                }
                            />
                        </div>

                        {record.tipo ===
                            "entrega" &&
                            delivered.length >
                                0 && (
                            <Section
                                title="Itens entregues"
                            >
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {delivered.map(
                                        ([
                                            id,
                                        ])=>(
                                            <div
                                                key={
                                                    id
                                                }
                                                className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                                            >
                                                <CheckCircle2 className="h-4 w-4"/>
                                                {itemName(
                                                    id
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            </Section>
                        )}

                        {record.tipo ===
                            "recolha" &&
                            missing.length >
                                0 && (
                            <Section
                                title="Itens em falta"
                            >
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {missing.map(
                                        ([
                                            id,
                                        ])=>(
                                            <div
                                                key={
                                                    id
                                                }
                                                className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
                                            >
                                                <AlertTriangle className="h-4 w-4"/>
                                                {itemName(
                                                    id
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            </Section>
                        )}

                        {record.danos &&
                            record.danos.length >
                                0 && (
                            <Section
                                title="Danos existentes na entrega"
                            >
                                <DamageList
                                    damages={
                                        record.danos
                                    }
                                />
                            </Section>
                        )}

                        {record.novos_danos &&
                            record
                                .novos_danos
                                .length >
                                0 && (
                            <Section
                                title="Novos danos na recolha"
                            >
                                <DamageList
                                    damages={
                                        record
                                            .novos_danos
                                    }
                                />
                            </Section>
                        )}

                        {record.observacoes && (
                            <Section
                                title="Observações"
                            >
                                <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                                    {record.observacoes}
                                </div>
                            </Section>
                        )}

                        <Section
                            title="Evidências"
                        >
                            {record.media_files &&
                            record
                                .media_files
                                .length >
                                0 ? (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {record.media_files.map(
                                        media=>(
                                            <button
                                                key={
                                                    media.id
                                                }
                                                type="button"
                                                disabled={
                                                    mediaLoading ===
                                                    media.id
                                                }
                                                onClick={()=>
                                                    void onMedia(
                                                        record.id,
                                                        media
                                                    )
                                                }
                                                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50 disabled:opacity-50"
                                            >
                                                {mediaLoading ===
                                                media.id ? (
                                                    <LoaderCircle className="h-5 w-5 animate-spin text-indigo-600"/>
                                                ) : (
                                                    <Camera className="h-5 w-5 text-indigo-600"/>
                                                )}

                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-slate-800">
                                                        {media.titulo ??
                                                            media.arquivo_nome}
                                                    </div>

                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {media.contexto}
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                                    Não existem ficheiros de evidência associados a este checklist.
                                </div>
                            )}
                        </Section>

                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                            <ShieldCheck className="h-5 w-5"/>
                            Este registo encontra-se finalizado e disponível apenas para consulta.
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function DamageList({
    damages,
}:{
    damages:DamageRecord[];
}){
    return (
        <div className="space-y-2">
            {damages.map(
                (
                    damage,
                    index
                )=>(
                    <div
                        key={
                            `${damage.part}-${index}`
                        }
                        className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center"
                    >
                        <span className="text-sm font-medium text-slate-700">
                            {damageLabel(
                                damage
                            )}
                        </span>

                        {damage.value !==
                            null &&
                            damage.value !==
                                undefined && (
                            <span className="text-sm font-semibold text-red-600">
                                {currency(
                                    damage.value
                                )}
                            </span>
                        )}
                    </div>
                )
            )}
        </div>
    );
}

function Section({
    title,
    children,
}:{
    title:string;
    children:React.ReactNode;
}){
    return (
        <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
                {title}
            </h3>

            {children}
        </section>
    );
}

function Info({
    label,
    value,
}:{
    label:string;
    value:string;
}){
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-700">
                {value}
            </div>
        </div>
    );
}

function Loading(){
    return (
        <div className="flex justify-center py-16">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
        </div>
    );
}