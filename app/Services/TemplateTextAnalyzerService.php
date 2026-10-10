<?php

namespace App\Services;

use DateTimeImmutable;
use Illuminate\Support\Str;

class TemplateTextAnalyzerService
{
    public function __construct(
        private TemplateSourceCatalog $sourceCatalog
    ) {}

    private const FIELD_DEFINITIONS = [
        'EMPRESA_NOME_EMPRESA' => [
            'label' => 'Nome da empresa',
            'type' => 'text',
            'required' => true,
            'source_type' => 'automatico',
            'source_path' => 'empresa.nome_empresa',
        ],
        'EMPRESA_NIF' => [
            'label' => 'NIF da empresa',
            'type' => 'cpf_cnpj',
            'required' => true,
            'source_type' => 'automatico',
            'source_path' => 'empresa.nif',
        ],
        'EMPRESA_NOME_GERENTE' => [
            'label' => 'Nome do gerente da empresa',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'empresa.nome_gerente',
        ],
        'EMPRESA_ENDERECO_COMPLETO' => [
            'label' => 'Morada da empresa',
            'type' => 'text',
            'required' => true,
            'source_type' => 'calculado',
            'source_path' => 'empresa.endereco_completo',
        ],
        'EMPRESA_ENDERECO_CIDADE' => [
            'label' => 'Cidade da empresa',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'empresa.endereco_cidade',
        ],
        'EMPRESA_CAPITAL_SOCIAL' => [
            'label' => 'Capital social da empresa',
            'type' => 'currency',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'empresa.capital_social',
        ],
        'EMPRESA_CERTIFICADO_TVDE' => [
            'label' => 'Licença TVDE da empresa',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'empresa.certificado_tvde',
        ],

        'MOTORISTA_NOME_COMPLETO' => [
            'label' => 'Nome do motorista',
            'type' => 'text',
            'required' => true,
            'source_type' => 'automatico',
            'source_path' => 'motorista.nome_completo',
        ],
        'MOTORISTA_NIF' => [
            'label' => 'NIF do motorista',
            'type' => 'cpf_cnpj',
            'required' => true,
            'source_type' => 'automatico',
            'source_path' => 'motorista.nif',
        ],
        'MOTORISTA_ENDERECO_COMPLETO' => [
            'label' => 'Morada do motorista',
            'type' => 'text',
            'required' => false,
            'source_type' => 'calculado',
            'source_path' => 'motorista.endereco_completo',
        ],
        'MOTORISTA_EMAIL' => [
            'label' => 'E-mail do motorista',
            'type' => 'email',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'motorista.email',
        ],
        'MOTORISTA_TIPO_DOCUMENTO' => [
            'label' => 'Tipo de documento do motorista',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'motorista.tipo_documento',
        ],
        'MOTORISTA_NUMERO_DOCUMENTO' => [
            'label' => 'Número do documento do motorista',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'motorista.numero_documento',
        ],
        'MOTORISTA_DOCUMENTO_VALID_UNTIL' => [
            'label' => 'Validade do documento do motorista',
            'type' => 'date',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'motorista.documento_valid_until',
        ],
        'MOTORISTA_CERTIFICADO_TVDE' => [
            'label' => 'Certificado TVDE do motorista',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'motorista.certificado_tvde',
        ],

        'PROPRIETARIO_NOME_COMPLETO' => [
            'label' => 'Nome do proprietário',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'proprietario.nome_completo',
        ],
        'PROPRIETARIO_NOME_EMPRESA' => [
            'label' => 'Empresa do proprietário',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'proprietario.nome_empresa',
        ],
        'PROPRIETARIO_NIF' => [
            'label' => 'NIF do proprietário',
            'type' => 'cpf_cnpj',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'proprietario.nif',
        ],
        'PROPRIETARIO_ENDERECO_COMPLETO' => [
            'label' => 'Morada do proprietário',
            'type' => 'text',
            'required' => false,
            'source_type' => 'calculado',
            'source_path' => 'proprietario.endereco_completo',
        ],
        'PROPRIETARIO_TIPO_DOCUMENTO' => [
            'label' => 'Tipo de documento do proprietário',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'proprietario.tipo_documento',
        ],
        'PROPRIETARIO_NUMERO_DOCUMENTO' => [
            'label' => 'Número do documento do proprietário',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'proprietario.numero_documento',
        ],
        'PROPRIETARIO_DOCUMENTO_VALID_UNTIL' => [
            'label' => 'Validade do documento do proprietário',
            'type' => 'date',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'proprietario.documento_valid_until',
        ],
        'PROPRIETARIO_CAPITAL_SOCIAL' => [
            'label' => 'Capital social do proprietário',
            'type' => 'currency',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'proprietario.capital_social',
        ],
        'PROPRIETARIO_NOME_GERENTE' => [
            'label' => 'Gerente do proprietário',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'proprietario.nome_gerente',
        ],

        'VEICULO_MATRICULA' => [
            'label' => 'Matrícula do veículo',
            'type' => 'text',
            'required' => true,
            'source_type' => 'automatico',
            'source_path' => 'veiculo.matricula',
        ],
        'VEICULO_MARCA' => [
            'label' => 'Marca do veículo',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'veiculo.marca',
        ],
        'VEICULO_MODELO' => [
            'label' => 'Modelo do veículo',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'veiculo.modelo',
        ],
        'VEICULO_DATA_MATRICULA' => [
            'label' => 'Data da primeira matrícula',
            'type' => 'date',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'veiculo.data_matricula',
        ],
        'VEICULO_CHASSI' => [
            'label' => 'Chassis do veículo',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'veiculo.chassi',
        ],
        'VEICULO_CILINDRADA' => [
            'label' => 'Cilindrada do veículo',
            'type' => 'number',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'veiculo.cilindrada',
        ],
        'VEICULO_POTENCIA' => [
            'label' => 'Potência do veículo',
            'type' => 'number',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'veiculo.potencia',
        ],
        'VEICULO_COMBUSTIVEL' => [
            'label' => 'Combustível do veículo',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'veiculo.combustivel',
        ],
        'VEICULO_LUGARES' => [
            'label' => 'Lugares do veículo',
            'type' => 'number',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'veiculo.lugares',
        ],
        'VEICULO_PORTAS' => [
            'label' => 'Portas do veículo',
            'type' => 'number',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'veiculo.portas',
        ],
        'VEICULO_COR' => [
            'label' => 'Cor do veículo',
            'type' => 'text',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'veiculo.cor',
        ],

        'DATA_INICIO' => [
            'label' => 'Data de início',
            'type' => 'date',
            'required' => true,
            'source_type' => 'automatico',
            'source_path' => 'contrato.data_inicio',
        ],
        'DATA_FIM' => [
            'label' => 'Data de fim',
            'type' => 'date',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'contrato.data_fim',
        ],
        'DATA_ASSINATURA' => [
            'label' => 'Data de assinatura',
            'type' => 'date',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'contrato.data_assinatura',
        ],
        'DURACAO_CONTRATO' => [
            'label' => 'Duração do contrato',
            'type' => 'text',
            'required' => false,
            'source_type' => 'calculado',
            'source_path' => 'contrato.duracao',
        ],
        'DATA_PRIMEIRO_PAGAMENTO' => [
            'label' => 'Data do primeiro pagamento',
            'type' => 'date',
            'required' => false,
            'source_type' => 'manual',
            'source_path' => null,
        ],
        'VALOR_CAUCAO' => [
            'label' => 'Valor da caução',
            'type' => 'currency',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'contrato.valor_caucao',
        ],
        'VALOR_SEMANAL' => [
            'label' => 'Valor semanal',
            'type' => 'currency',
            'required' => false,
            'source_type' => 'automatico',
            'source_path' => 'contrato.valor_semanal',
        ],
        'PERCENTAGEM_CONTRATO' => [
            'label' => 'Percentagem do contrato',
            'type' => 'number',
            'required' => false,
            'source_type' => 'manual',
            'source_path' => null,
        ],

        'ASSINATURA_EMPRESA' => [
            'label' => 'Assinatura da empresa',
            'type' => 'text',
            'required' => false,
            'source_type' => 'assinatura',
            'source_path' => 'assinatura.empresa',
        ],
        'ASSINATURA_PROPRIETARIO' => [
            'label' => 'Assinatura do proprietário',
            'type' => 'text',
            'required' => false,
            'source_type' => 'assinatura',
            'source_path' => 'assinatura.proprietario',
        ],
        'ASSINATURA_MOTORISTA' => [
            'label' => 'Assinatura do motorista',
            'type' => 'text',
            'required' => false,
            'source_type' => 'assinatura',
            'source_path' => 'assinatura.motorista',
        ],
        'ASSINATURA_TESTEMUNHA' => [
            'label' => 'Assinatura da testemunha',
            'type' => 'text',
            'required' => false,
            'source_type' => 'assinatura',
            'source_path' => 'assinatura.testemunha',
        ],
    ];

