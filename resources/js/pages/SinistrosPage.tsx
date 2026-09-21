import axios from 'axios';
import {
    AlertCircle,
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Download,
    Eye,
    FileText,
    LoaderCircle,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Shield,
    Trash2,
    Upload,
    UserRound,
    X,
} from 'lucide-react';
import {
    ChangeEvent,
    FormEvent,
    useMemo,
    useState,
} from 'react';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import api from '../lib/api';
import {useTenant} from '../contexts/TenantContext';
import type {Motorista} from '../types/motorista';
import type {Veiculo} from '../types/veiculo';
import type {
    Sinistro,
    SinistroDocumentoTipo,
    SinistroPayload,
    SinistroStatus,
} from '../types/sinistro';

interface Props {
    mode:'management'|'readonly';
}

type StatusFilter='todos'|SinistroStatus;

const statusLabels:Record<SinistroStatus,string>={
    aberto:'Aberto',
    em_andamento:'Em andamento',
    encerrado:'Encerrado',
};

const statusClasses:Record<SinistroStatus,string>={
    aberto:'bg-amber-50 text-amber-700',
    em_andamento:'bg-blue-50 text-blue-700',
    encerrado:'bg-emerald-50 text-emerald-700',
};

const documentoLabels:Record<SinistroDocumentoTipo,string>={
    declaracao_amigavel:'Declaração amigável',
    folha_peritagem:'Folha de peritagem',
    foto_acidente:'Foto do acidente',
    boletim_ocorrencia:'Boletim de ocorrência',
    outro:'Outro',
};

const emptyForm:SinistroPayload={
    veiculo_id:'',
    motorista_id:null,
    data_sinistro:'',
    status:'aberto',
    data_peritagem:null,
    peritagem_realizada:false,
    seguradora:null,
    apolice:null,
    numero_processo:null,
    itens_danificados:[],
    descricao:null,
    teve_testemunha:false,
    nome_testemunha:null,
    telemovel_testemunha:null,
};

const inputClass=
    'w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

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

function formatDate(value:string|null):string{
    if(!value){
        return '—';
    }

    const [year,month,day]=value
        .slice(0,10)
        .split('-');

    return day && month && year
        ? `${day}/${month}/${year}`
        : value;
}

function bytes(value:number):string{
    if(value<1024){
        return `${value} B`;
    }

    if(value<1024*1024){
        return `${(value/1024).toFixed(0)} KB`;
    }

    return `${(value/1024/1024).toFixed(2)} MB`;
}

