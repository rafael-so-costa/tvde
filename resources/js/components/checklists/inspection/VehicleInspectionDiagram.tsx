import {
    useMemo,
    useState,
} from "react";

import {
    appUrl,
} from "../../../lib/runtime";

import type {
    DamageRecord,
    VehiclePartDefinition,
} from "../../../types/checklist";

import {
    VEHICLE_PARTS,
} from "../../../types/checklist";

interface Props {
    damages:DamageRecord[];
    referenceDamages?:DamageRecord[];
    disabled?:boolean;

    onSelectPart?:(
        part:VehiclePartDefinition,
    )=>void;
}

interface Hotspot {
    id:string;
    x:number;
    y:number;
    label:string;
}

interface ViewConfig {
    key:string;
    title:string;
    image:string;
    hotspots:Hotspot[];
}

const front:Hotspot[]=[
    {id:"teto",x:50,y:11,label:"Teto"},
    {id:"para_brisa_d",x:50,y:29,label:"Para-brisa"},
    {id:"capo",x:50,y:44,label:"Capô"},
    {id:"retrovisor_e",x:15,y:34,label:"Retrovisor esquerdo"},
    {id:"retrovisor_d",x:85,y:34,label:"Retrovisor direito"},
    {id:"farol_de",x:25,y:56,label:"Farol esquerdo"},
    {id:"farol_dd",x:75,y:56,label:"Farol direito"},
    {id:"para_lama_de",x:18,y:67,label:"Para-lama esquerdo"},
    {id:"para_lama_dd",x:82,y:67,label:"Para-lama direito"},
    {id:"para_choque_dianteiro",x:50,y:78,label:"Para-choque dianteiro"},
    {id:"jante_de",x:17,y:88,label:"Jante dianteira esquerda"},
    {id:"jante_dd",x:83,y:88,label:"Jante dianteira direita"}
];

const rear:Hotspot[]=[
    {id:"teto",x:50,y:10,label:"Teto"},
    {id:"para_brisa_t",x:50,y:28,label:"Para-brisa traseiro"},
    {id:"porta_malas",x:50,y:48,label:"Porta-malas"},
    {id:"lanterna_te",x:25,y:48,label:"Lanterna esquerda"},
    {id:"lanterna_td",x:75,y:48,label:"Lanterna direita"},
    {id:"para_lama_te",x:18,y:64,label:"Para-lama esquerdo"},
    {id:"para_lama_td",x:82,y:64,label:"Para-lama direito"},
    {id:"para_choque_traseiro",x:50,y:76,label:"Para-choque traseiro"},
    {id:"jante_te",x:17,y:87,label:"Jante traseira esquerda"},
    {id:"jante_td",x:83,y:87,label:"Jante traseira direita"}
];

/*
 * Nas imagens laterais, o veículo ocupa aproximadamente
 * o terço central vertical. Por isso não usamos Y=80/90,
 * que colocava os pontos fora da carroçaria.
 */
const left:Hotspot[]=[
    {id:"farol_de",x:8,y:47,label:"Farol dianteiro"},
    {id:"para_lama_de",x:17,y:51,label:"Para-lama dianteiro"},

    {id:"retrovisor_e",x:32,y:35,label:"Retrovisor"},

    {id:"vidro_de",x:41,y:39,label:"Vidro dianteiro"},
    {id:"macaneta_de",x:48,y:47,label:"Maçaneta dianteira"},
    {id:"porta_de",x:42,y:54,label:"Porta dianteira"},

    {id:"vidro_te",x:59,y:39,label:"Vidro traseiro"},
    {id:"macaneta_te",x:66,y:47,label:"Maçaneta traseira"},
    {id:"porta_te",x:60,y:54,label:"Porta traseira"},

    {id:"vidro_fixo_te",x:72,y:39,label:"Vidro fixo traseiro"},

    {id:"saia_e",x:52,y:62,label:"Saia lateral"},

    {id:"para_lama_te",x:79,y:51,label:"Para-lama traseiro"},
    {id:"lanterna_te",x:90,y:46,label:"Lanterna traseira"},

    {id:"jante_de",x:23,y:60,label:"Jante dianteira"},
    {id:"pneu_de",x:23,y:67,label:"Pneu dianteiro"},

    {id:"jante_te",x:77,y:60,label:"Jante traseira"},
    {id:"pneu_te",x:77,y:67,label:"Pneu traseiro"}
];