    private const ALIASES = [
        'NOME_DA_EMPRESA' => 'EMPRESA_NOME_EMPRESA',
        'NOME_EMPRESA' => 'EMPRESA_NOME_EMPRESA',
        'NIF_DA_EMPRESA' => 'EMPRESA_NIF',
        'NIF_EMPRESA' => 'EMPRESA_NIF',
        'NOME_DO_GERENTE_DA_EMPRESA' => 'EMPRESA_NOME_GERENTE',
        'NOME_GERENTE_EMPRESA' => 'EMPRESA_NOME_GERENTE',
        'MORADA_DA_EMPRESA' => 'EMPRESA_ENDERECO_COMPLETO',
        'MORADA_EMPRESA' => 'EMPRESA_ENDERECO_COMPLETO',
        'CIDADE_DA_EMPRESA' => 'EMPRESA_ENDERECO_CIDADE',
        'CIDADE_EMPRESA' => 'EMPRESA_ENDERECO_CIDADE',
        'CAPITAL_SOCIAL_DA_EMPRESA' => 'EMPRESA_CAPITAL_SOCIAL',
        'CAPITAL_SOCIAL_EMPRESA' => 'EMPRESA_CAPITAL_SOCIAL',
        'LICENCA_TVDE_DA_EMPRESA' => 'EMPRESA_CERTIFICADO_TVDE',
        'LICENCA_TVDE_EMPRESA' => 'EMPRESA_CERTIFICADO_TVDE',

        'NOME_DO_MOTORISTA' => 'MOTORISTA_NOME_COMPLETO',
        'NOME_MOTORISTA' => 'MOTORISTA_NOME_COMPLETO',
        'MOTORISTA_NOME' => 'MOTORISTA_NOME_COMPLETO',
        'NIF_DO_MOTORISTA' => 'MOTORISTA_NIF',
        'NIF_MOTORISTA' => 'MOTORISTA_NIF',
        'MORADA_DO_MOTORISTA' => 'MOTORISTA_ENDERECO_COMPLETO',
        'MORADA_MOTORISTA' => 'MOTORISTA_ENDERECO_COMPLETO',
        'EMAIL_DO_MOTORISTA' => 'MOTORISTA_EMAIL',
        'EMAIL_MOTORISTA' => 'MOTORISTA_EMAIL',
        'DOCUMENTO_DE_IDENTIFICACAO_MOTORISTA' => 'MOTORISTA_TIPO_DOCUMENTO',
        'TIPO_DOCUMENTO_MOTORISTA' => 'MOTORISTA_TIPO_DOCUMENTO',
        'NUMERO_DO_DOCUMENTO_DE_IDENTIFICACAO_MOTORISTA' => 'MOTORISTA_NUMERO_DOCUMENTO',
        'NUMERO_DO_DOCUMENTO_IDENTIFICACAO_MOTORISTA' => 'MOTORISTA_NUMERO_DOCUMENTO',
        'NUMERO_DOCUMENTO_MOTORISTA' => 'MOTORISTA_NUMERO_DOCUMENTO',
        'VALIDADE_DO_DOCUMENTO_DE_IDENTIFICACAO_MOTORISTA' => 'MOTORISTA_DOCUMENTO_VALID_UNTIL',
        'VALIDADE_DO_DOCUMENTO_IDENTIFICACAO_MOTORISTA' => 'MOTORISTA_DOCUMENTO_VALID_UNTIL',
        'VALIDADE_DOCUMENTO_MOTORISTA' => 'MOTORISTA_DOCUMENTO_VALID_UNTIL',
        'LICENCA_TVDE_DO_MOTORISTA' => 'MOTORISTA_CERTIFICADO_TVDE',
        'LICENCA_TVDE_MOTORISTA' => 'MOTORISTA_CERTIFICADO_TVDE',

        'NOME_DO_PROPRIETARIO' => 'PROPRIETARIO_NOME_COMPLETO',
        'NOME_PROPRIETARIO' => 'PROPRIETARIO_NOME_COMPLETO',
        'NIF_DO_PROPRIETARIO' => 'PROPRIETARIO_NIF',
        'NIF_PROPRIETARIO' => 'PROPRIETARIO_NIF',
        'MORADA_DO_PROPRIETARIO' => 'PROPRIETARIO_ENDERECO_COMPLETO',
        'MORADA_PROPRIETARIO' => 'PROPRIETARIO_ENDERECO_COMPLETO',
        'DOCUMENTO_DE_IDENTIFICACAO_PROPRIETARIO' => 'PROPRIETARIO_TIPO_DOCUMENTO',
        'TIPO_DOCUMENTO_PROPRIETARIO' => 'PROPRIETARIO_TIPO_DOCUMENTO',
        'NUMERO_DO_DOCUMENTO_DE_IDENTIFICACAO_PROPRIETARIO' => 'PROPRIETARIO_NUMERO_DOCUMENTO',
        'NUMERO_DO_DOCUMENTO_IDENTIFICACAO_PROPRIETARIO' => 'PROPRIETARIO_NUMERO_DOCUMENTO',
        'NUMERO_DO_DOCUEMNTO_DE_IDENTIFICACAO_PROPRIETARIO' => 'PROPRIETARIO_NUMERO_DOCUMENTO',
        'VALIDADE_DO_DOCUMENTO_DE_IDENTIFICACAO_PROPRIETARIO' => 'PROPRIETARIO_DOCUMENTO_VALID_UNTIL',
        'VALIDADE_DOCUMENTO_PROPRIETARIO' => 'PROPRIETARIO_DOCUMENTO_VALID_UNTIL',
        'CAPITAL_SOCIAL_DO_PROPRIETARIO' => 'PROPRIETARIO_CAPITAL_SOCIAL',
        'NOME_DO_GERENTE_DO_PROPRIETARIO' => 'PROPRIETARIO_NOME_GERENTE',

        'MATRICULA_DO_VEICULO' => 'VEICULO_MATRICULA',
        'MATRICULA_VEICULO' => 'VEICULO_MATRICULA',
        'MARCA_DO_VEICULO' => 'VEICULO_MARCA',
        'MARCA_VEICULO' => 'VEICULO_MARCA',
        'MODELO_DO_VEICULO' => 'VEICULO_MODELO',
        'MODELO_VEICULO' => 'VEICULO_MODELO',
        'DATA_DO_VEICULO' => 'VEICULO_DATA_MATRICULA',
        'DATA_VEICULO' => 'VEICULO_DATA_MATRICULA',
        'DATA_MATRICULA_VEICULO' => 'VEICULO_DATA_MATRICULA',
        'CHASSI_DO_VEICULO' => 'VEICULO_CHASSI',
        'CHASSI_VEICULO' => 'VEICULO_CHASSI',
        'CILINDRADA_DO_VEICULO' => 'VEICULO_CILINDRADA',
        'POTENCIA_DO_VEICULO' => 'VEICULO_POTENCIA',
        'COMBUSTIVEL_DO_VEICULO' => 'VEICULO_COMBUSTIVEL',
        'LUGARES_DO_VEICULO' => 'VEICULO_LUGARES',
        'PORTAS_DO_VEICULO' => 'VEICULO_PORTAS',
        'COR_DO_VEICULO' => 'VEICULO_COR',

        'DATA_INICIO_CONTRATO' => 'DATA_INICIO',
        'DATA_INICIO_DO_CONTRATO' => 'DATA_INICIO',
        'DATA_FIM_CONTRATO' => 'DATA_FIM',
        'DATA_FIM_DO_CONTRATO' => 'DATA_FIM',
        'DATA_DA_ASSINATURA_CONTRATO' => 'DATA_ASSINATURA',
        'DATA_ASSINATURA_CONTRATO' => 'DATA_ASSINATURA',
        'DURACAO_DO_CONTRATO' => 'DURACAO_CONTRATO',
        'CAUCAO_DO_VEICULO' => 'VALOR_CAUCAO',
        'VALOR_CAUCAO_VEICULO' => 'VALOR_CAUCAO',
        'ALUGUEL_DO_VEICULO' => 'VALOR_SEMANAL',
        'VALOR_ALUGUEL_VEICULO' => 'VALOR_SEMANAL',
        'DATA_DO_PRIMEIRO_PAGAMENTO' => 'DATA_PRIMEIRO_PAGAMENTO',
        'PERCENTAGEM' => 'PERCENTAGEM_CONTRATO',
    ];

