<?php

namespace App\Services;

class TemplateSourceCatalog
{
    private const FIELDS = [
        'empresa' => [
            'empresa.nome_empresa' =>
                'Nome da empresa',

            'empresa.nif' =>
                'NIF',

            'empresa.email' =>
                'E-mail',

            'empresa.telemovel' =>
                'Telemóvel',

            'empresa.nome_gerente' =>
                'Nome do gerente',

            'empresa.privacidade_contacto_email' =>
                'E-mail para privacidade',

            'empresa.privacidade_contacto_telefone' =>
                'Telefone para privacidade',

            'empresa.privacidade_epd_nome' =>
                'Nome do encarregado de proteção de dados',

            'empresa.privacidade_epd_email' =>
                'E-mail do encarregado de proteção de dados',

            'empresa.privacidade_destinatarios' =>
                'Destinatários dos dados',

            'empresa.privacidade_subcontratantes' =>
                'Categorias de subcontratantes',

            'empresa.privacidade_prazo_identificacao' =>
                'Conservação - identificação e cadastro',

            'empresa.privacidade_prazo_contratos' =>
                'Conservação - contratos e documentação',

            'empresa.privacidade_prazo_fiscal' =>
                'Conservação - dados contabilísticos e fiscais',

            'empresa.privacidade_prazo_operacional' =>
                'Conservação - registos operacionais',

            'empresa.privacidade_prazo_consentimentos' =>
                'Conservação - consentimentos',

            'empresa.privacidade_prazo_localizacao' =>
                'Conservação - dados de localização',

            'empresa.privacidade_transferencias_internacionais' =>
                'Transferências internacionais e garantias',

            'empresa.privacidade_decisoes_automatizadas' =>
                'Decisões automatizadas e definição de perfis',

            'empresa.privacidade_finalidade_localizacao' =>
                'Finalidade facultativa de localização',

            'empresa.privacidade_finalidade_dados_especiais' =>
                'Finalidade de tratamento de dados especiais',

            'empresa.privacidade_categorias_dados_especiais' =>
                'Categorias de dados especiais',

            'empresa.privacidade_condicao_artigo9' =>
                'Condição do artigo 9 do RGPD',

            'empresa.endereco_completo' =>
                'Morada completa',

            'empresa.endereco_rua' =>
                'Rua',

            'empresa.endereco_numero' =>
                'Número',

            'empresa.endereco_complemento' =>
                'Complemento',

            'empresa.endereco_cep' =>
                'Código postal',

            'empresa.endereco_cidade' =>
                'Cidade',

            'empresa.iban' =>
                'IBAN',

            'empresa.capital_social' =>
                'Capital social',

            'empresa.certificado_tvde' =>
                'Licença / certificado TVDE',

            'empresa.certificado_tvde_valid_until' =>
                'Validade da licença TVDE',
        ],

        'motorista' => [
            'motorista.nome_completo' =>
                'Nome completo',

            'motorista.nif' =>
                'NIF',

            'motorista.email' =>
                'E-mail',

            'motorista.telemovel' =>
                'Telemóvel',

            'motorista.endereco_completo' =>
                'Morada completa',

            'motorista.endereco_rua' =>
                'Rua',

            'motorista.endereco_numero' =>
                'Número',

            'motorista.endereco_complemento' =>
                'Complemento',

            'motorista.endereco_cep' =>
                'Código postal',

            'motorista.endereco_cidade' =>
                'Cidade',

            'motorista.tipo_documento' =>
                'Tipo de documento',

            'motorista.numero_documento' =>
                'Número do documento',

            'motorista.documento_valid_until' =>
                'Validade do documento',

            'motorista.carta_numero' =>
                'Número da carta de condução',

            'motorista.carta_valid_until' =>
                'Validade da carta de condução',

            'motorista.certificado_tvde' =>
                'Certificado TVDE',

            'motorista.certificado_tvde_valid_until' =>
                'Validade do certificado TVDE',

            'motorista.data_nascimento' =>
                'Data de nascimento',

            'motorista.iban' =>
                'IBAN',
        ],

        'proprietario' => [
            'proprietario.tipo' =>
                'Tipo de proprietário',

            'proprietario.nome_completo' =>
                'Nome completo',

            'proprietario.nome_empresa' =>
                'Nome da empresa',

            'proprietario.nome_gerente' =>
                'Nome do gerente',

            'proprietario.nif' =>
                'NIF',

            'proprietario.email' =>
                'E-mail',

            'proprietario.telemovel' =>
                'Telemóvel',

            'proprietario.endereco_completo' =>
                'Morada completa',

            'proprietario.endereco_rua' =>
                'Rua',

            'proprietario.endereco_numero' =>
                'Número',

            'proprietario.endereco_complemento' =>
                'Complemento',

            'proprietario.endereco_cep' =>
                'Código postal',

            'proprietario.endereco_cidade' =>
                'Cidade',

            'proprietario.tipo_documento' =>
                'Tipo de documento',

            'proprietario.numero_documento' =>
                'Número do documento',

            'proprietario.documento_valid_until' =>
                'Validade do documento',

            'proprietario.capital_social' =>
                'Capital social',

            'proprietario.certidao_permanente' =>
                'Certidão permanente',

            'proprietario.certidao_valid_until' =>
                'Validade da certidão',

            'proprietario.certificado_tvde' =>
                'Licença / certificado TVDE',

            'proprietario.certificado_tvde_valid_until' =>
                'Validade da licença TVDE',

            'proprietario.iban' =>
                'IBAN',
        ],

        'veiculo' => [
            'veiculo.matricula' =>
                'Matrícula',

            'veiculo.data_matricula' =>
                'Data da primeira matrícula',

            'veiculo.marca' =>
                'Marca',

            'veiculo.modelo' =>
                'Modelo',

            'veiculo.chassi' =>
                'Chassis',

            'veiculo.cilindrada' =>
                'Cilindrada',

            'veiculo.potencia' =>
                'Potência',

            'veiculo.combustivel' =>
                'Combustível',

            'veiculo.lugares' =>
                'Lugares',

            'veiculo.portas' =>
                'Portas',

            'veiculo.cor' =>
                'Cor',

            'veiculo.valor_caucao' =>
                'Valor da caução',

            'veiculo.valor_aluguel' =>
                'Valor do aluguer',

            'veiculo.via_verde' =>
                'Via Verde',
        ],

        'contrato' => [
            'contrato.tipo' =>
                'Tipo de contrato',

            'contrato.status' =>
                'Estado do contrato',

            'contrato.data_inicio' =>
                'Data de início',

            'contrato.data_fim' =>
                'Data de fim',

            'contrato.data_assinatura' =>
                'Data de assinatura',

            'contrato.duracao' =>
                'Duração calculada',

            'contrato.valor_diaria' =>
                'Valor diário',

            'contrato.valor_semanal' =>
                'Valor semanal',

            'contrato.valor_caucao' =>
                'Valor da caução',

            'contrato.valor_total' =>
                'Valor total',

            'contrato.condicoes_cobranca' =>
                'Condições financeiras contratadas',

            'contrato.periodicidade_pagamento_texto' =>
                'Periodicidade de pagamento contratada',
        ],

        'assinatura' => [
            'assinatura.empresa' =>
                'Assinatura da empresa',

            'assinatura.motorista' =>
                'Assinatura do motorista',

            'assinatura.proprietario' =>
                'Assinatura do proprietário',

            'assinatura.testemunha' =>
                'Assinatura da testemunha',

            'assinatura.titular' =>
                'Assinatura do titular dos dados',
        ],
    ];

    public function grouped(): array
    {
        $result = [];

        foreach (
            self::FIELDS as
            $origin => $fields
        ) {
            $result[$origin] = [];

            foreach (
                $fields as
                $value => $label
            ) {
                $result[$origin][] = [
                    'value' => $value,
                    'label' => $label,
                ];
            }
        }

        return $result;
    }

    public function allowed(
        ?string $origin,
        ?string $field
    ): bool {
        if (
            !$origin ||
            !$field
        ) {
            return false;
        }

        return isset(
            self::FIELDS[
                $origin
            ][
                $field
            ]
        );
    }
}
