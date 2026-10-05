import {FormEvent,useEffect,useState} from "react";
import {
    AlertCircle,
    BellRing,
    Building2,
    Car,
    CheckCircle2,
    LoaderCircle,
    Pencil,
    Plus,
    Save,
    Settings2,
    SlidersHorizontal,
    Trash2,
    WalletCards,
} from "lucide-react";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import axios from "axios";
import api from "../lib/api";
import {useTenant} from "../contexts/TenantContext";
import {useCurrentPermissions} from "../hooks/useCurrentPermissions";
import CustomFieldModal from "../components/settings/CustomFieldModal";
import type {
    CustomFieldPayload,
    CustomFieldsResponse,
    FleetSettingsData,
    FleetSettingsResponse,
    TenantCustomField,
} from "../types/settings";

type Tab=
    |"general"
    |"operation"
    |"alerts"
    |"vehicles"
    |"rentals"
    |"custom";

const tabs=[
    {id:"general" as Tab,label:"Geral",icon:Building2},
    {id:"operation" as Tab,label:"Operação",icon:SlidersHorizontal},
    {id:"alerts" as Tab,label:"Alertas",icon:BellRing},
    {id:"vehicles" as Tab,label:"Veículos",icon:Car},
    {id:"rentals" as Tab,label:"Alugueres",icon:WalletCards},
    {id:"custom" as Tab,label:"Campos personalizados",icon:Settings2},
];