    public function analyze(string $content): array
    {
        $warnings = [];
        $fields = [];
        $detectedValues = [];

        $hadHtml = preg_match(
            '/<\s*[a-z][^>]*>/i',
            $content
        ) === 1;

        [
            $content,
            $ocrNormalized,
        ] = $this->normalizeOcrSpacing(
            $content
        );

        $plain = $this->plainText(
            $content
        );

        if ($ocrNormalized) {
            $warnings[] = [
                'code' => 'OCR_SPACING_NORMALIZED',
                'severity' => 'info',
                'message' => 'Foram normalizados espaçamentos típicos de texto obtido por OCR.',
            ];
        }

        if ($hadHtml) {
            $warnings[] = [
                'code' => 'HTML_CLEANED',
                'severity' => 'info',
                'message' => 'O conteúdo HTML foi convertido para texto normal antes da análise.',
            ];
        }

        $parameterized = $this->normalizeExplicitPlaceholders(
            $plain,
            $fields,
            $warnings
        );

        $parameterized = $this->repairMalformedPlaceholders(
            $parameterized,
            $fields,
            $warnings
        );

        $parameterized = $this->detectContextValues(
            $parameterized,
            $fields,
            $detectedValues
        );

        $parameterized = $this->detectAdditionalContextValues(
            $parameterized,
            $fields,
            $detectedValues
        );

        $parameterized = $this->detectContextualEmptyFields(
            $parameterized,
            $fields,
            $detectedValues
        );

        $this->validateChronology(
            $detectedValues,
            $warnings
        );

        $this->validateMultipleValues(
            $detectedValues,
            $warnings
        );

        $this->validateUnknownFields(
            $fields,
            $warnings
        );

        $detected = [];
        $mappings = [];

        foreach ($fields as $name => $field) {
            $detected[] = [
                'id' => Str::uuid()->toString(),
                'name' => $name,
                'label' => $field['label'],
                'type' => $field['type'],
                'required' => $field['required'],
            ];

            $mappings[$name] = [
                'tipo' => $field['source_type'],
                'origem' => $this->sourceEntity(
                    $field['source_path']
                ),
                'campo' => $field['source_path'],
                'confianca' => $field['confidence'],
                'valores_detectados' => array_values(
                    array_unique(
                        $field['detected_values']
                    )
                ),
                'aliases_detectados' => array_values(
                    array_unique(
                        $field['aliases']
                    )
                ),
            ];
        }

        return [
            'conteudo_original' => $plain,
            'conteudo_parametrizado' => $parameterized,
            'campos_detectados' => $detected,
            'campos_mapeados' => $mappings,
            'fields' => array_values(
                $fields
            ),
            'warnings' => $warnings,
            'source_catalog' => $this
                ->sourceCatalog
                ->grouped(),
            'stats' => [
                'campos' => count(
                    $fields
                ),
                'valores_detectados' => array_sum(
                    array_map(
                        fn(array $field) =>
                        count(
                            $field['detected_values']
                        ),
                        $fields
                    )
                ),
                'avisos' => count(
                    $warnings
                ),
            ],
        ];
    }

    private function normalizeOcrSpacing(
        string $content
    ): array {
        $changed = false;

        $content = preg_replace_callback(
            '/^[^\r\n]+$/mu',
            function (
                array $match
            ) use (
                &$changed
            ): string {
                $line = $match[0];

                $parts = preg_split(
                    '/([ \t]{2,})/u',
                    $line,
                    -1,
                    PREG_SPLIT_DELIM_CAPTURE
                );

                if (!$parts) {
                    return $line;
                }

                $normalizedAnyChunk = false;

                foreach (
                    $parts as $index => $part
                ) {
                    if (
                        $index % 2 === 1
                    ) {
                        continue;
                    }

                    $trimmed = trim(
                        $part
                    );

                    if (
                        $trimmed === ''
                    ) {
                        continue;
                    }

                    $tokens = preg_split(
                        '/[ \t]+/u',
                        $trimmed
                    );

                    if (
                        !$tokens ||
                        count(
                            $tokens
                        ) < 2
                    ) {
                        continue;
                    }

                    $singleCount = 0;
                    $valid = true;

                    foreach (
                        $tokens as $token
                    ) {
                        if (
                            preg_match(
                                '/^[\p{L}\p{N}]$/u',
                                $token
                            )
                        ) {
                            $singleCount++;

                            continue;
                        }

                        if (
                            preg_match(
                                '/^[.,;:]$/u',
                                $token
                            )
                        ) {
                            continue;
                        }

                        $valid = false;

                        break;
                    }

                    if (
                        !$valid ||
                        $singleCount < 2
                    ) {
                        continue;
                    }

                    $parts[$index] = implode(
                        '',
                        $tokens
                    );

                    $normalizedAnyChunk = true;
                }

                if (!$normalizedAnyChunk) {
                    return $line;
                }

                $changed = true;

                return implode(
                    '',
                    $parts
                );
            },
            $content
        ) ?? $content;

        $datesNormalized = preg_replace(
            '/(?<=\d)\s*\/\s*(?=\d)/u',
            '/',
            $content
        ) ?? $content;

        if (
            $datesNormalized !==
            $content
        ) {
            $changed = true;
        }

        return [
            $datesNormalized,
            $changed,
        ];
    }

    private function plainText(
        string $content
    ): string {
        $content = str_replace(
            [
                "\r\n",
                "\r",
                '&nbsp;',
            ],
            [
                "\n",
                "\n",
                ' ',
            ],
            $content
        );

        $content = preg_replace(
            '/<br\s*\/?>/i',
            "\n",
            $content
        ) ?? $content;

        $content = preg_replace(
            '/<\/(?:p|div|li|h[1-6])\s*>/i',
            "\n",
            $content
        ) ?? $content;

        $content = strip_tags(
            $content
        );

        $content = html_entity_decode(
            $content,
            ENT_QUOTES | ENT_HTML5,
            'UTF-8'
        );

        $content = preg_replace(
            '/[\x{200B}-\x{200D}\x{FEFF}]/u',
            '',
            $content
        ) ?? $content;

        $content = preg_replace(
            '/[ \t]+/u',
            ' ',
            $content
        ) ?? $content;

        $content = preg_replace(
            '/ *\n */u',
            "\n",
            $content
        ) ?? $content;

        $content = preg_replace(
            '/\n{3,}/u',
            "\n\n",
            $content
        ) ?? $content;

        return trim(
            $content
        );
    }

