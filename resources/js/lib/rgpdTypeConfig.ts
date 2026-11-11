/**
 * FROTAPRO_4R14B5A
 *
 * Proposta local de configuração do tipo RGPD.
 * Não realiza pedidos HTTP nem grava dados.
 */

export type RgpdSignatureRole =
    | "ASSINATURA_MOTORISTA"
    | "ASSINATURA_PROPRIETARIO"
    | "ASSINATURA_EMPRESA"
    | "ASSINATURA_TESTEMUNHA"
    | "ASSINATURA_TITULAR";

export interface RgpdEditableConfiguration {
    entidades: {
        empresa: boolean;
        proprietario: boolean;
        motorista: boolean;
        veiculo: boolean;
    };

    assinaturas: Record<
        RgpdSignatureRole,
        {
            enabled: boolean;
            obrigatoria: boolean;
            presencial: boolean;
            remota: boolean;
        }
    >;

    associar_motorista_veiculo: boolean;
}

export function isRgpdConfigurationCode(
    code: string
): boolean {
    return [
        "rgpd",
        "rgpd_informacao_autorizacoes",
        "informacao_tratamento_dados_rgpd",
    ].includes(code.trim().toLowerCase());
}

export function proposeRgpdConfiguration<
    T extends RgpdEditableConfiguration
>(current: T): T {
    const signatures = {
        ...current.assinaturas,
    };

    for (const key of Object.keys(signatures) as RgpdSignatureRole[]) {
        const isHolder = key === "ASSINATURA_TITULAR";

        signatures[key] = {
            ...signatures[key],
            enabled: isHolder,

            obrigatoria: isHolder
                ? true
                : signatures[key].obrigatoria,

            presencial: isHolder
                ? true
                : signatures[key].presencial,

            remota: isHolder
                ? true
                : signatures[key].remota,
        };
    }

    return {
        ...current,

        entidades: {
            ...current.entidades,
            empresa: true,
            proprietario: false,
            motorista: false,
            veiculo: false,
        },

        assinaturas: signatures,

        associar_motorista_veiculo: false,
    };
}