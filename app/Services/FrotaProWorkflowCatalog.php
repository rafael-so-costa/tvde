<?php

namespace App\Services;

final class FrotaProWorkflowCatalog
{
    public function all(): array
    {
        return [
            $this->aluguerCompletoLegado(),
            $this->aluguerEssencial(),
            $this->prestacaoServicos(),
            $this->entregaRecolha(),
            $this->onboardingMotorista(),

            $this->denunciaPrestacaoServicos(),
            $this->comodatoProprietarioNif(),
            $this->comodatoProprietarioDocumento(),
            $this->autorizacaoMotoristaProprietario(),
            $this->autorizacaoProprietarioTerceiro(),
            $this->aluguerPessoaSingular(),
            $this->aluguerPessoaColetiva(),
            $this->rgpdInformacaoAutorizacoes(),
        ];
    }

    public function documentWorkflowMap(): array
    {
        return [
            'prestacao_servicos_motorista'=>
                'prestacao_servicos_motorista',

            'denuncia_prestacao_servicos'=>
                'denuncia_prestacao_servicos',

            'comodato_proprietario_nif'=>
                'comodato_proprietario_nif',

            'comodato_proprietario_documento'=>
                'comodato_proprietario_documento',

            'autorizacao_tvde_motorista_proprietario'=>
                'autorizacao_tvde_motorista_proprietario',

            'autorizacao_tvde_proprietario_terceiro'=>
                'autorizacao_tvde_proprietario_terceiro',

            'aluguer_veiculo_pessoa_singular'=>
                'aluguer_tvde_pessoa_singular',

            'aluguer_veiculo_pessoa_coletiva'=>
                'aluguer_tvde_pessoa_coletiva',

            'informacao_tratamento_dados_rgpd'=>
                'rgpd_informacao_autorizacoes',
        ];
    }

    private function aluguerCompletoLegado(): array
    {
        return $this->workflow(
            'aluguer_completo_tvde',
            'Aluguer TVDE completo',
            'Aluguer',
            'Fluxo completo recomendado para aluguer TVDE, incluindo documento, assinaturas, acesso do motorista, prestação de serviços, entrega, recolha e conferência final.',
            [
                $this->item(
                    'validar_dados',
                    1,
                    'Validar dados do contrato',
                    'validacao',
                    [
                        'regra'=>
                            'contrato_dados_completos',
                    ]
                ),

                $this->item(
                    'gerar_contrato_aluguer',
                    2,
                    'Gerar contrato de aluguer',
                    'gerar_documento'
                ),

                $this->signature(
                    'assinatura_empresa',
                    3,
                    'Assinatura da empresa',
                    'ASSINATURA_EMPRESA'
                ),

                $this->signature(
                    'assinatura_motorista',
                    4,
                    'Assinatura do motorista',
                    'ASSINATURA_MOTORISTA'
                ),

                $this->systemAction(
                    'criar_acesso_motorista',
                    5,
                    'Criar ou validar acesso do motorista',
                    'motorista_acesso'
                ),

                $this->relatedContract(
                    'contrato_prestacao_servicos',
                    6,
                    'Contrato de prestação de serviços',
                    'prestacao_servico',
                    'assinado'
                ),

                $this->vehicleChecklist(
                    'entrega_veiculo',
                    7,
                    'Checklist de entrega do veículo',
                    'entrega'
                ),

                $this->vehicleChecklist(
                    'recolha_veiculo',
                    8,
                    'Checklist de recolha do veículo',
                    'recolha'
                ),

                $this->item(
                    'conferencia_final',
                    9,
                    'Conferência e encerramento',
                    'aprovacao',
                    [
                        'regra'=>
                            'processo_contrato_completo',
                    ]
                ),
            ],
            true,
            2
        );
    }

    private function aluguerEssencial(): array
    {
        return $this->workflow(
            'aluguer_essencial',
            'Aluguer de veículo essencial',
            'Aluguer',
            'Fluxo simplificado para aluguer com documento, assinatura do motorista, entrega e recolha do veículo.',
            [
                $this->item(
                    'gerar_contrato',
                    1,
                    'Gerar contrato',
                    'gerar_documento'
                ),

                $this->signature(
                    'assinatura_motorista',
                    2,
                    'Assinatura do motorista',
                    'ASSINATURA_MOTORISTA'
                ),

                $this->vehicleChecklist(
                    'entrega_veiculo',
                    3,
                    'Entrega do veículo',
                    'entrega'
                ),

                $this->vehicleChecklist(
                    'recolha_veiculo',
                    4,
                    'Recolha do veículo',
                    'recolha'
                ),
            ]
        );
    }