    private function normalizeExplicitPlaceholders(
        string $content,
        array &$fields,
        array &$warnings
    ): string {
        return preg_replace_callback(
            '/\{\{\s*([^{}\n]{2,140}?)\s*\}\}/u',
            function (
                array $match
            ) use (
                &$fields,
                &$warnings
            ): string {
                $original = trim(
                    $match[1]
                );

                $normalized = $this->normalizeToken(
                    $original
                );

                $canonical = $this->resolveCanonical(
                    $normalized
                );

                $this->registerField(
                    $fields,
                    $canonical,
                    $original,
                    null,
                    $canonical === $normalized
                        ? 1.0
                        : 0.98
                );

                if (
                    !isset(
                        self::FIELD_DEFINITIONS[$canonical]
                    )
                ) {
                    $warnings[] = [
                        'code' => 'UNKNOWN_PLACEHOLDER',
                        'severity' => 'warning',
                        'message' => "O campo {$original} não possui mapeamento automático conhecido.",
                        'field' => $canonical,
                    ];
                }

                return
                    '{{' .
                    $canonical .
                    '}}';
            },
            $content
        ) ?? $content;
    }

    private function repairMalformedPlaceholders(
        string $content,
        array &$fields,
        array &$warnings
    ): string {
        return preg_replace_callback(
            '/\{\{\s*([A-Za-zÀ-ÿ0-9_ ]{2,140}?)\s*\}(?!\})/u',
            function (
                array $match
            ) use (
                &$fields,
                &$warnings
            ): string {
                $original = trim(
                    $match[1]
                );

                $canonical = $this->resolveCanonical(
                    $this->normalizeToken(
                        $original
                    )
                );

                $this->registerField(
                    $fields,
                    $canonical,
                    $original,
                    null,
                    0.9
                );

                $warnings[] = [
                    'code' => 'MALFORMED_PLACEHOLDER',
                    'severity' => 'warning',
                    'message' => "O placeholder {$original} estava incompleto e foi normalizado.",
                    'field' => $canonical,
                ];

                return
                    '{{' .
                    $canonical .
                    '}}';
            },
            $content
        ) ?? $content;
    }

    private function detectContextValues(
        string $content,
        array &$fields,
        array &$detectedValues
    ): string {
        $rules = [
            [
                'field' => 'EMPRESA_NOME_EMPRESA',
                'confidence' => 0.96,
                'pattern' => '/\bENTRE\s+(?<value>[^,{}\n]{2,120}),\s*(?:sociedade|com\s+sede)/iu',
            ],
            [
                'field' => 'EMPRESA_ENDERECO_COMPLETO',
                'confidence' => 0.93,
                'pattern' => '/\bcom\s+sede\s+(?:na|em)\s+(?<value>[^,{}\n]{5,180}),\s*com\s+o\s+capital/iu',
            ],
            [
                'field' => 'EMPRESA_CAPITAL_SOCIAL',
                'confidence' => 0.99,
                'pattern' => '/\bcapital\s+social\s+de\s+(?<value>€\s*[0-9](?:[0-9.,]*[0-9])?|[0-9](?:[0-9.,]*[0-9])?\s*€)/iu',
            ],
            [
                'field' => 'EMPRESA_NIF',
                'confidence' => 0.99,
                'pattern' => '/n[uú]mero\s+(?:[uú]nico\s+de\s+)?pessoa\s+coletiva\s+(?<value>[0-9]{9})/iu',
            ],
            [
                'field' => 'EMPRESA_NOME_GERENTE',
                'confidence' => 0.98,
                'pattern' => '/representad[ao]\s+por\s+(?<value>[^,{}\n]{2,120}),\s+na\s+qualidade\s+de\s+gerente/iu',
            ],

            [
                'field' => 'PROPRIETARIO_NOME_COMPLETO',
                'confidence' => 0.93,
                'pattern' => '/\bENTRE\s+(?<value>[^,{}\n]{2,120}),\s+portador/iu',
            ],
            [
                'field' => 'PROPRIETARIO_NIF',
                'confidence' => 0.97,
                'pattern' => '/\{\{PROPRIETARIO_NOME_COMPLETO\}\}.{0,350}?\b(?:e\s+)?com\s+o\s+contribuinte\s+n\s*(?:\.\s*)?(?:[º°]\s*)?(?<value>[0-9]{9})(?=\s*,?\s*residente\b)/isu',
            ],
            [
                'field' => 'PROPRIETARIO_ENDERECO_COMPLETO',
                'confidence' => 0.9,
                'pattern' => '/residente\s+em\s+(?<value>[^,{}\n]{5,180}),\s+na\s+qualidade\s+de\s+locador(?:a)?/iu',
            ],

            [
                'field' => 'MOTORISTA_NOME_COMPLETO',
                'confidence' => 0.96,
                'pattern' => '/(?:^|[\n.!?])\s*E\s+(?<value>[^,{}\n]{2,120}),\s+(?:residente|portador)/iu',
            ],
            [
                'field' => 'MOTORISTA_ENDERECO_COMPLETO',
                'confidence' => 0.94,
                'pattern' => '/\bE\s+(?:\{\{MOTORISTA_NOME_COMPLETO\}\}|[^,{}\n]{2,120}),\s+residente\s+em\s+(?<value>[^,{}\n]{2,180})(?=,\s*(?:portador|contribuinte))/iu',
            ],
            [
                'field' => 'MOTORISTA_NIF',
                'confidence' => 0.97,
                'pattern' => '/\bE\s+\{\{MOTORISTA_NOME_COMPLETO\}\}.{0,450}?\b(?:(?:e\s+)?com\s+o\s+contribuinte|contribuinte\s+fiscal)\s+n\s*(?:\.\s*)?(?:[º°]\s*)?(?<value>[0-9]{9})/isu',
            ],

            [
                'field' => 'DATA_INICIO',
                'confidence' => 0.99,
                'pattern' => '/tem\s+in[ií]cio\s+no\s+dia\s+(?<value>[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/iu',
            ],
            [
                'field' => 'DATA_FIM',
                'confidence' => 0.99,
                'pattern' => '/(?:e\s+)?termina\s+(?:a|em|no\s+dia)\s+(?<value>[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/iu',
            ],
            [
                'field' => 'DURACAO_CONTRATO',
                'confidence' => 0.96,
                'pattern' => '/com\s+dura[cç][aã]o\s+de\s+(?<value>[0-9]+\s+(?:meses|m[eê]s|anos|ano))/iu',
            ],
            [
                'field' => 'PERCENTAGEM_CONTRATO',
                'confidence' => 0.97,
                'pattern' => '/deduzindo\s+(?<value>[0-9]+(?:[,.][0-9]+)?)(?=\s*%)/iu',
            ],

            [
                'field' => 'VEICULO_MATRICULA',
                'confidence' => 0.99,
                'pattern' => '/\bmatr[ií]cula\s+(?<value>[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2})/iu',
            ],
            [
                'field' => 'VEICULO_DATA_MATRICULA',
                'confidence' => 0.98,
                'pattern' => '/primeira\s+matr[ií]cula\s+em\s+(?<value>[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/iu',
            ],
            [
                'field' => 'VEICULO_MARCA',
                'confidence' => 0.95,
                'pattern' => '/\bda\s+marca\s+(?<value>[^,{}\n]{1,60}),\s*modelo\b/iu',
            ],
            [
                'field' => 'VEICULO_MODELO',
                'confidence' => 0.95,
                'pattern' => '/\bmodelo\s+(?<value>[^,{}\n]{1,80}),\s*chassis\b/iu',
            ],
            [
                'field' => 'VEICULO_CHASSI',
                'confidence' => 0.96,
                'pattern' => '/\bchassis\s+(?<value>[A-Z0-9-]{5,50})/iu',
            ],
            [
                'field' => 'VEICULO_CILINDRADA',
                'confidence' => 0.95,
                'pattern' => '/\bcilindrada\s+de\s+(?<value>[0-9]+(?:[,.][0-9]+)?)/iu',
            ],
            [
                'field' => 'VEICULO_POTENCIA',
                'confidence' => 0.95,
                'pattern' => '/\bpot[eê]ncia\s+de\s+(?<value>[0-9]+(?:[,.][0-9]+)?)/iu',
            ],
            [
                'field' => 'VEICULO_COMBUSTIVEL',
                'confidence' => 0.97,
                'pattern' => '/\bcombust[ií]vel\s+(?<value>[^,{}\n]{2,40}?)(?=(?:\s*,)+\s*com\s+lota[cç][aã]o\b)/iu',
            ],
            [
                'field' => 'VEICULO_LUGARES',
                'confidence' => 0.96,
                'pattern' => '/\blota[cç][aã]o\s+de\s+(?<value>[0-9]+)\s*,?\s*lugares/iu',
            ],
            [
                'field' => 'VEICULO_PORTAS',
                'confidence' => 0.95,
                'pattern' => '/\bligeiro\s+com\s+(?<value>[0-9]+)\s*,?\s*portas/iu',
            ],
            [
                'field' => 'VEICULO_COR',
                'confidence' => 0.9,
                'pattern' => '/\bcor\s+(?<value>[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ -]{1,30})(?=\s*,|\s*\(|\s*$)/iu',
            ],

            [
                'field' => 'VALOR_CAUCAO',
                'confidence' => 0.99,
                'pattern' => '/cau[cç][aã]o\s+no\s+valor\s+de\s+(?<value>€\s*[0-9](?:[0-9.,]*[0-9])?|[0-9](?:[0-9.,]*[0-9])?\s*€)/iu',
            ],
            [
                'field' => 'VALOR_SEMANAL',
                'confidence' => 0.99,
                'pattern' => '/valor\s+do\s+aluguer\s+[eé]\s+de\s+(?<value>€\s*[0-9](?:[0-9.,]*[0-9])?|[0-9](?:[0-9.,]*[0-9])?\s*€)/iu',
            ],
        ];

        return $this->applyDetectionRules(
            $content,
            $rules,
            $fields,
            $detectedValues
        );
    }

