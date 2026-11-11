import type { Empresa } from "../../../types/empresa";
import type { Motorista } from "../../../types/motorista";
import type { Proprietario } from "../../../types/proprietario";
import type { ContractWizardForm, TipoContrato } from "../../../types/tipo-contrato";

/** Campos da declaração RGPD dentro do passo "Dados" do wizard comum. */
export interface RgpdFuncionario {
    id: string;
    nome: string;
    email: string | null;
    nif: string | null;
}

export const rgpdDecisions = [
    { key: "RGPD_DECISAO_IMAGEM", label: "Utilização promocional da imagem", options: ["autorizo", "nao_autorizo"] },
    { key: "RGPD_DECISAO_VOZ", label: "Utilização promocional da voz", options: ["autorizo", "nao_autorizo"] },
    { key: "RGPD_DECISAO_GEO", label: "Localização para finalidade facultativa identificada", options: ["autorizo", "nao_autorizo", "nao_aplicavel"] },
    { key: "RGPD_DECISAO_SENSIVEIS", label: "Dados de categorias especiais para a finalidade identificada", options: ["autorizo", "nao_autorizo", "nao_aplicavel"] },
] as const;

export function rgpdDecisionsForType(type: TipoContrato) {
    return type.template?.modelo_documento_saas_versao === "1.2"
        ? rgpdDecisions.filter((item) => item.key !== "RGPD_DECISAO_SENSIVEIS")
        : rgpdDecisions;
}

/**
 * Identifica o formulario RGPD independentemente de a
 * configuracao de assinaturas estar correta.
 *
 * Os nomes legados servem apenas para apresentar
 * o formulario e um aviso de configuracao.
 * Nao autorizam a emissao do documento.
 */
export function isRgpdType(
    type: TipoContrato | null | undefined,
): boolean {
    if (!type) return false;

    const code = String(type.codigo ?? "")
        .trim()
        .toLowerCase();

    if (
        [
            "rgpd_informacao_autorizacoes",
            "informacao_tratamento_dados_rgpd",
            "rgpd",
        ].includes(code)
    ) {
        return true;
    }

    const name = String(type.nome ?? "")
        .trim()
        .toLowerCase();

    const templateName = String(
        type.template?.nome ?? "",
    )
        .trim()
        .toLowerCase();

    return (
        name === "rgpd" &&
        templateName.includes(
            "tratamento de dados pessoais",
        )
    );
}

/**
 * Confirma a configuracao que o backend exige.
 * Uma configuracao invalida nunca permite emitir.
 */
export function rgpdTypeConfigurationError(
    type: TipoContrato,
): string | null {
    if (!isRgpdType(type)) return null;

    const code = String(type.codigo ?? "")
        .trim()
        .toLowerCase();

    const allowedCodes = [
        "rgpd",
        "rgpd_informacao_autorizacoes",
        "informacao_tratamento_dados_rgpd",
    ];

    if (!allowedCodes.includes(code)) {
        return (
            "O tipo RGPD possui um codigo documental " +
            "incompativel. Em Tipos de contrato, configure " +
            "o codigo rgpd_informacao_autorizacoes."
        );
    }

    if (!type.template_id) {
        return "Associe um modelo documental RGPD ao tipo.";
    }

    const workflowCode =
        type.checklist_process_template?.codigo ?? "";

    if (
        ![
            "rgpd_informacao_autorizacoes",
            "frotapro_rgpd_informacao_autorizacoes",
        ].includes(workflowCode)
    ) {
        return (
            "Associe o workflow RGPD correto ao tipo " +
            "documental. O codigo do workflow deve ser " +
            "rgpd_informacao_autorizacoes."
        );
    }

    const configured =
        type.assinaturas_configuracao;

    if (
        configured.length !== 1 ||
        configured[0]?.placeholder !==
            "ASSINATURA_TITULAR" ||
        configured[0]?.obrigatoria !== true ||
        configured[0]?.modos.length === 0
    ) {
        return (
            "O RGPD exige exatamente uma assinatura " +
            "configurada: ASSINATURA_TITULAR, obrigatoria. " +
            "Remova as assinaturas de motorista, " +
            "proprietario, empresa e testemunha " +
            "deste tipo documental."
        );
    }

    if (
        !type.entidades.empresa ||
        type.entidades.motorista ||
        type.entidades.proprietario ||
        type.entidades.veiculo
    ) {
        return (
            "No tipo RGPD, configure apenas a Empresa " +
            "como entidade obrigatoria. O motorista, " +
            "proprietario, colaborador ou titular externo " +
            "sera selecionado no formulario RGPD."
        );
    }

    if (
        type.configuracao.associar_motorista_veiculo ===
        true
    ) {
        return (
            "Desative a associacao automatica de " +
            "motorista e veiculo no tipo RGPD."
        );
    }

    return null;
}

