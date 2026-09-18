import {
    FormEvent,
    useState,
} from 'react';
import {
    Navigate,
    useNavigate,
} from 'react-router-dom';
import {
    CheckCircle2,
    LoaderCircle,
    LockKeyhole,
    Mail,
    ShieldCheck,
    Truck,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
    const {
        user,
        loading,
        login,
    } = useAuth();

    const navigate =
        useNavigate();

    const [email, setEmail] =
        useState('');

    const [password, setPassword] =
        useState('');

    const [remember, setRemember] =
        useState(false);

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState('');

    if (!loading && user) {
        return (
            <Navigate
                to="/"
                replace
            />
        );
    }

    async function handleSubmit(
        event: FormEvent
    ) {
        event.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            await login({
                email,
                password,
                remember,
            });

            navigate('/', {
                replace: true,
            });
        } catch (exception) {
            if (
                axios.isAxiosError(
                    exception
                )
            ) {
                setError(
                    exception.response
                        ?.data?.message ??
                    'Não foi possível iniciar sessão.'
                );
            } else {
                setError(
                    'Não foi possível iniciar sessão.'
                );
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-950 lg:grid lg:grid-cols-2">
            <section className="hidden lg:flex relative overflow-hidden p-14 flex-col justify-between bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl" />

                <div className="relative">
                    <div className="inline-flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-950">
                            <Truck className="w-6 h-6 text-white" />
                        </div>

                        <div>
                            <div className="text-2xl font-bold text-white tracking-tight">
                                FrotaPRO
                            </div>
                            <div className="text-xs uppercase tracking-[0.22em] text-indigo-300">
                                Gestão TVDE
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative max-w-xl">
                    <p className="text-sm font-medium text-indigo-300 mb-4">
                        Gestão integrada da operação
                    </p>

                    <h1 className="text-5xl font-semibold leading-tight text-white tracking-tight">
                        A sua frota.
                        <br />
                        Toda num só lugar.
                    </h1>

                    <p className="mt-6 text-lg leading-relaxed text-slate-300 max-w-lg">
                        Motoristas, veículos,
                        proprietários, contratos e
                        alugueres numa plataforma
                        desenhada para operações
                        TVDE.
                    </p>

                    <div className="mt-10 grid gap-4">
                        {[
                            'Gestão multiempresa e multiutilizador',
                            'Contratos e assinaturas digitais',
                            'Controlo operacional por organização',
                        ].map((item) => (
                            <div
                                key={item}
                                className="flex items-center gap-3 text-slate-300"
                            >
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                <span>
                                    {item}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative flex items-center gap-2 text-sm text-slate-500">
                    <ShieldCheck className="w-4 h-4" />
                    Acesso protegido e isolado por organização
                </div>
            </section>

            <section className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                            <Truck className="w-5 h-5 text-white" />
                        </div>

                        <span className="text-2xl font-bold text-slate-950">
                            FrotaPRO
                        </span>
                    </div>

                    <div className="mb-9">
                        <p className="text-sm font-medium text-indigo-600 mb-2">
                            Bem-vindo
                        </p>

                        <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                            Entre na sua conta
                        </h2>

                        <p className="mt-2 text-slate-500">
                            Utilize as credenciais da
                            sua conta FrotaPRO.
                        </p>
                    </div>

                    <form
                        onSubmit={
                            handleSubmit
                        }
                        className="space-y-5"
                    >
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-slate-700 mb-2"
                            >
                                E-mail
                            </label>

                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(
                                        event
                                    ) =>
                                        setEmail(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    autoComplete="email"
                                    required
                                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    placeholder="nome@empresa.pt"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-slate-700 mb-2"
                            >
                                Palavra-passe
                            </label>

                            <div className="relative">
                                <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                                <input
                                    id="password"
                                    type="password"
                                    value={
                                        password
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setPassword(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    autoComplete="current-password"
                                    required
                                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-3 text-sm text-slate-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={
                                    remember
                                }
                                onChange={(
                                    event
                                ) =>
                                    setRemember(
                                        event
                                            .target
                                            .checked
                                    )
                                }
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                            />
                            Manter sessão iniciada
                        </label>

                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={
                                submitting
                            }
                            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                        >
                            {submitting ? (
                                <>
                                    <LoaderCircle className="w-5 h-5 animate-spin" />
                                    A entrar...
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </button>
                    </form>
                </div>
            </section>
        </main>
    );
}
