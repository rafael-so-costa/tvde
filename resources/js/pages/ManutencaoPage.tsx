import {
    Activity,
    Boxes,
    ClipboardList,
    PackageSearch,
    ShoppingCart,
    Store,
    Wrench,
} from "lucide-react";
import { useState } from "react";
import OrdensTab from "../components/manutencao/OrdensTab";
import EstoqueTab from "../components/manutencao/EstoqueTab";
import FornecedoresTab from "../components/manutencao/FornecedoresTab";
import ComprasTab from "../components/manutencao/ComprasTab";
import PlanosTab from "../components/manutencao/PlanosTab";
import DiagnosticosTab from "../components/manutencao/DiagnosticosTab";
type Tab =
    | "ordens"
    | "planos"
    | "estoque"
    | "compras"
    | "fornecedores"
    | "diagnosticos";

const tabs: [Tab, string, typeof Wrench][] = [
    ["ordens", "Ordens", Wrench],
    ["planos", "Planos preventivos", ClipboardList],
    ["estoque", "Estoque e peças", Boxes],
    ["compras", "Compras", ShoppingCart],
    ["fornecedores", "Fornecedores", Store],
    ["diagnosticos", "Diagnósticos", Activity],
];

export default function ManutencaoPage() {
    const [tab, setTab] = useState<Tab>("ordens");

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Wrench className="w-5 h-5" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-slate-950">
                            Manutenção
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Gestão de manutenção, peças, compras e diagnóstico
                            da frota.
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-2 overflow-x-auto">
                <div className="flex min-w-max gap-1">
                    {tabs.map(([value, label, Icon]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setTab(value)}
                            className={[
                                "h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-semibold transition",
                                tab === value
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                            ].join(" ")}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {tab === "ordens" && <OrdensTab />}

            {tab === "planos" && <PlanosTab />}

            {tab === "estoque" && <EstoqueTab />}

            {tab === "compras" && <ComprasTab />}

            {tab === "fornecedores" && <FornecedoresTab />}

            {tab === "diagnosticos" && <DiagnosticosTab />}
        </div>
    );
}

function EmptyState({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof Wrench;
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <Icon className="w-6 h-6" />
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-950">{title}</h2>

            <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
    );
}