export function rgpdSigner(
    form: ContractWizardForm,
    motorista: Motorista | undefined,
    proprietario: Proprietario | undefined,
    funcionarios: RgpdFuncionario[],
): { nome: string; email: string } {
    const fields = form.campos_preenchidos;
    const kind = String(fields.RGPD_TITULAR_TIPO ?? "");

    if (kind === "motorista" && motorista) {
        return { nome: motorista.nome_completo ?? "", email: motorista.email ?? "" };
    }
    if (kind === "proprietario" && proprietario) {
        return { nome: proprietario.nome_completo ?? "", email: proprietario.email ?? "" };
    }
    if (kind === "colaborador") {
        const funcionario = funcionarios.find((item) => item.id === fields.RGPD_TITULAR_ID);
        return { nome: funcionario?.nome ?? "", email: funcionario?.email ?? "" };
    }
    if (kind === "outro") {
        return { nome: String(fields.RGPD_OUTRO_NOME ?? "").trim(), email: "" };
    }
    return { nome: "", email: "" };
}

export function validateRgpdFields(
    type: TipoContrato,
    form: ContractWizardForm,
    funcionarios: RgpdFuncionario[],
): string | null {
    if (!isRgpdType(type)) return null;

    const configurationError =
        rgpdTypeConfigurationError(type);

    if (configurationError) {
        return configurationError;
    }

    const fields = form.campos_preenchidos;
    const kind = String(fields.RGPD_TITULAR_TIPO ?? "");

    if (!form.empresa_id) return "Selecione a empresa responsável pelo tratamento.";
    if (!["motorista", "proprietario", "colaborador", "outro"].includes(kind)) {
        return "Selecione a qualidade do titular dos dados.";
    }
    if (type.entidades.motorista && kind !== "motorista") {
        return "Este tipo RGPD exige motorista na configuração. Para aceitar outros titulares, retire essa obrigatoriedade do tipo documental.";
    }
    if (type.entidades.proprietario && kind !== "proprietario") {
        return "Este tipo RGPD exige proprietário na configuração. Para aceitar outros titulares, retire essa obrigatoriedade do tipo documental.";
    }
    if (kind === "motorista" && !form.motorista_id) return "Selecione o motorista titular dos dados.";
    if (kind === "proprietario" && !form.proprietario_id) return "Selecione o proprietário titular dos dados.";
    if (kind === "colaborador" && !funcionarios.some((f) => f.id === fields.RGPD_TITULAR_ID)) {
        return "Selecione um colaborador autorizado da organização.";
    }
    if (kind === "outro") {
        for (const [key, label] of [
            ["RGPD_OUTRO_NOME", "nome"],
            ["RGPD_OUTRO_NIF", "NIF"],
            ["RGPD_OUTRO_CONTACTO", "contacto"],
        ]) {
            if (!String(fields[key] ?? "").trim()) return `Informe o ${label} do titular externo.`;
        }
    }
    for (const decision of rgpdDecisionsForType(type)) {
        if (!decision.options.some((option) => option === fields[decision.key])) {
            return `Registe uma decisão expressa para: ${decision.label}.`;
        }
    }
    return null;
}

function choiceLabel(key: string, option: string): string {
    if (option === "nao_aplicavel") return "Não aplicável";
    if (key === "RGPD_DECISAO_SENSIVEIS") {
        return option === "autorizo" ? "Presto consentimento explícito" : "Não presto consentimento";
    }
    return option === "autorizo" ? "Autorizo" : "Não autorizo";
}

interface Props {
    form: ContractWizardForm;
    type: TipoContrato;
    empresa?: Empresa;
    funcionarios: RgpdFuncionario[];
    loading: boolean;
    error: string;
    search: string;
    onSearch: (value: string) => void;
    onField: (field: keyof Omit<ContractWizardForm, "campos_preenchidos">, value: string) => void;
    onCustomField: (key: string, value: string | number | boolean | null) => void;
}

