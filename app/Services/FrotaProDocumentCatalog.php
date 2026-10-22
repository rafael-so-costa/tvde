<?php

namespace App\Services;

use RuntimeException;

final class FrotaProDocumentCatalog
{
    public function __construct(
        private FrotaProWorkflowCatalog $workflowCatalog
    ) {}

    public function all(): array
    {
        return [
            $this->document(
                'prestacao_servicos_motorista',
                'Prestação de Serviços',
                'prestacao-servicos-motorista',
                'Contrato de Prestação de Serviços',
                'contrato',
                'prestacao_servicos_motorista',
                'Contrato recomendado para formalizar a prestação de serviços do motorista à empresa do tenant.',
                10,
                true,
                '2.1'
            ),

            $this->document(
                'denuncia_prestacao_servicos',
                'Denúncia de Prestação de Serviços',
                'denuncia-prestacao-servicos',
                'Cessação Contratual',
                'denuncia',
                'denuncia_prestacao_servicos',
                'Documento para formalizar a denúncia de um contrato de prestação de serviços existente.',
                20
            ),

            $this->document(
                'comodato_proprietario_nif',
                'Comodato — proprietário identificado por NIF',
                'comodato-proprietario-nif',
                'Comodato',
                'comodato',
                'comodato_proprietario_nif',
                'Contrato de comodato do veículo entre proprietário e empresa do tenant.',
                30
            ),

            $this->document(
                'comodato_proprietario_documento',
                'Comodato — proprietário identificado por documento',
                'comodato-proprietario-documento',
                'Comodato',
                'comodato',
                'comodato_proprietario_documento',
                'Variante do comodato que identifica o proprietário através do documento de identificação.',
                40
            ),

            $this->document(
                'autorizacao_tvde_motorista_proprietario',
                'Autorização TVDE — motorista proprietário',
                'autorizacao-tvde-motorista-proprietario',
                'Autorizações TVDE',
                'declaracao',
                'autorizacao_tvde_motorista_proprietario',
                'Autorização para inscrição do veículo quando o motorista é também o proprietário.',
                50
            ),

            $this->document(
                'autorizacao_tvde_proprietario_terceiro',
                'Autorização TVDE — proprietário distinto do motorista',
                'autorizacao-tvde-proprietario-terceiro',
                'Autorizações TVDE',
                'declaracao',
                'autorizacao_tvde_proprietario_terceiro',
                'Autorização para inscrição do veículo quando proprietário e motorista são pessoas distintas.',
                60
            ),

            $this->document(
                'aluguer_veiculo_pessoa_singular',
                'Aluguer de Veículo — locadora pessoa singular',
                'aluguer-veiculo-pessoa-singular',
                'Contrato de Aluguer',
                'contrato',
                'aluguer_tvde_pessoa_singular',
                'Contrato de aluguer quando a locadora/proprietário é uma pessoa singular.',
                70,
                true,
                '1.1'
            ),

            $this->document(
                'aluguer_veiculo_pessoa_coletiva',
                'Aluguer de Veículo — locadora pessoa coletiva',
                'aluguer-veiculo-pessoa-coletiva',
                'Contrato de Aluguer',
                'contrato',
                'aluguer_tvde_pessoa_coletiva',
                'Contrato de aluguer quando a locadora/proprietário é uma pessoa coletiva.',
                80,
                true,
                '1.1'
            ),
        ];
    }

    public function find(
        string $code
    ): ?array {
        return collect(
            $this->all()
        )->firstWhere(
            'codigo',
            $code
        );
    }

    public function content(
        array|string $document
    ): string {
        if(
            is_string(
                $document
            )
        ){
            $document=
                $this->find(
                    $document
                );

            if(!$document){
                throw new RuntimeException(
                    'Modelo recomendado FrotaPRO não encontrado.'
                );
            }
        }

        $path=
            resource_path(
                'frotapro/documentos/'.
                $document['arquivo'].
                '.txt'
            );

        if(
            !is_file(
                $path
            )
        ){
            throw new RuntimeException(
                "Ficheiro do modelo FrotaPRO não encontrado: {$path}"
            );
        }

        $content=
            file_get_contents(
                $path
            );

        if(
            $content===false ||
            trim($content)===''
        ){
            throw new RuntimeException(
                "O modelo FrotaPRO {$document['codigo']} está vazio."
            );
        }

        return trim(
            $content
        );
    }

    public function categories(): array
    {
        return collect(
            $this->all()
        )
            ->map(
                fn(array $document)=>[
                    'nome'=>$document[
                        'categoria'
                    ],
                    'slug'=>$document[
                        'categoria_slug'
                    ],
                    'descricao'=>$document[
                        'categoria_descricao'
                    ],
                ]
            )
            ->unique(
                'slug'
            )
            ->values()
            ->all();
    }

    private function document(
        string $code,
        string $name,
        string $file,
        string $category,
        string $documentType,
        string $workflow,
        string $summary,
        int $order,
        bool $featured=false,
        string $version='1.0'
    ): array {
        $workflowCodes=
            collect(
                $this
                    ->workflowCatalog
                    ->all()
            )
                ->pluck(
                    'codigo'
                );

        if(
            !$workflowCodes
                ->contains(
                    $workflow
                )
        ){
            throw new RuntimeException(
                "Workflow recomendado inexistente para {$code}: {$workflow}"
            );
        }

        return [
            'codigo'=>$code,
            'nome'=>$name,
            'slug'=>$code,

            'arquivo'=>$file,

            'categoria'=>$category,
            'categoria_slug'=>
                str_replace(
                    '_',
                    '-',
                    $this->slug(
                        $category
                    )
                ),

            'categoria_descricao'=>
                "Modelos recomendados FrotaPRO da categoria {$category}.",

            'tipo_documento'=>
                $documentType,

            'workflow_codigo'=>
                $workflow,

            'resumo'=>$summary,

            'descricao'=>$summary,

            'pais'=>'PT',
            'idioma'=>'pt-PT',

            'versao'=>$version,

            /*
             * Não marcar como juridicamente revisto.
             * A revisão jurídica deve ser uma ação explícita.
             */
            'juridicamente_revisto'=>false,

            'destaque'=>$featured,
            'ativo'=>true,
            'ordem'=>$order,
        ];
    }

    private function slug(
        string $value
    ): string {
        $value=
            mb_strtolower(
                \Illuminate\Support\Str::ascii(
                    $value
                )
            );

        return trim(
            preg_replace(
                '/[^a-z0-9]+/',
                '_',
                $value
            ) ?? '',
            '_'
        );
    }
}
