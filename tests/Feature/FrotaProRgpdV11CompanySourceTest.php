<?php

/*
 * FROTAPRO_4R14B4H
 *
 * Verifica valores da entidade Empresa
 * sem executar migrations ou alterar dados.
 */

test(
    '4r14b4h mapeia campos reais da empresa',
    function (): void {
        $empresa = new \App\Models\Empresa();

        $empresa->forceFill([
            'privacidade_contacto_email' =>
                'privacidade@empresa.test',

            'privacidade_prazo_identificacao' =>
                'Prazo definido para cadastro',

            'privacidade_prazo_contratos' =>
                'Prazo contratual configurado',

            'privacidade_prazo_fiscal' =>
                'Prazo fiscal configurado',

            'privacidade_prazo_operacional' =>
                'Prazo operacional configurado',

            'privacidade_prazo_consentimentos' =>
                'Prazo dos consentimentos configurado',

            'privacidade_prazo_localizacao' =>
                'Prazo de localizacao configurado',

            'privacidade_transferencias_internacionais' =>
                'Sem transferencias internacionais declaradas',

            'privacidade_decisoes_automatizadas' =>
                'Sem decisoes exclusivamente automatizadas',

            'privacidade_finalidade_localizacao' =>
                'Finalidade facultativa concreta',

            'privacidade_finalidade_dados_especiais' =>
                'Finalidade especifica configurada',

            'privacidade_categorias_dados_especiais' =>
                'Categorias especificadas',

            'privacidade_condicao_artigo9' =>
                'Condicao juridica configurada',

            'privacidade_epd_nome' =>
                'Responsavel EPD',

            'privacidade_epd_email' =>
                'epd@empresa.test',
        ]);

        $service = app(
            \App\Services\FrotaProRgpdV11Service::class
        );

        $values = $service->companyPrivacyValues($empresa);

        expect($values)->toMatchArray([
            'RGPD_CONTACTO_PRIVACIDADE' =>
                'privacidade@empresa.test',

            'RGPD_RETENCAO_CADASTRO' =>
                'Prazo definido para cadastro',

            'RGPD_RETENCAO_CONTRATOS' =>
                'Prazo contratual configurado',

            'RGPD_RETENCAO_FISCAL' =>
                'Prazo fiscal configurado',

            'RGPD_RETENCAO_OPERACIONAL' =>
                'Prazo operacional configurado',

            'RGPD_RETENCAO_CONSENTIMENTOS' =>
                'Prazo dos consentimentos configurado',

            'RGPD_RETENCAO_LOCALIZACAO' =>
                'Prazo de localizacao configurado',

            'RGPD_TRANSFERENCIAS' =>
                'Sem transferencias internacionais declaradas',

            'RGPD_DECISOES_AUTOMATIZADAS' =>
                'Sem decisoes exclusivamente automatizadas',

            'RGPD_GEO_FINALIDADE' =>
                'Finalidade facultativa concreta',

            'RGPD_SENSIVEL_FINALIDADE' =>
                'Finalidade especifica configurada',

            'RGPD_SENSIVEL_CATEGORIAS' =>
                'Categorias especificadas',

            'RGPD_SENSIVEL_ARTIGO9' =>
                'Condicao juridica configurada',

            'RGPD_EPD' =>
                'Responsavel EPD (epd@empresa.test)',
        ]);
    }
);

test(
    '4r14b4h nao inventa valores ausentes',
    function (): void {
        $empresa = new \App\Models\Empresa();

        $service = app(
            \App\Services\FrotaProRgpdV11Service::class
        );

        expect(
            $service->companyPrivacyValues($empresa)
        )->toBe([]);
    }
);

test(
    '4r14b4h contacto epd funciona sem nome',
    function (): void {
        $empresa = new \App\Models\Empresa();

        $empresa->forceFill([
            'privacidade_epd_email' =>
                'epd@empresa.test',
        ]);

        $service = app(
            \App\Services\FrotaProRgpdV11Service::class
        );

        expect(
            $service->companyPrivacyValues(
                $empresa
            )['RGPD_EPD']
        )->toBe('epd@empresa.test');
    }
);