export default function ContractRgpdFields({
    form, type, empresa, funcionarios, loading, error, search, onSearch, onField, onCustomField,
}: Props) {
    const fields = form.campos_preenchidos;
    const kind = String(fields.RGPD_TITULAR_TIPO ?? "");
    const display = (key: string): string => String(fields[key] ?? "");
    const companyGeoPurpose = String(
        empresa?.privacidade_finalidade_localizacao ?? ""
    ).trim();
    const isRgpd12 = type.template?.modelo_documento_saas_versao === "1.2";
    const employeeOptions = funcionarios.filter((item) => {
        const haystack = `${item.nome} ${item.email ?? ""} ${item.nif ?? ""}`.toLowerCase();
        return item.id === fields.RGPD_TITULAR_ID || haystack.includes(search.trim().toLowerCase());
    });

    function changeKind(next: string) {
        onCustomField("RGPD_TITULAR_TIPO", next);
        onCustomField("RGPD_TITULAR_ID", "");
        for (const name of ["RGPD_OUTRO_NOME", "RGPD_OUTRO_NIF", "RGPD_OUTRO_CONTACTO", "RGPD_OUTRO_IDENTIFICADOR"]) {
            onCustomField(name, "");
        }
        onField("motorista_id", "");
        onField("proprietario_id", "");
    }

    const selectClass = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm";
    return (
        <section className="border-t border-slate-200 pt-7" aria-label="Titular e autorizações RGPD">
            <h3 className="text-lg font-semibold text-slate-950">Titular dos dados</h3>
            <p className="mt-1 text-sm text-slate-500">A empresa e os dados do titular são obtidos do cadastro. As autorizações facultativas exigem uma decisão individual.</p>
            <label className="mt-5 block text-sm font-medium text-slate-700">
                Qualidade do titular *
                <select className={selectClass} required value={kind} onChange={(event) => changeKind(event.target.value)}>
                    <option value="">Selecionar...</option>
                    <option value="motorista">Motorista</option>
                    <option value="proprietario">Proprietário</option>
                    <option value="colaborador">Colaborador</option>
                    <option value="outro">Outro titular</option>
                </select>
            </label>
            {kind === "colaborador" && (
                <div className="mt-5 space-y-3">
                    <label className="block text-sm font-medium text-slate-700">
                        Procurar colaborador
                        <input className={selectClass} value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Nome, NIF ou e-mail" />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Colaborador titular *
                        <select className={selectClass} value={display("RGPD_TITULAR_ID")} required onChange={(event) => onCustomField("RGPD_TITULAR_ID", event.target.value)}>
                            <option value="">Selecionar...</option>
                            {employeeOptions.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                        </select>
                    </label>
                    {loading && <p className="text-xs text-slate-500">A consultar colaboradores...</p>}
                    {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}
                    <p className="text-xs text-slate-500">A consulta respeita as permissões existentes do módulo de funcionários. Utilize a pesquisa quando houver muitos registos.</p>
                </div>
            )}
            {kind === "outro" && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {[
                        ["RGPD_OUTRO_NOME", "Nome completo", true],
                        ["RGPD_OUTRO_NIF", "NIF", true],
                        ["RGPD_OUTRO_CONTACTO", "Contacto (e-mail ou telefone)", true],
                        ["RGPD_OUTRO_IDENTIFICADOR", "Identificador interno", false],
                    ].map(([key, label, required]) => (
                        <label key={String(key)} className="block text-sm font-medium text-slate-700">
                            {label}{required ? " *" : ""}
                            <input className={selectClass} value={display(String(key))} required={Boolean(required)} onChange={(event) => onCustomField(String(key), event.target.value)} />
                        </label>
                    ))}
                    <p className="md:col-span-2 text-xs text-amber-800">Titulares externos apenas podem assinar presencialmente, com verificação da identidade.</p>
                </div>
            )}
            <h3 className="mt-8 text-lg font-semibold text-slate-950">Autorizações específicas</h3>
            <p className="mt-1 text-sm text-slate-500">Não existe consentimento pré-selecionado. Recusar uma autorização facultativa é uma escolha válida.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
                {rgpdDecisionsForType(type).map((decision) => (
                    <label key={decision.key} className="block text-sm font-medium text-slate-700">
                        {decision.label} *
                        <select className={selectClass} value={display(decision.key)} required onChange={(event) => onCustomField(decision.key, event.target.value)}>
                            <option value="">Selecione uma decisão...</option>
                            {decision.options.map((option) => (
                                <option value={option} key={option}>{choiceLabel(decision.key, option)}</option>
                            ))}
                        </select>
                        {decision.key === "RGPD_DECISAO_GEO" && isRgpd12 && (
                            <span className="mt-2 block text-xs leading-relaxed text-slate-600">
                                {display(decision.key) === "autorizo"
                                    ? companyGeoPurpose
                                        ? `Finalidade registada na empresa: ${companyGeoPurpose}`
                                        : "Para autorizar, a empresa deve ter uma finalidade concreta registada em Empresas > Editar empresa > RGPD > Finalidade facultativa de localização. Se este tratamento não existir, selecione Não aplicável."
                                    : "Selecione Não aplicável se a empresa não realizar este tratamento facultativo. A recusa também é uma decisão válida."}
                            </span>
                        )}
                    </label>
                ))}
            </div>
        </section>
    );
}
