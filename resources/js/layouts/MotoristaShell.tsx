import {useState} from 'react';
import {NavLink,Outlet,useNavigate} from 'react-router-dom';
import {
    Clock3,
    FileCheck2,
    LoaderCircle,
    LogOut,
    Menu,
    ReceiptText,
    Truck,
    X,
} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {useTenant} from '../contexts/TenantContext';

const navigation=[
    {
        to:'/portal/motorista/expediente',
        label:'Expediente',
        icon:Clock3,
    },
    {
    to:'/portal/motorista/multas',
    label:'Multas',
    icon:ReceiptText,
},
    {
        to:'/portal/motorista/registo-criminal',
        label:'Registo Criminal',
        icon:FileCheck2,
    },
    {
        to:'/portal/motorista/recibos-verdes',
        label:'Recibos Verdes',
        icon:ReceiptText,
    },
];

export default function MotoristaShell(){
    const {user,logout}=useAuth();
    const {
        tenants,
        tenant,
        loading,
        selectTenant,
    }=useTenant();

    const navigate=useNavigate();
    const [mobileOpen,setMobileOpen]=useState(false);
    const [switching,setSwitching]=useState(false);

    async function changeTenant(id:string){
        if(!id){
            return;
        }

        setSwitching(true);

        try{
            await selectTenant(id);
            navigate('/portal/motorista/expediente');
        }finally{
            setSwitching(false);
        }
    }

    const sidebar=(
        <div className="h-full flex flex-col bg-slate-950 text-slate-300">
            <div className="h-20 px-6 flex items-center gap-3 border-b border-white/10">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white"/>
                </div>

                <div>
                    <div className="font-bold text-xl text-white tracking-tight">
                        FrotaPRO
                    </div>

                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        Portal do Motorista
                    </div>
                </div>
            </div>

            <div className="px-4 pt-6 pb-3">
                <div className="px-3 text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-600">
                    Minha área
                </div>
            </div>

            <nav className="px-3 space-y-1 flex-1">
                {navigation.map(({to,label,icon:Icon})=>(
                    <NavLink
                        key={to}
                        to={to}
                        onClick={()=>setMobileOpen(false)}
                        className={({isActive})=>[
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                            isActive
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white',
                        ].join(' ')}
                    >
                        <Icon className="w-5 h-5"/>
                        {label}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-white/10">
                <div className="px-3 py-3 mb-2 rounded-xl bg-white/5">
                    <div className="text-sm font-medium text-white truncate">
                        {user?.name}
                    </div>

                    <div className="text-xs text-slate-500 truncate mt-0.5">
                        {tenant?.nome ?? 'Sem organização'}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-300 transition"
                >
                    <LogOut className="w-5 h-5"/>
                    Terminar sessão
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">
                {sidebar}
            </aside>

            {mobileOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Fechar menu"
                        onClick={()=>setMobileOpen(false)}
                        className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
                    />

                    <aside className="lg:hidden fixed inset-y-0 left-0 w-72 z-50">
                        {sidebar}
                    </aside>
                </>
            )}

            <div className="lg:pl-64">
                <header className="sticky top-0 z-20 min-h-20 bg-white/90 backdrop-blur border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={()=>setMobileOpen(!mobileOpen)}
                            className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600"
                        >
                            {mobileOpen
                                ? <X className="w-5 h-5"/>
                                : <Menu className="w-5 h-5"/>
                            }
                        </button>

                        <div>
                            <p className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                Organização
                            </p>

                            {loading ? (
                                <LoaderCircle className="w-4 h-4 animate-spin text-indigo-600"/>
                            ) : tenants.length>1 ? (
                                <div className="relative">
                                    <select
                                        value={tenant?.id ?? ''}
                                        disabled={switching}
                                        onChange={event=>changeTenant(event.target.value)}
                                        className="h-10 max-w-[260px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
                                    >
                                        {tenants.map(item=>(
                                            <option key={item.id} value={item.id}>
                                                {item.nome}
                                            </option>
                                        ))}
                                    </select>

                                    {switching && (
                                        <LoaderCircle className="absolute right-3 top-3 w-4 h-4 animate-spin text-indigo-600"/>
                                    )}
                                </div>
                            ) : (
                                <h2 className="font-semibold text-slate-900">
                                    {tenant?.nome ?? 'Sem organização'}
                                </h2>
                            )}
                        </div>
                    </div>

                    <div className="hidden sm:block text-right">
                        <div className="text-sm font-medium text-slate-900">
                            {user?.name}
                        </div>

                        <div className="text-xs text-slate-500">
                            Motorista
                        </div>
                    </div>
                </header>

                <main className="p-4 sm:p-6 lg:p-8">
                    <Outlet/>
                </main>
            </div>
        </div>
    );
}
