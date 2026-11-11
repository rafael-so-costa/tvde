<?php

/*
 * FROTAPRO_4R14B4D_RGPD_ANALYZER
 *
 * Verifica apenas reconhecimento e mapeamento.
 * Nao considera o documento juridicamente aprovado.
 */

test(
    '4r14b4d analisa os 29 placeholders rgpd',
    function (): void {
        $names = [
            'EMPRESA_NOME_EMPRESA',
            'EMPRESA_NIF',
            'EMPRESA_ENDERECO_COMPLETO',
            'RGPD_TITULAR_NOME',
            'RGPD_TITULAR_NIF',
            'RGPD_TITULAR_CONTACTO',
            'RGPD_TITULAR_IDENTIFICADOR',
            'RGPD_TITULAR_QUALIDADE',
            'RGPD_CONTACTO_PRIVACIDADE',
            'RGPD_EPD',
            'RGPD_RETENCAO_CADASTRO',
            'RGPD_RETENCAO_CONTRATOS',
            'RGPD_RETENCAO_FISCAL',
            'RGPD_RETENCAO_OPERACIONAL',
            'RGPD_RETENCAO_CONSENTIMENTOS',
            'RGPD_RETENCAO_LOCALIZACAO',
            'RGPD_TRANSFERENCIAS',
            'RGPD_DECISOES_AUTOMATIZADAS',
            'RGPD_DATA_DECLARACAO',
            'RGPD_DECISAO_IMAGEM',
            'RGPD_DECISAO_VOZ',
            'RGPD_GEO_FINALIDADE',
            'RGPD_DECISAO_GEO',
            'RGPD_SENSIVEL_FINALIDADE',
            'RGPD_SENSIVEL_CATEGORIAS',
            'RGPD_SENSIVEL_ARTIGO9',
            'RGPD_DECISAO_SENSIVEIS',
            'RGPD_DATA_ESCOLHAS',
            'ASSINATURA_TITULAR',
        ];

        expect(count(array_unique($names)))->toBe(29);

        $content = implode(
            "\n",
            array_map(
                static fn(string $name): string =>
                    '{{' . $name . '}}',
                $names
            )
        );

        $analysis = app(
            \App\Services\ModeloDocumentoSaasService::class
        )->analyzeContent($content);

        $warnings = array_values(
            array_filter(
                (array) ($analysis['warnings'] ?? []),
                static fn(array $warning): bool =>
                    in_array(
                        $warning['code'] ?? '',
                        [
                            'UNKNOWN_PLACEHOLDER',
                            'INVALID_SOURCE_MAPPING',
                        ],
                        true
                    )
            )
        );

        expect($warnings)->toBe([]);

        $detected = array_column(
            $analysis['campos_detectados'],
            'name'
        );

        expect(count($detected))->toBe(29);

        foreach ($names as $name) {
            expect($detected)->toContain($name);
        }
    }
);

test(
    '4r14b4d respeita fontes escolhas e assinatura',
    function (): void {
        $analysis = app(
            \App\Services\ModeloDocumentoSaasService::class
        )->analyzeContent(
            implode("\n", [
                '{{RGPD_CONTACTO_PRIVACIDADE}}',
                '{{RGPD_RETENCAO_CONTRATOS}}',
                '{{RGPD_DECISAO_IMAGEM}}',
                '{{RGPD_DECISAO_VOZ}}',
                '{{RGPD_DECISAO_GEO}}',
                '{{RGPD_DECISAO_SENSIVEIS}}',
                '{{ASSINATURA_TITULAR}}',
            ])
        );

        $mapping = $analysis['campos_mapeados'];

        expect(
            $mapping['RGPD_CONTACTO_PRIVACIDADE']['campo']
        )->toBe('empresa.privacidade_contacto_email');

        expect(
            $mapping['RGPD_RETENCAO_CONTRATOS']['campo']
        )->toBe('empresa.privacidade_prazo_contratos');

        foreach ([
            'RGPD_DECISAO_IMAGEM',
            'RGPD_DECISAO_VOZ',
            'RGPD_DECISAO_GEO',
            'RGPD_DECISAO_SENSIVEIS',
        ] as $decision) {
            expect($mapping[$decision]['tipo'])
                ->toBe('manual');

            $field = collect(
                $analysis['campos_detectados']
            )->firstWhere('name', $decision);

            expect($field['required'])->toBeTrue();
        }

        expect(
            $mapping['ASSINATURA_TITULAR']['tipo']
        )->toBe('assinatura');

        expect(
            $mapping['ASSINATURA_TITULAR']['campo']
        )->toBe('assinatura.titular');

        expect(
            $analysis['assinaturas_requeridas']
        )->toContain('ASSINATURA_TITULAR');
    }
);

test(
    '4r14b4d campos desconhecidos continuam identificados',
    function (): void {
        $analysis = app(
            \App\Services\TemplateTextAnalyzerService::class
        )->analyze(
            '{{CAMPO_DESCONHECIDO_TVDE_999}}'
        );

        $codes = array_column(
            $analysis['warnings'],
            'code'
        );

        expect($codes)->toContain('UNKNOWN_PLACEHOLDER');
    }
);