    private function prestacaoServicos(): array
    {
        return $this->workflow(
            'prestacao_servicos_motorista',
            'Prestação de serviços do motorista',
            'Motorista',
            'Formalização completa da prestação de serviços do motorista à empresa TVDE.',
            [
                $this->item(
                    'validar_dados',
                    1,
                    'Validar dados do motorista e da empresa',
                    'validacao',
                    [
                        'regra'=>
                            'prestacao_servicos_dados',
                    ]
                ),

                $this->item(
                    'validar_documentacao_motorista',
                    2,
                    'Validar documentação do motorista',
                    'validacao',
                    [
                        'regra'=>
                            'motorista_documentacao_valida',
                    ]
                ),

                $this->item(
                    'gerar_documento',
                    3,
                    'Gerar contrato de prestação de serviços',
                    'gerar_documento'
                ),

                $this->signature(
                    'assinatura_empresa',
                    4,
                    'Assinatura da empresa',
                    'ASSINATURA_EMPRESA'
                ),

                $this->signature(
                    'assinatura_motorista',
                    5,
                    'Assinatura do motorista',
                    'ASSINATURA_MOTORISTA'
                ),

                $this->systemAction(
                    'acesso_motorista',
                    6,
                    'Criar ou validar acesso do motorista',
                    'motorista_acesso'
                ),
            ],
            true,
            2
        );
    }

    private function entregaRecolha(): array
    {
        return $this->workflow(
            'entrega_recolha_veiculo',
            'Entrega e recolha de veículo',
            'Veículo',
            'Fluxo operacional para inspeções completas de entrega e recolha do veículo.',
            [
                $this->vehicleChecklist(
                    'entrega_veiculo',
                    1,
                    'Checklist de entrega',
                    'entrega'
                ),

                $this->vehicleChecklist(
                    'recolha_veiculo',
                    2,
                    'Checklist de recolha',
                    'recolha'
                ),
            ]
        );
    }

    private function onboardingMotorista(): array
    {
        return $this->workflow(
            'onboarding_motorista',
            'Onboarding de motorista',
            'Motorista',
            'Validação da documentação, criação do acesso e aprovação da entrada do motorista.',
            [
                $this->item(
                    'validar_documentacao',
                    1,
                    'Validar documentação',
                    'validacao',
                    [
                        'regra'=>
                            'motorista_documentacao_valida',
                    ]
                ),

                $this->systemAction(
                    'acesso_motorista',
                    2,
                    'Criar ou validar acesso',
                    'motorista_acesso'
                ),

                $this->item(
                    'aprovar_motorista',
                    3,
                    'Aprovar onboarding',
                    'aprovacao',
                    [
                        'regra'=>
                            'motorista_onboarding_completo',
                    ]
                ),
            ]
        );
    }

    private function denunciaPrestacaoServicos(): array
    {
        return $this->workflow(
            'denuncia_prestacao_servicos',
            'Denúncia de prestação de serviços',
            'Cessação contratual',
            'Fluxo recomendado para emissão e assinatura da denúncia de um contrato de prestação de serviços existente.',
            [
                $this->relatedContract(
                    'contrato_origem',
                    1,
                    'Selecionar contrato de prestação de serviços',
                    'prestacao_servico',
                    'assinado'
                ),

                $this->item(
                    'validar_partes',
                    2,
                    'Validar partes do contrato',
                    'validacao',
                    [
                        'regra'=>
                            'denuncia_partes_correspondentes',
                    ]
                ),

                $this->item(
                    'validar_datas',
                    3,
                    'Validar data de efeitos da denúncia',
                    'validacao',
                    [
                        'regra'=>
                            'denuncia_datas_validas',
                    ]
                ),

                $this->item(
                    'gerar_denuncia',
                    4,
                    'Gerar documento de denúncia',
                    'gerar_documento'
                ),

                $this->signature(
                    'assinatura_empresa',
                    5,
                    'Assinatura da empresa',
                    'ASSINATURA_EMPRESA'
                ),

                $this->signature(
                    'assinatura_motorista',
                    6,
                    'Assinatura do motorista',
                    'ASSINATURA_MOTORISTA'
                ),

                $this->item(
                    'conferencia_final',
                    7,
                    'Confirmar conclusão da denúncia',
                    'aprovacao',
                    [
                        'regra'=>
                            'denuncia_concluida',
                    ]
                ),
            ],
            false,
            1
        );
    }

