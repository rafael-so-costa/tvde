<?php

namespace App\Services;

use App\Models\ChecklistProcessTemplate;
use App\Models\ChecklistProcessTemplateItem;
use Illuminate\Support\Facades\DB;

class ChecklistProcessPresetService
{
    public function catalog(
        string $tenantId
    ): array {
        $copies =
            ChecklistProcessTemplate::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->whereNotNull(
                    'preset_codigo'
                )
                ->select(
                    'preset_codigo'
                )
                ->selectRaw(
                    'COUNT(*) as total'
                )
                ->groupBy(
                    'preset_codigo'
                )
                ->pluck(
                    'total',
                    'preset_codigo'
                );

        return collect(
            $this->presets()
        )
            ->map(
                function (
                    array $preset
                ) use (
                    $copies
                ): array {
                    $count =
                        (int)(
                            $copies[
                                $preset[
                                    'codigo'
                                ]
                            ] ??
                            0
                        );

                    return array_merge(
                        $preset,
                        [
                            'copias' =>
                                $count,

                            'ja_utilizado' =>
                                $count > 0,
                        ]
                    );
                }
            )
            ->values()
            ->all();
    }

    public function copyToTenant(
        string $tenantId,
        string $code,
        array $data = []
    ): ChecklistProcessTemplate {
        $preset =
            collect(
                $this->presets()
            )
                ->firstWhere(
                    'codigo',
                    $code
                );

        if (!$preset) {
            abort(
                404,
                'Workflow recomendado não encontrado.'
            );
        }

        return DB::transaction(
            function () use (
                $tenantId,
                $preset,
                $data
            ): ChecklistProcessTemplate {
                $template =
                    new ChecklistProcessTemplate([
                        'codigo' =>
                            $this->uniqueTenantCode(
                                $tenantId,
                                'frotapro_' .
                                $preset['codigo']
                            ),

                        'nome' =>
                            trim(
                                $data['nome'] ??
                                $preset['nome']
                            ),

                        'descricao' =>
                            $preset[
                                'descricao'
                            ],

                        'ativo' =>
                            true,

                        'versao' =>
                            1,
                    ]);

                $template->tenant_id =
                    $tenantId;

                $template->preset_codigo =
                    $preset['codigo'];

                $template->preset_versao =
                    $preset['versao'];

                $template->save();

                foreach (
                    $preset['items']
                    as $itemData
                ) {
                    $item =
                        new ChecklistProcessTemplateItem([
                            'codigo' =>
                                $itemData[
                                    'codigo'
                                ],

                            'ordem' =>
                                $itemData[
                                    'ordem'
                                ],

                            'titulo' =>
                                $itemData[
                                    'titulo'
                                ],

                            'descricao' =>
                                $itemData[
                                    'descricao'
                                ] ??
                                null,

                            'tipo' =>
                                $itemData[
                                    'tipo'
                                ],

                            'obrigatorio' =>
                                $itemData[
                                    'obrigatorio'
                                ] ??
                                true,

                            'configuracao' =>
                                $itemData[
                                    'configuracao'
                                ] ??
                                [],
                        ]);

                    $item->template_id =
                        $template->id;

                    $item->save();
                }

                return $template
                    ->fresh()
                    ->load(
                        'items'
                    );
            }
        );
    }

    private function uniqueTenantCode(
        string $tenantId,
        string $base
    ): string {
        $base =
            substr(
                $base,
                0,
                90
            );

        $candidate =
            $base;

        $suffix =
            2;

        while (
            ChecklistProcessTemplate::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'codigo',
                    $candidate
                )
                ->exists()
        ) {
            $candidate =
                substr(
                    $base,
                    0,
                    86
                ) .
                '_' .
                $suffix;

            $suffix++;
        }

