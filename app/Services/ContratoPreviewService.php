<?php

namespace App\Services;

use App\Models\AssinaturaDigital;
use App\Models\Contrato;
use App\Models\Empresa;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\TemplateContrato;
use App\Models\Veiculo;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ContratoPreviewService
{
    public function __construct(
        private ContratoTipoResolverService $tipoResolver,
        private ContratoPdfService $documentRenderer
    ) {}

    public function preview(
        array $data,
        string $tenantId
    ): array {
        $resolved=
            $this->tipoResolver
                ->resolve(
                    $data,
                    $tenantId
                );

        $data=
            $resolved['data'];

        $template=
            $resolved['template'];

        if(
            !$template &&
            filled(
                $data['template_id'] ?? null
            )
        ){
            $template=
                TemplateContrato::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        'ativo',
                        true
                    )
                    ->find(
                        $data['template_id']
                    );
        }

        if(
            !$template
        ){
            throw ValidationException::withMessages([
                'template_id'=>
                    'O contrato precisa de um template válido para gerar a pré-visualização.',
            ]);
        }

        if(
            blank(
                $template->conteudo_original
            )
        ){
            throw ValidationException::withMessages([
                'template_id'=>
                    'O template selecionado não possui conteúdo.',
            ]);
        }

        $empresa=
            $this->empresa(
                $tenantId,
                $data['empresa_id'] ?? null
            );

        $motorista=
            $this->motorista(
                $tenantId,
                $data['motorista_id'] ?? null
            );

        $proprietario=
            $this->proprietario(
                $tenantId,
                $data['proprietario_id'] ?? null
            );

        $veiculo=
            $this->veiculo(
                $tenantId,
                $data['veiculo_id'] ?? null
            );

        $contrato=
            new Contrato(
                collect(
                    $data
                )
                    ->except([
                        'assinaturas',
                    ])
                    ->all()
            );

        $contrato->tenant_id=
            $tenantId;

        /*
         * No preview usamos a data corrente como data visual
         * de assinatura quando o contrato ainda não existe.
         */
        $contrato->data_assinatura=
            now();

        $contrato->setRelation(
            'template',
            $template
        );

        $contrato->setRelation(
            'tipoContrato',
            $resolved[
                'tipo_contrato'
            ]
        );

        $contrato->setRelation(
            'empresa',
            $empresa
        );

        $contrato->setRelation(
            'motorista',
            $motorista
        );

        $contrato->setRelation(
            'proprietario',
            $proprietario
        );

        $contrato->setRelation(
            'veiculo',
            $veiculo
        );

        $contrato->setRelation(
            'assinaturas',
            $this->assinaturas(
                $data[
                    'assinaturas'
                ] ?? [],
                $tenantId
            )
        );

        $contrato->setRelation(
            'documento',
            null
        );

        $html=
            $this->documentRenderer
                ->renderHtml(
                    $contrato,
                    $empresa,
                    true
                );

        return [
            'html'=>$html,

            'meta'=>[
                'tipo_contrato_id'=>
                    $contrato
                        ->tipo_contrato_id,

                'template_id'=>
                    $template->id,

                'template_nome'=>
                    $template->nome,

                'empresa_id'=>
                    $empresa?->id,

                'empresa_nome'=>
                    $empresa
                        ?->nome_empresa,

                'preview'=>true,
            ],
        ];
    }

    private function assinaturas(
        array $input,
        string $tenantId
    ): Collection {
        return collect(
            $input
        )
            ->map(
                function(
                    array $data
                ) use(
                    $tenantId
                ): AssinaturaDigital {
                    $modo=
                        strtolower(
                            trim(
                                (string)(
                                    $data['modo']
                                    ?? ''
                                )
                            )
                        );

                    $assinatura=
                        new AssinaturaDigital([
                            'placeholder'=>
                                mb_strtoupper(
                                    trim(
                                        (string)(
                                            $data[
                                                'placeholder'
                                            ]
                                            ?? ''
                                        )
                                    )
                                ),

                            'assinatura_url'=>
                                $data[
                                    'assinatura_url'
                                ] ?? null,

                            'signatario_nome'=>
                                $data[
                                    'signatario_nome'
                                ] ?? null,

                            'signatario_email'=>
                                $data[
                                    'signatario_email'
                                ] ?? null,

                            'status'=>
                                $modo==='presencial'
                                ? 'assinado'
                                : 'pendente',
                        ]);

                    $assinatura->tenant_id=
                        $tenantId;

                    return $assinatura;
                }
            );
    }

    private function empresa(
        string $tenantId,
        ?string $id
    ): ?Empresa {
        if(!$id){
            return null;
        }

        return Empresa::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'ativo',
                true
            )
            ->findOrFail(
                $id
            );
    }

    private function motorista(
        string $tenantId,
        ?string $id
    ): ?Motorista {
        if(!$id){
            return null;
        }

        return Motorista::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'ativo',
                true
            )
            ->findOrFail(
                $id
            );
    }

    private function proprietario(
        string $tenantId,
        ?string $id
    ): ?Proprietario {
        if(!$id){
            return null;
        }

        return Proprietario::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'ativo',
                true
            )
            ->findOrFail(
                $id
            );
    }

    private function veiculo(
        string $tenantId,
        ?string $id
    ): ?Veiculo {
        if(!$id){
            return null;
        }

        return Veiculo::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'ativo',
                true
            )
            ->findOrFail(
                $id
            );
    }
}
