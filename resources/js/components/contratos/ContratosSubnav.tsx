import {
    ClipboardCheck,
    FileStack,
    FileText,
    Settings2,
    ShieldCheck,
} from "lucide-react";

import {
    NavLink,
} from "react-router-dom";

const items = [
    {
        to:"/contratos",
        label:"Contratos",
        icon:FileText,
        end:true,
    },
    {
        to:"/contratos/checklists",
        label:"Entregas e recolhas",
        icon:ClipboardCheck,
        end:false,
    },
    {
        to:"/contratos/configuracao",
        label:"Tipos e configuração",
        icon:Settings2,
        end:false,
    },
    {
        to:"/contratos/recursos",
        label:"Templates e workflows",
        icon:FileStack,
        end:false,
    },
    {
        to:"/contratos/rgpd",
        label:"RGPD",
        icon:ShieldCheck,
        end:false,
    },
];

export default function ContratosSubnav(){
    return (
        <nav className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex min-w-max gap-1">
                {items.map(
                    ({
                        to,
                        label,
                        icon:Icon,
                        end,
                    })=>(
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({
                                isActive,
                            })=>[
                                "inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition",
                                isActive
                                    ?"bg-indigo-600 text-white shadow-sm"
                                    :"text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                            ].join(" ")}
                        >
                            <Icon className="h-4 w-4 shrink-0"/>
                            {label}
                        </NavLink>
                    ),
                )}
            </div>
        </nav>
    );
}