    private function comodatoProprietarioNif(): array
    {
        return $this->workflow(
            'comodato_proprietario_nif',
            'Comodato — proprietário identificado por NIF',
            'Comodato',
            'Contrato de comodato entre proprietário do veículo e empresa TVDE com validação por NIF.',
            [
                $this->item(
                    'validar_proprietario',
                    1,
                    'Validar proprietário',
                    'validacao',
                    [
                        'regra'=>
                            'proprietario_nif_valido',
                    ]
                ),

                $this->item(
                    'validar_empresa',
                    2,
                    'Validar empresa e licença TVDE',
                    'validacao',
                    [
                        'regra'=>
                            'empresa_tenant_tvde_valida',
                    ]
                ),

                $this->item(
                    'validar_veiculo',
                    3,
                    'Validar dados do veículo',
                    'validacao',
                    [
                        'regra'=>
                            'veiculo_dados_completos',
                    ]
                ),

                $this->item(
                    'gerar_documento',
                    4,
                    'Gerar contrato de comodato',
                    'gerar_documento'
                ),

                $this->signature(
                    'assinatura_proprietario',
                    5,
                    'Assinatura do proprietário',
                    'ASSINATURA_PROPRIETARIO'
                ),

                $this->signature(
                    'assinatura_empresa',
                    6,
                    'Assinatura da empresa',
                    'ASSINATURA_EMPRESA'
                ),
            ]
        );
    }

    private function comodatoProprietarioDocumento(): array
    {
        return $this->workflow(
            'comodato_proprietario_documento',
            'Comodato — proprietário identificado por documento',
            'Comodato',
            'Contrato de comodato entre proprietário e empresa TVDE usando documento de identificação do proprietário.',
            [
                $this->item(
                    'validar_proprietario',
                    1,
                    'Validar documento do proprietário',
                    'validacao',
                    [
                        'regra'=>
                            'proprietario_documento_valido',
                    ]
                ),

                $this->item(
                    'validar_empresa',
                    2,
                    'Validar empresa e licença TVDE',
                    'validacao',
                    [
                        'regra'=>
                            'empresa_tenant_tvde_valida',
                    ]
                ),

                $this->item(
                    'validar_veiculo',
                    3,
                    'Validar dados do veículo',
                    'validacao',
                    [
                        'regra'=>
                            'veiculo_dados_completos',
                    ]
                ),

                $this->item(
                    'gerar_documento',
                    4,
                    'Gerar contrato de comodato',
                    'gerar_documento'
                ),

                $this->signature(
                    'assinatura_proprietario',
                    5,
                    'Assinatura do proprietário',
                    'ASSINATURA_PROPRIETARIO'
                ),

                $this->signature(
                    'assinatura_empresa',
                    6,
                    'Assinatura da empresa',
                    'ASSINATURA_EMPRESA'
                ),
            ]
        );
    }

    private function autorizacaoMotoristaProprietario(): array
    {
        return $this->workflow(
            'autorizacao_tvde_motorista_proprietario',
            'Autorização TVDE — motorista proprietário',
            'Autorizações TVDE',
            'Declaração para inscrição de veículo quando o próprio motorista é o proprietário.',
            [
                $this->item(
                    'validar_motorista',
                    1,
                    'Validar motorista e certificado TVDE',
                    'validacao',
                    [
                        'regra'=>
                            'motorista_tvde_valido',
                    ]
                ),

                $this->item(
                    'validar_propriedade',
                    2,
                    'Confirmar propriedade do veículo',
                    'validacao',
                    [
                        'regra'=>
                            'motorista_proprietario_veiculo',
                    ]
                ),

                $this->item(
                    'validar_veiculo',
                    3,
                    'Validar requisitos do veículo',
                    'validacao',
                    [
                        'regra'=>
                            'veiculo_tvde_valido',
                    ]
                ),

                $this->item(
                    'validar_empresa',
                    4,
                    'Validar operador TVDE',
                    'validacao',
                    [
                        'regra'=>
                            'empresa_tenant_tvde_valida',
                    ]
                ),

                $this->item(
                    'gerar_documento',
                    5,
                    'Gerar declaração de autorização',
                    'gerar_documento'
                ),

                $this->signature(
                    'assinatura_motorista',
                    6,
                    'Assinatura do motorista/proprietário',
                    'ASSINATURA_MOTORISTA'
                ),
            ]
        );
    }