export default function ConfiguracoesPage(){
    const {tenant,refreshTenant}=useTenant();
    const {can}=useCurrentPermissions();
    const queryClient=useQueryClient();

    const [tab,setTab]=useState<Tab>("general");
    const [form,setForm]=useState<FleetSettingsData|null>(null);
    const [message,setMessage]=useState("");
    const [editingField,setEditingField]=useState<TenantCustomField|null>(null);
    const [fieldOpen,setFieldOpen]=useState(false);
    const [fieldError,setFieldError]=useState("");

    const canConfigure=
        can(
            "configuracoes",
            "configurar"
        );

    const settingsQuery=useQuery({
        queryKey:[
            "tenant-settings",
            tenant?.id,
        ],
        enabled:Boolean(tenant?.id),
        queryFn:async()=>{
            const response=
                await api.get(
                    "/api/configuracoes"
                );

            return response.data as FleetSettingsResponse;
        },
    });

    const fieldsQuery=useQuery({
        queryKey:[
            "tenant-custom-fields",
            tenant?.id,
        ],
        enabled:Boolean(tenant?.id),
        queryFn:async()=>{
            const response=
                await api.get(
                    "/api/configuracoes/campos"
                );

            return response.data as CustomFieldsResponse;
        },
    });

    useEffect(()=>{
        if(settingsQuery.data?.data){
            setForm(
                structuredClone(
                    settingsQuery.data.data
                )
            );
        }
    },[settingsQuery.data]);

    const settingsMutation=useMutation({
        mutationFn:async()=>{
            if(!form){
                return;
            }

            const response=
                await api.patch(
                    "/api/configuracoes",
                    {
                        nome:form.tenant.nome,
                        email:
                            form.tenant.email?.trim()||
                            null,
                        telefone:
                            form.tenant.telefone?.trim()||
                            null,
                        ...form.settings,
                    }
                );

            return response.data;
        },
        onSuccess:async response=>{
            setMessage(
                response?.message??
                "Configurações atualizadas."
            );

            await queryClient.invalidateQueries({
                queryKey:[
                    "tenant-settings",
                    tenant?.id,
                ],
            });

            await refreshTenant();
        },
    });

    const createFieldMutation=useMutation({
        mutationFn:async(
            payload:CustomFieldPayload
        )=>{
            const response=
                await api.post(
                    "/api/configuracoes/campos",
                    payload
                );

            return response.data;
        },
    });

    const updateFieldMutation=useMutation({
        mutationFn:async({
            id,
            payload,
        }:{
            id:string;
            payload:CustomFieldPayload;
        })=>{
            const response=
                await api.patch(
                    `/api/configuracoes/campos/${id}`,
                    payload
                );

            return response.data;
        },
    });

    const deleteFieldMutation=useMutation({
        mutationFn:async(id:string)=>{
            await api.delete(
                `/api/configuracoes/campos/${id}`
            );
        },
        onSuccess:async()=>{
            await fieldsQuery.refetch();
        },
    });

    function updateGroup(
        group:keyof FleetSettingsData["settings"],
        key:string,
        value:unknown
    ){
        setForm(current=>{
            if(!current){
                return current;
            }

            return {
                ...current,
                settings:{
                    ...current.settings,
                    [group]:{
                        ...current.settings[group],
                        [key]:value,
                    },
                },
            } as FleetSettingsData;
        });
    }

    function toggleOperation(
        key:"platforms"|"operation_types",
        value:string
    ){
        if(!form){
            return;
        }

        const current=
            form.settings.operation[key];

        updateGroup(
            "operation",
            key,
            current.includes(value)
                ?current.filter(item=>item!==value)
                :[...current,value]
        );
    }

    function submitSettings(
        event:FormEvent
    ){
        event.preventDefault();

        if(!canConfigure){
            return;
        }

        setMessage("");
        settingsMutation.mutate();
    }

    async function saveField(
        payload:CustomFieldPayload
    ){
        setFieldError("");

        try{
            if(editingField){
                await updateFieldMutation.mutateAsync({
                    id:editingField.id,
                    payload,
                });
            }else{
                await createFieldMutation.mutateAsync(
                    payload
                );
            }

            await fieldsQuery.refetch();

            setFieldOpen(false);
            setEditingField(null);
        }catch(error){
            setFieldError(
                errorMessage(
                    error,
                    "Não foi possível guardar o campo."
                )
            );

            throw error;
        }
    }

    async function removeField(
        field:TenantCustomField
    ){
        if(
            !window.confirm(
                `Remover o campo "${field.label}"?`
            )
        ){
            return;
        }

        await deleteFieldMutation.mutateAsync(
            field.id
        );
    }

    if(!tenant){
        return (
            <div className="mx-auto max-w-7xl">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
                    Selecione uma organização.
                </div>
            </div>
        );
    }

    if(
        settingsQuery.isLoading ||
        !form
    ){
        return (
            <div className="flex justify-center py-24">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
            </div>
        );
    }

    if(settingsQuery.isError){
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-red-500"/>

                <h1 className="mt-4 font-bold text-slate-950">
                    Não foi possível carregar as configurações
                </h1>

                <button
                    type="button"
                    onClick={()=>settingsQuery.refetch()}
                    className="mt-5 h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    const options=
        settingsQuery.data?.options;

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Organização
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Configurações da Frota
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Defina dados institucionais e padrões operacionais de {tenant.nome}.
                    </p>
                </div>

                {!canConfigure&&(
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500">
                        Acesso apenas para consulta
                    </div>
                )}
            </div>

            <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
                <div className="flex min-w-max gap-1">
                    {tabs.map(item=>{
                        const Icon=item.icon;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={()=>setTab(item.id)}
                                className={[
                                    "flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
                                    tab===item.id
                                        ?"bg-indigo-600 text-white"
                                        :"text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                                ].join(" ")}
                            >
                                <Icon className="h-4 w-4"/>
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {tab==="custom"?(
                <CustomFieldsSection
                    fields={fieldsQuery.data?.data??[]}
                    loading={fieldsQuery.isLoading}
                    canConfigure={canConfigure}
                    deleting={deleteFieldMutation.isPending}
                    onCreate={()=>{
                        setEditingField(null);
                        setFieldError("");
                        setFieldOpen(true);
                    }}
                    onEdit={field=>{
                        setEditingField(field);
                        setFieldError("");
                        setFieldOpen(true);
                    }}
                    onDelete={removeField}
                />
            ):(
                <form
                    onSubmit={submitSettings}
                    className="rounded-2xl border border-slate-200 bg-white"
                >
                    <div className="p-6 sm:p-8">
                        {tab==="general"&&(
                            <GeneralTab
                                form={form}
                                disabled={!canConfigure}
                                onTenant={(key,value)=>
                                    setForm(current=>
                                        current
                                            ?{
                                                ...current,
                                                tenant:{
                                                    ...current.tenant,
                                                    [key]:value,
                                                },
                                            }
                                            :current
                                    )
                                }
                                onChange={(key,value)=>
                                    updateGroup(
                                        "general",
                                        key,
                                        value
                                    )
                                }
                            />
                        )}

                        {tab==="operation"&&options&&(
                            <OperationTab
                                form={form}
                                platforms={options.platforms}
                                operationTypes={options.operation_types}
                                disabled={!canConfigure}
                                onBaseCity={value=>
                                    updateGroup(
                                        "operation",
                                        "base_city",
                                        value
                                    )
                                }
                                onTogglePlatform={value=>
                                    toggleOperation(
                                        "platforms",
                                        value
                                    )
                                }
                                onToggleType={value=>
                                    toggleOperation(
                                        "operation_types",
                                        value
                                    )
                                }
                            />
                        )}

                        {tab==="alerts"&&(
                            <AlertsTab
                                form={form}
                                disabled={!canConfigure}
                                onChange={(key,value)=>
                                    updateGroup(
                                        "alerts",
                                        key,
                                        value
                                    )
                                }
                            />
                        )}

                        {tab==="vehicles"&&(
                            <VehiclesTab
                                form={form}
                                disabled={!canConfigure}
                                onChange={(key,value)=>
                                    updateGroup(
                                        "vehicles",
                                        key,
                                        value
                                    )
                                }
                            />
                        )}

                        {tab==="rentals"&&options&&(
                            <RentalsTab
                                form={form}
                                periodicities={
                                    options.rental_periodicities
                                }
                                weekdays={
                                    options.weekdays
                                }
                                disabled={!canConfigure}
                                onChange={(key,value)=>
                                    updateGroup(
                                        "rentals",
                                        key,
                                        value
                                    )
                                }
                            />
                        )}

                        {message&&(
                            <div className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                <CheckCircle2 className="h-4 w-4"/>
                                {message}
                            </div>
                        )}

                        {settingsMutation.isError&&(
                            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {errorMessage(
                                    settingsMutation.error,
                                    "Não foi possível guardar as configurações."
                                )}
                            </div>
                        )}
                    </div>

                    {canConfigure&&(
                        <div className="flex justify-end border-t border-slate-200 px-6 py-4 sm:px-8">
                            <button
                                type="submit"
                                disabled={settingsMutation.isPending}
                                className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {settingsMutation.isPending
                                    ?<LoaderCircle className="h-4 w-4 animate-spin"/>
                                    :<Save className="h-4 w-4"/>
                                }

                                Guardar configurações
                            </button>
                        </div>
                    )}
                </form>
            )}

            <CustomFieldModal
                open={fieldOpen}
                field={editingField}
                submitting={
                    createFieldMutation.isPending||
                    updateFieldMutation.isPending
                }
                error={fieldError}
                onClose={()=>{
                    if(
                        createFieldMutation.isPending||
                        updateFieldMutation.isPending
                    ){
                        return;
                    }

                    setFieldOpen(false);
                    setEditingField(null);
                    setFieldError("");
                }}
                onSubmit={saveField}
            />
        </div>
    );
}

function GeneralTab({
    form,
    disabled,
    onTenant,
    onChange,
}:{
    form:FleetSettingsData;
    disabled:boolean;
    onTenant:(key:"nome"|"email"|"telefone",value:string)=>void;
    onChange:(key:string,value:string)=>void;
}){
    return (
        <Section
            title="Identificação da frota"
            description="Dados gerais utilizados na operação e futuramente em documentos."
        >
            <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nome da organização">
                    <input
                        value={form.tenant.nome}
                        onChange={event=>onTenant("nome",event.target.value)}
                        disabled={disabled}
                        required
                        className={inputClass}
                    />
                </Field>

                <Field label="Nome comercial">
                    <input
                        value={form.settings.general.commercial_name??""}
                        onChange={event=>onChange("commercial_name",event.target.value)}
                        disabled={disabled}
                        className={inputClass}
                    />
                </Field>

                <Field label="NIF">
                    <input
                        value={form.tenant.nif??""}
                        disabled
                        className={disabledInputClass}
                    />
                </Field>

                <Field label="Pessoa de contacto">
                    <input
                        value={form.settings.general.contact_name??""}
                        onChange={event=>onChange("contact_name",event.target.value)}
                        disabled={disabled}
                        className={inputClass}
                    />
                </Field>

                <Field label="E-mail">
                    <input
                        type="email"
                        value={form.tenant.email??""}
                        onChange={event=>onTenant("email",event.target.value)}
                        disabled={disabled}
                        className={inputClass}
                    />
                </Field>

                <Field label="Telefone">
                    <input
                        value={form.tenant.telefone??""}
                        onChange={event=>onTenant("telefone",event.target.value)}
                        disabled={disabled}
                        className={inputClass}
                    />
                </Field>

                <Field label="Website">
                    <input
                        type="url"
                        value={form.settings.general.website??""}
                        onChange={event=>onChange("website",event.target.value)}
                        disabled={disabled}
                        placeholder="https://"
                        className={inputClass}
                    />
                </Field>

                <Field label="Morada">
                    <input
                        value={form.settings.general.address??""}
                        onChange={event=>onChange("address",event.target.value)}
                        disabled={disabled}
                        className={inputClass}
                    />
                </Field>

                <Field label="Código postal">
                    <input
                        value={form.settings.general.postal_code??""}
                        onChange={event=>onChange("postal_code",event.target.value)}
                        disabled={disabled}
                        className={inputClass}
                    />
                </Field>

                <Field label="Localidade">
                    <input
                        value={form.settings.general.city??""}
                        onChange={event=>onChange("city",event.target.value)}
                        disabled={disabled}
                        className={inputClass}
                    />
                </Field>

                <Field label="Distrito">
                    <input
                        value={form.settings.general.district??""}
                        onChange={event=>onChange("district",event.target.value)}
                        disabled={disabled}
                        className={inputClass}
                    />
                </Field>

                <Field label="Fuso horário">
                    <input
                        value={form.settings.regional.timezone}
                        disabled
                        className={disabledInputClass}
                    />
                </Field>
            </div>
        </Section>
    );
}

function OperationTab({
    form,
    platforms,
    operationTypes,
    disabled,
    onBaseCity,
    onTogglePlatform,
    onToggleType,
}:{
    form:FleetSettingsData;
    platforms:Record<string,string>;
    operationTypes:Record<string,string>;
    disabled:boolean;
    onBaseCity:(value:string)=>void;
    onTogglePlatform:(value:string)=>void;
    onToggleType:(value:string)=>void;
}){
    return (
        <div className="space-y-8">
            <Section
                title="Base operacional"
                description="Informação principal da operação TVDE."
            >
                <Field label="Cidade/base principal">
                    <input
                        value={form.settings.operation.base_city??""}
                        onChange={event=>onBaseCity(event.target.value)}
                        disabled={disabled}
                        placeholder="Lisboa"
                        className={inputClass}
                    />
                </Field>
            </Section>

            <Section
                title="Plataformas TVDE"
                description="Selecione as plataformas utilizadas pela frota."
            >
                <CheckGrid
                    options={platforms}
                    selected={form.settings.operation.platforms}
                    disabled={disabled}
                    onToggle={onTogglePlatform}
                />
            </Section>

            <Section
                title="Modelo de operação"
                description="Indique os modelos utilizados na gestão da frota."
            >
                <CheckGrid
                    options={operationTypes}
                    selected={form.settings.operation.operation_types}
                    disabled={disabled}
                    onToggle={onToggleType}
                />
            </Section>
        </div>
    );
}

function AlertsTab({
    form,
    disabled,
    onChange,
}:{
    form:FleetSettingsData;
    disabled:boolean;
    onChange:(key:string,value:number)=>void;
}){
    const items=[
        ["insurance_days","Seguro","Dias antes do vencimento do seguro"],
        ["inspection_days","Inspeção","Dias antes da inspeção"],
        ["iuc_days","IUC","Dias antes do vencimento"],
        ["criminal_record_days","Registo criminal","Dias antes da validade terminar"],
        ["driver_documents_days","Documentos do motorista","Antecedência padrão para documentos"],
    ] as const;

    return (
        <Section
            title="Prazos de alertas"
            description="Defina com quantos dias de antecedência o FrotaPro deve considerar cada situação próxima do vencimento."
        >
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {items.map(([key,label,description])=>(
                    <div
                        key={key}
                        className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div>
                            <div className="text-sm font-semibold text-slate-800">
                                {label}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                                {description}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={0}
                                max={365}
                                value={form.settings.alerts[key]}
                                onChange={event=>onChange(key,Number(event.target.value))}
                                disabled={disabled}
                                className="h-10 w-24 rounded-xl border border-slate-200 px-3 text-right text-sm"
                            />
                            <span className="text-sm text-slate-400">
                                dias
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </Section>
    );
}

function VehiclesTab({
    form,
    disabled,
    onChange,
}:{
    form:FleetSettingsData;
    disabled:boolean;
    onChange:(key:string,value:number)=>void;
}){
    return (
        <Section
            title="Manutenção preventiva"
            description="Valores padrão utilizados no acompanhamento da quilometragem dos veículos."
        >
            <div className="grid gap-5 sm:grid-cols-2">
                <Field
                    label="Intervalo padrão de revisão"
                    help="Quilómetros entre revisões."
                >
                    <NumberInput
                        value={form.settings.vehicles.revision_interval_km}
                        min={1000}
                        max={200000}
                        disabled={disabled}
                        suffix="km"
                        onChange={value=>onChange("revision_interval_km",value)}
                    />
                </Field>

                <Field
                    label="Antecedência do alerta"
                    help="Quantos quilómetros antes da revisão o alerta deve aparecer."
                >
                    <NumberInput
                        value={form.settings.vehicles.revision_alert_km}
                        min={0}
                        max={50000}
                        disabled={disabled}
                        suffix="km"
                        onChange={value=>onChange("revision_alert_km",value)}
                    />
                </Field>
            </div>
        </Section>
    );
}

function RentalsTab({
    form,
    periodicities,
    weekdays,
    disabled,
    onChange,
}:{
    form:FleetSettingsData;
    periodicities:Record<string,string>;
    weekdays:Record<string,string>;
    disabled:boolean;
    onChange:(key:string,value:string|number|null)=>void;
}){
    return (
        <Section
            title="Padrões de aluguer"
            description="Valores preenchidos por padrão ao criar novos alugueres. Poderão ser alterados em cada registo."
        >
            <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Periodicidade padrão">
                    <select
                        value={form.settings.rentals.periodicity}
                        onChange={event=>onChange("periodicity",event.target.value)}
                        disabled={disabled}
                        className={inputClass}
                    >
                        {Object.entries(periodicities).map(([value,label])=>(
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Dia padrão de vencimento">
                    <select
                        value={form.settings.rentals.due_weekday}
                        onChange={event=>onChange("due_weekday",Number(event.target.value))}
                        disabled={disabled}
                        className={inputClass}
                    >
                        {Object.entries(weekdays).map(([value,label])=>(
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Caução padrão">
                    <NumberInput
                        value={form.settings.rentals.default_deposit}
                        min={0}
                        max={999999.99}
                        disabled={disabled}
                        suffix="€"
                        nullable
                        onChange={value=>onChange("default_deposit",value)}
                    />
                </Field>

                <Field label="Quilómetros incluídos">
                    <NumberInput
                        value={form.settings.rentals.included_km}
                        min={0}
                        max={1000000}
                        disabled={disabled}
                        suffix="km"
                        nullable
                        onChange={value=>onChange("included_km",value)}
                    />
                </Field>
            </div>
        </Section>
    );
}

function CustomFieldsSection({
    fields,
    loading,
    canConfigure,
    deleting,
    onCreate,
    onEdit,
    onDelete,
}:{
    fields:TenantCustomField[];
    loading:boolean;
    canConfigure:boolean;
    deleting:boolean;
    onCreate:()=>void;
    onEdit:(field:TenantCustomField)=>void;
    onDelete:(field:TenantCustomField)=>void;
}){
    const entityLabels:Record<string,string>={
        empresa:"Empresas",
        proprietario:"Proprietários",
        motorista:"Motoristas",
        veiculo:"Veículos",
    };

    const typeLabels:Record<string,string>={
        text:"Texto",
        textarea:"Texto longo",
        number:"Número",
        date:"Data",
        boolean:"Sim / Não",
        select:"Lista",
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-bold text-slate-950">
                        Campos personalizados
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Crie campos adicionais para empresas, proprietários, motoristas e veículos.
                    </p>
                </div>

                {canConfigure&&(
                    <button
                        type="button"
                        onClick={onCreate}
                        className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white"
                    >
                        <Plus className="h-4 w-4"/>
                        Novo campo
                    </button>
                )}
            </div>

            {loading?(
                <div className="flex justify-center py-20">
                    <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
                </div>
            ):fields.length===0?(
                <div className="py-20 text-center">
                    <Settings2 className="mx-auto h-9 w-9 text-slate-300"/>
                    <p className="mt-3 text-sm font-medium text-slate-600">
                        Nenhum campo personalizado criado.
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Os campos criados aqui serão depois apresentados nos respetivos cadastros.
                    </p>
                </div>
            ):(
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                    Campo
                                </th>
                                <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                    Entidade
                                </th>
                                <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                    Tipo
                                </th>
                                <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                    Estado
                                </th>
                                <th className="px-5 py-3 text-right text-xs uppercase text-slate-500">
                                    Ações
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {fields.map(field=>(
                                <tr key={field.id}>
                                    <td className="px-5 py-4">
                                        <div className="font-semibold text-slate-900">
                                            {field.label}
                                        </div>
                                        <div className="mt-1 font-mono text-xs text-slate-400">
                                            {field.key}
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        {entityLabels[field.entity]??field.entity}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        {typeLabels[field.type]??field.type}
                                        {field.required&&(
                                            <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                                                Obrigatório
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-5 py-4">
                                        <span className={[
                                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                                            field.active
                                                ?"bg-emerald-50 text-emerald-700"
                                                :"bg-slate-100 text-slate-500",
                                        ].join(" ")}>
                                            {field.active?"Ativo":"Inativo"}
                                        </span>
                                    </td>

                                    <td className="px-5 py-4">
                                        {canConfigure&&(
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    title="Editar"
                                                    onClick={()=>onEdit(field)}
                                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                                                >
                                                    <Pencil className="h-4 w-4"/>
                                                </button>

                                                <button
                                                    type="button"
                                                    title="Remover"
                                                    disabled={deleting}
                                                    onClick={()=>onDelete(field)}
                                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function Section({
    title,
    description,
    children,
}:{
    title:string;
    description:string;
    children:React.ReactNode;
}){
    return (
        <section>
            <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-950">
                    {title}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    {description}
                </p>
            </div>

            {children}
        </section>
    );
}

function Field({
    label,
    help,
    children,
}:{
    label:string;
    help?:string;
    children:React.ReactNode;
}){
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </label>

            {children}

            {help&&(
                <p className="mt-1.5 text-xs text-slate-400">
                    {help}
                </p>
            )}
        </div>
    );
}

function CheckGrid({
    options,
    selected,
    disabled,
    onToggle,
}:{
    options:Record<string,string>;
    selected:string[];
    disabled:boolean;
    onToggle:(value:string)=>void;
}){
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(options).map(([value,label])=>(
                <label
                    key={value}
                    className={[
                        "flex items-center gap-3 rounded-xl border p-4 transition",
                        selected.includes(value)
                            ?"border-indigo-200 bg-indigo-50"
                            :"border-slate-200 bg-white",
                        disabled
                            ?"cursor-default opacity-70"
                            :"cursor-pointer",
                    ].join(" ")}
                >
                    <input
                        type="checkbox"
                        checked={selected.includes(value)}
                        disabled={disabled}
                        onChange={()=>onToggle(value)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />

                    <span className="text-sm font-semibold text-slate-700">
                        {label}
                    </span>
                </label>
            ))}
        </div>
    );
}

function NumberInput({
    value,
    min,
    max,
    disabled,
    suffix,
    nullable=false,
    onChange,
}:{
    value:number|null;
    min:number;
    max:number;
    disabled:boolean;
    suffix:string;
    nullable?:boolean;
    onChange:(value:number|null)=>void;
}){
    return (
        <div className="relative">
            <input
                type="number"
                min={min}
                max={max}
                value={value??""}
                onChange={event=>{
                    if(
                        nullable &&
                        event.target.value===""
                    ){
                        onChange(null);
                        return;
                    }

                    onChange(
                        Number(event.target.value)
                    );
                }}
                disabled={disabled}
                className={`${inputClass} pr-12`}
            />

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                {suffix}
            </span>
        </div>
    );
}

function errorMessage(
    error:unknown,
    fallback:string
):string {
    if(
        axios.isAxiosError(error)
    ){
        const errors=
            error.response?.data?.errors;

        if(errors&&typeof errors==="object"){
            const first=
                Object.values(errors)
                    .flat()
                    .find(
                        value=>
                            typeof value==="string"
                    );

            if(typeof first==="string"){
                return first;
            }
        }

        const message=
            error.response?.data?.message;

        if(typeof message==="string"){
            return message;
        }
    }

    return fallback;
}

const inputClass=
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:text-slate-500";

const disabledInputClass=
    "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500";
