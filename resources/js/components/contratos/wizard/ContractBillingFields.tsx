import type { ContractWizardForm } from "../../../types/tipo-contrato";

type Fields=ContractWizardForm["campos_preenchidos"];
type Change=(key:string,value:string)=>void;

const periods=[
    ["diario","Diário"],
    ["semanal","Semanal"],
    ["quinzenal","Quinzenal"],
    ["mensal","Mensal"],
    ["bimestral","Bimestral"],
    ["trimestral","Trimestral"],
    ["semestral","Semestral"],
    ["anual","Anual"],
] as const;

const modes=["fixa","variavel","mista"];

const read=(f:Fields,k:string):string=>String(f[k]??"").trim();

function validNumber(value:string,max:number):boolean{
    if(!/^\d{1,9}(?:[.,]\d{1,2})?$/.test(value))return false;

    const number=Number(value.replace(",","."));

    return Number.isFinite(number)&&
        number>0&&number<=max;
}

export function validateBillingFields(f:Fields):string|null{
    const mode=read(f,"TIPO_COBRANCA");
    const period=read(f,"PERIODICIDADE_PAGAMENTO");

    if(!modes.includes(mode)){
        return "Selecione o tipo de cobrança.";
    }

    if(!periods.some(([value])=>value===period)){
        return "Selecione a periodicidade de pagamento.";
    }

    if(
        mode!=="variavel" &&
        !validNumber(read(f,"VALOR_FIXO_COBRANCA"),999999999.99)
    ){
        return "Informe um valor fixo superior a zero.";
    }

    if(mode!=="fixa"){
        if(!validNumber(read(f,"PERCENTAGEM_COBRANCA"),100)){
            return "Informe uma percentagem entre 0 e 100%.";
        }

        const base=read(f,"BASE_CALCULO_COBRANCA");

        if(!base||base.length>160||/[\r\n<>]/.test(base)){
            return "Informe uma base de cálculo válida.";
        }
    }

    return null;
}

export default function ContractBillingFields({
    fields,onChange
}:{
    fields:Fields;
    onChange:Change;
}){
    const mode=read(fields,"TIPO_COBRANCA");
    const fixed=mode==="fixa"||mode==="mista";
    const percent=mode==="variavel"||mode==="mista";

    const css="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

    return(
        <section className="border-t border-slate-200 pt-7">
            <h3 className="text-lg font-semibold text-slate-950">
                Condições financeiras do contrato
            </h3>

            <p className="mt-1 text-sm text-slate-500">
                Defina os valores e a periodicidade acordados.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                        Tipo de cobrança *
                    </span>

                    <select
                        className={css}
                        value={mode}
                        onChange={e=>onChange("TIPO_COBRANCA",e.target.value)}
                    >
                        <option value="">Selecionar...</option>
                        <option value="fixa">Fixa</option>
                        <option value="variavel">Variável</option>
                        <option value="mista">Mista (fixa + variável)</option>
                    </select>
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                        Periodicidade de pagamento *
                    </span>

                    <select
                        className={css}
                        value={read(fields,"PERIODICIDADE_PAGAMENTO")}
                        onChange={e=>onChange("PERIODICIDADE_PAGAMENTO",e.target.value)}
                    >
                        <option value="">Selecionar...</option>
                        {periods.map(([value,label])=>(
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </label>

                {fixed&&(
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                            Valor fixo (€) *
                        </span>

                        <input
                            className={css}
                            type="text"
                            inputMode="decimal"
                            placeholder="25,00"
                            value={read(fields,"VALOR_FIXO_COBRANCA")}
                            onChange={e=>onChange("VALOR_FIXO_COBRANCA",e.target.value)}
                        />
                    </label>
                )}

                {percent&&(
                    <>
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                                Percentagem (%) *
                            </span>

                            <input
                                className={css}
                                type="text"
                                inputMode="decimal"
                                placeholder="5"
                                value={read(fields,"PERCENTAGEM_COBRANCA")}
                                onChange={e=>onChange("PERCENTAGEM_COBRANCA",e.target.value)}
                            />
                        </label>

                        <label className="block md:col-span-2">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                                Base de cálculo da percentagem *
                            </span>

                            <input
                                className={css}
                                type="text"
                                maxLength={160}
                                placeholder="Ex.: faturação bruta das plataformas"
                                value={String(fields["BASE_CALCULO_COBRANCA"]??"")}
                                onChange={e=>onChange("BASE_CALCULO_COBRANCA",e.target.value)}
                            />
                        </label>
                    </>
                )}
            </div>
        </section>
    );
}