    private function autorizacaoProprietarioTerceiro(): array
    {
        return $this->workflow(
            'autorizacao_tvde_proprietario_terceiro',
            'Autorização TVDE — proprietário distinto do motorista',
            'Autorizações TVDE',
            'Declaração para inscrição de veículo quando proprietário e motorista são pessoas distintas.',
            [
                $this->item(
                    'validar_proprietario',
                    1,
                    'Validar proprietário do veículo',
                    'validacao',
                    [
                        'regra'=>
                            'proprietario_dados_validos',
                    ]
                ),

                $this->item(
                    'validar_motorista',
                    2,
                    'Validar motorista e certificado TVDE',
                    'validacao',
                    [
                        'regra'=>
                            'motorista_tvde_valido',
                    ]
                ),

                $this->item(
                    'validar_veiculo',
                    3,
                    'Validar requisitos do veículo',
                    'validacao',
                    [
                        'regra'=>
                            'veiculo_tvde_valido',
                    ]
                ),

                $this->item(
                    'validar_empresa',
                    4,
                    'Validar operador TVDE',
                    'validacao',
                    [
                        'regra'=>
                            'empresa_tenant_tvde_valida',
                    ]
                ),

                $this->item(
                    'gerar_documento',
                    5,
                    'Gerar declaração de autorização',
                    'gerar_documento'
                ),

                $this->signature(
                    'assinatura_proprietario',
                    6,
                    'Assinatura do proprietário',
                    'ASSINATURA_PROPRIETARIO'
                ),

                $this->signature(
                    'assinatura_motorista',
                    7,
                    'Assinatura do motorista',
                    'ASSINATURA_MOTORISTA'
                ),
            ]
        );
    }

    private function aluguerPessoaSingular(): array
    {
        return $this->workflow(
            'aluguer_tvde_pessoa_singular',
            'Aluguer TVDE — proprietário pessoa singular',
            'Aluguer',
            'Fluxo integral de aluguer entre proprietário pessoa singular e motorista.',
            $this->aluguerItems(
                'proprietario_documento_valido'
            ),
            true
        );
    }

    private function aluguerPessoaColetiva(): array
    {
        return $this->workflow(
            'aluguer_tvde_pessoa_coletiva',
            'Aluguer TVDE — proprietário pessoa coletiva',
            'Aluguer',
            'Fluxo integral de aluguer quando a locadora é uma pessoa coletiva.',
            $this->aluguerItems(
                'proprietario_empresa_valido'
            ),
            true
        );
    }

    private function aluguerItems(
        string $ownerRule
    ): array {
        return [
            $this->item(
                'validar_proprietario',
                1,
                'Validar locadora/proprietário',
                'validacao',
                [
                    'regra'=>$ownerRule,
                ]
            ),

            $this->item(
                'validar_motorista',
                2,
                'Validar motorista',
                'validacao',
                [
                    'regra'=>
                        'motorista_documentacao_valida',
                ]
            ),

            $this->item(
                'validar_veiculo',
                3,
                'Validar veículo',
                'validacao',
                [
                    'regra'=>
                        'veiculo_dados_completos',
                ]
            ),

            $this->item(
                'validar_condicoes_financeiras',
                4,
                'Validar caução, valor e datas',
                'validacao',
                [
                    'regra'=>
                        'aluguer_condicoes_validas',
                ]
            ),

            $this->item(
                'gerar_contrato',
                5,
                'Gerar contrato de aluguer',
                'gerar_documento'
            ),

            $this->signature(
                'assinatura_proprietario',
                6,
                'Assinatura da locadora/proprietário',
                'ASSINATURA_PROPRIETARIO'
            ),

            $this->signature(
                'assinatura_motorista',
                7,
                'Assinatura do motorista',
                'ASSINATURA_MOTORISTA'
            ),

            $this->systemAction(
                'acesso_motorista',
                8,
                'Criar ou validar acesso do motorista',
                'motorista_acesso'
            ),

            $this->relatedContract(
                'prestacao_servicos',
                9,
                'Validar contrato de prestação de serviços',
                'contrato_de_prestacao_de_servicos',
                'assinado'
            ),

            $this->vehicleChecklist(
                'entrega_veiculo',
                10,
                'Checklist integral de entrega',
                'entrega'
            ),

            $this->vehicleChecklist(
                'recolha_veiculo',
                11,
                'Checklist integral de recolha',
                'recolha'
            ),

            $this->item(
                'conferencia_final',
                12,
                'Conferência final e encerramento',
                'aprovacao',
                [
                    'regra'=>
                        'aluguer_encerramento_completo',
                ]
            ),
        ];
    }

