import axios from 'axios';
import {useMemo,useState} from 'react';
import type {FormEvent,ReactNode} from 'react';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import {
    AlertCircle,
    Building2,
    Eye,
    LoaderCircle,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Plus,
    RefreshCw,
    Search,
    Store,
    Trash2,
    UserRound,
    Wrench,
    X,
} from 'lucide-react';
import api from '../../lib/api';
import {useTenant} from '../../contexts/TenantContext';
import type {
    FornecedorPayload,
    FornecedorTipo,
    ManutencaoFornecedor,
} from '../../types/manutencao';

type TipoFilter='todos'|FornecedorTipo;
type AtivoFilter='todos'|'ativos'|'inativos';

interface FormState {
    tipo:FornecedorTipo;
    nome:string;
    nif:string;
    email:string;
    telemovel:string;
    morada:string;
    contacto_responsavel:string;
    observacoes:string;
    ativo:boolean;
}

const inputClass='w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

const tipoLabels:Record<FornecedorTipo,string>={
    oficina:'Oficina',
    pecas:'Peças',
    geral:'Geral',
};

function emptyForm():FormState{
    return {
        tipo:'geral',
        nome:'',
        nif:'',
        email:'',
        telemovel:'',
        morada:'',
        contacto_responsavel:'',
        observacoes:'',
        ativo:true,
    };
}

function apiError(error:unknown):string{
    if(axios.isAxiosError(error)){
        const errors=error.response?.data?.errors;

        if(errors){
            const first=Object.values(errors)[0];

            if(Array.isArray(first) && first.length){
                return String(first[0]);
            }
        }

        return error.response?.data?.message
            ?? 'Não foi possível concluir a operação.';
    }

    return 'Não foi possível concluir a operação.';
}