    private function detectAdditionalContextValues(
        string $content,
        array &$fields,
        array &$detectedValues
    ): string {
        $rules = [
            [
                'field' => 'EMPRESA_ENDERECO_COMPLETO',
                'confidence' => 0.95,
                'pattern' => '/\bcom\s+sede\s+(?:na|em)\s+(?<value>[^{}\n]{5,220}?)(?=,\s*com\s+o\s+capital\b)/iu',
            ],

            [
                'field' => 'PROPRIETARIO_ENDERECO_COMPLETO',
                'confidence' => 0.96,
                'pattern' => '/\{\{PROPRIETARIO_NIF\}\}\s*,\s*residente\s+(?:em|na|no)\s+(?<value>[^\n{}]{3,220}?)(?=,\s*na\s+qualidade\s+de\s+locador(?:a)?\b)/iu',
            ],

            [
                'field' => 'MOTORISTA_ENDERECO_COMPLETO',
                'confidence' => 0.95,
                'pattern' => '/\bE\s+(?:\{\{MOTORISTA_NOME_COMPLETO\}\}|[^,{}\n]{2,120}),\s+residente\s+em\s+(?<value>[^{}\n]{3,220}?)(?=,\s*(?:portador|contribuinte)\b)/iu',
            ],
            [
                'field' => 'MOTORISTA_ENDERECO_COMPLETO',
                'confidence' => 0.97,
                'pattern' => '/\{\{MOTORISTA_NIF\}\}\s*,\s*residente\s+em\s+(?<value>[^\n{}]{3,220}?)(?=\s*,?\s*na\s+qualidade\s+de\s+locat[aá]ri[oa]\b)/iu',
            ],

            [
                'field' => 'MOTORISTA_NOME_COMPLETO',
                'confidence' => 0.94,
                'pattern' => '/\bEu,\s+(?<value>[^,{}\n]{2,120}),\s+NIF\s+[0-9]{9},\s+residente\s+em\s+[^{}\n]+?,\s+declaro\s+ser\s+propriet[aá]rio\s+e\s+condutor\b/iu',
            ],
            [
                'field' => 'MOTORISTA_NIF',
                'confidence' => 0.96,
                'pattern' => '/\bEu,\s+\{\{MOTORISTA_NOME_COMPLETO\}\},\s+NIF\s+(?<value>[0-9]{9}),\s+residente\s+em\s+[^{}\n]+?,\s+declaro\s+ser\s+propriet[aá]rio\s+e\s+condutor\b/iu',
            ],
            [
                'field' => 'MOTORISTA_ENDERECO_COMPLETO',
                'confidence' => 0.93,
                'pattern' => '/\bEu,\s+\{\{MOTORISTA_NOME_COMPLETO\}\},\s+NIF\s+\{\{MOTORISTA_NIF\}\},\s+residente\s+em\s+(?<value>[^{}\n]{3,220}?)(?=,\s+declaro\s+ser\s+propriet[aá]rio\s+e\s+condutor\b)/iu',
            ],

            [
                'field' => 'PROPRIETARIO_NOME_COMPLETO',
                'confidence' => 0.97,
                'pattern' => '/\bEu,\s+(?<value>[^,{}\n]{2,120}),\s+NIF\s+[0-9]{9},\s+residente\s+(?:em|na|no)\s+[^\n{}]+?,\s+na\s+qualidade\s+de\s+propriet[aá]ri[oa]\s+do\s+ve[ií]culo\b/iu',
            ],
            [
                'field' => 'PROPRIETARIO_NIF',
                'confidence' => 0.98,
                'pattern' => '/\bEu,\s+\{\{PROPRIETARIO_NOME_COMPLETO\}\},\s+NIF\s+(?<value>[0-9]{9}),\s+residente\s+(?:em|na|no)\s+[^\n{}]+?,\s+na\s+qualidade\s+de\s+propriet[aá]ri[oa]\s+do\s+ve[ií]culo\b/iu',
            ],
            [
                'field' => 'PROPRIETARIO_ENDERECO_COMPLETO',
                'confidence' => 0.96,
                'pattern' => '/\bEu,\s+\{\{PROPRIETARIO_NOME_COMPLETO\}\},\s+NIF\s+\{\{PROPRIETARIO_NIF\}\},\s+residente\s+(?:em|na|no)\s+(?<value>[^\n{}]{3,220}?)(?=,\s+na\s+qualidade\s+de\s+propriet[aá]ri[oa]\s+do\s+ve[ií]culo\b)/iu',
            ],

            [
                'field' => 'MOTORISTA_NOME_COMPLETO',
                'confidence' => 0.97,
                'pattern' => '/\bautorizo\s+o\s+motorista\s+(?<value>[^,{}\n]{2,120}),\s+NIF\s+[0-9]{9}\b/iu',
            ],
            [
                'field' => 'MOTORISTA_NIF',
                'confidence' => 0.98,
                'pattern' => '/\bautorizo\s+o\s+motorista\s+\{\{MOTORISTA_NOME_COMPLETO\}\},\s+NIF\s+(?<value>[0-9]{9})\b/iu',
            ],

            [
                'field' => 'EMPRESA_NOME_EMPRESA',
                'confidence' => 0.96,
                'pattern' => '/\batrav[eé]s\s+da\s+empresa\s+(?<value>[^,{}\n]{2,120}),\s+NIPC\s+[0-9]{9}\b/iu',
            ],
            [
                'field' => 'EMPRESA_NIF',
                'confidence' => 0.98,
                'pattern' => '/\batrav[eé]s\s+da\s+empresa\s+\{\{EMPRESA_NOME_EMPRESA\}\},\s+NIPC\s+(?<value>[0-9]{9})\b/iu',
            ],
            [
                'field' => 'EMPRESA_NOME_EMPRESA',
                'confidence' => 0.95,
                'pattern' => '/(?:^|\n)(?<value>[^,\n{}]{2,120}),\s+NIPC\s+[0-9]{9},\s+declara\b/imu',
            ],
            [
                'field' => 'EMPRESA_NIF',
                'confidence' => 0.98,
                'pattern' => '/(?:^|\n)\{\{EMPRESA_NOME_EMPRESA\}\},\s+NIPC\s+(?<value>[0-9]{9}),\s+declara\b/imu',
            ],

            [
                'field' => 'MOTORISTA_NOME_COMPLETO',
                'confidence' => 0.96,
                'pattern' => '/\bdeclara\s+para\s+os\s+devidos\s+efeitos\s+que\s+(?<value>[^,{}\n]{2,120}),\s+contribuinte\s+fiscal\s+(?:n[uú]mero|n[.º°]*)\s*[0-9]{9}\b/iu',
            ],
            [
                'field' => 'MOTORISTA_NIF',
                'confidence' => 0.98,
                'pattern' => '/\bdeclara\s+para\s+os\s+devidos\s+efeitos\s+que\s+\{\{MOTORISTA_NOME_COMPLETO\}\},\s+contribuinte\s+fiscal\s+(?:n[uú]mero|n[.º°]*)\s*(?<value>[0-9]{9})\b/iu',
            ],

            [
                'field' => 'VEICULO_MARCA',
                'confidence' => 0.94,
                'pattern' => '/\bmarca\s+(?<value>[^,{}\n]{1,60}),\s*modelo\b/iu',
            ],
            [
                'field' => 'VEICULO_MODELO',
                'confidence' => 0.94,
                'pattern' => '/\bmodelo\s+(?<value>[^,{}\n.]{1,80})(?=,\s*chassis\b|[.\n]|$)/iu',
            ],

            [
                'field' => 'DATA_PRIMEIRO_PAGAMENTO',
                'confidence' => 0.99,
                'pattern' => '/\biniciando-se\s+o\s+primeiro\s+pagamento\s+em\s+(?<value>[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/iu',
            ],
            [
                'field' => 'DATA_ASSINATURA',
                'confidence' => 0.99,
                'pattern' => '/\bFeito\s+e\s+assinado\s+(?<value>[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/iu',
            ],

            [
                'field' => 'EMPRESA_NOME_EMPRESA',
                'confidence' => 0.88,
                'pattern' => '/\bENTRE\s+(?<value>[^\n{}]{2,120})\s*\n\s*NIPC\s+[0-9]{9}\b/iu',
            ],
            [
                'field' => 'EMPRESA_NIF',
                'confidence' => 0.92,
                'pattern' => '/\bENTRE\s+\{\{EMPRESA_NOME_EMPRESA\}\}\s*\n\s*NIPC\s+(?<value>[0-9]{9})\b/iu',
            ],
            [
                'field' => 'EMPRESA_NOME_GERENTE',
                'confidence' => 0.86,
                'pattern' => '/\brepresentad[ao]\s+por\s*\n+\s*(?<value>[^\n{},]{2,120})(?=\s*\n+\s*E\b)/iu',
            ],
            [
                'field' => 'MOTORISTA_NOME_COMPLETO',
                'confidence' => 0.88,
                'pattern' => '/(?:^|\n)E\s*\n+\s*(?<value>[^\n{},]{2,120})\s*\n+\s*NIF\s+[0-9]{9}\b/imu',
            ],
            [
                'field' => 'MOTORISTA_NIF',
                'confidence' => 0.92,
                'pattern' => '/(?:^|\n)E\s*\n+\s*\{\{MOTORISTA_NOME_COMPLETO\}\}\s*\n+\s*NIF\s+(?<value>[0-9]{9})\b/imu',
            ],
            [
                'field' => 'DATA_INICIO',
                'confidence' => 0.92,
                'pattern' => '/\bcontrato\s+inicia-se\s+em\s*\n*\s*(?<value>[0-9]{2}\/[0-9]{2}\/[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/iu',
            ],
            [
                'field' => 'DATA_FIM',
                'confidence' => 0.92,
                'pattern' => '/\be\s+termina\s+em\s*\n*\s*(?<value>[0-9]{2}\/[0-9]{2}\/[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/iu',
            ],
        ];

        return $this->applyDetectionRules(
            $content,
            $rules,
            $fields,
            $detectedValues
        );
    }

