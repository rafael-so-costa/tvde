import {FormEvent,useEffect,useState} from "react";
import {LoaderCircle,X} from "lucide-react";
import type {
    CustomFieldEntity,
    CustomFieldPayload,
    CustomFieldType,
    TenantCustomField,
} from "../../types/settings";

interface Props {
    open:boolean;
    field:TenantCustomField|null;
    submitting:boolean;
    error:string;
    onClose:()=>void;
    onSubmit:(payload:CustomFieldPayload)=>Promise<void>;
}

const entities:Record<CustomFieldEntity,string>={
    empresa:"Empresas",
    proprietario:"Proprietários",
    motorista:"Motoristas",
    veiculo:"Veículos",
};

const types:Record<CustomFieldType,string>={
    text:"Texto",
    textarea:"Texto longo",
    number:"Número",
    date:"Data",
    boolean:"Sim / Não",
    select:"Lista de opções",
};

export default function CustomFieldModal({
    open,
    field,
    submitting,
    error,
    onClose,
    onSubmit,
}:Props){
    const [entity,setEntity]=useState<CustomFieldEntity>("motorista");
    const [key,setKey]=useState("");
    const [label,setLabel]=useState("");
    const [type,setType]=useState<CustomFieldType>("text");
    const [required,setRequired]=useState(false);
    const [active,setActive]=useState(true);
    const [placeholder,setPlaceholder]=useState("");
    const [helpText,setHelpText]=useState("");
    const [defaultValue,setDefaultValue]=useState("");
    const [sortOrder,setSortOrder]=useState("0");
    const [options,setOptions]=useState("");

    useEffect(()=>{
        if(!open){
            return;
        }

        setEntity(field?.entity??"motorista");
        setKey(field?.key??"");
        setLabel(field?.label??"");
        setType(field?.type??"text");
        setRequired(field?.required??false);
        setActive(field?.active??true);
        setPlaceholder(field?.placeholder??"");
        setHelpText(field?.help_text??"");
        setDefaultValue(field?.default_value??"");
        setSortOrder(String(field?.sort_order??0));
        setOptions((field?.options??[]).join("\n"));
    },[open,field]);

    async function submit(event:FormEvent){
        event.preventDefault();

        const parsedOptions=
            type==="select"
                ?options
                    .split("\n")
                    .map(item=>item.trim())
                    .filter(Boolean)
                :null;

        await onSubmit({
            entity,
            key:key.trim()||null,
            label:label.trim(),
            type,
            required,
            active,
            options:parsedOptions,
            placeholder:placeholder.trim()||null,
            help_text:helpText.trim()||null,
            default_value:defaultValue.trim()||null,
            sort_order:Number(sortOrder)||0,
        });
    }

    if(!open){
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <form
                onSubmit={submit}
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <div>
                        <h2 className="text-lg font-bold text-slate-950">
                            {field?"Editar campo":"Novo campo personalizado"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Defina informação adicional para os cadastros da frota.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
                    >
                        <X className="h-4 w-4"/>
                    </button>
                </div>

                <div className="space-y-5 p-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Entidade">
                            <select
                                value={entity}
                                onChange={event=>setEntity(event.target.value as CustomFieldEntity)}
                                className={inputClass}
                            >
                                {Object.entries(entities).map(([value,text])=>(
                                    <option key={value} value={value}>
                                        {text}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Tipo">
                            <select
                                value={type}
                                onChange={event=>setType(event.target.value as CustomFieldType)}
                                className={inputClass}
                            >
                                {Object.entries(types).map(([value,text])=>(
                                    <option key={value} value={value}>
                                        {text}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <Field label="Nome do campo">
                        <input
                            value={label}
                            onChange={event=>setLabel(event.target.value)}
                            required
                            maxLength={120}
                            placeholder="Ex.: Número interno"
                            className={inputClass}
                        />
                    </Field>

                    <Field
                        label="Chave"
                        help="Pode deixar vazio para o FrotaPro gerar automaticamente."
                    >
                        <input
                            value={key}
                            onChange={event=>setKey(event.target.value)}
                            maxLength={80}
                            placeholder="numero_interno"
                            className={inputClass}
                        />
                    </Field>

                    {type==="select"&&(
                        <Field
                            label="Opções"
                            help="Uma opção por linha."
                        >
                            <textarea
                                value={options}
                                onChange={event=>setOptions(event.target.value)}
                                rows={5}
                                required
                                placeholder={"TVDE\nSubstituição\nReserva"}
                                className={textareaClass}
                            />
                        </Field>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Placeholder">
                            <input
                                value={placeholder}
                                onChange={event=>setPlaceholder(event.target.value)}
                                maxLength={255}
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Ordem">
                            <input
                                type="number"
                                min={0}
                                max={9999}
                                value={sortOrder}
                                onChange={event=>setSortOrder(event.target.value)}
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <Field label="Texto de ajuda">
                        <textarea
                            value={helpText}
                            onChange={event=>setHelpText(event.target.value)}
                            rows={2}
                            maxLength={500}
                            className={textareaClass}
                        />
                    </Field>

                    <Field label="Valor padrão">
                        <input
                            value={defaultValue}
                            onChange={event=>setDefaultValue(event.target.value)}
                            maxLength={2000}
                            className={inputClass}
                        />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                            <input
                                type="checkbox"
                                checked={required}
                                onChange={event=>setRequired(event.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                            />

                            <div>
                                <div className="text-sm font-semibold text-slate-800">
                                    Obrigatório
                                </div>
                                <div className="text-xs text-slate-500">
                                    Exigir preenchimento no cadastro.
                                </div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                            <input
                                type="checkbox"
                                checked={active}
                                onChange={event=>setActive(event.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                            />

                            <div>
                                <div className="text-sm font-semibold text-slate-800">
                                    Ativo
                                </div>
                                <div className="text-xs text-slate-500">
                                    Disponível nos formulários.
                                </div>
                            </div>
                        </label>
                    </div>

                    {error&&(
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {submitting&&(
                            <LoaderCircle className="h-4 w-4 animate-spin"/>
                        )}

                        {field?"Guardar alterações":"Criar campo"}
                    </button>
                </div>
            </form>
        </div>
    );
}

const inputClass=
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const textareaClass=
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

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
