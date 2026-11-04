import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, BadgePercent, CheckCircle2, ChevronLeft,
    ChevronRight, History, LoaderCircle,
    Pencil, Plus, Search, ShieldCheck, Tag, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../lib/api";

type Scope = "saas_subscription" | "ad_order" | "both";
type DiscountType = "fixed" | "percentage";
type Coupon = {
    id: string; code: string; name: string; description: string | null;
    discount_type: DiscountType; discount_value: string;
    applies_to: Scope; enabled: boolean; first_payment_only: boolean;
    min_subtotal: string | null; max_redemptions: number | null;
    max_per_customer: number | null; starts_at: string | null;
    expires_at: string | null; usage_count: number; redeemed_count: number;
    reserved_count: number; saved_amount: string; created_at: string;
};
type CouponForm = {
    code: string; name: string; description: string;
    discount_type: DiscountType; discount_value: string;
    applies_to: Scope; enabled: boolean; first_payment_only: boolean;
    min_subtotal: string; max_redemptions: string;
    max_per_customer: string; starts_at: string; expires_at: string;
};
type CouponListResponse = {
    data: Coupon[];
    meta: { total: number; current_page: number; last_page: number; per_page: number };
    module_enabled: boolean;
};
type CouponHistory = {
    id: string; status: string; source_type: string;
    discount_amount: string; subtotal_amount: string;
    created_at: string | null; redeemed_at: string | null;
};
type HistoryResponse = {
    data: CouponHistory[];
    meta: { total: number; current_page: number; last_page: number };
};