    private function detectContextualEmptyFields(
        string $content,
        array &$fields,
        array &$detectedValues
    ): string {
        /*
         * Documento do proprietário.
         */
        $content = preg_replace_callback(
            '/(\{\{PROPRIETARIO_NOME_COMPLETO\}\}.{0,220}?\bportador(?:a)?\s+d[oa]\s+)(?<value>Cart[aã]o\s+de\s+Cidad[aã]o|Bilhete\s+de\s+Identidade|Passaporte|T[ií]tulo\s+de\s+Resid[eê]ncia)(?=\s*,?\s*n\s*(?:\.\s*)?(?:[º°]\s*)?)/isu',
            function (
                array $match
            ) use (
                &$fields,
                &$detectedValues
            ): string {
                $value = trim(
                    $match['value']
                );

                $this->registerField(
                    $fields,
                    'PROPRIETARIO_TIPO_DOCUMENTO',
                    null,
                    $value,
                    0.99
                );

                $detectedValues['PROPRIETARIO_TIPO_DOCUMENTO'][] = $value;

                return
                    $match[1] .
                    '{{PROPRIETARIO_TIPO_DOCUMENTO}}';
            },
            $content
        ) ?? $content;

        $content = preg_replace_callback(
            '/(\{\{PROPRIETARIO_TIPO_DOCUMENTO\}\}\s*,?\s*n\s*(?:\.\s*)?(?:[º°]\s*)?)(?<value>[A-Z0-9][A-Z0-9._\/-]{1,79})(?=\s*,?\s*(?:emitid[oa]\b|com\s+o\s+contribuinte\b|e\s+com\s+o\s+contribuinte\b))/iu',
            function (
                array $match
            ) use (
                &$fields,
                &$detectedValues
            ): string {
                $value = trim(
                    $match['value']
                );

                $this->registerField(
                    $fields,
                    'PROPRIETARIO_NUMERO_DOCUMENTO',
                    null,
                    $value,
                    0.99
                );

                $detectedValues['PROPRIETARIO_NUMERO_DOCUMENTO'][] = $value;

                return
                    $match[1] .
                    '{{PROPRIETARIO_NUMERO_DOCUMENTO}}';
            },
            $content
        ) ?? $content;

        /*
         * Morada vazia do motorista.
         */
        $content = preg_replace_callback(
            '/(\{\{MOTORISTA_NOME_COMPLETO\}\}\s*,\s*residente\s+em)\s*(?=portador(?:a)?\s+d[oa]\b)/iu',
            function (
                array $match
            ) use (
                &$fields
            ): string {
                $this->registerField(
                    $fields,
                    'MOTORISTA_ENDERECO_COMPLETO',
                    null,
                    null,
                    0.96
                );

                return
                    $match[1] .
                    ' {{MOTORISTA_ENDERECO_COMPLETO}}, ';
            },
            $content
        ) ?? $content;

        /*
         * Tipo de documento do motorista.
         */
        $content = preg_replace_callback(
            '/(\{\{MOTORISTA_NOME_COMPLETO\}\}.{0,500}?\bportador(?:a)?\s+d[oa]\s+)(?<value>Cart[aã]o\s+de\s+Cidad[aã]o|Bilhete\s+de\s+Identidade|Passaporte|T[ií]tulo\s+de\s+Resid[eê]ncia)(?=\s*,?\s*n\s*(?:\.\s*)?(?:[º°]\s*)?)/isu',
            function (
                array $match
            ) use (
                &$fields,
                &$detectedValues
            ): string {
                $value = trim(
                    $match['value']
                );

                $this->registerField(
                    $fields,
                    'MOTORISTA_TIPO_DOCUMENTO',
                    null,
                    $value,
                    0.99
                );

                $detectedValues['MOTORISTA_TIPO_DOCUMENTO'][] = $value;

                return
                    $match[1] .
                    '{{MOTORISTA_TIPO_DOCUMENTO}}';
            },
            $content
        ) ?? $content;

        /*
         * Número do documento do motorista.
         */
        $content = preg_replace_callback(
            '/(\{\{MOTORISTA_TIPO_DOCUMENTO\}\}\s*,?\s*n\s*(?:\.\s*)?(?:[º°]\s*)?)(?<value>[A-Z0-9][A-Z0-9._\/-]{1,79})(?=\s*,?\s*(?:emitid[oa]\b|v[aá]lid[oa]\s+at[eé]\b|e\s+com\s+o\s+contribuinte\b|com\s+o\s+contribuinte\b|contribuinte\b))/iu',
            function (
                array $match
            ) use (
                &$fields,
                &$detectedValues
            ): string {
                $value = trim(
                    $match['value']
                );

                $this->registerField(
                    $fields,
                    'MOTORISTA_NUMERO_DOCUMENTO',
                    null,
                    $value,
                    0.99
                );

                $detectedValues['MOTORISTA_NUMERO_DOCUMENTO'][] = $value;

                return
                    $match[1] .
                    '{{MOTORISTA_NUMERO_DOCUMENTO}}';
            },
            $content
        ) ?? $content;

        /*
         * NIF do motorista / locatário.
         */
        $content = preg_replace_callback(
            '/(\{\{MOTORISTA_NUMERO_DOCUMENTO\}\}.{0,350}?\b(?:e\s+)?com\s+o\s+contribuinte\s+n\s*(?:\.\s*)?(?:[º°]\s*)?)(?<value>[0-9]{9})(?=\s*,\s*residente\b)/isu',
            function (
                array $match
            ) use (
                &$fields,
                &$detectedValues
            ): string {
                $value = trim(
                    $match['value']
                );

                $this->registerField(
                    $fields,
                    'MOTORISTA_NIF',
                    null,
                    $value,
                    0.99
                );

                $detectedValues['MOTORISTA_NIF'][] = $value;

                return
                    $match[1] .
                    '{{MOTORISTA_NIF}}';
            },
            $content
        ) ?? $content;

        /*
         * Morada preenchida do motorista / locatário.
         */
        $content = preg_replace_callback(
            '/(\{\{MOTORISTA_NIF\}\}\s*,\s*residente\s+em\s+)(?<value>[^\n{}]{3,220}?)(?=\s*,?\s*na\s+qualidade\s+de\s+locat[aá]ri[oa]\b)/iu',
            function (
                array $match
            ) use (
                &$fields,
                &$detectedValues
            ): string {
                $value = trim(
                    $match['value'],
                    " \t\n\r\0\x0B,"
                );

                $this->registerField(
                    $fields,
                    'MOTORISTA_ENDERECO_COMPLETO',
                    null,
                    $value,
                    0.99
                );

                $detectedValues['MOTORISTA_ENDERECO_COMPLETO'][] = $value;

                return
                    $match[1] .
                    '{{MOTORISTA_ENDERECO_COMPLETO}}';
            },
            $content
        ) ?? $content;

        /*
         * Validade preenchida do documento.
         */
        $content = preg_replace_callback(
            '/(\{\{MOTORISTA_NUMERO_DOCUMENTO\}\}\s*,\s*v[aá]lid[oa]\s+at[eé]\s+)(?<value>[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})(?=\s*,)/iu',
            function (
                array $match
            ) use (
                &$fields,
                &$detectedValues
            ): string {
                $value = trim(
                    $match['value']
                );

                $this->registerField(
                    $fields,
                    'MOTORISTA_DOCUMENTO_VALID_UNTIL',
                    null,
                    $value,
                    0.99
                );

                $detectedValues['MOTORISTA_DOCUMENTO_VALID_UNTIL'][] = $value;

                return
                    $match[1] .
                    '{{MOTORISTA_DOCUMENTO_VALID_UNTIL}}';
            },
            $content
        ) ?? $content;

        /*
         * Número e validade vazios.
         */
        $content = preg_replace_callback(
            '/\{\{MOTORISTA_TIPO_DOCUMENTO\}\}\s+n\s*(?:\.\s*)?(?:[º°])?\s*,\s*v[aá]lid[oa]\s+at[eé]\s*,/iu',
            function (
                array $match
            ) use (
                &$fields
            ): string {
                $this->registerField(
                    $fields,
                    'MOTORISTA_NUMERO_DOCUMENTO',
                    null,
                    null,
                    0.98
                );

                $this->registerField(
                    $fields,
                    'MOTORISTA_DOCUMENTO_VALID_UNTIL',
                    null,
                    null,
                    0.98
                );

                return
                    '{{MOTORISTA_TIPO_DOCUMENTO}}' .
                    ' nº {{MOTORISTA_NUMERO_DOCUMENTO}}, ' .
                    'válido até {{MOTORISTA_DOCUMENTO_VALID_UNTIL}},';
            },
            $content
        ) ?? $content;

        /*
         * Prestação de serviços.
         */
        $content = preg_replace_callback(
            '/\bAssinatura\s+(?=O\s+PRIMEIRO\s+CONTRATANTE\b)/iu',
            function (
                array $match
            ) use (
                &$fields
            ): string {
                $this->registerField(
                    $fields,
                    'ASSINATURA_EMPRESA',
                    null,
                    null,
                    0.96
                );

                return
                    '{{ASSINATURA_EMPRESA}} ';
            },
            $content
        ) ?? $content;

        $content = preg_replace_callback(
            '/\bAssinatura\s+(?=O\s+SEGUNDO\s+CONTRATANTE\b)/iu',
            function (
                array $match
            ) use (
                &$fields
            ): string {
                $this->registerField(
                    $fields,
                    'ASSINATURA_MOTORISTA',
                    null,
                    null,
                    0.96
                );

                return
                    '{{ASSINATURA_MOTORISTA}} ';
            },
            $content
        ) ?? $content;

        /*
         * Contrato de aluguer:
         *
         * A LOCADORA
         * O LOCATÁRIO
         */
        $content = preg_replace_callback(
            '/\bA\s+LOCADORA\s+O\s+LOCAT[AÁ]RIO\s*$/iu',
            function (
                array $match
            ) use (
                &$fields
            ): string {
                $this->registerField(
                    $fields,
                    'ASSINATURA_PROPRIETARIO',
                    null,
                    null,
                    0.98
                );

                $this->registerField(
                    $fields,
                    'ASSINATURA_MOTORISTA',
                    null,
                    null,
                    0.98
                );

                return
                    '{{ASSINATURA_PROPRIETARIO}}' .
                    PHP_EOL .
                    'A LOCADORA' .
                    PHP_EOL .
                    PHP_EOL .
                    '{{ASSINATURA_MOTORISTA}}' .
                    PHP_EOL .
                    'O LOCATÁRIO';
            },
            $content
        ) ?? $content;

        return $content;
    }