const right:Hotspot[]=[
    {id:"lanterna_td",x:10,y:46,label:"Lanterna traseira"},
    {id:"para_lama_td",x:21,y:51,label:"Para-lama traseiro"},

    {id:"jante_td",x:23,y:60,label:"Jante traseira"},
    {id:"pneu_td",x:23,y:67,label:"Pneu traseiro"},

    {id:"vidro_fixo_td",x:28,y:39,label:"Vidro fixo traseiro"},

    {id:"vidro_td",x:41,y:39,label:"Vidro traseiro"},
    {id:"macaneta_td",x:34,y:47,label:"Maçaneta traseira"},
    {id:"porta_td",x:40,y:54,label:"Porta traseira"},

    {id:"saia_d",x:48,y:62,label:"Saia lateral"},

    {id:"vidro_dd",x:59,y:39,label:"Vidro dianteiro"},
    {id:"macaneta_dd",x:52,y:47,label:"Maçaneta dianteira"},
    {id:"porta_dd",x:58,y:54,label:"Porta dianteira"},

    {id:"retrovisor_d",x:68,y:35,label:"Retrovisor"},

    {id:"para_lama_dd",x:83,y:51,label:"Para-lama dianteiro"},
    {id:"farol_dd",x:92,y:47,label:"Farol dianteiro"},

    {id:"jante_dd",x:77,y:60,label:"Jante dianteira"},
    {id:"pneu_dd",x:77,y:67,label:"Pneu dianteiro"}
];

const top:Hotspot[]=[
    {id:"capo",x:50,y:17,label:"Capô"},
    {id:"para_brisa_d",x:50,y:30,label:"Para-brisa dianteiro"},

    {id:"retrovisor_e",x:30,y:36,label:"Retrovisor esquerdo"},
    {id:"retrovisor_d",x:70,y:36,label:"Retrovisor direito"},

    {id:"teto",x:50,y:49,label:"Teto"},

    {id:"para_brisa_t",x:50,y:67,label:"Para-brisa traseiro"},
    {id:"porta_malas",x:50,y:81,label:"Porta-malas"}
];

export default function VehicleInspectionDiagram({
    damages,
    referenceDamages=[],
    disabled=false,
    onSelectPart,
}:Props){
    const[
        selectedPart,
        setSelectedPart,
    ]=useState<string|null>(
        null,
    );

    const views=
        useMemo<ViewConfig[]>(
            ()=>[
                {
                    key:"front",
                    title:"Vista dianteira",
                    image:appUrl(
                        "images/checklists/vehicle-front.png",
                    ),
                    hotspots:front,
                },
                {
                    key:"rear",
                    title:"Vista traseira",
                    image:appUrl(
                        "images/checklists/vehicle-rear.png",
                    ),
                    hotspots:rear,
                },
                {
                    key:"left",
                    title:"Lateral esquerda",
                    image:appUrl(
                        "images/checklists/vehicle-left.png",
                    ),
                    hotspots:left,
                },
                {
                    key:"right",
                    title:"Lateral direita",
                    image:appUrl(
                        "images/checklists/vehicle-right.png",
                    ),
                    hotspots:right,
                },
                {
                    key:"top",
                    title:"Vista superior",
                    image:appUrl(
                        "images/checklists/vehicle-top.png",
                    ),
                    hotspots:top,
                },
            ],
            [],
        );

    function stateFor(
        part:VehiclePartDefinition,
    ){
        if(
            damages.some(
                damage=>
                    damage.part===
                    part.name,
            )
        ){
            return "current";
        }

        if(
            referenceDamages.some(
                damage=>
                    damage.part===
                    part.name,
            )
        ){
            return "reference";
        }

        return "clean";
    }

    function select(
        id:string,
    ){
        if(disabled){
            return;
        }

        const part=
            VEHICLE_PARTS.find(
                item=>
                    item.id===id,
            );

        if(!part){
            return;
        }

        setSelectedPart(
            id,
        );

        onSelectPart?.(
            part,
        );
    }

    return(
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h4 className="font-semibold text-slate-950">
                    Inspeção visual do veículo
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                    Selecione diretamente a peça que pretende inspecionar.
                </p>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                    <Legend
                        color="bg-indigo-600"
                        label="Selecionável"
                    />

                    {referenceDamages.length>0&&(
                        <Legend
                            color="bg-amber-500"
                            label="Dano da entrega"
                        />
                    )}

                    <Legend
                        color="bg-red-600"
                        label="Dano atual"
                    />
                </div>
            </div>

            <div className="grid gap-4 bg-slate-50/60 p-4 md:grid-cols-2 2xl:grid-cols-3">
                {views.map(({key,...viewProps})=>(
                        <VehicleView
                            key={key}
                            {...viewProps}
                            disabled={
                                disabled
                            }
                            selectedPart={
                                selectedPart
                            }
                            stateFor={
                                stateFor
                            }
                            onSelect={
                                select
                            }
                        />
                    ),
                )}
            </div>
        </div>
    );
}

