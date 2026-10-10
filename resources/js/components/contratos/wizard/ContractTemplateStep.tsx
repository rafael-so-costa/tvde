import {
    FileText,
    LoaderCircle,
    Workflow,
} from "lucide-react";
import type {
    TipoContrato,
} from "../../../types/tipo-contrato";

interface Props {
    types: TipoContrato[];
    selectedId: string;
    loading: boolean;
    onSelect: (id: string) => void;
}

export default function ContractTemplateStep({
    types,
    selectedId,
    loading,
    onSelect,
}: Props) {
    if (loading) {
        return (
            <div className="flex min-h-64 items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (types.length === 0) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h3 className="font-semibold text-amber-900">
                    Nenhum tipo de contrato disponível
                </h3>

                <p className="mt-2 text-sm text-amber-700">
                    Configure e ative pelo menos um tipo de contrato
                    antes de criar contratos.
                </p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-5">
                <h3 className="text-lg font-semibold text-slate-950">
                    Qual contrato pretende criar?
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                    O tipo selecionado define automaticamente template,
                    entidades, campos, assinaturas e workflow.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {types.map((type) => {
                    const selected =
                        type.id === selectedId;

                    return (
                        <button
                            key={type.id}
                            type="button"
                            onClick={() =>
                                onSelect(type.id)
                            }
                            className={[
                                "rounded-2xl border p-5 text-left transition",
                                selected
                                    ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/10"
                                    : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50",
                            ].join(" ")}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                                        <FileText className="h-5 w-5" />
                                    </div>

                                    <h4 className="mt-4 font-semibold text-slate-950">
                                        {type.nome}
                                    </h4>

                                    {type.descricao && (
                                        <p className="mt-1 text-sm text-slate-500">
                                            {type.descricao}
                                        </p>
                                    )}
                                </div>

                                <div
                                    className={[
                                        "mt-1 h-5 w-5 rounded-full border-2",
                                        selected
                                            ? "border-indigo-600 bg-indigo-600 ring-4 ring-indigo-100"
                                            : "border-slate-300",
                                    ].join(" ")}
                                />
                            </div>

                            <div className="mt-5 space-y-2 border-t border-slate-200/80 pt-4 text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />

                                    {type.template?.nome ??
                                        "Sem template documental"}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Workflow className="h-4 w-4" />

                                    {type.checklist_process_template
                                        ?.nome ??
                                        "Sem workflow"}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