    /*
     * FROTAPRO_4R6_RGPD_GLOBAL_WORKFLOW
     *
     * Workflow global RGPD v1.0.
     *
     * Estado: rascunho nao publicavel.
     *
     * As configuracoes sao declarativas.
     * A recolha auditavel de consentimentos
     * e a assinatura generica do titular
     * serao implementadas antes da ativacao.
     */
    /*
     * FROTAPRO_4R11F_RGPD_SIMPLE
     *
     * Workflow documental de cinco etapas.
     * Template e workflow em rascunho.
     *
     * As etapas nao executam assinaturas
     * ou PDFs por si proprias.
     */
    private function rgpdInformacaoAutorizacoes(): array
    {
        return $this->workflow(
            'rgpd_informacao_autorizacoes',
            'Informação e autorizações RGPD',
            'Proteção de Dados (RGPD)',
            'Preenchimento, validação, pré-visualização, assinatura e PDF.',
            [
                $this->item(
                    'preencher_rgpd',
                    1,
                    'Preencher identificação e autorizações',
                    'preenchimento',
                    [
                        'perfis'=>[
                            'motorista',
                            'proprietario',
                            'colaborador',
                            'outro',
                        ],
                        'campos'=>[
                            'qualidade_titular',
                            'identificador_titular',
                            'autorizacao_imagem',
                            'autorizacao_voz',
                            'autorizacao_localizacao',
                            'autorizacao_dados_sensiveis',
                        ],
                        'opcoes'=>[
                            'autorizo',
                            'nao_autorizo',
                            'nao_aplicavel',
                        ],
                        'pre_selecionadas'=>false,
                        'escolhas_independentes'=>true,
                    ]
                ),

                $this->item(
                    'validar_itens_rgpd',
                    2,
                    'Validar dados e escolhas',
                    'tarefa',
                    [
                        'itens'=>[
                            'empresa',
                            'titular',
                            'finalidades',
                            'bases_legais',
                            'destinatarios',
                            'conservacao',
                            'direitos',
                            'contactos',
                            'autorizacoes',
                        ],
                    ]
                ),

                $this->item(
                    'previsualizar_rgpd',
                    3,
                    'Conferir pré-visualização',
                    'tarefa',
                    [
                        'conferir_versao'=>true,
                        'conferir_conteudo'=>true,
                        'conferir_autorizacoes'=>true,
                    ]
                ),

                $this->item(
                    'conferir_assinatura_rgpd',
                    4,
                    'Conferir assinatura do titular',
                    'upload',
                    [
                        'tipo_comprovativo'=>'assinatura_titular',
                        'associar_versao'=>true,
                    ]
                ),

                $this->item(
                    'emitir_pdf_rgpd',
                    5,
                    'Emitir PDF e arquivar',
                    'gerar_documento',
                    [
                        'numeracao'=>'global',
                        'arquivo'=>'documentos',
                    ]
                ),
            ],
            false,
            1,
            true
        );
    }
    private function workflow(
        string $code,
        string $name,
        string $category,
        string $description,
        array $items,
        bool $featured=false,
        int $version=1,
        bool $publishable=true
    ): array {
        return [
            'codigo'=>$code,
            'nome'=>$name,
            'categoria'=>$category,
            'descricao'=>$description,
            'versao'=>$version,
            'destaque'=>$featured,
            'publicavel'=>$publishable,
            'items'=>$items,
        ];
    }

    private function item(
        string $code,
        int $order,
        string $title,
        string $type,
        array $configuration=[],
        bool $required=true,
        ?string $description=null
    ): array {
        $item=[
            'codigo'=>$code,
            'ordem'=>$order,
            'titulo'=>$title,
            'tipo'=>$type,
            'obrigatorio'=>$required,
        ];

        if($description!==null){
            $item['descricao']=$description;
        }

        if($configuration!==[]){
            $item['configuracao']=$configuration;
        }

        return $item;
    }

    private function signature(
        string $code,
        int $order,
        string $title,
        string $placeholder
    ): array {
        return $this->item(
            $code,
            $order,
            $title,
            'assinatura',
            [
                'placeholder'=>$placeholder,
            ]
        );
    }

    private function systemAction(
        string $code,
        int $order,
        string $title,
        string $action
    ): array {
        return $this->item(
            $code,
            $order,
            $title,
            'acao_sistema',
            [
                'action'=>$action,
            ]
        );
    }

    private function relatedContract(
        string $code,
        int $order,
        string $title,
        string $typeCode,
        string $completionStatus
    ): array {
        return $this->item(
            $code,
            $order,
            $title,
            'contrato_relacionado',
            [
                'tipo_contrato_codigo'=>$typeCode,
                'status_conclusao'=>$completionStatus,
            ]
        );
    }

    private function vehicleChecklist(
        string $code,
        int $order,
        string $title,
        string $type
    ): array {
        return $this->item(
            $code,
            $order,
            $title,
            'checklist_veiculo',
            [
                'checklist_tipo'=>$type,
            ]
        );
    }
}