        return $candidate;
    }

    private function presets(): array
    {
        return [
            [
                'codigo' =>
                    'aluguer_completo_tvde',

                'nome' =>
                    'Aluguer TVDE completo',

                'categoria' =>
                    'Aluguer',

                'descricao' =>
                    'Fluxo completo recomendado para aluguer de veículo TVDE, incluindo documento, assinaturas, acesso do motorista, prestação de serviços, entrega, recolha e conferência final.',

                'versao' =>
                    1,

                'destaque' =>
                    true,

                'items' => [
                    [
                        'codigo' =>
                            'validar_dados',

                        'ordem' =>
                            1,

                        'titulo' =>
                            'Validar dados do contrato',

                        'descricao' =>
                            'Confirmar dados da empresa, motorista, proprietário, veículo, valores e datas.',

                        'tipo' =>
                            'validacao',

                        'obrigatorio' =>
                            true,
                    ],

                    [
                        'codigo' =>
                            'gerar_contrato_aluguer',

                        'ordem' =>
                            2,

                        'titulo' =>
                            'Gerar contrato de aluguer',

                        'descricao' =>
                            'Gerar o documento definitivo do contrato de aluguer.',

                        'tipo' =>
                            'gerar_documento',

                        'obrigatorio' =>
                            true,
                    ],

                    [
                        'codigo' =>
                            'assinatura_empresa',

                        'ordem' =>
                            3,

                        'titulo' =>
                            'Assinatura da empresa',

                        'tipo' =>
                            'assinatura',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'placeholder' =>
                                'ASSINATURA_EMPRESA',
                        ],
                    ],

                    [
                        'codigo' =>
                            'assinatura_motorista',

                        'ordem' =>
                            4,

                        'titulo' =>
                            'Assinatura do motorista',

                        'tipo' =>
                            'assinatura',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'placeholder' =>
                                'ASSINATURA_MOTORISTA',
                        ],
                    ],

                    [
                        'codigo' =>
                            'criar_acesso_motorista',

                        'ordem' =>
                            5,

                        'titulo' =>
                            'Criar ou validar acesso do motorista',

                        'descricao' =>
                            'Garantir que o motorista possui acesso ativo à organização.',

                        'tipo' =>
                            'acao_sistema',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'action' =>
                                'motorista_acesso',
                        ],
                    ],

                    [
                        'codigo' =>
                            'contrato_prestacao_servicos',

                        'ordem' =>
                            6,

                        'titulo' =>
                            'Contrato de prestação de serviços',

                        'descricao' =>
                            'Criar e confirmar o contrato de prestação de serviços associado ao motorista antes da entrega do veículo.',

                        'tipo' =>
                            'contrato_relacionado',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'tipo_contrato_codigo' =>
                                'prestacao_servico',
                        ],
                    ],

                    [
                        'codigo' =>
                            'entrega_veiculo',

                        'ordem' =>
                            7,

                        'titulo' =>
                            'Checklist de entrega do veículo',

                        'descricao' =>
                            'Registar estado, quilometragem, combustível, equipamentos, fotografias e assinaturas da entrega.',

                        'tipo' =>
                            'checklist_veiculo',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'checklist_tipo' =>
                                'entrega',
                        ],
                    ],

                    [
                        'codigo' =>
                            'recolha_veiculo',

                        'ordem' =>
                            8,

                        'titulo' =>
                            'Checklist de recolha do veículo',

                        'descricao' =>
                            'Comparar o estado do veículo com a entrega, registando danos, faltas e eventuais penalizações.',

                        'tipo' =>
                            'checklist_veiculo',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'checklist_tipo' =>
                                'recolha',
                        ],
                    ],

                    [
                        'codigo' =>
                            'conferencia_final',

                        'ordem' =>
                            9,

                        'titulo' =>
                            'Conferência e encerramento',

                        'descricao' =>
                            'Confirmar que todas as obrigações e documentos do processo foram concluídos.',

                        'tipo' =>
                            'aprovacao',

                        'obrigatorio' =>
                            true,
                    ],
                ],
            ],

            [
                'codigo' =>
                    'aluguer_essencial',

                'nome' =>
                    'Aluguer de veículo essencial',

                'categoria' =>
                    'Aluguer',

                'descricao' =>
                    'Fluxo simplificado para contratos de aluguer com documento, assinatura do motorista, entrega e recolha do veículo.',

                'versao' =>
                    1,

                'destaque' =>
                    false,

                'items' => [
                    [
                        'codigo' =>
                            'gerar_contrato',

                        'ordem' =>
                            1,

                        'titulo' =>
                            'Gerar contrato',

                        'tipo' =>
                            'gerar_documento',

                        'obrigatorio' =>
                            true,
                    ],

                    [
                        'codigo' =>
                            'assinatura_motorista',

                        'ordem' =>
                            2,

                        'titulo' =>
                            'Assinatura do motorista',

                        'tipo' =>
                            'assinatura',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'placeholder' =>
                                'ASSINATURA_MOTORISTA',
                        ],
                    ],

                    [
                        'codigo' =>
                            'entrega_veiculo',

                        'ordem' =>
                            3,

                        'titulo' =>
                            'Entrega do veículo',

                        'tipo' =>
                            'checklist_veiculo',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'checklist_tipo' =>
                                'entrega',
                        ],
                    ],

                    [
                        'codigo' =>
                            'recolha_veiculo',

                        'ordem' =>
                            4,

                        'titulo' =>
                            'Recolha do veículo',

                        'tipo' =>
                            'checklist_veiculo',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'checklist_tipo' =>
                                'recolha',
                        ],
                    ],
                ],
            ],

            [
                'codigo' =>
                    'prestacao_servicos_motorista',

                'nome' =>
                    'Prestação de serviços do motorista',

                'categoria' =>
                    'Motorista',

                'descricao' =>
                    'Fluxo recomendado para formalização da prestação de serviços do motorista.',

                'versao' =>
                    1,

                'destaque' =>
                    false,

                'items' => [
                    [
                        'codigo' =>
                            'validar_dados',

                        'ordem' =>
                            1,

                        'titulo' =>
                            'Validar dados do motorista',

                        'tipo' =>
                            'validacao',

                        'obrigatorio' =>
                            true,
                    ],

                    [
                        'codigo' =>
                            'gerar_documento',

                        'ordem' =>
                            2,

                        'titulo' =>
                            'Gerar contrato de prestação de serviços',

                        'tipo' =>
                            'gerar_documento',

                        'obrigatorio' =>
                            true,
                    ],

                    [
                        'codigo' =>
                            'assinatura_empresa',

                        'ordem' =>
                            3,

                        'titulo' =>
                            'Assinatura da empresa',

                        'tipo' =>
                            'assinatura',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'placeholder' =>
                                'ASSINATURA_EMPRESA',
                        ],
                    ],

                    [
                        'codigo' =>
                            'assinatura_motorista',

                        'ordem' =>
                            4,

                        'titulo' =>
                            'Assinatura do motorista',

                        'tipo' =>
                            'assinatura',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'placeholder' =>
                                'ASSINATURA_MOTORISTA',
                        ],
                    ],

                    [
                        'codigo' =>
                            'acesso_motorista',

                        'ordem' =>
                            5,

                        'titulo' =>
                            'Validar acesso do motorista',

                        'tipo' =>
                            'acao_sistema',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'action' =>
                                'motorista_acesso',
                        ],
                    ],
                ],
            ],

            [
                'codigo' =>
                    'entrega_recolha_veiculo',

                'nome' =>
                    'Entrega e recolha de veículo',

                'categoria' =>
                    'Veículo',

                'descricao' =>
                    'Fluxo operacional focado exclusivamente nas inspeções de entrega e recolha do veículo.',

                'versao' =>
                    1,

                'destaque' =>
                    false,

                'items' => [
                    [
                        'codigo' =>
                            'entrega_veiculo',

                        'ordem' =>
                            1,

                        'titulo' =>
                            'Checklist de entrega',

                        'tipo' =>
                            'checklist_veiculo',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'checklist_tipo' =>
                                'entrega',
                        ],
                    ],

                    [
                        'codigo' =>
                            'recolha_veiculo',

                        'ordem' =>
                            2,

                        'titulo' =>
                            'Checklist de recolha',

                        'tipo' =>
                            'checklist_veiculo',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'checklist_tipo' =>
                                'recolha',
                        ],
                    ],
                ],
            ],

            [
                'codigo' =>
                    'onboarding_motorista',

                'nome' =>
                    'Onboarding de motorista',

                'categoria' =>
                    'Motorista',

                'descricao' =>
                    'Fluxo simples para validar documentação, criar acesso e aprovar a entrada do motorista.',

                'versao' =>
                    1,

                'destaque' =>
                    false,

                'items' => [
                    [
                        'codigo' =>
                            'validar_documentacao',

                        'ordem' =>
                            1,

                        'titulo' =>
                            'Validar documentação',

                        'descricao' =>
                            'Confirmar os documentos e dados necessários do motorista.',

                        'tipo' =>
                            'validacao',

                        'obrigatorio' =>
                            true,
                    ],

                    [
                        'codigo' =>
                            'acesso_motorista',

                        'ordem' =>
                            2,

                        'titulo' =>
                            'Criar ou validar acesso',

                        'tipo' =>
                            'acao_sistema',

                        'obrigatorio' =>
                            true,

                        'configuracao' => [
                            'action' =>
                                'motorista_acesso',
                        ],
                    ],

                    [
                        'codigo' =>
                            'aprovar_motorista',

                        'ordem' =>
                            3,

                        'titulo' =>
                            'Aprovar onboarding',

                        'tipo' =>
                            'aprovacao',

                        'obrigatorio' =>
                            true,
                    ],
                ],
            ],
        ];
    }
}