export default function FornecedoresTab(){
    const {tenant}=useTenant();
    const queryClient=useQueryClient();

    const [search,setSearch]=useState('');
    const [tipo,setTipo]=useState<TipoFilter>('todos');
    const [ativo,setAtivo]=useState<AtivoFilter>('todos');

    const [formOpen,setFormOpen]=useState(false);
    const [editing,setEditing]=useState<ManutencaoFornecedor|null>(null);
    const [form,setForm]=useState<FormState>(emptyForm());

    const [selectedId,setSelectedId]=useState<string|null>(null);
    const [error,setError]=useState<string|null>(null);

    const fornecedoresQuery=useQuery({
        queryKey:[
            'fornecedores',
            tenant?.id,
        ],
        enabled:Boolean(tenant?.id),
        queryFn:async()=>{
            const response=await api.get(
                '/api/fornecedores'
            );

            return response.data.data as ManutencaoFornecedor[];
        },
    });

    const detailQuery=useQuery({
        queryKey:[
            'fornecedor',
            tenant?.id,
            selectedId,
        ],
        enabled:Boolean(
            tenant?.id &&
            selectedId
        ),
        queryFn:async()=>{
            const response=await api.get(
                `/api/fornecedores/${selectedId}`
            );

            return response.data.data as ManutencaoFornecedor;
        },
    });

    async function refresh(
        id?:string|null
    ){
        await queryClient.invalidateQueries({
            queryKey:[
                'fornecedores',
                tenant?.id,
            ],
        });

        await queryClient.invalidateQueries({
            queryKey:[
                'pecas',
                tenant?.id,
            ],
        });

        await queryClient.invalidateQueries({
            queryKey:[
                'estoque',
                tenant?.id,
            ],
        });

        if(id){
            await queryClient.invalidateQueries({
                queryKey:[
                    'fornecedor',
                    tenant?.id,
                    id,
                ],
            });
        }
    }

    function update<K extends keyof FormState>(
        field:K,
        value:FormState[K]
    ){
        setForm(current=>({
            ...current,
            [field]:value,
        }));
    }

    function openCreate(){
        setError(null);
        setEditing(null);
        setForm(emptyForm());
        setFormOpen(true);
    }

    function openEdit(
        fornecedor:ManutencaoFornecedor
    ){
        setError(null);
        setEditing(fornecedor);

        setForm({
            tipo:fornecedor.tipo,
            nome:fornecedor.nome,
            nif:fornecedor.nif ?? '',
            email:fornecedor.email ?? '',
            telemovel:fornecedor.telemovel ?? '',
            morada:fornecedor.morada ?? '',
            contacto_responsavel:
                fornecedor.contacto_responsavel ?? '',
            observacoes:fornecedor.observacoes ?? '',
            ativo:fornecedor.ativo,
        });

        setFormOpen(true);
    }

    const saveMutation=useMutation({
        mutationFn:async()=>{
            const payload:FornecedorPayload={
                tipo:form.tipo,
                nome:form.nome.trim(),
                nif:form.nif.trim() || null,
                email:form.email.trim() || null,
                telemovel:form.telemovel.trim() || null,
                morada:form.morada.trim() || null,
                contacto_responsavel:
                    form.contacto_responsavel.trim() || null,
                observacoes:
                    form.observacoes.trim() || null,
                ativo:form.ativo,
            };

            if(editing){
                const response=await api.patch(
                    `/api/fornecedores/${editing.id}`,
                    payload
                );

                return response.data.data as ManutencaoFornecedor;
            }

            const response=await api.post(
                '/api/fornecedores',
                payload
            );

            return response.data.data as ManutencaoFornecedor;
        },
        onMutate:()=>{
            setError(null);
        },
        onSuccess:async fornecedor=>{
            setFormOpen(false);
            setEditing(null);
            await refresh(fornecedor.id);
        },
        onError:error=>{
            setError(apiError(error));
        },
    });

    const deleteMutation=useMutation({
        mutationFn:async(
            fornecedor:ManutencaoFornecedor
        )=>{
            if(
                !window.confirm(
                    `Eliminar o fornecedor "${fornecedor.nome}"?`
                )
            ){
                throw new Error('__cancelled__');
            }

            await api.delete(
                `/api/fornecedores/${fornecedor.id}`
            );
        },
        onMutate:()=>{
            setError(null);
        },
        onSuccess:async()=>{
            setSelectedId(null);
            await refresh();
        },
        onError:error=>{
            if(
                error instanceof Error &&
                error.message==='__cancelled__'
            ){
                return;
            }

            setError(apiError(error));
        },
    });

    function submit(
        event:FormEvent<HTMLFormElement>
    ){
        event.preventDefault();
        saveMutation.mutate();
    }

    const fornecedores=
        fornecedoresQuery.data ?? [];

    const filtered=useMemo(()=>{
        const term=search
            .trim()
            .toLocaleLowerCase('pt-PT');

        return fornecedores.filter(
            fornecedor=>{
                if(
                    tipo!=='todos' &&
                    fornecedor.tipo!==tipo
                ){
                    return false;
                }

                if(
                    ativo==='ativos' &&
                    !fornecedor.ativo
                ){
                    return false;
                }

                if(
                    ativo==='inativos' &&
                    fornecedor.ativo
                ){
                    return false;
                }

                if(!term){
                    return true;
                }

                return [
                    fornecedor.nome,
                    fornecedor.nif,
                    fornecedor.email,
                    fornecedor.telemovel,
                    fornecedor.morada,
                    fornecedor.contacto_responsavel,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLocaleLowerCase('pt-PT')
                    .includes(term);
            }
        );
    },[
        fornecedores,
        search,
        tipo,
        ativo,
    ]);

    const stats=useMemo(()=>({
        total:fornecedores.length,

        oficinas:fornecedores.filter(
            fornecedor=>
                fornecedor.tipo==='oficina'
        ).length,

        pecas:fornecedores.filter(
            fornecedor=>
                fornecedor.tipo==='pecas'
        ).length,

        ativos:fornecedores.filter(
            fornecedor=>fornecedor.ativo
        ).length,
    }),[fornecedores]);

    const selected=
        detailQuery.data ?? null;

    return (
        <div className="space-y-5">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={openCreate}
                    className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                    <Plus className="w-5 h-5"/>
                    Novo fornecedor
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0"/>

                    <p className="text-sm text-red-700">
                        {error}
                    </p>
                </div>
            )}

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Stat
                    label="Fornecedores"
                    value={String(stats.total)}
                    icon={Building2}
                />

                <Stat
                    label="Oficinas"
                    value={String(stats.oficinas)}
                    icon={Wrench}
                />

                <Stat
                    label="Fornecedores de peças"
                    value={String(stats.pecas)}
                    icon={Store}
                />

                <Stat
                    label="Ativos"
                    value={String(stats.ativos)}
                    icon={Building2}
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_190px_170px_auto]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>

                        <input
                            value={search}
                            onChange={event=>
                                setSearch(event.target.value)
                            }
                            placeholder="Pesquisar fornecedor, NIF, email, contacto..."
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>

                    <select
                        value={tipo}
                        onChange={event=>
                            setTipo(event.target.value as TipoFilter)
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
                    >
                        <option value="todos">
                            Todos os tipos
                        </option>

                        <option value="oficina">
                            Oficinas
                        </option>

                        <option value="pecas">
                            Peças
                        </option>

                        <option value="geral">
                            Geral
                        </option>
                    </select>

                    <select
                        value={ativo}
                        onChange={event=>
                            setAtivo(event.target.value as AtivoFilter)
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
                    >
                        <option value="todos">
                            Todos
                        </option>

                        <option value="ativos">
                            Ativos
                        </option>

                        <option value="inativos">
                            Inativos
                        </option>
                    </select>

                    <button
                        type="button"
                        onClick={()=>
                            fornecedoresQuery.refetch()
                        }
                        disabled={
                            fornecedoresQuery.isFetching
                        }
                        className="h-11 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                'w-4 h-4',
                                fornecedoresQuery.isFetching
                                    ? 'animate-spin'
                                    : '',
                            ].join(' ')}
                        />

                        Atualizar
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                {fornecedoresQuery.isLoading ? (
                    <Loader/>
                ) : fornecedoresQuery.isError ? (
                    <ErrorState
                        message={apiError(
                            fornecedoresQuery.error
                        )}
                    />
                ) : filtered.length===0 ? (
                    <EmptyState/>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <Th>Fornecedor</Th>
                                    <Th>Tipo</Th>
                                    <Th>NIF</Th>
                                    <Th>Responsável</Th>
                                    <Th>Contacto</Th>
                                    <Th>Email</Th>
                                    <Th>Estado</Th>
                                    <th className="w-32"/>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(
                                    fornecedor=>(
                                        <tr
                                            key={fornecedor.id}
                                            className="hover:bg-slate-50/60"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {fornecedor.nome}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500 max-w-[260px] truncate">
                                                    {fornecedor.morada
                                                        || 'Sem morada'
                                                    }
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                                    {tipoLabels[
                                                        fornecedor.tipo
                                                    ]}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {fornecedor.nif ?? '—'}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {fornecedor.contacto_responsavel
                                                    ?? '—'
                                                }
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {fornecedor.telemovel ?? '—'}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {fornecedor.email ?? '—'}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={[
                                                        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                                        fornecedor.ativo
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : 'bg-slate-100 text-slate-500',
                                                    ].join(' ')}
                                                >
                                                    {fornecedor.ativo
                                                        ? 'Ativo'
                                                        : 'Inativo'
                                                    }
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={()=>{
                                                            setError(null);
                                                            setSelectedId(
                                                                fornecedor.id
                                                            );
                                                        }}
                                                        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                                                        title="Ver detalhes"
                                                    >
                                                        <Eye className="w-4 h-4"/>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={()=>
                                                            openEdit(
                                                                fornecedor
                                                            )
                                                        }
                                                        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                                                        title="Editar fornecedor"
                                                    >
                                                        <Pencil className="w-4 h-4"/>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={()=>
                                                            deleteMutation.mutate(
                                                                fornecedor
                                                            )
                                                        }
                                                        disabled={
                                                            deleteMutation.isPending
                                                        }
                                                        className="w-9 h-9 rounded-lg border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-50 disabled:opacity-50"
                                                        title="Eliminar fornecedor"
                                                    >
                                                        <Trash2 className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {formOpen && (
                <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <ModalHeader
                            title={
                                editing
                                    ? 'Editar fornecedor'
                                    : 'Novo fornecedor'
                            }
                            onClose={()=>{
                                setFormOpen(false);
                                setEditing(null);
                            }}
                        />

                        <form
                            onSubmit={submit}
                            className="p-6 space-y-5"
                        >
                            {saveMutation.isError && (
                                <ErrorBox
                                    message={apiError(
                                        saveMutation.error
                                    )}
                                />
                            )}

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Tipo *">
                                    <select
                                        required
                                        value={form.tipo}
                                        onChange={event=>
                                            update(
                                                'tipo',
                                                event.target.value as FornecedorTipo
                                            )
                                        }
                                        className={inputClass}
                                    >
                                        <option value="oficina">
                                            Oficina
                                        </option>

                                        <option value="pecas">
                                            Peças
                                        </option>

                                        <option value="geral">
                                            Geral
                                        </option>
                                    </select>
                                </Field>

                                <Field label="NIF">
                                    <input
                                        maxLength={30}
                                        value={form.nif}
                                        onChange={event=>
                                            update(
                                                'nif',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <Field label="Nome *">
                                <input
                                    required
                                    maxLength={255}
                                    value={form.nome}
                                    onChange={event=>
                                        update(
                                            'nome',
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />
                            </Field>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Email">
                                    <input
                                        type="email"
                                        maxLength={255}
                                        value={form.email}
                                        onChange={event=>
                                            update(
                                                'email',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Telemóvel">
                                    <input
                                        maxLength={50}
                                        value={form.telemovel}
                                        onChange={event=>
                                            update(
                                                'telemovel',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <Field label="Contacto responsável">
                                <input
                                    maxLength={255}
                                    value={form.contacto_responsavel}
                                    onChange={event=>
                                        update(
                                            'contacto_responsavel',
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Morada">
                                <textarea
                                    maxLength={2000}
                                    rows={3}
                                    value={form.morada}
                                    onChange={event=>
                                        update(
                                            'morada',
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                            </Field>

                            <Field label="Observações">
                                <textarea
                                    maxLength={10000}
                                    rows={4}
                                    value={form.observacoes}
                                    onChange={event=>
                                        update(
                                            'observacoes',
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                            </Field>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.ativo}
                                    onChange={event=>
                                        update(
                                            'ativo',
                                            event.target.checked
                                        )
                                    }
                                    className="mt-1 w-4 h-4 rounded border-slate-300"
                                />

                                <span>
                                    <span className="block text-sm font-medium text-slate-800">
                                        Fornecedor ativo
                                    </span>

                                    <span className="block mt-1 text-xs text-slate-500">
                                        Fornecedores inativos permanecem no histórico, mas podem ser retirados das novas operações.
                                    </span>
                                </span>
                            </label>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={()=>{
                                        setFormOpen(false);
                                        setEditing(null);
                                    }}
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saveMutation.isPending ||
                                        !form.nome.trim()
                                    }
                                    className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saveMutation.isPending && (
                                        <LoaderCircle className="w-4 h-4 animate-spin"/>
                                    )}

                                    {editing
                                        ? 'Guardar alterações'
                                        : 'Criar fornecedor'
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedId && (
                <div className="fixed inset-0 z-[65] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <ModalHeader
                            title="Detalhes do fornecedor"
                            onClose={()=>
                                setSelectedId(null)
                            }
                        />

                        {detailQuery.isLoading ? (
                            <Loader/>
                        ) : detailQuery.isError || !selected ? (
                            <ErrorState
                                message={apiError(
                                    detailQuery.error
                                )}
                            />
                        ) : (
                            <FornecedorDetail
                                fornecedor={selected}
                                onEdit={()=>{
                                    openEdit(selected);
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function FornecedorDetail({
    fornecedor,
    onEdit,
}:{
    fornecedor:ManutencaoFornecedor;
    onEdit:()=>void;
}){
    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold text-slate-950">
                            {fornecedor.nome}
                        </h3>

                        <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                            {tipoLabels[fornecedor.tipo]}
                        </span>

                        <span
                            className={[
                                'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                fornecedor.ativo
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500',
                            ].join(' ')}
                        >
                            {fornecedor.ativo
                                ? 'Ativo'
                                : 'Inativo'
                            }
                        </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                        NIF: {fornecedor.nif ?? 'Não indicado'}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onEdit}
                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50"
                >
                    <Pencil className="w-4 h-4"/>
                    Editar
                </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <ContactCard
                    icon={UserRound}
                    label="Responsável"
                    value={
                        fornecedor.contacto_responsavel
                        ?? 'Não indicado'
                    }
                />

                <ContactCard
                    icon={Phone}
                    label="Telemóvel"
                    value={
                        fornecedor.telemovel
                        ?? 'Não indicado'
                    }
                />

                <ContactCard
                    icon={Mail}
                    label="Email"
                    value={
                        fornecedor.email
                        ?? 'Não indicado'
                    }
                />

                <ContactCard
                    icon={MapPin}
                    label="Morada"
                    value={
                        fornecedor.morada
                        ?? 'Não indicada'
                    }
                />
            </div>

            <div>
                <h4 className="font-semibold text-slate-900">
                    Utilização
                </h4>

                <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Counter
                        label="Peças"
                        value={
                            fornecedor.pecas_preferenciais_count
                            ?? 0
                        }
                    />

                    <Counter
                        label="Compras"
                        value={
                            fornecedor.compras_count
                            ?? 0
                        }
                    />

                    <Counter
                        label="Manutenções"
                        value={
                            fornecedor.manutencoes_count
                            ?? 0
                        }
                    />

                    <Counter
                        label="Garantias"
                        value={
                            fornecedor.garantias_count
                            ?? 0
                        }
                    />
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-5">
                <h4 className="font-semibold text-slate-900">
                    Observações
                </h4>

                <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">
                    {fornecedor.observacoes
                        || 'Sem observações.'
                    }
                </p>
            </div>
        </div>
    );
}

function ContactCard({
    icon:Icon,
    label,
    value,
}:{
    icon:typeof Building2;
    label:string;
    value:string;
}){
    return (
        <div className="rounded-xl bg-slate-50 p-4 flex gap-3">
            <Icon className="w-5 h-5 text-indigo-600 shrink-0"/>

            <div className="min-w-0">
                <p className="text-xs text-slate-500">
                    {label}
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900 break-words">
                    {value}
                </p>
            </div>
        </div>
    );
}

function Counter({
    label,
    value,
}:{
    label:string;
    value:number;
}){
    return (
        <div className="rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-slate-950">
                {value}
            </p>

            <p className="mt-1 text-xs text-slate-500">
                {label}
            </p>
        </div>
    );
}

function ModalHeader({
    title,
    onClose,
}:{
    title:string;
    onClose:()=>void;
}){
    return (
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-950">
                {title}
            </h3>

            <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
            >
                <X className="w-5 h-5"/>
            </button>
        </div>
    );
}

function Field({
    label,
    children,
}:{
    label:string;
    children:ReactNode;
}){
    return (
        <label className="block">
            <span className="block mb-1 text-sm font-medium text-slate-700">
                {label}
            </span>

            {children}
        </label>
    );
}

function Stat({
    label,
    value,
    icon:Icon,
}:{
    label:string;
    value:string;
    icon:typeof Building2;
}){
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm text-slate-500">
                        {label}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-950">
                        {value}
                    </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Icon className="w-5 h-5"/>
                </div>
            </div>
        </div>
    );
}

function ErrorBox({
    message,
}:{
    message:string;
}){
    return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0"/>

            <p className="text-sm text-red-700">
                {message}
            </p>
        </div>
    );
}

function Loader(){
    return (
        <div className="py-20 flex justify-center">
            <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600"/>
        </div>
    );
}

function ErrorState({
    message,
}:{
    message:string;
}){
    return (
        <div className="py-16 px-6 text-center">
            <AlertCircle className="mx-auto w-9 h-9 text-red-500"/>

            <p className="mt-3 font-semibold text-slate-800">
                Não foi possível carregar os dados.
            </p>

            <p className="mt-1 text-sm text-slate-500">
                {message}
            </p>
        </div>
    );
}

function EmptyState(){
    return (
        <div className="py-16 text-center">
            <Building2 className="mx-auto w-10 h-10 text-slate-300"/>

            <p className="mt-3 font-semibold text-slate-700">
                Nenhum fornecedor encontrado.
            </p>

            <p className="mt-1 text-sm text-slate-500">
                Ajuste os filtros ou cadastre um novo fornecedor.
            </p>
        </div>
    );
}

function Th({
    children,
}:{
    children:string;
}){
    return (
        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}
