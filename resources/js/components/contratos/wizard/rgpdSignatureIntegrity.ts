import type {
    ContractWizardSignatures,
} from "../../../types/tipo-contrato";

/**
 * FROTAPRO_4R14B4R
 *
 * Identifica alteracoes que obrigam a
 * recolher novamente a assinatura RGPD.
 */
export function rgpdRelevantChange(
    isRgpd: boolean,
    field: string,
    before: unknown,
    after: unknown,
): boolean {
    if (!isRgpd) {
        return false;
    }

    const protectedField =
        [
            "empresa_id",
            "motorista_id",
            "proprietario_id",
        ].includes(field) ||
        field.startsWith("RGPD_");

    if (!protectedField) {
        return false;
    }

    return (
        String(before ?? "") !==
        String(after ?? "")
    );
}

/**
 * Limpa a imagem da assinatura do titular.
 *
 * Preserva:
 * - restantes assinaturas;
 * - identidade do signatario;
 * - modo de assinatura;
 * - estado anterior, sem mutacao.
 */
export function invalidateRgpdCapturedSignature(
    current: ContractWizardSignatures,
): ContractWizardSignatures {
    const titular =
        current.ASSINATURA_TITULAR;

    if (!titular?.assinatura_url) {
        return current;
    }

    return {
        ...current,

        ASSINATURA_TITULAR: {
            ...titular,

            assinatura_url: "",
        },
    };
}