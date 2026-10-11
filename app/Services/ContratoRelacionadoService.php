<?php

namespace App\Services;

use App\Models\ChecklistProcessRunItem;
use App\Models\ChecklistProcessTemplateItem;
use App\Models\Contrato;
use App\Models\ContratoRelacao;
use App\Models\TipoContrato;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ContratoRelacionadoService
{
    public function __construct(
        private ChecklistProcessService $checklistProcessService
    ) {}

    public function status(
        string $tenantId,
        string $contratoId,
        string $itemId
    ): array {
        [
            $contrato,
            $item,
        ] = $this->baseContext(
            $tenantId,
            $contratoId,
            $itemId
        );

        $tipoContrato =
            $this->resolveTargetType(
                $tenantId,
                $item
            );

        if (! $tipoContrato) {
            return [
                'item_id' => $item->id,

                'item_status' => $item->status,

                'bloqueado' => $this->hasPreviousPending(
                    $item
                ),

                'configuracao_pendente' => true,

                'status_conclusao' => $this->completionStatus(
                    $item
                ),

                'tipo_contrato' => null,

                'tipos_disponiveis' => $this->availableTypes(
                    $tenantId
                ),

                'relacao' => null,

                'candidatos' => [],
            ];
        }

        $relation =
            ContratoRelacao::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'process_run_item_id',
                    $item->id
                )
                ->with([
                    'contratoRelacionado.tipoContrato',
                    'contratoRelacionado.documento',
                ])
                ->first();

        $statusConclusao =
            $this->completionStatus(
                $item
            );

        $related =
            $relation
                ?->contratoRelacionado;

        return [
            'item_id' => $item->id,

            'item_status' => $item->status,

            'bloqueado' => $this->hasPreviousPending(
                $item
            ),

            'configuracao_pendente' => false,

            'status_conclusao' => $statusConclusao,

            'tipo_contrato' => [
            'id' => $tipoContrato->id,

            'nome' => $tipoContrato->nome,

            'codigo' => $tipoContrato->codigo,

            'ativo' => (bool) $tipoContrato->ativo,

            'entidades' => (array) $tipoContrato->entidades,
            ],

            'tipos_disponiveis' => [],

            'relacao' => $relation
                    ? [
                    'id' => $relation->id,

                    'contrato' => [
                        'id' => $related?->id,

                        'status' => $related?->status,

                        'tipo' => $related?->tipo,

                        'tipo_contrato_id' => $related
                            ?->tipo_contrato_id,

                        'tipo_contrato_nome' => $related
                            ?->tipoContrato
                            ?->nome,

                        'documento_codigo' => $related
                            ?->documento
                            ?->codigo,

                        'data_inicio' => $related
                            ?->data_inicio
                            ?->toDateString(),

                        'data_fim' => $related
                            ?->data_fim
                            ?->toDateString(),
                    ],

                    'criterio_atingido' => $related
                            ? $this->reached(
                                $related,
                                $statusConclusao
                            )
                            : false,
                ]
                    : null,

            'candidatos' => $relation
                    ? []
                    : $this->candidates(
                        $tenantId,
                        $contrato,
                        $tipoContrato
                    ),
        ];
    }

    public function configureTargetType(
        string $tenantId,
        string $contratoId,
        string $itemId,
        string $tipoContratoId
    ): array {
        DB::transaction(
            function () use (
                $tenantId,
                $contratoId,
                $itemId,
                $tipoContratoId
            ): void {
                [
                    ,
                    $item,
                ] = $this->baseContext(
                    $tenantId,
                    $contratoId,
                    $itemId
                );

                if (
                    ContratoRelacao::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'process_run_item_id',
                            $item->id
                        )
                        ->exists()
                ) {
                    throw ValidationException::withMessages([
                        'tipo_contrato_id' => 'O tipo não pode ser alterado porque esta etapa já possui um contrato relacionado.',
                    ]);
                }

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
                        ->whereKey(
                            $tipoContratoId
                        )
                        ->lockForUpdate()
                        ->first();

                if (! $tipoContrato) {
                    throw ValidationException::withMessages([
                        'tipo_contrato_id' => 'Selecione um tipo de contrato ativo desta organização.',
                    ]);
                }

                $config =
                    (array) (
                        $item
                            ->configuracao_snapshot
                        ?? []
                    );

                $config[
                    'tipo_contrato_id'
                ] =
                    $tipoContrato->id;

                $config[
                    'tipo_contrato_codigo'
                ] =
                    $tipoContrato->codigo;

                $item
                    ->configuracao_snapshot =
                    $config;

                $item->save();

                if (
                    $item->template_item_id
                ) {
                    $templateItem =
                        ChecklistProcessTemplateItem::query()
                            ->whereKey(
                                $item
                                    ->template_item_id
                            )
                            ->whereHas(
                                'template',
                                fn ($query) => $query->where(
                                    'tenant_id',
                                    $tenantId
                                )
                            )
                            ->lockForUpdate()
                            ->first();

                    if ($templateItem) {
                        $templateConfig =
                            (array) (
                                $templateItem
                                    ->configuracao
                                ?? []
                            );

                        $templateConfig[
                            'tipo_contrato_id'
                        ] =
                            $tipoContrato->id;

                        $templateConfig[
                            'tipo_contrato_codigo'
                        ] =
                            $tipoContrato->codigo;

                        $templateItem
                            ->configuracao =
                            $templateConfig;

                        $templateItem->save();
                    }
                }
            }
        );

        return $this->status(
            $tenantId,
            $contratoId,
            $itemId
        );
    }

    public function link(
        string $tenantId,
        string $contratoId,
        string $itemId,
        string $relatedContractId,
        User $actor
    ): array {
        DB::transaction(
            function () use (
                $tenantId,
                $contratoId,
                $itemId,
                $relatedContractId,
                $actor
            ): void {
                [
                    $contrato,
                    $item,
                ] = $this->baseContext(
                    $tenantId,
                    $contratoId,
                    $itemId
                );

                $tipoContrato =
                    $this->resolveTargetType(
                        $tenantId,
                        $item
                    );

                if (! $tipoContrato) {
                    throw ValidationException::withMessages([
                        'tipo_contrato_id' => 'Selecione primeiro o tipo de contrato relacionado.',
                    ]);
                }

                if (
                    ! $tipoContrato->ativo
                ) {
                    throw ValidationException::withMessages([
                        'tipo_contrato' => 'O tipo de contrato relacionado está inativo.',
                    ]);
                }

                if (
                    $this->hasPreviousPending(
                        $item
                    )
                ) {
                    throw ValidationException::withMessages([
                        'item' => 'Existem etapas obrigatórias anteriores ainda pendentes.',
                    ]);
                }

                $related =
                    Contrato::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->whereKey(
                            $relatedContractId
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                if (
                    $related->id ===
                    $contrato->id
                ) {
                    throw ValidationException::withMessages([
                        'contrato_relacionado_id' => 'Um contrato não pode ser relacionado consigo próprio.',
                    ]);
                }

                if (
                    $related
                        ->tipo_contrato_id !==
                    $tipoContrato->id
                ) {
                    throw ValidationException::withMessages([
                        'contrato_relacionado_id' => 'O contrato selecionado não pertence ao tipo exigido por esta etapa.',
                    ]);
                }

                $this->validateEntities(
                    $contrato,
                    $related,
                    $tipoContrato
                );

                $existing =
                    ContratoRelacao::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'process_run_item_id',
                            $item->id
                        )
                        ->lockForUpdate()
                        ->first();

                if ($existing) {
                    if (
                        $existing
                            ->contrato_relacionado_id !==
                        $related->id
                    ) {
                        throw ValidationException::withMessages([
                            'contrato_relacionado_id' => 'Esta etapa já possui outro contrato relacionado.',
                        ]);
                    }

                    $this->syncRelation(
                        $existing,
                        $actor->id
                    );

                    return;
                }

                $relation =
                    new ContratoRelacao([
                        'contrato_origem_id' => $contrato->id,

                        'contrato_relacionado_id' => $related->id,

                        'process_run_item_id' => $item->id,

                        'tipo_contrato_codigo_snapshot' => $tipoContrato->codigo,

                        'status_conclusao' => $this->completionStatus(
                            $item
                        ),
                    ]);

                $relation->tenant_id =
                    $tenantId;

                $relation->created_by =
                    $actor->id;

                $relation->save();

                $this->syncRelation(
                    $relation,
                    $actor->id
                );
            }
        );

        return $this->status(
            $tenantId,
            $contratoId,
            $itemId
        );
    }

    public function syncByRelatedContract(
        string $tenantId,
        string $relatedContractId,
        ?string $actorId = null
    ): void {
        $relations =
            ContratoRelacao::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'contrato_relacionado_id',
                    $relatedContractId
                )
                ->with([
                    'contratoRelacionado',
                    'processRunItem',
                ])
                ->get();

        foreach (
            $relations as $relation
        ) {
            $this->syncRelation(
                $relation,
                $actorId
            );
        }
    }

    private function syncRelation(
        ContratoRelacao $relation,
        ?string $actorId = null
    ): void {
        $related =
            $relation
                ->relationLoaded(
                    'contratoRelacionado'
                )
                ? $relation
                    ->contratoRelacionado
                : $relation
                    ->contratoRelacionado()
                    ->first();

        $item =
            $relation
                ->relationLoaded(
                    'processRunItem'
                )
                ? $relation
                    ->processRunItem
                : $relation
                    ->processRunItem()
                    ->first();

        if (
            ! $related ||
            ! $item
        ) {
            return;
        }

        if (
            in_array(
                $item->status,
                [
                    ChecklistProcessService::ITEM_DONE,
                    ChecklistProcessService::ITEM_WAIVED,
                ],
                true
            )
        ) {
            return;
        }

        if (
            ! $this->reached(
                $related,
                $relation
                    ->status_conclusao
            )
        ) {
            return;
        }

        $this
            ->checklistProcessService
            ->completeByCode(
                $relation->tenant_id,
                ChecklistProcessService::ENTITY_CONTRATO,
                $relation->contrato_origem_id,
                $item->codigo,
                [
                    'origem' => 'contrato_relacionado',

                    'contrato_relacionado_id' => $related->id,

                    'contrato_relacao_id' => $relation->id,

                    'status_conclusao' => $relation
                        ->status_conclusao,

                    'status_contrato' => $related->status,
                ],
                $actorId
            );
    }

    private function baseContext(
        string $tenantId,
        string $contratoId,
        string $itemId
    ): array {
        $contrato =
            Contrato::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->findOrFail(
                    $contratoId
                );

        $item =
            ChecklistProcessRunItem::query()
                ->whereKey(
                    $itemId
                )
                ->where(
                    'tipo',
                    'contrato_relacionado'
                )
                ->with(
                    'run'
                )
                ->firstOrFail();

        if (
            ! $item->run ||
            $item->run->tenant_id !== $tenantId ||
            $item->run->entidade_tipo !==
                ChecklistProcessService::ENTITY_CONTRATO ||
            $item->run->entidade_id !==
                $contrato->id
        ) {
            abort(404);
        }

        return [
            $contrato,
            $item,
        ];
    }

    private function resolveTargetType(
        string $tenantId,
        ChecklistProcessRunItem $item
    ): ?TipoContrato {
        $config =
            (array) (
                $item
                    ->configuracao_snapshot
                ?? []
            );

        $id =
            trim(
                (string) (
                    $config[
                        'tipo_contrato_id'
                    ] ??
                    ''
                )
            );

        if ($id !== '') {
            $tipo =
                TipoContrato::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->whereKey(
                        $id
                    )
                    ->first();

            if ($tipo) {
                return $tipo;
            }
        }

        $code =
            strtolower(
                trim(
                    (string) (
                        $config[
                            'tipo_contrato_codigo'
                        ] ??
                        ''
                    )
                )
            );

        if ($code === '') {
            return null;
        }

        return TipoContrato::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'codigo',
                $code
            )
            ->first();
    }

    private function availableTypes(
        string $tenantId
    ): array {
        return TipoContrato::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'ativo',
                true
            )
            ->orderBy(
                'ordem'
            )
            ->orderBy(
                'nome'
            )
            ->get([
                'id',
                'nome',
                'codigo',
                'entidades',
            ])
            ->map(
                fn (TipoContrato $tipo) => [
                    'id' => $tipo->id,
                    'nome' => $tipo->nome,
                    'codigo' => $tipo->codigo,
                    'entidades' => (array) $tipo
                        ->entidades,
                ]
            )
            ->values()
            ->all();
    }

    private function completionStatus(
        ChecklistProcessRunItem $item
    ): string {
        $status =
            strtolower(
                trim(
                    (string) data_get(
                        $item->configuracao_snapshot,
                        'status_conclusao',
                        'assinado'
                    )
                )
            );

        return in_array(
            $status,
            [
                'criado',
                'assinado',
                'encerrado',
            ],
            true
        )
            ? $status
            : 'assinado';
    }

    private function reached(
        Contrato $related,
        string $required
    ): bool {
        return match (
            $required
        ) {
            'criado' => $related->status !==
                    'cancelado',

            'encerrado' => $related->status ===
                    'encerrado',

            default => in_array(
                $related->status,
                [
                    'assinado',
                    'renovado',
                    'expirado',
                    'encerrado',
                ],
                true
            ),
        };
    }

    private function hasPreviousPending(
        ChecklistProcessRunItem $item
    ): bool {
        return ChecklistProcessRunItem::query()
            ->where(
                'run_id',
                $item->run_id
            )
            ->where(
                'obrigatorio',
                true
            )
            ->where(
                'ordem',
                '<',
                $item->ordem
            )
            ->whereNotIn(
                'status',
                [
                    ChecklistProcessService::ITEM_DONE,
                    ChecklistProcessService::ITEM_WAIVED,
                ]
            )
            ->exists();
    }

    private function validateEntities(
        Contrato $origin,
        Contrato $related,
        TipoContrato $target
    ): void {
        $entities =
            (array) (
                $target->entidades
                ?? []
            );

        $map = [
            'empresa' => 'empresa_id',
            'proprietario' => 'proprietario_id',
            'motorista' => 'motorista_id',
            'veiculo' => 'veiculo_id',
        ];

        foreach (
            $map as $entity => $field
        ) {
            if (
                ! filter_var(
                    $entities[
                        $entity
                    ] ??
                    false,
                    FILTER_VALIDATE_BOOLEAN
                )
            ) {
                continue;
            }

            $originValue =
                $origin->{$field};

            if (! $originValue) {
                throw ValidationException::withMessages([
                    'contrato_relacionado_id' => "O contrato principal não possui {$entity} para validar esta relação.",
                ]);
            }

            if (
                $related->{$field} !==
                $originValue
            ) {
                throw ValidationException::withMessages([
                    'contrato_relacionado_id' => "O contrato relacionado não corresponde à entidade {$entity} do contrato principal.",
                ]);
            }
        }
    }

    private function candidates(
        string $tenantId,
        Contrato $origin,
        TipoContrato $target
    ): array {
        if (! $target->ativo) {
            return [];
        }

        $query =
            Contrato::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'tipo_contrato_id',
                    $target->id
                )
                ->where(
                    'id',
                    '!=',
                    $origin->id
                )
                ->where(
                    'status',
                    '!=',
                    'cancelado'
                )
                ->with(
                    'documento'
                );

        $entities =
            (array) (
                $target->entidades
                ?? []
            );

        foreach (
            [
                'empresa' => 'empresa_id',
                'proprietario' => 'proprietario_id',
                'motorista' => 'motorista_id',
                'veiculo' => 'veiculo_id',
            ] as $entity => $field
        ) {
            if (
                ! filter_var(
                    $entities[
                        $entity
                    ] ??
                    false,
                    FILTER_VALIDATE_BOOLEAN
                )
            ) {
                continue;
            }

            if (
                blank(
                    $origin->{$field}
                )
            ) {
                return [];
            }

            $query->where(
                $field,
                $origin->{$field}
            );
        }

        return $query
            ->latest(
                'created_at'
            )
            ->limit(5)
            ->get()
            ->map(
                fn (Contrato $contract) => [
                    'id' => $contract->id,

                    'status' => $contract->status,

                    'documento_codigo' => $contract
                        ->documento
                        ?->codigo,

                    'data_inicio' => $contract
                        ->data_inicio
                        ?->toDateString(),

                    'data_fim' => $contract
                        ->data_fim
                        ?->toDateString(),
                ]
            )
            ->values()
            ->all();
    }
}
