import axios from 'axios';
import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, LoaderCircle, X } from 'lucide-react';
import api from '../../lib/api';
import type { Motorista } from '../../types/motorista';

interface Props {
    open: boolean;
    motorista: Motorista | null;
    onClose: () => void;
    onSuccess: () => Promise<void>;
}

export default function MotoristaAccountModal({
    open,
    motorista,
    onClose,
    onSuccess,
}: Props) {
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setPassword('');
            setConfirmation('');
            setError('');
        }
    }, [open]);

    if (!open || !motorista) {
        return null;
    }

    const motoristaId = motorista.id;
    const hasAccount = Boolean(motorista.user_id);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        setError('');
        setSubmitting(true);

        try {
            const payload = {
                password,
                password_confirmation: confirmation,
            };

            if (hasAccount) {
                await api.patch(
                    `/api/motoristas/${motoristaId}/conta/senha`,
                    payload
                );
            } else {
                await api.post(
                    `/api/motoristas/${motoristaId}/conta`,
                    payload
                );
            }

            await onSuccess();
            onClose();
        } catch (exception) {
            if (axios.isAxiosError(exception)) {
                const response = exception.response?.data;

                setError(
                    response?.errors?.password?.[0] ??
                        response?.errors?.conta?.[0] ??
                        response?.message ??
                        'Não foi possível atualizar a conta.'
                );
            } else {
                setError(
                    'Não foi possível atualizar a conta.'
                );
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
                <header className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <KeyRound className="w-5 h-5" />
                        </div>

                        <div>
                            <h2 className="font-semibold text-slate-950">
                                {hasAccount
                                    ? 'Alterar senha'
                                    : 'Criar conta de acesso'}
                            </h2>

                            <p className="text-sm text-slate-500">
                                {motorista.email ??
                                    'Sem e-mail cadastrado'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </header>

                <form
                    onSubmit={handleSubmit}
                    className="p-6"
                >
                    {!hasAccount &&
                        !motorista.email && (
                            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                                Cadastre um e-mail no motorista antes de criar a conta.
                            </div>
                        )}

                    {error && (
                        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Nova senha
                            </label>

                            <input
                                type="password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(
                                        event.target.value
                                    )
                                }
                                minLength={8}
                                required
                                className="w-full h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Confirmar senha
                            </label>

                            <input
                                type="password"
                                value={confirmation}
                                onChange={(event) =>
                                    setConfirmation(
                                        event.target.value
                                    )
                                }
                                minLength={8}
                                required
                                className="w-full h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={
                                submitting ||
                                (!hasAccount &&
                                    !motorista.email)
                            }
                            className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                        >
                            {submitting && (
                                <LoaderCircle className="w-4 h-4 animate-spin" />
                            )}

                            {hasAccount
                                ? 'Alterar senha'
                                : 'Criar conta'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
