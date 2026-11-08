<?php

namespace App\Services;

use App\Models\ChecklistProcessTemplate;
use App\Models\ChecklistProcessTemplateItem;
use App\Models\ModeloDocumentoSaas;
use App\Models\TipoContrato;
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
            ->filter(
                fn(array $preset): bool =>
                    ($preset['publicavel'] ?? true) !== false &&
                    (
                        $preset['codigo'] !== 'rgpd_informacao_autorizacoes' ||
                        $this->rgpdReleased()
                    )
            )
            ->map(
                function (
                    array $preset
                ) use (
                    $copies
                ): array {
                    $count =
                        (int) (
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
                            'copias' => $count,

                            'ja_utilizado' => $count > 0,
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

        if (! $preset) {
            abort(
                404,
                'Workflow recomendado não encontrado.'
            );
        }

        // FROTAPRO_4R6_DRAFT_WORKFLOW_GUARD
        if(($preset['publicavel']??true)===false){
            abort(
                409,
                'Este workflow global ainda está em preparação e não pode ser copiado para uma organização.'
            );
        }

        // FROTAPRO_4R12C1_RGPD_RELEASE_GUARD
        if (
            $code === 'rgpd_informacao_autorizacoes' &&
            !$this->rgpdReleased()
        ) {
            abort(
                409,
                'O RGPD ainda nao possui uma versao publicada.'
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
                        'codigo' => $this->uniqueTenantCode(
                            $tenantId,
                            'frotapro_'.
                            $preset['codigo']
                        ),

                        'nome' => trim(
                            $data['nome'] ??
                            $preset['nome']
                        ),

                        'descricao' => $preset[
                                'descricao'
                            ],

                        'ativo' => true,

                        'versao' => 1,
                    ]);

                $template->tenant_id =
                    $tenantId;

                $template->preset_codigo =
                    $preset['codigo'];

                $template->preset_versao =
                    $preset['versao'];

                $template->save();

                foreach (
                    $preset['items'] as $itemData
                ) {
                    $configuracao =
                        (array) (
                            $itemData[
                                'configuracao'
                            ] ??
                            []
                        );

                    if (
                        (
                            $itemData[
                                'tipo'
                            ] ??
                            null
                        ) ===
                        'contrato_relacionado'
                    ) {
                        $codigo =
                            strtolower(
                                trim(
                                    (string) (
                                        $configuracao[
                                            'tipo_contrato_codigo'
                                        ] ??
                                        ''
                                    )
                                )
                            );

                        if (
                            $codigo !== ''
                        ) {
                            $tipoContrato =
                                TipoContrato::query()
                                    ->where(
                                        'tenant_id',
                                        $tenantId
                                    )
                                    ->where(
                                        'ativo',
                                        true
                                    )
                                    ->where(
                                        'codigo',
                                        $codigo
                                    )
                                    ->first();

                            if (
                                $tipoContrato
                            ) {
                                $configuracao[
                                    'tipo_contrato_id'
                                ] =
                                    $tipoContrato
                                        ->id;

                                $configuracao[
                                    'tipo_contrato_codigo'
                                ] =
                                    $tipoContrato
                                        ->codigo;
                            }
                        }
                    }

                    $item =
                        new ChecklistProcessTemplateItem([
                            'codigo' => $itemData[
                                    'codigo'
                                ],

                            'ordem' => $itemData[
                                    'ordem'
                                ],

                            'titulo' => $itemData[
                                    'titulo'
                                ],

                            'descricao' => $itemData[
                                    'descricao'
                                ] ??
                                null,

                            'tipo' => $itemData[
                                    'tipo'
                                ],

                            'obrigatorio' => $itemData[
                                    'obrigatorio'
                                ] ??
                                true,

                            'configuracao' => $configuracao,
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
                ).
                '_'.
                $suffix;

            $suffix++;
        }

        return $candidate;
    }

    private function rgpdReleased(): bool
    {
        return ModeloDocumentoSaas::query()
            ->where(
                'slug',
                'informacao-tratamento-dados-rgpd'
            )
            ->where('status', 'publicado')
            ->where('ativo', true)
            ->where('tecnicamente_validado', true)
            ->whereNotNull('versao_publicada')
            ->whereHas(
                'categoria',
                fn($query) => $query->where('ativo', true)
            )
            ->exists();
    }
    private function presets(): array
    {
        return app(
            FrotaProWorkflowCatalog::class
        )->all();
    }
}
