<?php

return [
    '01-prestacao-servicos-preenchido.txt' => [
        'expected' => [
            'EMPRESA_NOME_EMPRESA',
            'EMPRESA_ENDERECO_COMPLETO',
            'EMPRESA_CAPITAL_SOCIAL',
            'EMPRESA_NIF',
            'EMPRESA_NOME_GERENTE',
            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_ENDERECO_COMPLETO',
            'MOTORISTA_NIF',
            'DATA_INICIO',
            'DATA_FIM',
            'DURACAO_CONTRATO',
            'PERCENTAGEM_CONTRATO',
        ],
        'forbidden' => [],
        'warnings' => [],
    ],

    '02-prestacao-servicos-placeholders.txt' => [
        'expected' => [
            'EMPRESA_NOME_EMPRESA',
            'EMPRESA_ENDERECO_COMPLETO',
            'EMPRESA_NIF',
            'EMPRESA_NOME_GERENTE',
            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_ENDERECO_COMPLETO',
            'MOTORISTA_NIF',
            'DATA_INICIO',
            'DATA_FIM',
            'PERCENTAGEM_CONTRATO',
            'ASSINATURA_EMPRESA',
            'ASSINATURA_MOTORISTA',
        ],
        'forbidden' => [],
        'warnings' => [],
    ],

    '03-aluguer-veiculo-preenchido.txt' => [
        'expected' => [
            'VEICULO_MATRICULA',
            'VEICULO_DATA_MATRICULA',
            'VEICULO_MARCA',
            'VEICULO_MODELO',
            'VEICULO_CHASSI',
            'VEICULO_CILINDRADA',
            'VEICULO_POTENCIA',
            'VEICULO_COMBUSTIVEL',
            'VEICULO_LUGARES',
            'VEICULO_PORTAS',
            'VEICULO_COR',
            'DATA_INICIO',
            'DATA_FIM',
            'DURACAO_CONTRATO',
            'VALOR_CAUCAO',
            'VALOR_SEMANAL',
        ],
        'forbidden' => [],
        'warnings' => [],
    ],

    '04-aluguer-proprietario-singular.txt' => [
        'expected' => [
            'PROPRIETARIO_NOME_COMPLETO',
            'PROPRIETARIO_NIF',
            'PROPRIETARIO_ENDERECO_COMPLETO',
            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_ENDERECO_COMPLETO',
            'MOTORISTA_NIF',
            'VEICULO_MATRICULA',
            'DATA_INICIO',
            'DATA_FIM',
            'DURACAO_CONTRATO',
            'VALOR_CAUCAO',
            'VALOR_SEMANAL',
            'PROPRIETARIO_TIPO_DOCUMENTO',
            'PROPRIETARIO_NUMERO_DOCUMENTO',
        ],
        'forbidden' => [
            'MOTORISTA_TIPO_DOCUMENTO',
            'MOTORISTA_NUMERO_DOCUMENTO',
            'MOTORISTA_DOCUMENTO_VALID_UNTIL',
        ],
        'warnings' => [],
    ],

    '05-aluguer-proprietario-empresa.txt' => [
        'expected' => [
            'PROPRIETARIO_NOME_EMPRESA',
            'PROPRIETARIO_NIF',
            'PROPRIETARIO_ENDERECO_COMPLETO',
            'PROPRIETARIO_CAPITAL_SOCIAL',
            'PROPRIETARIO_NOME_GERENTE',
            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_NIF',
            'MOTORISTA_ENDERECO_COMPLETO',
            'VEICULO_MATRICULA',
            'VEICULO_MARCA',
            'VEICULO_MODELO',
            'VALOR_SEMANAL',
            'VALOR_CAUCAO',
            'ASSINATURA_PROPRIETARIO',
            'ASSINATURA_MOTORISTA',
        ],
        'forbidden' => [],
        'warnings' => [],
    ],

    '06-comodato-pessoa-singular.txt' => [
        'expected' => [
            'PROPRIETARIO_NOME_COMPLETO',
            'PROPRIETARIO_NIF',
            'PROPRIETARIO_ENDERECO_COMPLETO',
            'EMPRESA_NOME_EMPRESA',
            'EMPRESA_NIF',
            'VEICULO_MATRICULA',
            'ASSINATURA_PROPRIETARIO',
            'ASSINATURA_EMPRESA',
            'PROPRIETARIO_TIPO_DOCUMENTO',
            'PROPRIETARIO_NUMERO_DOCUMENTO',
        ],
        'forbidden' => [
            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_TIPO_DOCUMENTO',
            'MOTORISTA_NUMERO_DOCUMENTO',
            'MOTORISTA_DOCUMENTO_VALID_UNTIL',
        ],
        'warnings' => [],
    ],

    '07-comodato-pessoa-coletiva.txt' => [
        'expected' => [
            'PROPRIETARIO_NOME_EMPRESA',
            'PROPRIETARIO_NIF',
            'PROPRIETARIO_ENDERECO_COMPLETO',
            'PROPRIETARIO_CAPITAL_SOCIAL',
            'PROPRIETARIO_NOME_GERENTE',
            'EMPRESA_NOME_EMPRESA',
            'EMPRESA_NIF',
            'EMPRESA_ENDERECO_COMPLETO',
            'EMPRESA_NOME_GERENTE',
            'VEICULO_MARCA',
            'VEICULO_MODELO',
            'VEICULO_MATRICULA',
            'ASSINATURA_PROPRIETARIO',
            'ASSINATURA_EMPRESA',
        ],
        'forbidden' => [],
        'warnings' => [],
    ],

    '08-autorizacao-motorista-proprietario.txt' => [
        'expected' => [
            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_NIF',
            'MOTORISTA_ENDERECO_COMPLETO',
            'VEICULO_MATRICULA',
            'VEICULO_MARCA',
            'VEICULO_MODELO',
        ],
        'forbidden' => [],
        'warnings' => [],
    ],

    '09-autorizacao-terceiro-proprietario.txt' => [
        'expected' => [
            'PROPRIETARIO_NOME_COMPLETO',
            'PROPRIETARIO_NIF',
            'PROPRIETARIO_ENDERECO_COMPLETO',
            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_NIF',
            'EMPRESA_NOME_EMPRESA',
            'EMPRESA_NIF',
            'VEICULO_MATRICULA',
        ],
        'forbidden' => [],
        'warnings' => [],
    ],

    '10-denuncia-contrato.txt' => [
        'expected' => [
            'EMPRESA_NOME_EMPRESA',
            'EMPRESA_NIF',
            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_NIF',
            'NUMERO_CONTRATO_ORIGINAL',
            'DATA_INICIO',
            'DATA_DENUNCIA',
            'ASSINATURA_EMPRESA',
            'ASSINATURA_MOTORISTA',
        ],
        'forbidden' => [],
        'warnings' => [
            'UNKNOWN_PLACEHOLDER',
        ],
    ],

    '11-aditamento-contrato.txt' => [
        'expected' => [
            'NUMERO_CONTRATO_ORIGINAL',
            'EMPRESA_NOME_EMPRESA',
            'MOTORISTA_NOME_COMPLETO',
            'DATA_INICIO',
            'VALOR_SEMANAL',
            'VALOR_SEGURO_SEMANAL',
            'ASSINATURA_EMPRESA',
            'ASSINATURA_MOTORISTA',
        ],
        'forbidden' => [],
        'warnings' => [
            'UNKNOWN_PLACEHOLDER',
        ],
    ],

    '12-declaracao-motorista.txt' => [
        'expected' => [
            'EMPRESA_NOME_EMPRESA',
            'EMPRESA_NIF',
            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_NIF',
            'VEICULO_MATRICULA',
        ],
        'forbidden' => [
            'DATA_INICIO',
            'DATA_FIM',
        ],
        'warnings' => [],
    ],

    '13-html-legado.html' => [
        'expected' => [
            'EMPRESA_NOME_EMPRESA',
            'EMPRESA_NIF',
            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_NIF',
            'DATA_INICIO',
            'DATA_FIM',
        ],
        'forbidden' => [],
        'warnings' => [
            'HTML_CLEANED',
        ],
    ],

    '14-placeholders-malformados.txt' => [
        'expected' => [
            'EMPRESA_NOME_EMPRESA',
            'EMPRESA_NIF',
            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_NUMERO_DOCUMENTO',
            'DATA_INICIO',
        ],
        'forbidden' => [],
        'warnings' => [
            'MALFORMED_PLACEHOLDER',
        ],
    ],

    '15-ocr-imperfeito.txt' => [
        'expected' => [
            'EMPRESA_NOME_EMPRESA',
            'EMPRESA_NIF',
            'EMPRESA_NOME_GERENTE',
            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_NIF',
            'DATA_INICIO',
            'DATA_FIM',
        ],
        'forbidden' => [],
        'warnings' => [],
    ],

    '16-datas-contraditorias.txt' => [
        'expected' => [
            'DATA_INICIO',
            'DATA_FIM',
            'DURACAO_CONTRATO',
        ],
        'forbidden' => [],
        'warnings' => [
            'DATE_DURATION_MISMATCH',
        ],
    ],

    '17-valores-contraditorios.txt' => [
        'expected' => [
            'VEICULO_MATRICULA',
            'VALOR_CAUCAO',
            'VALOR_SEMANAL',
        ],
        'forbidden' => [],
        'warnings' => [
            'MULTIPLE_VALUES_CONFLICT',
        ],
        'minimum_values' => [
            'VALOR_CAUCAO' => 2,
            'VALOR_SEMANAL' => 2,
        ],
    ],

    '18-falsos-positivos-juridicos.txt' => [
        'expected' => [],
        'forbidden' => [
            'DATA_INICIO',
            'DATA_FIM',
            'DURACAO_CONTRATO',
            'PERCENTAGEM_CONTRATO',
            'VALOR_CAUCAO',
            'VALOR_SEMANAL',
        ],
        'warnings' => [],
    ],

    '19-texto-com-muitos-numeros.txt' => [
        'expected' => [],
        'forbidden' => [
            'DATA_INICIO',
            'DATA_FIM',
            'DURACAO_CONTRATO',
            'PERCENTAGEM_CONTRATO',
            'VALOR_CAUCAO',
            'VALOR_SEMANAL',
            'VEICULO_MATRICULA',
        ],
        'warnings' => [],
    ],

    '20-documento-misto-assinaturas.txt' => [
        'expected' => [
            'EMPRESA_NOME_EMPRESA',
            'EMPRESA_NIF',
            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_NIF',
            'VEICULO_MARCA',
            'VEICULO_MODELO',
            'VEICULO_MATRICULA',
            'NOME_TESTEMUNHA',
            'ASSINATURA_EMPRESA',
            'ASSINATURA_MOTORISTA',
            'ASSINATURA_TESTEMUNHA',
        ],
        'forbidden' => [],
        'warnings' => [
            'UNKNOWN_PLACEHOLDER',
        ],
    ],

    '21-prestacao-servicos-real-lacunas.txt' => [
        'expected' => [
            'EMPRESA_NOME_EMPRESA',
            'EMPRESA_ENDERECO_COMPLETO',
            'EMPRESA_CAPITAL_SOCIAL',
            'EMPRESA_NIF',
            'EMPRESA_NOME_GERENTE',

            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_ENDERECO_COMPLETO',
            'MOTORISTA_TIPO_DOCUMENTO',
            'MOTORISTA_NUMERO_DOCUMENTO',
            'MOTORISTA_DOCUMENTO_VALID_UNTIL',
            'MOTORISTA_NIF',

            'DATA_INICIO',
            'DATA_FIM',
            'DURACAO_CONTRATO',
            'PERCENTAGEM_CONTRATO',

            'ASSINATURA_EMPRESA',
            'ASSINATURA_MOTORISTA',
        ],

        'forbidden' => [],

        'warnings' => [
            'DATE_DURATION_MISMATCH',
        ],

        'forbidden_warnings' => [
            'OCR_SPACING_NORMALIZED',
        ],

        'minimum_values' => [
            'MOTORISTA_TIPO_DOCUMENTO' => 1,
            'MOTORISTA_NUMERO_DOCUMENTO' => 1,
            'MOTORISTA_DOCUMENTO_VALID_UNTIL' => 1,
        ],

        'contains' => [
            'residente em {{MOTORISTA_ENDERECO_COMPLETO}}',
            '{{MOTORISTA_TIPO_DOCUMENTO}}',
            '{{MOTORISTA_NUMERO_DOCUMENTO}}',
            '{{MOTORISTA_DOCUMENTO_VALID_UNTIL}}',
            '{{ASSINATURA_EMPRESA}}',
            '{{ASSINATURA_MOTORISTA}}',
        ],
    ],
    '22-aluguer-veiculo-real-pessoa-singular.txt' => [
        'expected' => [
            'PROPRIETARIO_NOME_COMPLETO',
            'PROPRIETARIO_TIPO_DOCUMENTO',
            'PROPRIETARIO_NUMERO_DOCUMENTO',
            'PROPRIETARIO_NIF',
            'PROPRIETARIO_ENDERECO_COMPLETO',

            'MOTORISTA_NOME_COMPLETO',
            'MOTORISTA_TIPO_DOCUMENTO',
            'MOTORISTA_NUMERO_DOCUMENTO',
            'MOTORISTA_NIF',
            'MOTORISTA_ENDERECO_COMPLETO',

            'VEICULO_MATRICULA',
            'VEICULO_DATA_MATRICULA',
            'VEICULO_MARCA',
            'VEICULO_MODELO',
            'VEICULO_CHASSI',
            'VEICULO_CILINDRADA',
            'VEICULO_POTENCIA',
            'VEICULO_COMBUSTIVEL',
            'VEICULO_LUGARES',
            'VEICULO_PORTAS',
            'VEICULO_COR',

            'DATA_INICIO',
            'DATA_FIM',
            'DURACAO_CONTRATO',
            'DATA_PRIMEIRO_PAGAMENTO',
            'DATA_ASSINATURA',
            'VALOR_CAUCAO',
            'VALOR_SEMANAL',

            'ASSINATURA_PROPRIETARIO',
            'ASSINATURA_MOTORISTA',
        ],

        'forbidden' => [
            'PROPRIETARIO_DOCUMENTO_VALID_UNTIL',
            'MOTORISTA_DOCUMENTO_VALID_UNTIL',
            'PERCENTAGEM_CONTRATO',
        ],

        'warnings' => [
            'DATE_DURATION_MISMATCH',
        ],

        'forbidden_warnings' => [
            'OCR_SPACING_NORMALIZED',
            'MULTIPLE_VALUES_CONFLICT',
        ],

        'exact_values' => [
            'PROPRIETARIO_NIF' => [
                '515698350',
            ],

            'MOTORISTA_NIF' => [
                '123123414',
            ],

            'PROPRIETARIO_TIPO_DOCUMENTO' => [
                'Cartão de Cidadão',
            ],

            'PROPRIETARIO_NUMERO_DOCUMENTO' => [
                '1231414u8',
            ],

            'MOTORISTA_TIPO_DOCUMENTO' => [
                'Cartão de Cidadão',
            ],

            'MOTORISTA_NUMERO_DOCUMENTO' => [
                '1231445R3',
            ],

            'VEICULO_COMBUSTIVEL' => [
                'Elétrico',
            ],

            'DATA_PRIMEIRO_PAGAMENTO' => [
                '2026-08-24',
            ],

            'DATA_ASSINATURA' => [
                '2026-08-20',
            ],
            'PROPRIETARIO_ENDERECO_COMPLETO' => [
                'rua do joao, 123, bloco c, 1234-554, lisboa',
            ],

            'MOTORISTA_ENDERECO_COMPLETO' => [
                'rua de jo, 2, ap, 1234-324, lisboa',
            ],
        ],

        'contains' => [
            '{{PROPRIETARIO_TIPO_DOCUMENTO}}',
            '{{PROPRIETARIO_NUMERO_DOCUMENTO}}',
            '{{MOTORISTA_TIPO_DOCUMENTO}}',
            '{{MOTORISTA_NUMERO_DOCUMENTO}}',
            '{{MOTORISTA_NIF}}',
            '{{MOTORISTA_ENDERECO_COMPLETO}}',
            'iniciando-se o primeiro pagamento em {{DATA_PRIMEIRO_PAGAMENTO}}',
            'Feito e assinado {{DATA_ASSINATURA}}',
            '{{ASSINATURA_PROPRIETARIO}}',
            '{{ASSINATURA_MOTORISTA}}',
            'utilizar exclusivamente o tipo de combustível ou sistema de carregamento adequado',
        ],

        'forbidden_contains' => [
            '{{VEICULO_COMBUSTIVEL}}comendado',
        ],
    ],
];
