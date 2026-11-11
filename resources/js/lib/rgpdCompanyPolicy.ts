/**
 * RGPD 1.1 - requisitos documentais provenientes da empresa.
 * Nenhum valor e inventado ou guardado por este modulo.
 * O indicador NAO representa aprovacao juridica ou prontidao para emissao.
 */
export const RGPD_COMPANY_POLICY_REQUIREMENTS = [
    { token: 'RGPD_CONTACTO_PRIVACIDADE', label: 'E-mail de privacidade', fields: ['privacidade_contacto_email'] },
    { token: 'RGPD_EPD', label: 'Encarregado de protecao de dados (nome ou e-mail)', fields: ['privacidade_epd_nome', 'privacidade_epd_email'] },
    { token: 'RGPD_RETENCAO_CADASTRO', label: 'Conservacao da identificacao e cadastro', fields: ['privacidade_prazo_identificacao'] },
    { token: 'RGPD_RETENCAO_CONTRATOS', label: 'Conservacao de contratos', fields: ['privacidade_prazo_contratos'] },
    { token: 'RGPD_RETENCAO_FISCAL', label: 'Conservacao fiscal', fields: ['privacidade_prazo_fiscal'] },
    { token: 'RGPD_RETENCAO_OPERACIONAL', label: 'Conservacao operacional', fields: ['privacidade_prazo_operacional'] },
    { token: 'RGPD_RETENCAO_CONSENTIMENTOS', label: 'Conservacao dos consentimentos', fields: ['privacidade_prazo_consentimentos'] },
    { token: 'RGPD_RETENCAO_LOCALIZACAO', label: 'Conservacao da localizacao', fields: ['privacidade_prazo_localizacao'] },
    { token: 'RGPD_TRANSFERENCIAS', label: 'Transferencias internacionais', fields: ['privacidade_transferencias_internacionais'] },
    { token: 'RGPD_DECISOES_AUTOMATIZADAS', label: 'Decisoes automatizadas e perfis', fields: ['privacidade_decisoes_automatizadas'] },
    { token: 'RGPD_GEO_FINALIDADE', label: 'Finalidade da geolocalizacao', fields: ['privacidade_finalidade_localizacao'] },
    { token: 'RGPD_SENSIVEL_FINALIDADE', label: 'Finalidade de dados especiais', fields: ['privacidade_finalidade_dados_especiais'] },
    { token: 'RGPD_SENSIVEL_CATEGORIAS', label: 'Categorias de dados especiais', fields: ['privacidade_categorias_dados_especiais'] },
    { token: 'RGPD_SENSIVEL_ARTIGO9', label: 'Condicao do artigo 9.o do RGPD', fields: ['privacidade_condicao_artigo9'] },
] as const;

type Field = (typeof RGPD_COMPANY_POLICY_REQUIREMENTS)[number]['fields'][number];
export type RgpdCompanyPolicyValues = Partial<Record<Field, string | null | undefined>>;

export function rgpdCompanyPolicyStatus(values: RgpdCompanyPolicyValues) {
    const missing = RGPD_COMPANY_POLICY_REQUIREMENTS.filter(
        (requirement) => !requirement.fields.some(
            (field) => typeof values[field] === 'string' && values[field]!.trim().length > 0
        )
    );

    return {
        total: RGPD_COMPANY_POLICY_REQUIREMENTS.length,
        complete: RGPD_COMPANY_POLICY_REQUIREMENTS.length - missing.length,
        missing,
        allPresent: missing.length === 0,
    };
}