    private function applyDetectionRules(
        string $content,
        array $rules,
        array &$fields,
        array &$detectedValues
    ): string {
        foreach ($rules as $rule) {
            $fieldName = $rule['field'];
            $confidence = $rule['confidence'];

            $content = preg_replace_callback(
                $rule['pattern'],
                function (
                    array $match
                ) use (
                    &$fields,
                    &$detectedValues,
                    $fieldName,
                    $confidence
                ): string {
                    $value = trim(
                        $match['value'] ?? ''
                    );

                    if (
                        $value === '' ||
                        str_contains(
                            $value,
                            '{{'
                        )
                    ) {
                        return $match[0];
                    }

                    $this->registerField(
                        $fields,
                        $fieldName,
                        null,
                        $value,
                        $confidence
                    );

                    $detectedValues[$fieldName][] = $value;

                    return str_replace(
                        $value,
                        '{{' .
                            $fieldName .
                            '}}',
                        $match[0]
                    );
                },
                $content
            ) ?? $content;
        }

        return $content;
    }

    private function registerField(
        array &$fields,
        string $canonical,
        ?string $alias,
        ?string $detectedValue,
        float $confidence
    ): void {
        $definition =
            self::FIELD_DEFINITIONS[$canonical] ?? [
                'label' => $this->label(
                    $canonical
                ),
                'type' => 'text',
                'required' => false,
                'source_type' => 'manual',
                'source_path' => null,
            ];

        if (
            !isset(
                $fields[$canonical]
            )
        ) {
            $fields[$canonical] = [
                'name' => $canonical,
                'label' => $definition['label'],
                'type' => $definition['type'],
                'required' => $definition['required'],
                'source_type' => $definition['source_type'],
                'source_path' => $definition['source_path'],
                'confidence' => $confidence,
                'aliases' => [],
                'detected_values' => [],
            ];
        }

        $fields[$canonical]['confidence'] = max(
            $fields[$canonical]['confidence'],
            $confidence
        );

        if (
            $alias !== null &&
            $alias !== ''
        ) {
            $fields[$canonical]['aliases'][] = $alias;
        }

        if (
            $detectedValue !== null &&
            $detectedValue !== ''
        ) {
            $fields[$canonical]['detected_values'][] =
                $detectedValue;
        }
    }

