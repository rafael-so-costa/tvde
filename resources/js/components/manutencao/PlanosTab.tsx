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
    CalendarClock,
    Car,
    CheckCircle2,
    Eye,
    Gauge,
    LoaderCircle,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    TriangleAlert,
    Wrench,
    X,
} from 'lucide-react';
import api from '../../lib/api';
import {useTenant} from '../../contexts/TenantContext';
import type {
    ManutencaoPlano,
    ManutencaoPlanoPayload,
    ManutencaoPlanoSituacao,
    ManutencaoPlanoVeiculoPayload,
} from '../../types/manutencao';

interface PlanoFormState {
    nome:string;
    tipo_servico:string;
    descricao:string;
    intervalo_km:string;
    intervalo_meses:string;
    alerta_antecedencia_km:string;
    alerta_antecedencia_dias:string;
    ativo:boolean;
}

interface VinculoFormState {
    veiculo_id:string;
    ultimo_km:string;
    ultima_data:string;
    ativo:boolean;
}

interface VeiculoLookup {
    id:string;
    matricula:string;
    marca:string|null;
    modelo:string|null;
    km_atual:number|null;
    disponibilidade:string|null;
}

const inputClass='w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

const situacaoLabels:Record<
    ManutencaoPlanoSituacao,
    string
>={
    vencida:'Vencida',
    proxima:'Próxima',
    ok:'Em dia',
};

const situacaoClasses:Record<
    ManutencaoPlanoSituacao,
    string
>={
    vencida:'bg-red-50 text-red-700',
    proxima:'bg-amber-50 text-amber-700',
    ok:'bg-emerald-50 text-emerald-700',
};

function emptyPlano():PlanoFormState{
    return {
        nome:'',
        tipo_servico:'',
        descricao:'',
        intervalo_km:'',
        intervalo_meses:'',
        alerta_antecedencia_km:'1000',
        alerta_antecedencia_dias:'7',
        ativo:true,
    };
}

function emptyVinculo():VinculoFormState{
    return {
        veiculo_id:'',
        ultimo_km:'',
        ultima_data:'',
        ativo:true,
    };
}

function apiError(error:unknown):string{
    if(axios.isAxiosError(error)){
        const errors=
            error.response
                ?.data
                ?.errors;

        if(errors){
            const first=
                Object.values(
                    errors
                )[0];

            if(
                Array.isArray(first) &&
                first.length
            ){
                return String(first[0]);
            }
        }

        return error.response
            ?.data
            ?.message
            ?? 'Não foi possível concluir a operação.';
    }

    return 'Não foi possível concluir a operação.';
}

function number(
    value:number|null|undefined
):string{
    if(value===null || value===undefined){
        return '—';
    }

    return value.toLocaleString('pt-PT');
}

function date(
    value:string|null|undefined
):string{
    if(!value){
        return '—';
    }

    const raw=value.slice(0,10);
    const [year,month,day]=raw.split('-');

    if(year && month && day){
        return `${day}/${month}/${year}`;
    }

    return value;
}