export default function SinistrosPage({mode}:Props){
    const {tenant}=useTenant();
    const queryClient=useQueryClient();

    const readonly=mode==='readonly';

    const [search,setSearch]=useState('');
    const [status,setStatus]=
        useState<StatusFilter>('todos');

    const [formOpen,setFormOpen]=useState(false);
    const [editing,setEditing]=useState<Sinistro|null>(null);
    const [form,setForm]=
        useState<SinistroPayload>(emptyForm);

    const [damagedItem,setDamagedItem]=useState('');
    const [selectedId,setSelectedId]=
        useState<string|null>(null);

    const [documentType,setDocumentType]=
        useState<SinistroDocumentoTipo>(
            'declaracao_amigavel'
        );

    const [documentFile,setDocumentFile]=
        useState<File|null>(null);

    const [error,setError]=
        useState<string|null>(null);

    const sinistrosQuery=useQuery({
        queryKey:['sinistros',tenant?.id],
        enabled:Boolean(tenant?.id),
        queryFn:async()=>{
            const response=await api.get(
                '/api/sinistros'
            );

            return response.data.data as Sinistro[];
        },
    });

    const detailQuery=useQuery({
        queryKey:[
            'sinistro-detail',
            tenant?.id,
            selectedId,
        ],
        enabled:Boolean(
            tenant?.id && selectedId
        ),
        queryFn:async()=>{
            const response=await api.get(
                `/api/sinistros/${selectedId}`
            );

            return response.data.data as Sinistro;
        },
    });

    const veiculosQuery=useQuery({
        queryKey:[
            'sinistros-veiculos',
            tenant?.id,
        ],
        enabled:Boolean(
            tenant?.id &&
            formOpen &&
            !readonly
        ),
        queryFn:async()=>{
            const response=await api.get(
                '/api/veiculos'
            );

            return response.data.data as Veiculo[];
        },
    });

    const motoristasQuery=useQuery({
        queryKey:[
            'sinistros-motoristas',
            tenant?.id,
        ],
        enabled:Boolean(
            tenant?.id &&
            formOpen &&
            !readonly
        ),
        queryFn:async()=>{
            const response=await api.get(
                '/api/motoristas'
            );

            return response.data.data as Motorista[];
        },
    });

    async function refresh(){
        await queryClient.invalidateQueries({
            queryKey:[
                'sinistros',
                tenant?.id,
            ],
        });

        if(selectedId){
            await queryClient.invalidateQueries({
                queryKey:[
                    'sinistro-detail',
                    tenant?.id,
                    selectedId,
                ],
            });
        }
    }

    const saveMutation=useMutation({
        mutationFn:async()=>{
            const payload={
                ...form,
                motorista_id:
                    form.motorista_id || null,
                data_peritagem:
                    form.data_peritagem || null,
                seguradora:
                    form.seguradora?.trim() || null,
                apolice:
                    form.apolice?.trim() || null,
                numero_processo:
                    form.numero_processo?.trim() || null,
                descricao:
                    form.descricao?.trim() || null,
                nome_testemunha:
                    form.teve_testemunha
                        ? form.nome_testemunha?.trim() || null
                        : null,
                telemovel_testemunha:
                    form.teve_testemunha
                        ? form.telemovel_testemunha?.trim() || null
                        : null,
            };

            if(editing){
                await api.patch(
                    `/api/sinistros/${editing.id}`,
                    payload
                );

                return;
            }

            await api.post(
                '/api/sinistros',
                payload
            );
        },
        onSuccess:async()=>{
            closeForm();
            await refresh();
        },
        onError:exception=>{
            setError(
                apiError(exception)
            );
        },
    });

    const deleteMutation=useMutation({
        mutationFn:async(id:string)=>{
            await api.delete(
                `/api/sinistros/${id}`
            );
        },
        onSuccess:async()=>{
            setSelectedId(null);
            await refresh();
        },
        onError:exception=>{
            window.alert(
                apiError(exception)
            );
        },
    });

    const uploadMutation=useMutation({
        mutationFn:async()=>{
            if(
                !selectedId ||
                !documentFile
            ){
                return;
            }

            const data=new FormData();

            data.append(
                'tipo',
                documentType
            );

            data.append(
                'arquivo',
                documentFile
            );

            await api.post(
                `/api/sinistros/${selectedId}/documentos`,
                data
            );
        },
        onSuccess:async()=>{
            setDocumentFile(null);

            setDocumentType(
                'declaracao_amigavel'
            );

            await refresh();
        },
        onError:exception=>{
            setError(
                apiError(exception)
            );
        },
    });

    const deleteDocumentMutation=
        useMutation({
            mutationFn:async(
                documentId:string
            )=>{
                if(!selectedId){
                    return;
                }

                await api.delete(
                    `/api/sinistros/${selectedId}/documentos/${documentId}`
                );
            },
            onSuccess:refresh,
            onError:exception=>{
                window.alert(
                    apiError(exception)
                );
            },
        });

    function newClaim(){
        setEditing(null);
        setForm(emptyForm);
        setDamagedItem('');
        setError(null);
        setFormOpen(true);
    }

    function editClaim(item:Sinistro){
        setEditing(item);

        setForm({
            veiculo_id:item.veiculo_id,
            motorista_id:item.motorista_id,
            data_sinistro:
                item.data_sinistro.slice(0,10),
            status:item.status,
            data_peritagem:
                item.data_peritagem
                    ? item.data_peritagem.slice(0,10)
                    : null,
            peritagem_realizada:
                item.peritagem_realizada,
            seguradora:item.seguradora,
            apolice:item.apolice,
            numero_processo:
                item.numero_processo,
            itens_danificados:
                item.itens_danificados ?? [],
            descricao:item.descricao,
            teve_testemunha:
                item.teve_testemunha,
            nome_testemunha:
                item.nome_testemunha,
            telemovel_testemunha:
                item.telemovel_testemunha,
        });

        setDamagedItem('');
        setError(null);
        setFormOpen(true);
    }

    function closeForm(){
        setFormOpen(false);
        setEditing(null);
        setForm(emptyForm);
        setDamagedItem('');
        setError(null);
    }

    function submit(
        event:FormEvent
    ){
        event.preventDefault();

        if(
            !form.veiculo_id ||
            !form.data_sinistro
        ){
            setError(
                'Preencha o veículo e a data do sinistro.'
            );

            return;
        }

        saveMutation.mutate();
    }

    function addDamagedItem(){
        const item=damagedItem.trim();

        if(!item){
            return;
        }

        const exists=form
            .itens_danificados
            .some(existing=>
                existing.toLocaleLowerCase('pt-PT')
                === item.toLocaleLowerCase('pt-PT')
            );

        if(!exists){
            setForm({
                ...form,
                itens_danificados:[
                    ...form.itens_danificados,
                    item,
                ],
            });
        }

        setDamagedItem('');
    }

    function removeDamagedItem(
        index:number
    ){
        setForm({
            ...form,
            itens_danificados:
                form.itens_danificados
                    .filter(
                        (_,i)=>i!==index
                    ),
        });
    }

    function chooseFile(
        event:ChangeEvent<HTMLInputElement>
    ){
        setDocumentFile(
            event.target.files?.[0]
            ?? null
        );
    }

    function removeClaim(
        item:Sinistro
    ){
        if(!window.confirm(
            `Eliminar o sinistro ${item.numero_processo ?? ''}?`
        )){
            return;
        }

        deleteMutation.mutate(
            item.id
        );
    }

    const items=useMemo(()=>{
        const list=
            sinistrosQuery.data ?? [];

        const term=search
            .trim()
            .toLocaleLowerCase('pt-PT');

        return list.filter(item=>{
            if(
                status!=='todos' &&
                item.status!==status
            ){
                return false;
            }

            if(!term){
                return true;
            }

            return [
                item.numero_processo,
                item.seguradora,
                item.apolice,
                item.veiculo?.matricula,
                item.veiculo?.marca,
                item.veiculo?.modelo,
                item.motorista?.nome_completo,
                item.motorista?.nif,
            ]
                .filter(Boolean)
                .some(value=>
                    String(value)
                        .toLocaleLowerCase('pt-PT')
                        .includes(term)
                );
        });
    },[
        sinistrosQuery.data,
        search,
        status,
    ]);

    if(!tenant){
        return (
            <div className="max-w-7xl mx-auto">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0"/>

                    <div>
                        <h1 className="font-semibold text-amber-900">
                            Selecione uma organização
                        </h1>

                        <p className="mt-1 text-sm text-amber-700">
                            Selecione uma organização antes de consultar os sinistros.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const all=
        sinistrosQuery.data ?? [];

    const open=all.filter(
        item=>item.status==='aberto'
    ).length;

    const progress=all.filter(
        item=>item.status==='em_andamento'
    ).length;

    const closed=all.filter(
        item=>item.status==='encerrado'
    ).length;

    const selected=
        detailQuery.data;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <p className="text-sm font-medium text-indigo-600 mb-2">
                        {readonly
                            ? 'Minha área'
                            : 'Operação'
                        }
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Sinistros
                    </h1>

                    <p className="mt-2 text-slate-500">
                        {readonly
                            ? 'Consulte acidentes, peritagens e documentos associados.'
                            : 'Gestão de acidentes, seguros, peritagens e documentação.'
                        }
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        disabled={
                            sinistrosQuery.isFetching
                        }
                        onClick={refresh}
                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 flex items-center gap-2"
                    >
                        <RefreshCw
                            className={[
                                'w-4 h-4',
                                sinistrosQuery.isFetching
                                    ? 'animate-spin'
                                    : '',
                            ].join(' ')}
                        />

                        Atualizar
                    </button>

                    {!readonly && (
                        <button
                            type="button"
                            onClick={newClaim}
                            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4"/>
                            Novo sinistro
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Stat
                    icon={AlertTriangle}
                    label="Total"
                    value={String(all.length)}
                />

                <Stat
                    icon={Clock3}
                    label="Abertos"
                    value={String(open)}
                />

                <Stat
                    icon={AlertCircle}
                    label="Em andamento"
                    value={String(progress)}
                />

                <Stat
                    icon={CheckCircle2}
                    label="Encerrados"
                    value={String(closed)}
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                    <div className="grid lg:grid-cols-[1fr_220px] gap-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>

                            <input
                                value={search}
                                onChange={event=>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                                placeholder="Pesquisar processo, matrícula, motorista, seguradora..."
                                className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-indigo-500"
                            />
                        </div>

                        <select
                            value={status}
                            onChange={event=>
                                setStatus(
                                    event.target.value as StatusFilter
                                )
                            }
                            className={inputClass}
                        >
                            <option value="todos">
                                Todos os estados
                            </option>

                            {Object.entries(
                                statusLabels
                            ).map(([value,label])=>(
                                <option
                                    key={value}
                                    value={value}
                                >
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {sinistrosQuery.isLoading ? (
                    <div className="py-20 flex justify-center">
                        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600"/>
                    </div>
                ) : sinistrosQuery.isError ? (
                    <div className="py-16 text-center">
                        <AlertCircle className="w-10 h-10 mx-auto text-red-500"/>

                        <p className="mt-3 font-semibold text-slate-900">
                            Não foi possível carregar os sinistros
                        </p>
                    </div>
                ) : items.length===0 ? (
                    <div className="py-20 text-center">
                        <AlertTriangle className="w-12 h-12 mx-auto text-slate-300"/>

                        <p className="mt-4 font-semibold text-slate-900">
                            Nenhum sinistro encontrado
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <Th>Processo</Th>
                                    <Th>Veículo</Th>
                                    <Th>Motorista</Th>
                                    <Th>Data</Th>
                                    <Th>Peritagem</Th>
                                    <Th>Estado</Th>
                                    <Th>Ações</Th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {items.map(item=>(
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-sm text-slate-900">
                                                {item.numero_processo
                                                    ?? 'Sem nº de processo'
                                                }
                                            </div>

                                            <div className="mt-1 text-xs text-slate-500">
                                                {item.seguradora
                                                    ?? 'Sem seguradora'
                                                }
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="font-medium text-sm text-slate-900">
                                                {item.veiculo?.matricula ?? '—'}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-500">
                                                {[
                                                    item.veiculo?.marca,
                                                    item.veiculo?.modelo,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' ')
                                                }
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {item.motorista?.nome_completo ?? '—'}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                                            {formatDate(
                                                item.data_sinistro
                                            )}
                                        </td>

                                        <td className="px-5 py-4 text-sm">
                                            {item.peritagem_realizada ? (
                                                <span className="text-emerald-700 font-medium">
                                                    Realizada
                                                </span>
                                            ) : item.data_peritagem ? (
                                                <span className="text-amber-700">
                                                    {formatDate(
                                                        item.data_peritagem
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">
                                                    Não agendada
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={[
                                                    'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                                    statusClasses[item.status],
                                                ].join(' ')}
                                            >
                                                {statusLabels[item.status]}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={()=>
                                                        setSelectedId(
                                                            item.id
                                                        )
                                                    }
                                                    className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                                                >
                                                    <Eye className="w-4 h-4"/>
                                                </button>

                                                {!readonly && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={()=>
                                                                editClaim(
                                                                    item
                                                                )
                                                            }
                                                            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                                                        >
                                                            <Pencil className="w-4 h-4"/>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={()=>
                                                                removeClaim(
                                                                    item
                                                                )
                                                            }
                                                            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4"/>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {formOpen && !readonly && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <form
                        onSubmit={submit}
                        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="sticky top-0 z-10 bg-white px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-950">
                                    {editing
                                        ? 'Editar sinistro'
                                        : 'Novo sinistro'
                                    }
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Registe acidente, seguro, peritagem e danos.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeForm}
                                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                            >
                                <X className="w-5 h-5"/>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <Section
                                title="Identificação"
                                icon={AlertTriangle}
                            >
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Field label="Veículo *">
                                        <select
                                            value={form.veiculo_id}
                                            onChange={event=>
                                                setForm({
                                                    ...form,
                                                    veiculo_id:event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        >
                                            <option value="">
                                                Selecionar veículo
                                            </option>

                                            {(veiculosQuery.data ?? [])
                                                .map(item=>(
                                                    <option
                                                        key={item.id}
                                                        value={item.id}
                                                    >
                                                        {item.matricula} — {item.marca} {item.modelo}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </Field>

                                    <Field label="Motorista">
                                        <select
                                            value={form.motorista_id ?? ''}
                                            onChange={event=>
                                                setForm({
                                                    ...form,
                                                    motorista_id:
                                                        event.target.value || null,
                                                })
                                            }
                                            className={inputClass}
                                        >
                                            <option value="">
                                                Sem motorista associado
                                            </option>

                                            {(motoristasQuery.data ?? [])
                                                .map(item=>(
                                                    <option
                                                        key={item.id}
                                                        value={item.id}
                                                    >
                                                        {item.nome_completo}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </Field>

                                    <Field label="Data do sinistro *">
                                        <input
                                            type="date"
                                            value={form.data_sinistro}
                                            onChange={event=>
                                                setForm({
                                                    ...form,
                                                    data_sinistro:event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Estado">
                                        <select
                                            value={form.status}
                                            onChange={event=>
                                                setForm({
                                                    ...form,
                                                    status:event.target.value as SinistroStatus,
                                                })
                                            }
                                            className={inputClass}
                                        >
                                            {Object.entries(
                                                statusLabels
                                            ).map(([value,label])=>(
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            </Section>

                            <Section
                                title="Peritagem"
                                icon={CalendarDays}
                            >
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Field label="Data da peritagem">
                                        <input
                                            type="date"
                                            min={form.data_sinistro || undefined}
                                            value={form.data_peritagem ?? ''}
                                            onChange={event=>
                                                setForm({
                                                    ...form,
                                                    data_peritagem:
                                                        event.target.value || null,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <label className="flex items-center gap-3 h-11 mt-6">
                                        <input
                                            type="checkbox"
                                            checked={form.peritagem_realizada}
                                            onChange={event=>
                                                setForm({
                                                    ...form,
                                                    peritagem_realizada:
                                                        event.target.checked,
                                                })
                                            }
                                            className="w-4 h-4 rounded border-slate-300"
                                        />

                                        <span className="text-sm font-medium text-slate-700">
                                            Peritagem realizada
                                        </span>
                                    </label>
                                </div>
                            </Section>

                            <Section
                                title="Seguro"
                                icon={Shield}
                            >
                                <div className="grid md:grid-cols-3 gap-4">
                                    <Field label="Seguradora">
                                        <input
                                            value={form.seguradora ?? ''}
                                            onChange={event=>
                                                setForm({
                                                    ...form,
                                                    seguradora:event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                            placeholder="Fidelidade"
                                        />
                                    </Field>

                                    <Field label="Nº da apólice">
                                        <input
                                            value={form.apolice ?? ''}
                                            onChange={event=>
                                                setForm({
                                                    ...form,
                                                    apolice:event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Nº do processo">
                                        <input
                                            value={form.numero_processo ?? ''}
                                            onChange={event=>
                                                setForm({
                                                    ...form,
                                                    numero_processo:event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>
                            </Section>

                            <Section
                                title="Testemunha"
                                icon={UserRound}
                            >
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={form.teve_testemunha}
                                        onChange={event=>
                                            setForm({
                                                ...form,
                                                teve_testemunha:
                                                    event.target.checked,
                                                nome_testemunha:
                                                    event.target.checked
                                                        ? form.nome_testemunha
                                                        : null,
                                                telemovel_testemunha:
                                                    event.target.checked
                                                        ? form.telemovel_testemunha
                                                        : null,
                                            })
                                        }
                                        className="w-4 h-4 rounded border-slate-300"
                                    />

                                    <span className="text-sm font-medium text-slate-700">
                                        Houve testemunha
                                    </span>
                                </label>

                                {form.teve_testemunha && (
                                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                                        <Field label="Nome">
                                            <input
                                                value={form.nome_testemunha ?? ''}
                                                onChange={event=>
                                                    setForm({
                                                        ...form,
                                                        nome_testemunha:event.target.value,
                                                    })
                                                }
                                                className={inputClass}
                                            />
                                        </Field>

                                        <Field label="Telemóvel">
                                            <input
                                                value={form.telemovel_testemunha ?? ''}
                                                onChange={event=>
                                                    setForm({
                                                        ...form,
                                                        telemovel_testemunha:event.target.value,
                                                    })
                                                }
                                                className={inputClass}
                                            />
                                        </Field>
                                    </div>
                                )}
                            </Section>

                            <Section
                                title="Itens danificados"
                                icon={AlertCircle}
                            >
                                <div className="flex gap-2">
                                    <input
                                        value={damagedItem}
                                        onChange={event=>
                                            setDamagedItem(
                                                event.target.value
                                            )
                                        }
                                        onKeyDown={event=>{
                                            if(event.key==='Enter'){
                                                event.preventDefault();
                                                addDamagedItem();
                                            }
                                        }}
                                        placeholder="Ex.: Para-choques dianteiro"
                                        className={inputClass}
                                    />

                                    <button
                                        type="button"
                                        onClick={addDamagedItem}
                                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold"
                                    >
                                        Adicionar
                                    </button>
                                </div>

                                {form.itens_danificados.length>0 && (
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {form.itens_danificados.map(
                                            (item,index)=>(
                                                <span
                                                    key={`${item}-${index}`}
                                                    className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
                                                >
                                                    {item}

                                                    <button
                                                        type="button"
                                                        onClick={()=>
                                                            removeDamagedItem(
                                                                index
                                                            )
                                                        }
                                                        className="text-slate-400 hover:text-red-600"
                                                    >
                                                        <X className="w-3.5 h-3.5"/>
                                                    </button>
                                                </span>
                                            )
                                        )}
                                    </div>
                                )}
                            </Section>

                            <Field label="Descrição">
                                <textarea
                                    rows={4}
                                    value={form.descricao ?? ''}
                                    onChange={event=>
                                        setForm({
                                            ...form,
                                            descricao:event.target.value,
                                        })
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none"
                                />
                            </Field>

                            {error && (
                                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                disabled={saveMutation.isPending}
                                className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                            >
                                {saveMutation.isPending && (
                                    <LoaderCircle className="w-4 h-4 animate-spin"/>
                                )}

                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {selectedId && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 bg-white px-6 py-5 border-b border-slate-200 flex justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-950">
                                    Detalhes do sinistro
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {selected?.numero_processo
                                        ?? 'Sem número de processo'
                                    }
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={()=>
                                    setSelectedId(null)
                                }
                                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                            >
                                <X className="w-5 h-5"/>
                            </button>
                        </div>

                        {detailQuery.isLoading || !selected ? (
                            <div className="py-20 flex justify-center">
                                <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600"/>
                            </div>
                        ) : (
                            <div className="p-6 space-y-6">
                                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Info
                                        label="Data"
                                        value={formatDate(
                                            selected.data_sinistro
                                        )}
                                    />

                                    <Info
                                        label="Estado"
                                        value={statusLabels[
                                            selected.status
                                        ]}
                                    />

                                    <Info
                                        label="Processo"
                                        value={
                                            selected.numero_processo
                                            ?? '—'
                                        }
                                    />

                                    <Info
                                        label="Seguradora"
                                        value={
                                            selected.seguradora
                                            ?? '—'
                                        }
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <Card>
                                        <p className="text-xs text-slate-500">
                                            Veículo
                                        </p>

                                        <p className="mt-1 font-semibold text-slate-900">
                                            {selected.veiculo?.matricula ?? '—'}
                                        </p>

                                        <p className="text-sm text-slate-500">
                                            {selected.veiculo?.marca} {selected.veiculo?.modelo}
                                        </p>
                                    </Card>

                                    <Card>
                                        <p className="text-xs text-slate-500">
                                            Motorista
                                        </p>

                                        <p className="mt-1 font-semibold text-slate-900">
                                            {selected.motorista?.nome_completo
                                                ?? 'Não associado'
                                            }
                                        </p>
                                    </Card>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <Card>
                                        <p className="text-sm font-semibold text-slate-900">
                                            Peritagem
                                        </p>

                                        <p className="mt-2 text-sm text-slate-600">
                                            Data: {formatDate(
                                                selected.data_peritagem
                                            )}
                                        </p>

                                        <p className="text-sm text-slate-600">
                                            Estado: {
                                                selected.peritagem_realizada
                                                    ? 'Realizada'
                                                    : 'Pendente'
                                            }
                                        </p>
                                    </Card>

                                    <Card>
                                        <p className="text-sm font-semibold text-slate-900">
                                            Seguro
                                        </p>

                                        <p className="mt-2 text-sm text-slate-600">
                                            Seguradora: {selected.seguradora ?? '—'}
                                        </p>

                                        <p className="text-sm text-slate-600">
                                            Apólice: {selected.apolice ?? '—'}
                                        </p>
                                    </Card>
                                </div>

                                {selected.teve_testemunha && (
                                    <Card>
                                        <p className="text-sm font-semibold text-slate-900">
                                            Testemunha
                                        </p>

                                        <p className="mt-2 text-sm text-slate-600">
                                            {selected.nome_testemunha ?? 'Nome não informado'}
                                        </p>

                                        <p className="text-sm text-slate-600">
                                            {selected.telemovel_testemunha ?? 'Telemóvel não informado'}
                                        </p>
                                    </Card>
                                )}

                                {selected.itens_danificados?.length>0 && (
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 mb-3">
                                            Itens danificados
                                        </p>

                                        <div className="flex flex-wrap gap-2">
                                            {selected.itens_danificados.map(
                                                (item,index)=>(
                                                    <span
                                                        key={`${item}-${index}`}
                                                        className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 text-sm"
                                                    >
                                                        {item}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}

                                {selected.descricao && (
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 mb-2">
                                            Descrição
                                        </p>

                                        <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                            {selected.descricao}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between mb-3">
                                        <h3 className="font-semibold text-slate-900">
                                            Documentos
                                        </h3>

                                        <span className="text-xs text-slate-500">
                                            {selected.documentos?.length ?? 0} ficheiro(s)
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {(selected.documentos ?? [])
                                            .map(document=>(
                                                <div
                                                    key={document.id}
                                                    className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <FileText className="w-5 h-5 text-indigo-500 shrink-0"/>

                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                                {document.arquivo_nome}
                                                            </p>

                                                            <p className="text-xs text-slate-500">
                                                                {documentoLabels[document.tipo]} · {bytes(document.arquivo_tamanho)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 shrink-0">
                                                        <a
                                                            href={`/api/sinistros/${selected.id}/documentos/${document.id}/arquivo`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                                                        >
                                                            <Eye className="w-4 h-4"/>
                                                        </a>

                                                        <a
                                                            href={`/api/sinistros/${selected.id}/documentos/${document.id}/arquivo/download`}
                                                            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                                                        >
                                                            <Download className="w-4 h-4"/>
                                                        </a>

                                                        {!readonly && (
                                                            <button
                                                                type="button"
                                                                onClick={()=>{
                                                                    if(window.confirm('Eliminar este documento?')){
                                                                        deleteDocumentMutation.mutate(
                                                                            document.id
                                                                        );
                                                                    }
                                                                }}
                                                                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4"/>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        }

                                        {!selected.documentos?.length && (
                                            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                                                Nenhum documento associado.
                                            </div>
                                        )}
                                    </div>

                                    {!readonly && (
                                        <div className="mt-4 rounded-xl bg-slate-50 p-4">
                                            <div className="grid md:grid-cols-[220px_1fr_auto] gap-3">
                                                <select
                                                    value={documentType}
                                                    onChange={event=>
                                                        setDocumentType(
                                                            event.target.value as SinistroDocumentoTipo
                                                        )
                                                    }
                                                    className={inputClass}
                                                >
                                                    {Object.entries(
                                                        documentoLabels
                                                    ).map(
                                                        ([value,label])=>(
                                                            <option
                                                                key={value}
                                                                value={value}
                                                            >
                                                                {label}
                                                            </option>
                                                        )
                                                    )}
                                                </select>

                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={chooseFile}
                                                    className="block w-full text-sm text-slate-600 file:mr-3 file:h-10 file:border-0 file:rounded-lg file:bg-white file:px-4 file:text-sm file:font-semibold"
                                                />

                                                <button
                                                    type="button"
                                                    disabled={
                                                        !documentFile ||
                                                        uploadMutation.isPending
                                                    }
                                                    onClick={()=>
                                                        uploadMutation.mutate()
                                                    }
                                                    className="h-11 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {uploadMutation.isPending
                                                        ? <LoaderCircle className="w-4 h-4 animate-spin"/>
                                                        : <Upload className="w-4 h-4"/>
                                                    }

                                                    Enviar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Stat({
    icon:Icon,
    label,
    value,
}:{
    icon:typeof AlertTriangle;
    label:string;
    value:string;
}){
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex justify-between gap-3">
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

function Field({
    label,
    children,
}:{
    label:string;
    children:React.ReactNode;
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

function Section({
    title,
    icon:Icon,
    children,
}:{
    title:string;
    icon:typeof AlertTriangle;
    children:React.ReactNode;
}){
    return (
        <div className="rounded-2xl bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <Icon className="w-4 h-4 text-indigo-600"/>
                {title}
            </h3>

            {children}
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

function Card({
    children,
}:{
    children:React.ReactNode;
}){
    return (
        <div className="rounded-xl bg-slate-50 p-4">
            {children}
        </div>
    );
}

function Th({
    children,
}:{
    children:string;
}){
    return (
        <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}
