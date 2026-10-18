import {
    AlertTriangle,
    ArrowRight,
    Fuel,
    Gauge,
    ShieldCheck,
} from "lucide-react";

import type {
    ChecklistRecord,
    DamageRecord,
    FuelLevel,
} from "../../types/checklist";

interface Props {
    delivery: ChecklistRecord;
    currentKilometragem: number | null;
    currentFuel: FuelLevel;
    newDamages: DamageRecord[];
    missingItems: Record<string,boolean>;
}

const fuelLabels: Record<FuelLevel,string> = {
    "1/4":"1/4",
    "1/2":"1/2",
    "3/4":"3/4",
    cheio:"Cheio",
};

function number(
    value:number|null|undefined,
) {
    if (
        value===null ||
        value===undefined
    ) {
        return "—";
    }

    return new Intl.NumberFormat(
        "pt-PT",
    ).format(
        value,
    );
}

export default function ChecklistComparison({
    delivery,
    currentKilometragem,
    currentFuel,
    newDamages,
    missingItems,
}: Props) {
    const deliveryKm=
        delivery.quilometragem;

    const kmDifference=
        deliveryKm!==null &&
        currentKilometragem!==null
            ?Math.max(
                0,
                currentKilometragem-deliveryKm,
            )
            :null;

    const missingCount=
        Object.values(
            missingItems,
        ).filter(
            Boolean,
        ).length;

    const existingDamages=
        delivery.danos??[];

    return (
        <section>
            <div className="mb-4">
                <h3 className="font-semibold text-slate-900">
                    Comparação com a entrega
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                    O sistema compara automaticamente a recolha com o estado registado no momento da entrega.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ComparisonCard
                    icon={Gauge}
                    label="Quilometragem"
                    before={`${number(deliveryKm)} km`}
                    after={
                        currentKilometragem!==null
                            ?`${number(currentKilometragem)} km`
                            :"—"
                    }
                    detail={
                        kmDifference!==null
                            ?`+${number(kmDifference)} km utilizados`
                            :"Informe a quilometragem da recolha"
                    }
                />

                <ComparisonCard
                    icon={Fuel}
                    label="Combustível"
                    before={
                        delivery.nivel_combustivel
                            ?fuelLabels[
                                delivery.nivel_combustivel
                            ]
                            :"—"
                    }
                    after={
                        fuelLabels[
                            currentFuel
                        ]
                    }
                    detail="Entrega → recolha"
                />

                <ComparisonCard
                    icon={AlertTriangle}
                    label="Danos"
                    before={`${existingDamages.length} existentes`}
                    after={`${newDamages.length} novos`}
                    detail={
                        newDamages.length===0
                            ?"Nenhum dano novo registado"
                            :"Rever as zonas assinaladas"
                    }
                    alert={
                        newDamages.length>0
                    }
                />

                <ComparisonCard
                    icon={
                        missingCount>0
                            ?AlertTriangle
                            :ShieldCheck
                    }
                    label="Itens em falta"
                    before="Entrega"
                    after={`${missingCount} em falta`}
                    detail={
                        missingCount===0
                            ?"Nenhuma falta registada"
                            :"Pode gerar penalização"
                    }
                    alert={
                        missingCount>0
                    }
                />
            </div>

            {existingDamages.length>0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-sm font-semibold text-amber-900">
                        Danos que já existiam na entrega
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {existingDamages.map(
                            (
                                damage,
                                index,
                            )=>(
                                <span
                                    key={`${damage.part}-${index}`}
                                    className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200"
                                >
                                    {damage.part}
                                    {" · "}
                                    {damage.types?.[0]??"dano"}
                                </span>
                            ),
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}

function ComparisonCard({
    icon:Icon,
    label,
    before,
    after,
    detail,
    alert=false,
}: {
    icon:typeof Gauge;
    label:string;
    before:string;
    after:string;
    detail:string;
    alert?:boolean;
}) {
    return (
        <div
            className={[
                "rounded-2xl border bg-white p-4",
                alert
                    ?"border-red-200"
                    :"border-slate-200",
            ].join(" ")}
        >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Icon className="h-4 w-4"/>
                {label}
            </div>

            <div className="mt-3 flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">
                    {before}
                </span>

                <ArrowRight className="h-4 w-4 text-slate-300"/>

                <span
                    className={[
                        "text-sm font-bold",
                        alert
                            ?"text-red-600"
                            :"text-slate-950",
                    ].join(" ")}
                >
                    {after}
                </span>
            </div>

            <div className="mt-2 text-xs text-slate-400">
                {detail}
            </div>
        </div>
    );
}