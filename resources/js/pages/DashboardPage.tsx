import {
    ArrowRight,
    Building2,
    Car,
    FileText,
    UserRound,
} from 'lucide-react';
import {
    Link,
} from 'react-router-dom';
import {
    useAuth,
} from '../contexts/AuthContext';
import {
    useTenant,
} from '../contexts/TenantContext';

const modules = [
    {
        title: 'Empresas',
        description:
            'Dados das empresas da organização.',
        href: '/empresas',
        icon: Building2,
    },
    {
        title: 'Motoristas',
        description:
            'Cadastro e contas de acesso.',
        href: '/motoristas',
        icon: UserRound,
    },
    {
        title: 'Veículos',
        description:
            'Frota, proprietários e aluguer.',
        href: '/veiculos',
        icon: Car,
    },
    {
        title: 'Contratos',
        description:
            'Contratos e assinaturas digitais.',
        href: '/contratos',
        icon: FileText,
    },
];

export default function DashboardPage() {
    const {
        user,
    } = useAuth();

    const {
        tenant,
        loading,
    } = useTenant();

    return (
        <div className="max-w-7xl mx-auto">
            <section className="mb-8">
                <p className="text-sm font-medium text-indigo-600 mb-2">
                    Dashboard
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    Olá, {user?.name}
                </h1>

                <p className="mt-2 text-slate-500">
                    {tenant
                        ? `A gerir ${tenant.nome}.`
                        : 'Bem-vindo ao FrotaPRO.'}
                </p>
            </section>

            {!loading &&
            !tenant &&
            user?.super_admin ? (
                <section className="rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-7 sm:p-10 overflow-hidden relative">
                    <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/20 blur-3xl rounded-full" />

                    <div className="relative max-w-2xl">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center mb-6">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>

                        <p className="text-sm font-medium text-indigo-300 mb-3">
                            Super Administrador
                        </p>

                        <h2 className="text-2xl sm:text-3xl font-semibold text-white">
                            Selecione uma organização para começar.
                        </h2>

                        <p className="mt-4 text-slate-400 leading-relaxed">
                            Utilize o seletor no topo do painel. Depois de escolher uma organização, todos os módulos serão carregados dentro desse contexto.
                        </p>
                    </div>
                </section>
            ) : (
                <>
                    <section className="rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-7 sm:p-9 mb-8 overflow-hidden relative">
                        <div className="absolute right-0 top-0 w-72 h-72 bg-indigo-500/20 blur-3xl rounded-full" />

                        <div className="relative max-w-2xl">
                            <span className="inline-flex px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                                Organização ativa
                            </span>

                            <h2 className="mt-5 text-2xl sm:text-3xl font-semibold text-white">
                                {tenant?.nome ??
                                    'FrotaPRO'}
                            </h2>

                            <p className="mt-3 text-slate-400 leading-relaxed">
                                Os módulos abaixo utilizam o contexto da organização selecionada.
                            </p>
                        </div>
                    </section>

                    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
                        {modules.map(
                            ({
                                title,
                                description,
                                href,
                                icon: Icon,
                            }) => (
                                <Link
                                    key={
                                        title
                                    }
                                    to={
                                        href
                                    }
                                    className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/60 transition"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    <h3 className="font-semibold text-slate-900">
                                        {
                                            title
                                        }
                                    </h3>

                                    <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                        {
                                            description
                                        }
                                    </p>

                                    <div className="mt-5 flex items-center gap-2 text-sm font-medium text-indigo-600">
                                        Abrir
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                                    </div>
                                </Link>
                            )
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