const emptyForm: CouponForm = {
    code: "", name: "", description: "", discount_type: "percentage",
    discount_value: "10.00", applies_to: "both", enabled: false,
    first_payment_only: true, min_subtotal: "", max_redemptions: "",
    max_per_customer: "", starts_at: "", expires_at: "",
};
const field = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const primary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
const money = (value: string | number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(Number(value));
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString("pt-PT") : "Sem prazo";
const localDate = (value: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return "";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const newForm = (coupon?: Coupon): CouponForm => coupon ? {
    code: coupon.code, name: coupon.name, description: coupon.description ?? "",
    discount_type: coupon.discount_type, discount_value: coupon.discount_value,
    applies_to: coupon.applies_to, enabled: coupon.enabled,
    first_payment_only: coupon.first_payment_only,
    min_subtotal: coupon.min_subtotal ?? "",
    max_redemptions: coupon.max_redemptions?.toString() ?? "",
    max_per_customer: coupon.max_per_customer?.toString() ?? "",
    starts_at: localDate(coupon.starts_at), expires_at: localDate(coupon.expires_at),
} : { ...emptyForm };
const scopeLabel = (scope: Scope) => scope === "both" ? "SaaS e Ads" : scope === "ad_order" ? "Publicidade" : "Assinaturas";

// Apenas para pré-visualização local: /backoffice/cupoes?preview=1
// Em produção, o build Vite elimina este modo de demonstração.
const demoData: Coupon[] = [
    { id: "demo-1", code: "BEMVINDO10", name: "Boas-vindas FrotaPRO", description: "Primeira assinatura",
      discount_type: "percentage", discount_value: "10.00", applies_to: "saas_subscription",
      enabled: true, first_payment_only: true, min_subtotal: null, max_redemptions: 100,
      max_per_customer: 1, starts_at: null, expires_at: null,
      usage_count: 34, redeemed_count: 31, reserved_count: 3, saved_amount: "155.00", created_at: "2026-11-01T00:00:00Z" },
    { id: "demo-2", code: "ADS20", name: "Campanha de publicidade", description: "Publicidade inicial",
      discount_type: "percentage", discount_value: "20.00", applies_to: "ad_order",
      enabled: true, first_payment_only: false, min_subtotal: "30.00", max_redemptions: 50,
      max_per_customer: 2, starts_at: null, expires_at: null,
      usage_count: 13, redeemed_count: 12, reserved_count: 1, saved_amount: "240.00", created_at: "2026-11-02T00:00:00Z" },
    { id: "demo-3", code: "NOVEMBRO5", name: "Promoção de novembro", description: "Desconto fixo",
      discount_type: "fixed", discount_value: "5.00", applies_to: "both",
      enabled: false, first_payment_only: false, min_subtotal: "15.00", max_redemptions: null,
      max_per_customer: null, starts_at: null, expires_at: null,
      usage_count: 0, redeemed_count: 0, reserved_count: 0, saved_amount: "0.00", created_at: "2026-11-03T00:00:00Z" },
];

function TextField({ label, value, onChange, type = "text", placeholder, required = false, disabled = false }: {
    label: string; value: string; onChange: (s: string) => void;
    type?: string; placeholder?: string; required?: boolean; disabled?: boolean;
}) {
    return <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <input type={type} step={type === "number" ? "0.01" : undefined} value={value} onChange={e => onChange(e.target.value)}
            className={field} placeholder={placeholder} required={required} disabled={disabled} />
    </label>;
}

export default function BackofficeCouponsPage() {
    const preview = import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "1";
    const client = useQueryClient();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [scope, setScope] = useState("");
    const [page, setPage] = useState(1);
    const [editor, setEditor] = useState<Coupon | "new" | null>(null);
    const [form, setForm] = useState<CouponForm>({ ...emptyForm });
    const [selected, setSelected] = useState<Coupon | null>(null);
    const [historyPage, setHistoryPage] = useState(1);
    const [notice, setNotice] = useState("");
    const deferredSearch = useDeferredValue(search);

    const list = useQuery({
        queryKey: ["backoffice", "cupoes", deferredSearch, status, scope, page],
        enabled: !preview,
        queryFn: async () => (await api.get<CouponListResponse>("/api/backoffice/cupoes", {
            params: { q: deferredSearch || undefined, enabled: status || undefined,
                applies_to: scope || undefined, page },
        })).data,
    });
    const history = useQuery({
        queryKey: ["backoffice", "cupoes", "historico", selected?.id, historyPage],
        enabled: Boolean(selected?.id) && !preview,
        queryFn: async () => (await api.get<HistoryResponse>(
            `/api/backoffice/cupoes/${selected!.id}/historico`,
            { params: { page: historyPage } },
        )).data,
    });
    const save = useMutation({
        mutationFn: async () => {
            const payload = {
                ...form, code: form.code.trim().toUpperCase(),
                description: form.description.trim() || null,
                min_subtotal: form.min_subtotal || null,
                max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
                max_per_customer: form.max_per_customer ? Number(form.max_per_customer) : null,
                starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
                expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
            };
            return editor === "new"
                ? api.post("/api/backoffice/cupoes", payload)
                : api.patch(`/api/backoffice/cupoes/${(editor as Coupon).id}`, payload);
        },
        onSuccess: async () => {
            setEditor(null);
            setNotice("Cupão guardado com sucesso.");
            await client.invalidateQueries({ queryKey: ["backoffice", "cupoes"] });
            setSelected(null);
        },
    });

    const coupons = preview ? demoData.filter(c =>
        (!deferredSearch || `${c.code} ${c.name}`.toLowerCase().includes(deferredSearch.toLowerCase())) &&
        (!status || (c.enabled ? "1" : "0") === status) &&
        (!scope || c.applies_to === scope)
    ) : (list.data?.data ?? []);
    const viewMeta = preview ? { total: coupons.length, current_page: 1, last_page: 1, per_page: 15 } : list.data?.meta;
    const totalRedeemed = useMemo(() => coupons.reduce((n, c) => n + c.redeemed_count, 0), [coupons]);
    const totalSaved = useMemo(() => coupons.reduce((n, c) => n + Number(c.saved_amount), 0), [coupons]);
    const editing = editor !== null;
    const fixedTerms = editor !== null && editor !== "new" &&
        editor.usage_count > 0;
    function openEditor(coupon?: Coupon) {
        setNotice(""); save.reset();
        setForm(newForm(coupon)); setEditor(coupon ?? "new");
    }
    function set<K extends keyof CouponForm>(key: K, value: CouponForm[K]) {
        setForm(old => ({ ...old, [key]: value }));
    }
    const error = save.error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } } | null;
    const serverErrors = error?.response?.data?.errors;

    return <div className="mx-auto max-w-[1450px] space-y-6 pb-12">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
                <Link to="/backoffice/faturacao" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">
                    <ArrowLeft className="h-4 w-4" /> Faturação
                </Link>
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600"><BadgePercent className="h-6 w-6" /></div>
                    <div><h1 className="text-3xl font-bold tracking-tight text-slate-950">Cupões promocionais</h1>
                        <p className="mt-1 text-sm text-slate-500">Campanhas de desconto para assinaturas SaaS e FrotaPRO Ads.</p></div>
                </div>
            </div>
            <button type="button" onClick={() => openEditor()} className={primary}><Plus className="h-4 w-4" /> Novo cupão</button>
        </header>

        {preview && <div role="status" className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
            <strong>Pré-visualização local.</strong> Os três cupões apresentados são fictícios. Nenhum dado é guardado e nenhum pagamento é criado.
        </div>}
        {list.data && !list.data.module_enabled && <div role="status" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div><p className="font-semibold">Aplicação de cupões ainda desativada</p>
                <p className="mt-1 text-sm">É possível preparar campanhas, mas o motor de pagamentos não aplicará descontos enquanto a configuração global estiver desativada.</p></div>
        </div>}
        {notice && <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{notice}</div>}
        <section className="grid gap-4 sm:grid-cols-3">
            <Metric icon={Tag} label="Cupões registados" value={viewMeta ? String(viewMeta.total) : "—"} hint="Total no catálogo" />
            <Metric icon={CheckCircle2} label="Utilizações confirmadas" value={String(totalRedeemed)} hint="Nos cupões desta página" />
            <Metric icon={BadgePercent} label="Descontos concedidos" value={money(totalSaved)} hint="Utilizações confirmadas nesta página" />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
                <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <input aria-label="Pesquisar cupões" value={search} onChange={e => {setSearch(e.target.value);setPage(1);}}
                        className={field + " pl-10"} placeholder="Pesquisar por código ou nome..." /></div>
                <select aria-label="Filtrar por estado" className={field} value={status}
                    onChange={e => {setStatus(e.target.value);setPage(1);}}>
                    <option value="">Todos os estados</option><option value="1">Ativos</option><option value="0">Desativados</option>
                </select>
                <select aria-label="Filtrar por âmbito" className={field} value={scope}
                    onChange={e => {setScope(e.target.value);setPage(1);}}>
                    <option value="">Todos os âmbitos</option><option value="saas_subscription">SaaS</option>
                    <option value="ad_order">Ads</option><option value="both">SaaS e Ads</option>
                </select>
            </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {list.isLoading && !preview ? <div className="flex min-h-52 items-center justify-center"><LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" /></div>
                : list.isError && !preview ? <div role="alert" className="p-10 text-center text-sm text-rose-700">Não foi possível carregar os cupões. Verifique a API, as migrations e as permissões do Super Admin.</div>
                : coupons.length === 0 ? <div className="py-20 text-center"><Tag className="mx-auto h-10 w-10 text-slate-300" />
                    <h2 className="mt-3 font-semibold text-slate-900">Nenhum cupão encontrado</h2><p className="mt-1 text-sm text-slate-500">Crie uma campanha ou ajuste os filtros.</p></div>
                : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr>
                        {(["Cupão", "Desconto", "Aplicação", "Estado", "Utilizações", "Validade", "Ações"] as const).map(x =>
                            <th key={x} scope="col" className="whitespace-nowrap px-5 py-4">{x}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100">{coupons.map(c => <tr key={c.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4"><button type="button" onClick={() => {setSelected(c);setHistoryPage(1);}}
                            className="font-bold tracking-wide text-indigo-700 hover:underline">{c.code}</button>
                            <p className="mt-0.5 max-w-52 truncate text-xs text-slate-500">{c.name}</p></td>
                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">{c.discount_type === "percentage" ? `${c.discount_value}%` : money(c.discount_value)}</td>
                        <td className="px-5 py-4 text-slate-700">{scopeLabel(c.applies_to)}</td>
                        <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            {c.enabled ? "Ativo" : "Desativado"}</span></td>
                        <td className="whitespace-nowrap px-5 py-4"><span className="font-bold text-slate-900">{c.redeemed_count}</span>
                            <span className="text-slate-400"> / {c.max_redemptions ?? "∞"}</span>
                            {c.reserved_count > 0 && <p className="text-xs text-amber-700">{c.reserved_count} reserva(s)</p>}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">{dateTime(c.expires_at)}</td>
                        <td className="px-5 py-4"><div className="flex gap-2">
                            <button type="button" aria-label={`Editar ${c.code}`} title="Editar" onClick={() => openEditor(c)} className={secondary + " !min-h-9 !px-3"}><Pencil className="h-4 w-4" /></button>
                            <button type="button" aria-label={`Histórico ${c.code}`} title="Histórico" onClick={() => {setSelected(c);setHistoryPage(1);}} className={secondary + " !min-h-9 !px-3"}><History className="h-4 w-4" /></button>
                        </div></td>
                    </tr>)}</tbody></table></div>}
            {viewMeta && viewMeta.last_page > 1 && <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm text-slate-600">
                <span>Página {viewMeta.current_page} de {viewMeta.last_page}</span>
                <div className="flex gap-2"><button type="button" aria-label="Página anterior" className={secondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></button>
                    <button type="button" aria-label="Página seguinte" className={secondary} disabled={page >= viewMeta.last_page} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></button></div>
            </div>}
        </section>

        {editing && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-7" role="presentation">
            <div role="dialog" aria-modal="true" aria-label={editor === "new" ? "Criar cupão" : "Editar cupão"}
                className="mx-auto my-4 max-w-3xl rounded-3xl bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-100 p-6">
                    <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Campanha promocional</p>
                        <h2 className="mt-1 text-2xl font-bold text-slate-950">{editor === "new" ? "Novo cupão" : `Editar ${form.code}`}</h2></div>
                    <button aria-label="Fechar formulário" onClick={() => setEditor(null)} className={secondary + " !px-3"}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); if (!preview) save.mutate(); }} className="space-y-5 p-6">
                    {fixedTerms && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">O cupão já possui utilizações. Os campos financeiros e o código ficam bloqueados para preservar o histórico.</p>}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField label="Código do cupão *" value={form.code} onChange={v => set("code", v.toUpperCase())} required disabled={fixedTerms} placeholder="FROTAPRO10" />
                        <TextField label="Nome da campanha *" value={form.name} onChange={v => set("name", v)} required placeholder="Boas-vindas" />
                    </div>
                    <TextField label="Descrição" value={form.description} onChange={v => set("description", v)} placeholder="Objetivo e condições da promoção" />
                    <div className="grid gap-4 sm:grid-cols-3">
                        <label className="space-y-1.5"><span className="text-xs font-semibold text-slate-600">Tipo de desconto</span>
                            <select className={field} value={form.discount_type} disabled={fixedTerms} onChange={e => set("discount_type", e.target.value as DiscountType)}>
                                <option value="percentage">Percentagem (%)</option><option value="fixed">Valor fixo (€)</option></select></label>
                        <TextField label={form.discount_type === "percentage" ? "Desconto (%) *" : "Desconto (€) *"} type="number"
                            value={form.discount_value} onChange={v => set("discount_value", v)} required disabled={fixedTerms} />
                        <label className="space-y-1.5"><span className="text-xs font-semibold text-slate-600">Aplicar a</span>
                            <select className={field} value={form.applies_to} disabled={fixedTerms} onChange={e => set("applies_to", e.target.value as Scope)}>
                                <option value="both">SaaS e publicidade</option><option value="saas_subscription">Apenas SaaS</option><option value="ad_order">Apenas Ads</option></select></label>
                    </div>
                    {form.discount_type === "percentage" && Number(form.discount_value) >= 100 &&
                        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">O checkout com desconto integral (100%) continua bloqueado no motor financeiro até existir um fluxo de ativação sem pagamento validado.</p>}
                    <div className="grid gap-4 sm:grid-cols-3">
                        <TextField label="Compra mínima (€)" type="number" value={form.min_subtotal} onChange={v => set("min_subtotal", v)} disabled={fixedTerms} placeholder="Opcional" />
                        <TextField label="Limite global" type="number" value={form.max_redemptions} onChange={v => set("max_redemptions", v)} placeholder="Sem limite" />
                        <TextField label="Limite por cliente" type="number" value={form.max_per_customer} onChange={v => set("max_per_customer", v)} placeholder="Sem limite" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField label="Início da campanha" type="datetime-local" value={form.starts_at} onChange={v => set("starts_at", v)} />
                        <TextField label="Fim da campanha" type="datetime-local" value={form.expires_at} onChange={v => set("expires_at", v)} />
                    </div>
                    <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:gap-8">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.enabled} onChange={e => set("enabled", e.target.checked)} className="accent-indigo-600" /> Campanha ativada</label>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.first_payment_only} disabled={fixedTerms} onChange={e => set("first_payment_only", e.target.checked)} className="accent-indigo-600" /> Apenas primeira compra</label>
                    </div>
                    {serverErrors && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{Object.entries(serverErrors).map(([name, errors]) => <p key={name}><strong>{name}:</strong> {errors.join(" ")}</p>)}</div>}
                    {save.isError && !serverErrors && <p role="alert" className="text-sm text-rose-700">{error?.response?.data?.message ?? "Não foi possível guardar o cupão."}</p>}
                    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                        <button type="button" className={secondary} onClick={() => setEditor(null)}>Cancelar</button>
                        <button type="submit" disabled={save.isPending || preview} className={primary}>{save.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Guardar cupão</button>
                    </div>
                </form>
            </div>
        </div>}

        {selected && <div className="fixed inset-0 z-40 bg-slate-950/60" role="presentation">
            <button type="button" className="absolute inset-0 w-full cursor-default" aria-label="Fechar histórico" onClick={() => setSelected(null)} />
            <aside role="dialog" aria-modal="true" aria-label={`Histórico do cupão ${selected.code}`}
                className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Histórico e auditoria</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-950">{selected.code}</h2><p className="mt-1 text-sm text-slate-500">{selected.name}</p></div>
                    <button type="button" aria-label="Fechar histórico" onClick={() => setSelected(null)} className={secondary + " !px-3"}><X className="h-4 w-4" /></button></div>
                <div className="mt-7 grid grid-cols-2 gap-3"><Metric icon={CheckCircle2} label="Confirmados" value={String(selected.redeemed_count)} hint="Utilizações pagas" />
                    <Metric icon={BadgePercent} label="Descontos" value={money(selected.saved_amount)} hint="Valor total confirmado" /></div>
                <div className="mt-6 flex items-center gap-2 border-b border-slate-100 pb-4"><History className="h-5 w-5 text-slate-500" /><h3 className="font-bold text-slate-900">Movimentos</h3></div>
                {history.isLoading && !preview ? <div className="p-10 text-center text-slate-400"><LoaderCircle className="mx-auto h-6 w-6 animate-spin" /></div>
                    : history.isError && !preview ? <p role="alert" className="p-6 text-sm text-rose-700">Não foi possível carregar o histórico.</p>
                    : !history.data?.data.length ? <div className="p-10 text-center text-sm text-slate-500">Sem movimentos.</div>
                    : <div className="divide-y divide-slate-100">{history.data.data.map(h => <div key={h.id} className="flex justify-between gap-4 py-4">
                        <div><p className="text-sm font-semibold text-slate-900">{h.source_type === "ad_order" ? "Publicidade" : "SaaS"}</p>
                            <p className="mt-1 text-xs text-slate-500">{dateTime(h.created_at)}</p></div>
                        <div className="text-right"><p className="font-bold text-slate-900">-{money(h.discount_amount)}</p>
                            <span className={`text-xs font-semibold ${h.status === "redeemed" ? "text-emerald-700" : "text-amber-700"}`}>{h.status}</span></div>
                    </div>)}</div>}
                {history.data && history.data.meta.last_page > 1 && <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-slate-500">Página {historyPage} de {history.data.meta.last_page}</span>
                    <div className="flex gap-2"><button aria-label="Histórico anterior" disabled={historyPage === 1} className={secondary} onClick={() => setHistoryPage(x => x - 1)}><ChevronLeft className="h-4 w-4" /></button>
                        <button aria-label="Histórico seguinte" disabled={historyPage >= history.data.meta.last_page} className={secondary} onClick={() => setHistoryPage(x => x + 1)}><ChevronRight className="h-4 w-4" /></button></div></div>}
                <div className="mt-7 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900"><ShieldCheck className="mb-2 h-5 w-5" />Histórico somente de leitura. Não são permitidas remoções de utilizações ou confirmações manuais de pagamento.</div>
            </aside>
        </div>}
    </div>;
}

function Metric({ icon: Icon, label, value, hint }: {
    icon: typeof Tag; label: string; value: string; hint: string;
}) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label}</span>
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><Icon className="h-5 w-5" /></span></div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>;
}