function VehicleView({
    title,
    image,
    hotspots,
    disabled,
    selectedPart,
    stateFor,
    onSelect,
}:Omit<ViewConfig,"key">&{
    disabled:boolean;
    selectedPart:string|null;

    stateFor:(
        part:VehiclePartDefinition,
    )=>
        |"clean"
        |"reference"
        |"current";

    onSelect:(
        id:string,
    )=>void;
}){
    return(
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                    {title}
                </span>

                <span className="text-[10px] text-slate-400">
                    Pontos de inspeção
                </span>
            </div>

            <div className="relative aspect-[4/3] bg-white">
                <img
                    src={image}
                    alt={title}
                    draggable={false}
                    className="absolute inset-0 h-full w-full select-none object-contain"
                />

                {hotspots.map(
                    hotspot=>{
                        const part=
                            VEHICLE_PARTS.find(
                                item=>
                                    item.id===
                                    hotspot.id,
                            );

                        if(!part){
                            return null;
                        }

                        const state=
                            stateFor(
                                part,
                            );

                        const selected=
                            selectedPart===
                            hotspot.id;

                        return(
                            <button
                                key={
                                    hotspot.id
                                }
                                type="button"
                                disabled={
                                    disabled
                                }
                                title={
                                    hotspot.label
                                }
                                onClick={()=>
                                    onSelect(
                                        hotspot.id,
                                    )
                                }
                                style={{
                                    left:
                                        `${hotspot.x}%`,
                                    top:
                                        `${hotspot.y}%`,
                                }}
                                className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
                            >
                                <span
                                    className={[
                                        "block h-3.5 w-3.5 rounded-full border-2 border-white shadow-md ring-2 transition",
                                        state==="current"
                                            ?"bg-red-600 ring-red-200"
                                            :state==="reference"
                                                ?"bg-amber-500 ring-amber-200"
                                                :"bg-indigo-600 ring-indigo-200",
                                        selected
                                            ?"scale-150"
                                            :"group-hover:scale-125",
                                    ].join(" ")}
                                />

                                <span
                                    className={[
                                        "pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[10px] font-semibold text-white shadow-lg",
                                        selected
                                            ?"opacity-100"
                                            :"opacity-0 group-hover:opacity-100",
                                    ].join(" ")}
                                >
                                    {
                                        hotspot.label
                                    }
                                </span>
                            </button>
                        );
                    },
                )}
            </div>
        </article>
    );
}

function Legend({
    color,
    label,
}:{
    color:string;
    label:string;
}){
    return(
        <span className="inline-flex items-center gap-2">
            <span
                className={`h-2.5 w-2.5 rounded-full ${color}`}
            />
            {label}
        </span>
    );
}