export default function PlanosTab(){
    const {tenant}=useTenant();
    const queryClient=useQueryClient();

    const [search,setSearch]=useState('');
    const [showInactive,setShowInactive]=useState(false);

    const [selectedId,setSelectedId]=
        useState<string|null>(null);

    const [editing,setEditing]=
        useState<ManutencaoPlano|null>(
            null
        );

    const [formOpen,setFormOpen]=
        useState(false);

    const [form,setForm]=
        useState<PlanoFormState>(
            emptyPlano()
        );

    const [vinculoPlano,setVinculoPlano]=
        useState<ManutencaoPlano|null>(
            null
        );

    const [vinculo,setVinculo]=
        useState<VinculoFormState>(
            emptyVinculo()
        );

    const [error,setError]=
        useState<string|null>(
            null
        );

    const planosQuery=useQuery({
        queryKey:[
            'manutencao-planos',
            tenant?.id,
        ],

        enabled:Boolean(
            tenant?.id
        ),

        queryFn:async()=>{
            const response=
                await api.get(
                    '/api/manutencao-planos'
                );

            return response
                .data
                .data as ManutencaoPlano[];
        },
    });

    const detailQuery=useQuery({
        queryKey:[
            'manutencao-plano',
            tenant?.id,
            selectedId,
        ],

        enabled:Boolean(
            tenant?.id &&
            selectedId
        ),

        queryFn:async()=>{
            const response=
                await api.get(
                    `/api/manutencao-planos/${selectedId}`
                );

            return response
                .data
                .data as ManutencaoPlano;
        },
    });

    const veiculosQuery=useQuery({
        queryKey:[
            'veiculos',
            tenant?.id,
            'planos-manutencao',
        ],

        enabled:Boolean(
            tenant?.id
        ),

        queryFn:async()=>{
            const response=
                await api.get(
                    '/api/veiculos'
                );

            return response
                .data
                .data as VeiculoLookup[];
        },
    });

    async function refresh(
        id?:string|null
    ){
        await queryClient.invalidateQueries({
            queryKey:[
                'manutencao-planos',
                tenant?.id,
            ],
        });

        if(id){
            await queryClient.invalidateQueries({
                queryKey:[
                    'manutencao-plano',
                    tenant?.id,
                    id,
                ],
            });
        }
    }

    function openCreate(){
        setError(null);
        setEditing(null);
        setForm(emptyPlano());
        setFormOpen(true);
    }

    function openEdit(
        plano:ManutencaoPlano
    ){
        setError(null);
        setEditing(plano);

        setForm({
            nome:plano.nome,
            tipo_servico:
                plano.tipo_servico,

            descricao:
                plano.descricao
                ?? '',

            intervalo_km:
                plano.intervalo_km===null
                    ? ''
                    : String(
                        plano.intervalo_km
                    ),

            intervalo_meses:
                plano.intervalo_meses===null
                    ? ''
                    : String(
                        plano.intervalo_meses
                    ),

            alerta_antecedencia_km:
                String(
                    plano
                        .alerta_antecedencia_km
                ),

            alerta_antecedencia_dias:
                String(
                    plano
                        .alerta_antecedencia_dias
                ),

            ativo:plano.ativo,
        });

        setFormOpen(true);
    }

    function openVinculo(
        plano:ManutencaoPlano
    ){
        setError(null);
        setVinculoPlano(plano);
        setVinculo(emptyVinculo());
    }

    function update<
        K extends keyof PlanoFormState
    >(
        field:K,
        value:PlanoFormState[K]
    ){
        setForm(current=>({
            ...current,
            [field]:value,
        }));
    }

    const saveMutation=useMutation({
        mutationFn:async()=>{
            const payload:
                ManutencaoPlanoPayload={
                    nome:
                        form.nome.trim(),

                    tipo_servico:
                        form
                            .tipo_servico
                            .trim(),

                    descricao:
                        form
                            .descricao
                            .trim()
                        || null,

                    intervalo_km:
                        form.intervalo_km===
                        ''
                            ? null
                            : Number(
                                form
                                    .intervalo_km
                            ),

                    intervalo_meses:
                        form.intervalo_meses===
                        ''
                            ? null
                            : Number(
                                form
                                    .intervalo_meses
                            ),

                    alerta_antecedencia_km:
                        Number(
                            form
                                .alerta_antecedencia_km
                        ),

                    alerta_antecedencia_dias:
                        Number(
                            form
                                .alerta_antecedencia_dias
                        ),

                    ativo:
                        form.ativo,
                };

            if(editing){
                const response=
                    await api.patch(
                        `/api/manutencao-planos/${editing.id}`,
                        payload
                    );

                return response
                    .data
                    .data as ManutencaoPlano;
            }

            const response=
                await api.post(
                    '/api/manutencao-planos',
                    payload
                );

            return response
                .data
                .data as ManutencaoPlano;
        },

        onMutate:()=>{
            setError(null);
        },

        onSuccess:async plano=>{
            setFormOpen(false);
            setEditing(null);
            setSelectedId(plano.id);

            await refresh(
                plano.id
            );
        },

        onError:error=>{
            setError(
                apiError(error)
            );
        },
    });

    const deleteMutation=useMutation({
        mutationFn:async(
            plano:ManutencaoPlano
        )=>{
            if(
                !window.confirm(
                    `Eliminar o plano "${plano.nome}"?`
                )
            ){
                throw new Error(
                    '__cancelled__'
                );
            }

            await api.delete(
                `/api/manutencao-planos/${plano.id}`
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
                error.message===
                    '__cancelled__'
            ){
                return;
            }

            setError(
                apiError(error)
            );
        },
    });

    const vinculoMutation=useMutation({
        mutationFn:async()=>{
            if(!vinculoPlano){
                return;
            }

            const payload:
                ManutencaoPlanoVeiculoPayload={
                    veiculo_id:
                        vinculo.veiculo_id,

                    ultimo_km:
                        vinculo.ultimo_km===
                        ''
                            ? null
                            : Number(
                                vinculo
                                    .ultimo_km
                            ),

                    ultima_data:
                        vinculo.ultima_data
                        || null,

                    ativo:
                        vinculo.ativo,
                };

            await api.post(
                `/api/manutencao-planos/${vinculoPlano.id}/veiculos`,
                payload
            );
        },

        onMutate:()=>{
            setError(null);
        },

        onSuccess:async()=>{
            const id=
                vinculoPlano?.id
                ?? null;

            setVinculoPlano(null);
            setVinculo(
                emptyVinculo()
            );

            await refresh(id);
        },

        onError:error=>{
            setError(
                apiError(error)
            );
        },
    });

    function submitPlano(
        event:FormEvent<HTMLFormElement>
    ){
        event.preventDefault();
        saveMutation.mutate();
    }

    function submitVinculo(
        event:FormEvent<HTMLFormElement>
    ){
        event.preventDefault();
        vinculoMutation.mutate();
    }

    const planos=
        planosQuery.data
        ?? [];

    const filtered=useMemo(()=>{
        const term=
            search
                .trim()
                .toLocaleLowerCase(
                    'pt-PT'
                );

        return planos.filter(
            plano=>{
                if(
                    !showInactive &&
                    !plano.ativo
                ){
                    return false;
                }

                if(!term){
                    return true;
                }

                return [
                    plano.nome,
                    plano.tipo_servico,
                    plano.descricao,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLocaleLowerCase(
                        'pt-PT'
                    )
                    .includes(term);
            }
        );
    },[
        planos,
        search,
        showInactive,
    ]);

    const stats=useMemo(()=>{
        const vinculos=
            planos.flatMap(
                plano=>
                    plano.veiculos
                    ?? []
            );

        return {
            planos:
                planos.length,

            veiculos:
                vinculos.filter(
                    item=>item.ativo
                ).length,

            vencidas:
                vinculos.filter(
                    item=>
                        item.ativo &&
                        item.situacao===
                        'vencida'
                ).length,

            proximas:
                vinculos.filter(
                    item=>
                        item.ativo &&
                        item.situacao===
                        'proxima'
                ).length,
        };
    },[planos]);

    const selected=
        detailQuery.data
        ?? null;

    const availableVehicles=
        useMemo(()=>{
            if(!vinculoPlano){
                return [];
            }

            const usados=
                new Set(
                    (
                        vinculoPlano
                            .veiculos
                        ?? []
                    ).map(
                        item=>
                            item.veiculo_id
                    )
                );

            return (
                veiculosQuery.data
                ?? []
            ).filter(
                veiculo=>
                    !usados.has(
                        veiculo.id
                    )
            );
        },[
            vinculoPlano,
            veiculosQuery.data,
        ]);

    const validPlano=
        Boolean(
            form.nome.trim() &&
            form.tipo_servico.trim() &&
            (
                Number(
                    form.intervalo_km
                )>0 ||
                Number(
                    form.intervalo_meses
                )>0
            ) &&
            Number(
                form
                    .alerta_antecedencia_km
            )>=0 &&
            Number(
                form
                    .alerta_antecedencia_dias
            )>=0
        );

    return (
        <div className="space-y-5">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={openCreate}
                    className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
                >
                    <Plus className="w-5 h-5"/>
                    Novo plano
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
                    label="Planos"
                    value={String(
                        stats.planos
                    )}
                    icon={Wrench}
                />

                <Stat
                    label="Veículos associados"
                    value={String(
                        stats.veiculos
                    )}
                    icon={Car}
                />

                <Stat
                    label="Revisões vencidas"
                    value={String(
                        stats.vencidas
                    )}
                    icon={TriangleAlert}
                />

                <Stat
                    label="Próximas revisões"
                    value={String(
                        stats.proximas
                    )}
                    icon={CalendarClock}
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>

                        <input
                            value={search}
                            onChange={event=>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Pesquisar plano ou tipo de serviço..."
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>

                    <label className="h-11 px-4 rounded-xl border border-slate-200 flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={
                                showInactive
                            }
                            onChange={event=>
                                setShowInactive(
                                    event
                                        .target
                                        .checked
                                )
                            }
                        />

                        Mostrar inativos
                    </label>

                    <button
                        type="button"
                        onClick={()=>
                            planosQuery
                                .refetch()
                        }
                        disabled={
                            planosQuery
                                .isFetching
                        }
                        className="h-11 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                'w-4 h-4',
                                planosQuery
                                    .isFetching
                                    ? 'animate-spin'
                                    : '',
                            ].join(' ')}
                        />

                        Atualizar
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                {planosQuery.isLoading ? (
                    <Loader/>
                ) : planosQuery.isError ? (
                    <ErrorState
                        message={apiError(
                            planosQuery.error
                        )}
                    />
                ) : filtered.length===0 ? (
                    <div className="py-16 text-center">
                        <Wrench className="mx-auto w-10 h-10 text-slate-300"/>

                        <p className="mt-3 font-semibold text-slate-700">
                            Nenhum plano encontrado.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filtered.map(
                            plano=>(
                                <div
                                    key={plano.id}
                                    className="p-5 hover:bg-slate-50/50"
                                >
                                    <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold text-slate-950">
                                                    {plano.nome}
                                                </h3>

                                                <span
                                                    className={[
                                                        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                                        plano.ativo
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : 'bg-slate-100 text-slate-500',
                                                    ].join(' ')}
                                                >
                                                    {plano.ativo
                                                        ? 'Ativo'
                                                        : 'Inativo'
                                                    }
                                                </span>
                                            </div>

                                            <p className="mt-1 text-sm text-slate-600">
                                                {plano.tipo_servico}
                                            </p>

                                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                                                {plano.intervalo_km!==null && (
                                                    <span>
                                                        A cada {number(plano.intervalo_km)} km
                                                    </span>
                                                )}

                                                {plano.intervalo_meses!==null && (
                                                    <span>
                                                        A cada {plano.intervalo_meses} meses
                                                    </span>
                                                )}

                                                <span>
                                                    {(plano.veiculos ?? []).length} veículo(s)
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={()=>
                                                    setSelectedId(
                                                        plano.id
                                                    )
                                                }
                                                className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center hover:text-indigo-600"
                                                title="Detalhes"
                                            >
                                                <Eye className="w-4 h-4"/>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={()=>
                                                    openEdit(
                                                        plano
                                                    )
                                                }
                                                className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center hover:text-indigo-600"
                                                title="Editar"
                                            >
                                                <Pencil className="w-4 h-4"/>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={()=>
                                                    openVinculo(
                                                        plano
                                                    )
                                                }
                                                className="h-10 px-3 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-semibold flex items-center gap-2 hover:bg-indigo-50"
                                            >
                                                <Car className="w-4 h-4"/>
                                                Associar
                                            </button>

                                            <button
                                                type="button"
                                                disabled={
                                                    deleteMutation
                                                        .isPending
                                                }
                                                onClick={()=>
                                                    deleteMutation
                                                        .mutate(
                                                            plano
                                                        )
                                                }
                                                className="w-10 h-10 rounded-xl border border-red-100 text-red-500 flex items-center justify-center hover:bg-red-50 disabled:opacity-50"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>

                                    {(plano.veiculos ?? []).length>0 && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {(plano.veiculos ?? []).map(
                                                vinculo=>(
                                                    <span
                                                        key={vinculo.id}
                                                        className={[
                                                            'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold',
                                                            !vinculo.ativo
                                                                ? 'bg-slate-100 text-slate-500'
                                                                : situacaoClasses[
                                                                    vinculo.situacao
                                                                ],
                                                        ].join(' ')}
                                                    >
                                                        {vinculo.veiculo?.matricula ?? 'Veículo'}
                                                        {' · '}
                                                        {vinculo.ativo
                                                            ? situacaoLabels[
                                                                vinculo.situacao
                                                            ]
                                                            : 'Inativo'
                                                        }
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>

            {formOpen && (
                <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <ModalHeader
                            title={
                                editing
                                    ? 'Editar plano preventivo'
                                    : 'Novo plano preventivo'
                            }
                            onClose={()=>{
                                setFormOpen(false);
                                setEditing(null);
                            }}
                        />

                        <form
                            onSubmit={submitPlano}
                            className="p-6 space-y-5"
                        >
                            {saveMutation.isError && (
                                <ErrorBox
                                    message={apiError(
                                        saveMutation.error
                                    )}
                                />
                            )}

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
                                    placeholder="Ex.: Revisão periódica"
                                />
                            </Field>

                            <Field label="Tipo de serviço *">
                                <input
                                    required
                                    maxLength={150}
                                    value={
                                        form.tipo_servico
                                    }
                                    onChange={event=>
                                        update(
                                            'tipo_servico',
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                    placeholder="Ex.: Revisão geral"
                                />
                            </Field>

                            <Field label="Descrição">
                                <textarea
                                    maxLength={10000}
                                    rows={3}
                                    value={form.descricao}
                                    onChange={event=>
                                        update(
                                            'descricao',
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                            </Field>

                            <div>
                                <div className="mb-3">
                                    <h4 className="font-semibold text-slate-900">
                                        Periodicidade
                                    </h4>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Informe quilometragem, meses ou ambos.
                                    </p>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <Field label="Intervalo em km">
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={
                                                form.intervalo_km
                                            }
                                            onChange={event=>
                                                update(
                                                    'intervalo_km',
                                                    event.target.value
                                                )
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Intervalo em meses">
                                        <input
                                            type="number"
                                            min="1"
                                            max="600"
                                            step="1"
                                            value={
                                                form.intervalo_meses
                                            }
                                            onChange={event=>
                                                update(
                                                    'intervalo_meses',
                                                    event.target.value
                                                )
                                            }
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>

                                {!Number(form.intervalo_km) &&
                                    !Number(form.intervalo_meses) && (
                                        <p className="mt-2 text-xs text-amber-600">
                                            Informe pelo menos um intervalo.
                                        </p>
                                    )}
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-900">
                                    Antecedência do alerta
                                </h4>

                                <div className="mt-3 grid sm:grid-cols-2 gap-4">
                                    <Field label="Quilómetros">
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={
                                                form
                                                    .alerta_antecedencia_km
                                            }
                                            onChange={event=>
                                                update(
                                                    'alerta_antecedencia_km',
                                                    event.target.value
                                                )
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Dias">
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            max="3650"
                                            step="1"
                                            value={
                                                form
                                                    .alerta_antecedencia_dias
                                            }
                                            onChange={event=>
                                                update(
                                                    'alerta_antecedencia_dias',
                                                    event.target.value
                                                )
                                            }
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>
                            </div>

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
                                        Plano ativo
                                    </span>

                                    <span className="block mt-1 text-xs text-slate-500">
                                        Planos inativos permanecem no histórico.
                                    </span>
                                </span>
                            </label>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={()=>{
                                        setFormOpen(false);
                                        setEditing(null);
                                    }}
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saveMutation.isPending ||
                                        !validPlano
                                    }
                                    className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saveMutation.isPending && (
                                        <LoaderCircle className="w-4 h-4 animate-spin"/>
                                    )}

                                    {editing
                                        ? 'Guardar alterações'
                                        : 'Criar plano'
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {vinculoPlano && (
                <div className="fixed inset-0 z-[75] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
                        <ModalHeader
                            title="Associar veículo"
                            onClose={()=>
                                setVinculoPlano(null)
                            }
                        />

                        <form
                            onSubmit={submitVinculo}
                            className="p-6 space-y-5"
                        >
                            {vinculoMutation.isError && (
                                <ErrorBox
                                    message={apiError(
                                        vinculoMutation.error
                                    )}
                                />
                            )}

                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="text-xs text-slate-500">
                                    Plano
                                </p>

                                <p className="mt-1 font-semibold text-slate-900">
                                    {vinculoPlano.nome}
                                </p>
                            </div>

                            <Field label="Veículo *">
                                <select
                                    required
                                    value={
                                        vinculo.veiculo_id
                                    }
                                    onChange={event=>{
                                        const id=
                                            event.target.value;

                                        const veiculo=
                                            (
                                                veiculosQuery.data
                                                ?? []
                                            ).find(
                                                item=>
                                                    item.id===id
                                            );

                                        setVinculo(
                                            current=>({
                                                ...current,
                                                veiculo_id:id,

                                                ultimo_km:
                                                    veiculo
                                                        ?.km_atual
                                                    !==null &&
                                                    veiculo
                                                        ?.km_atual
                                                    !==undefined
                                                        ? String(
                                                            veiculo
                                                                .km_atual
                                                        )
                                                        : current
                                                            .ultimo_km,
                                            })
                                        );
                                    }}
                                    className={inputClass}
                                >
                                    <option value="">
                                        Selecione...
                                    </option>

                                    {availableVehicles.map(
                                        veiculo=>(
                                            <option
                                                key={veiculo.id}
                                                value={veiculo.id}
                                            >
                                                {veiculo.matricula} · {veiculo.marca ?? ''} {veiculo.modelo ?? ''}
                                            </option>
                                        )
                                    )}
                                </select>
                            </Field>

                            {availableVehicles.length===0 && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                                    Todos os veículos disponíveis já estão associados a este plano.
                                </div>
                            )}

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Último km">
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={
                                            vinculo.ultimo_km
                                        }
                                        onChange={event=>
                                            setVinculo(
                                                current=>({
                                                    ...current,
                                                    ultimo_km:
                                                        event.target.value,
                                                })
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Última revisão">
                                    <input
                                        type="date"
                                        value={
                                            vinculo.ultima_data
                                        }
                                        onChange={event=>
                                            setVinculo(
                                                current=>({
                                                    ...current,
                                                    ultima_data:
                                                        event.target.value,
                                                })
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                                Se o último km não for informado, o backend pode utilizar a quilometragem atual do veículo como referência.
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={
                                        vinculo.ativo
                                    }
                                    onChange={event=>
                                        setVinculo(
                                            current=>({
                                                ...current,
                                                ativo:
                                                    event.target.checked,
                                            })
                                        )
                                    }
                                    className="mt-1 w-4 h-4 rounded border-slate-300"
                                />

                                <span className="text-sm font-medium text-slate-800">
                                    Associação ativa
                                </span>
                            </label>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={()=>
                                        setVinculoPlano(null)
                                    }
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        vinculoMutation.isPending ||
                                        !vinculo.veiculo_id
                                    }
                                    className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {vinculoMutation.isPending && (
                                        <LoaderCircle className="w-4 h-4 animate-spin"/>
                                    )}

                                    Associar veículo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedId && (
                <div className="fixed inset-0 z-[65] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <ModalHeader
                            title="Plano preventivo"
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
                            <div className="p-6 space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-950">
                                            {selected.nome}
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {selected.tipo_servico}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={()=>
                                            openEdit(selected)
                                        }
                                        className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 flex items-center gap-2"
                                    >
                                        <Pencil className="w-4 h-4"/>
                                        Editar
                                    </button>
                                </div>

                                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <Info
                                        label="Intervalo km"
                                        value={
                                            selected.intervalo_km
                                            ===null
                                                ? '—'
                                                : `${number(selected.intervalo_km)} km`
                                        }
                                    />

                                    <Info
                                        label="Intervalo temporal"
                                        value={
                                            selected.intervalo_meses
                                            ===null
                                                ? '—'
                                                : `${selected.intervalo_meses} meses`
                                        }
                                    />

                                    <Info
                                        label="Alerta km"
                                        value={`${number(selected.alerta_antecedencia_km)} km`}
                                    />

                                    <Info
                                        label="Alerta dias"
                                        value={`${selected.alerta_antecedencia_dias} dias`}
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-slate-900">
                                            Veículos
                                        </h4>

                                        <button
                                            type="button"
                                            onClick={()=>
                                                openVinculo(
                                                    selected
                                                )
                                            }
                                            className="h-9 px-3 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-semibold flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4"/>
                                            Associar
                                        </button>
                                    </div>

                                    {(selected.veiculos ?? []).length===0 ? (
                                        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
                                            <Car className="mx-auto w-9 h-9 text-slate-300"/>

                                            <p className="mt-3 text-sm text-slate-600">
                                                Nenhum veículo associado.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {(selected.veiculos ?? []).map(
                                                item=>(
                                                    <div
                                                        key={item.id}
                                                        className="rounded-xl border border-slate-200 p-4"
                                                    >
                                                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="font-semibold text-slate-900">
                                                                        {item.veiculo?.matricula ?? 'Veículo'}
                                                                    </p>

                                                                    <span
                                                                        className={[
                                                                            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                                                            !item.ativo
                                                                                ? 'bg-slate-100 text-slate-500'
                                                                                : situacaoClasses[
                                                                                    item.situacao
                                                                                ],
                                                                        ].join(' ')}
                                                                    >
                                                                        {!item.ativo
                                                                            ? 'Inativo'
                                                                            : situacaoLabels[
                                                                                item.situacao
                                                                            ]
                                                                        }
                                                                    </span>
                                                                </div>

                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    {item.veiculo?.marca ?? ''} {item.veiculo?.modelo ?? ''}
                                                                </p>
                                                            </div>

                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                                <SmallInfo
                                                                    label="Km atual"
                                                                    value={
                                                                        item.veiculo?.km_atual===null ||
                                                                        item.veiculo?.km_atual===undefined
                                                                            ? '—'
                                                                            : number(
                                                                                item.veiculo.km_atual
                                                                            )
                                                                    }
                                                                />

                                                                <SmallInfo
                                                                    label="Último km"
                                                                    value={
                                                                        item.ultimo_km===null
                                                                            ? '—'
                                                                            : number(
                                                                                item.ultimo_km
                                                                            )
                                                                    }
                                                                />

                                                                <SmallInfo
                                                                    label="Próximo km"
                                                                    value={
                                                                        item.proximo_km===null
                                                                            ? '—'
                                                                            : number(
                                                                                item.proximo_km
                                                                            )
                                                                    }
                                                                />

                                                                <SmallInfo
                                                                    label="Próxima data"
                                                                    value={
                                                                        date(
                                                                            item.proxima_data
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border border-slate-200 p-5">
                                    <h4 className="font-semibold text-slate-900">
                                        Descrição
                                    </h4>

                                    <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">
                                        {selected.descricao
                                            || 'Sem descrição.'
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
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
            <h2 className="text-lg font-bold text-slate-950">
                {title}
            </h2>

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
    icon:typeof Wrench;
}){
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
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

function Info({
    label,
    value,
}:{
    label:string;
    value:string;
}){
    return (
        <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">
                {label}
            </p>

            <p className="mt-1 font-semibold text-slate-900">
                {value}
            </p>
        </div>
    );
}

function SmallInfo({
    label,
    value,
}:{
    label:string;
    value:string;
}){
    return (
        <div className="min-w-20">
            <p className="text-[11px] text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-700">
                {value}
            </p>
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
        <div className="py-16 text-center">
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