    private function resolveCanonical(
        string $token
    ): string {
        if (
            isset(
                self::FIELD_DEFINITIONS[$token]
            )
        ) {
            return $token;
        }

        if (
            isset(
                self::ALIASES[$token]
            )
        ) {
            return self::ALIASES[$token];
        }

        if (
            mb_strlen(
                $token
            ) >= 12
        ) {
            $best = null;
            $bestDistance =
                PHP_INT_MAX;

            foreach (
                self::ALIASES
                as $alias =>
                $canonical
            ) {
                if (
                    abs(
                        strlen(
                            $alias
                        ) -
                            strlen(
                                $token
                            )
                    ) > 4
                ) {
                    continue;
                }

                $distance = levenshtein(
                    $token,
                    $alias
                );

                if (
                    $distance <
                    $bestDistance
                ) {
                    $best = $canonical;
                    $bestDistance =
                        $distance;
                }
            }

            if (
                $best !== null &&
                $bestDistance <= 3
            ) {
                return $best;
            }
        }

        return $token;
    }

    private function normalizeToken(
        string $value
    ): string {
        $value = mb_strtoupper(
            Str::ascii(
                trim(
                    $value
                )
            )
        );

        $value = preg_replace(
            '/[^A-Z0-9]+/',
            '_',
            $value
        ) ?? '';

        $value = preg_replace(
            '/_+/',
            '_',
            $value
        ) ?? '';

        return trim(
            $value,
            '_'
        );
    }

    private function label(
        string $field
    ): string {
        return collect(
            explode(
                '_',
                $field
            )
        )
            ->map(
                fn(string $word) =>
                ucfirst(
                    mb_strtolower(
                        $word
                    )
                )
            )
            ->implode(
                ' '
            );
    }

    private function sourceEntity(
        ?string $path
    ): ?string {
        if (!$path) {
            return null;
        }

        return str_contains(
            $path,
            '.'
        )
            ? explode(
                '.',
                $path,
                2
            )[0]
            : null;
    }

    private function validateUnknownFields(
        array $fields,
        array &$warnings
    ): void {
        $already = [];

        foreach ($warnings as $warning) {
            if (
                (
                    $warning['code'] ?? null
                ) ===
                'UNKNOWN_PLACEHOLDER'
            ) {
                $already[$warning['field'] ?? ''] = true;
            }
        }

        foreach (
            array_keys(
                $fields
            ) as $field
        ) {
            if (
                isset(
                    self::FIELD_DEFINITIONS[$field]
                ) ||
                isset(
                    $already[$field]
                )
            ) {
                continue;
            }

            $warnings[] = [
                'code' => 'UNKNOWN_PLACEHOLDER',
                'severity' => 'warning',
                'message' => "O campo {$field} não possui mapeamento automático conhecido.",
                'field' => $field,
            ];
        }
    }

    private function validateMultipleValues(
        array $values,
        array &$warnings
    ): void {
        foreach (
            $values
            as $field =>
            $detected
        ) {
            if (
                count(
                    $detected
                ) < 2
            ) {
                continue;
            }

            $unique = [];

            foreach (
                $detected
                as $value
            ) {
                $normalized =
                    mb_strtolower(
                        preg_replace(
                            '/\s+/u',
                            ' ',
                            trim(
                                $value
                            )
                        ) ??
                            trim(
                                $value
                            )
                    );

                $unique[$normalized] = $value;
            }

            if (
                count(
                    $unique
                ) < 2
            ) {
                continue;
            }

            $warnings[] = [
                'code' => 'MULTIPLE_VALUES_CONFLICT',
                'severity' => 'warning',
                'message' => "Foram encontrados valores diferentes para o campo {$field}. Confirme qual valor deve ser utilizado.",
                'field' => $field,
                'context' => [
                    'values' =>
                    array_values(
                        $unique
                    ),
                ],
            ];
        }
    }

    private function validateChronology(
        array $values,
        array &$warnings
    ): void {
        $startRaw =
            $values['DATA_INICIO'][0] ?? null;

        $endRaw =
            $values['DATA_FIM'][0] ?? null;

        if (
            !$startRaw ||
            !$endRaw
        ) {
            return;
        }

        $start = $this->date(
            $startRaw
        );

        $end = $this->date(
            $endRaw
        );

        if (
            !$start ||
            !$end
        ) {
            return;
        }

        if (
            $end <= $start
        ) {
            $warnings[] = [
                'code' => 'INVALID_DATE_RANGE',
                'severity' => 'error',
                'message' => 'A data de fim não é posterior à data de início.',
                'context' => [
                    'data_inicio' => $startRaw,
                    'data_fim' => $endRaw,
                ],
            ];

            return;
        }

        $durationRaw =
            $values['DURACAO_CONTRATO'][0] ?? null;

        if (!$durationRaw) {
            return;
        }

        $declaredMonths =
            $this->durationMonths(
                $durationRaw
            );

        if (
            $declaredMonths ===
            null
        ) {
            return;
        }

        $difference =
            $start->diff(
                $end
            );

        $actualMonths =
            (
                $difference->y *
                12
            ) +
            $difference->m;

        if (
            $difference->d >
            0
        ) {
            $actualMonths++;
        }

        if (
            $actualMonths ===
            $declaredMonths
        ) {
            return;
        }

        $warnings[] = [
            'code' => 'DATE_DURATION_MISMATCH',
            'severity' => 'warning',
            'message' => "As datas correspondem aproximadamente a {$actualMonths} meses, mas o texto declara {$durationRaw}.",
            'context' => [
                'data_inicio' => $startRaw,
                'data_fim' => $endRaw,
                'duracao_declarada' => $durationRaw,
                'duracao_calculada_meses' => $actualMonths,
            ],
        ];
    }

    private function date(
        string $value
    ): ?DateTimeImmutable {
        foreach (
            [
                'Y-m-d',
                'd/m/Y',
                'd-m-Y',
            ]
            as $format
        ) {
            $date =
                DateTimeImmutable::createFromFormat(
                    '!' .
                        $format,
                    trim(
                        $value
                    )
                );

            if (
                $date instanceof
                DateTimeImmutable
            ) {
                return $date;
            }
        }

        return null;
    }

    private function durationMonths(
        string $value
    ): ?int {
        if (
            !preg_match(
                '/([0-9]+)\s*(m[eê]s|meses|ano|anos)/iu',
                trim(
                    $value
                ),
                $match
            )
        ) {
            return null;
        }

        $amount =
            (int)$match[1];

        $unit =
            mb_strtolower(
                Str::ascii(
                    $match[2]
                )
            );

        return str_starts_with(
            $unit,
            'ano'
        )
            ? $amount * 12
            : $amount;
    }
}
