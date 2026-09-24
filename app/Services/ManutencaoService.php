<?php

namespace App\Services;

use App\Models\ChecklistRecord;
use App\Models\EstoqueMovimento;
use App\Models\Fornecedor;
use App\Models\Manutencao;
use App\Models\ManutencaoItem;
use App\Models\ManutencaoPlano;
use App\Models\ManutencaoPlanoVeiculo;
use App\Models\Motorista;
use App\Models\Peca;
use App\Models\Sinistro;
use App\Models\User;
use App\Models\Veiculo;
use App\Models\VeiculoDiagnostico;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ManutencaoService
{
    private const ORIGENS = [
        'preventiva',
        'avaria',
        'checklist',
        'sinistro',
        'diagnostico',
        'manual',
    ];

    private const PRIORIDADES = [
        'baixa',
        'normal',
        'alta',
        'critica',
    ];

    private const TIPOS_ITEM = [
        'peca',
        'mao_obra',
        'outro',
    ];

    public function __construct(
        private PermissionService $permissionService,
        private EstoqueService $estoqueService,
        private VeiculoOperacaoService $veiculoOperacaoService,
        private ManutencaoPlanoService $planoService,
        private ManutencaoGarantiaService $garantiaService,
        private VeiculoDiagnosticoService $diagnosticoService
    ) {}

    public function create(
        array $data,
        User $actor,
        string $tenantId
    ): Manutencao {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        $origem = $data['origem'] ?? 'manual';

        if (!in_array(
            $origem,
            self::ORIGENS,
            true
        )) {
            throw ValidationException::withMessages([
                'origem' => 'Origem da manutenção inválida.',
            ]);
        }

        $prioridade =
            $data['prioridade'] ?? 'normal';

        if (!in_array(
            $prioridade,
            self::PRIORIDADES,
            true
        )) {
            throw ValidationException::withMessages([
                'prioridade' =>
                'Prioridade da manutenção inválida.',
            ]);
        }

        $veiculo = $this->resolveVeiculo(
            $data['veiculo_id'],
            $tenantId
        );

        $motorista = $this->resolveMotorista(
            $data['motorista_id'] ?? null,
            $tenantId
        );

        $fornecedor = $this->resolveFornecedor(
            $data['fornecedor_id'] ?? null,
            $tenantId
        );

        $plano = $this->resolvePlano(
            $data['plano_id'] ?? null,
            $tenantId
        );

        $checklist = $this->resolveChecklist(
            $data['checklist_record_id']
                ?? null,
            $tenantId
        );

        $sinistro = $this->resolveSinistro(
            $data['sinistro_id'] ?? null,
            $tenantId
        );

        $diagnostico = $this->resolveDiagnostico(
            $data['diagnostico_id'] ?? null,
            $tenantId
        );

        $this->assertOrigem(
            $origem,
            $veiculo,
            $plano,
            $checklist,
            $sinistro,
            $diagnostico
        );

        return DB::transaction(function () use (
            $data,
            $actor,
            $tenantId,
            $origem,
            $prioridade,
            $veiculo,
            $motorista,
            $fornecedor,
            $plano,
            $checklist,
            $sinistro,
            $diagnostico
        ) {
            if (
                $plano &&
                !ManutencaoPlanoVeiculo::query()
                    ->where('tenant_id', $tenantId)
                    ->where(
                        'plano_id',
                        $plano->id
                    )
                    ->where(
                        'veiculo_id',
                        $veiculo->id
                    )
                    ->exists()
            ) {
                $this->planoService
                    ->associarVeiculo(
                        $plano->id,
                        $veiculo->id,
                        [],
                        $actor,
                        $tenantId
                    );
            }

            $manutencao = new Manutencao([
                'veiculo_id' => $veiculo->id,
                'motorista_id' => $motorista?->id,
                'plano_id' => $plano?->id,
                'checklist_record_id' =>
                $checklist?->id,
                'sinistro_id' => $sinistro?->id,
                'fornecedor_id' => $fornecedor?->id,
                'origem' => $origem,
                'tipo_servico' => trim(
                    $data['tipo_servico']
                ),
                'prioridade' => $prioridade,
                'problema_reportado' =>
                $this->nullableTrim(
                    $data['problema_reportado']
                        ?? null
                ),
                'km' => $data['km'] ?? null,
                'data_solicitacao' =>
                $data['data_solicitacao']
                    ?? today()->toDateString(),
                'data_agendada' =>
                $data['data_agendada']
                    ?? null,
                'aprovacao_obrigatoria' =>
                (bool)(
                    $data['aprovacao_obrigatoria'] ?? false
                ),
                'indisponibiliza_veiculo' =>
                (bool)(
                    $data['indisponibiliza_veiculo'] ?? true
                ),
                'valor_orcamento' =>
                array_key_exists(
                    'valor_orcamento',
                    $data
                )
                    ? $this->money(
                        $data['valor_orcamento']
                    )
                    : null,
                'proxima_revisao_km' =>
                $data['proxima_revisao_km'] ?? null,
                'proxima_revisao_data' =>
                $data['proxima_revisao_data'] ?? null,
                'observacoes' =>
                $this->nullableTrim(
                    $data['observacoes']
                        ?? null
                ),
            ]);

            $manutencao->tenant_id = $tenantId;
            $manutencao->numero_ordem =
                $this->generateOrderNumber(
                    $tenantId
                );

            $manutencao->status = 'rascunho';
            $manutencao->custo_pecas = 0;
            $manutencao->custo_mao_obra = 0;
            $manutencao->custo_outros = 0;
            $manutencao->custo_total = 0;
            $manutencao->created_by = $actor->id;
            $manutencao->updated_by = $actor->id;

            $manutencao->save();

            foreach (
                $data['itens'] ?? []
                as $index => $item
            ) {
                $this->createItem(
                    $manutencao,
                    $item,
                    $tenantId,
                    $index
                );
            }

            $this->recalcularCustos(
                $manutencao
            );

            if ($manutencao->km !== null) {
                $this->veiculoOperacaoService
                    ->atualizarKmSeMaior(
                        $veiculo->id,
                        (int)$manutencao->km,
                        $tenantId,
                        'manutencao'
                    );
            }

            if ($diagnostico) {
                $this->diagnosticoService
                    ->vincularManutencao(
                        $diagnostico->id,
                        $manutencao,
                        $tenantId
                    );
            }

            return $this->load(
                $manutencao
            );
        });
    }

    public function update(
        string $id,
        array $data,
        User $actor,
        string $tenantId
    ): Manutencao {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $id,
            $data,
            $actor,
            $tenantId
        ) {
            $manutencao = Manutencao::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->assertEditable(
                $manutencao
            );

            if (array_key_exists(
                'veiculo_id',
                $data
            )) {
                if (
                    $manutencao->status !==
                    'rascunho'
                ) {
                    throw ValidationException::withMessages([
                        'veiculo_id' =>
                        'O veículo só pode ser alterado enquanto a manutenção estiver em rascunho.',
                    ]);
                }

                $manutencao->veiculo_id =
                    $this->resolveVeiculo(
                        $data['veiculo_id'],
                        $tenantId
                    )->id;
            }

            if (array_key_exists(
                'motorista_id',
                $data
            )) {
                $manutencao->motorista_id =
                    $this->resolveMotorista(
                        $data['motorista_id'],
                        $tenantId
                    )?->id;
            }

            if (array_key_exists(
                'fornecedor_id',
                $data
            )) {
                $manutencao->fornecedor_id =
                    $this->resolveFornecedor(
                        $data['fornecedor_id'],
                        $tenantId
                    )?->id;
            }

            if (array_key_exists(
                'plano_id',
                $data
            )) {
                $manutencao->plano_id =
                    $this->resolvePlano(
                        $data['plano_id'],
                        $tenantId
                    )?->id;
            }

            if (array_key_exists(
                'tipo_servico',
                $data
            )) {
                $manutencao->tipo_servico =
                    trim(
                        $data['tipo_servico']
                    );
            }

            if (array_key_exists(
                'prioridade',
                $data
            )) {
                if (!in_array(
                    $data['prioridade'],
                    self::PRIORIDADES,
                    true
                )) {
                    throw ValidationException::withMessages([
                        'prioridade' =>
                        'Prioridade inválida.',
                    ]);
                }

                $manutencao->prioridade =
                    $data['prioridade'];
            }

            foreach (
                [
                    'problema_reportado',
                    'observacoes',
                ] as $field
            ) {
                if (array_key_exists(
                    $field,
                    $data
                )) {
                    $manutencao->{$field} =
                        $this->nullableTrim(
                            $data[$field]
                        );
                }
            }

            foreach (
                [
                    'data_solicitacao',
                    'data_agendada',
                    'proxima_revisao_data',
                ] as $field
            ) {
                if (array_key_exists(
                    $field,
                    $data
                )) {
                    $manutencao->{$field} =
                        $data[$field];
                }
            }

            foreach (
                [
                    'km',
                    'proxima_revisao_km',
                ] as $field
            ) {
                if (array_key_exists(
                    $field,
                    $data
                )) {
                    $manutencao->{$field} =
                        $data[$field];
                }
            }

            foreach (
                [
                    'aprovacao_obrigatoria',
                    'indisponibiliza_veiculo',
                ] as $field
            ) {
                if (array_key_exists(
                    $field,
                    $data
                )) {
                    $manutencao->{$field} =
                        (bool)$data[$field];
                }
            }

            if (array_key_exists(
                'valor_orcamento',
                $data
            )) {
                $novoValor =
                    $data['valor_orcamento'] === null
                    ? null
                    : $this->money(
                        $data['valor_orcamento']
                    );

                $alterouValor =
                    $this->money(
                        $manutencao
                            ->valor_orcamento
                            ?? 0
                    ) !==
                    $this->money(
                        $novoValor ?? 0
                    );

                $manutencao->valor_orcamento =
                    $novoValor;

                if (
                    $alterouValor &&
                    $manutencao->status ===
                    'aprovada'
                ) {
                    if ($alterouValor) {
                        $manutencao
                            ->aprovacoes()
                            ->whereIn(
                                'status',
                                ['pendente', 'aprovada']
                            )
                            ->update([
                                'status' => 'expirada',
                                'updated_at' => now(),
                            ]);

                        if (in_array(
                            $manutencao->status,
                            [
                                'aguardando_aprovacao',
                                'aprovada',
                            ],
                            true
                        )) {
                            $manutencao->status = 'rascunho';
                        }
                    }
                }
            }

            $manutencao->updated_by =
                $actor->id;

            $manutencao->save();

            if ($manutencao->km !== null) {
                $this->veiculoOperacaoService
                    ->atualizarKmSeMaior(
                        $manutencao->veiculo_id,
                        (int)$manutencao->km,
                        $tenantId,
                        'manutencao'
                    );
            }

            return $this->load(
                $manutencao
            );
        });
    }

    public function addItem(
        string $manutencaoId,
        array $data,
        User $actor,
        string $tenantId
    ): ManutencaoItem {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $manutencaoId,
            $data,
            $tenantId
        ) {
            $manutencao = Manutencao::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($manutencaoId)
                ->lockForUpdate()
                ->firstOrFail();

            $this->assertEditable(
                $manutencao
            );

            $item = $this->createItem(
                $manutencao,
                $data,
                $tenantId
            );

            $this->recalcularCustos(
                $manutencao
            );

            return $item->load(
                'peca:id,codigo,nome,unidade,estoque_atual,custo_medio'
            );
        });
    }

    public function updateItem(
        string $manutencaoId,
        string $itemId,
        array $data,
        User $actor,
        string $tenantId
    ): ManutencaoItem {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $manutencaoId,
            $itemId,
            $data,
            $tenantId
        ) {
            $manutencao = Manutencao::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($manutencaoId)
                ->lockForUpdate()
                ->firstOrFail();

            $this->assertEditable(
                $manutencao
            );

            $item = ManutencaoItem::query()
                ->where('tenant_id', $tenantId)
                ->where(
                    'manutencao_id',
                    $manutencao->id
                )
                ->whereKey($itemId)
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $item->movimentosEstoque()
                ->exists()
            ) {
                throw ValidationException::withMessages([
                    'item' =>
                    'O item já possui movimento de estoque e não pode ser alterado.',
                ]);
            }

            $tipo = $data['tipo']
                ?? $item->tipo;

            if (!in_array(
                $tipo,
                self::TIPOS_ITEM,
                true
            )) {
                throw ValidationException::withMessages([
                    'tipo' =>
                    'Tipo de item inválido.',
                ]);
            }

            $peca = $this->resolvePeca(
                array_key_exists(
                    'peca_id',
                    $data
                )
                    ? $data['peca_id']
                    : $item->peca_id,
                $tenantId
            );

            $consomeEstoque =
                array_key_exists(
                    'consome_estoque',
                    $data
                )
                ? (bool)$data['consome_estoque']
                : $item->consome_estoque;

            $this->assertItemEstoque(
                $tipo,
                $peca,
                $consomeEstoque
            );

            $quantidade =
                array_key_exists(
                    'quantidade',
                    $data
                )
                ? (float)$data['quantidade']
                : (float)$item
                    ->quantidade;

            if ($quantidade <= 0) {
                throw ValidationException::withMessages([
                    'quantidade' =>
                    'A quantidade deve ser superior a zero.',
                ]);
            }

            $valorUnitario =
                array_key_exists(
                    'valor_unitario',
                    $data
                )
                ? (float)$data['valor_unitario']
                : (float)$item
                    ->valor_unitario;

            if (
                $tipo === 'peca' &&
                $peca &&
                !array_key_exists(
                    'valor_unitario',
                    $data
                ) &&
                $valorUnitario <= 0
            ) {
                $valorUnitario =
                    (float)$peca->custo_medio;
            }

            if ($valorUnitario < 0) {
                throw ValidationException::withMessages([
                    'valor_unitario' =>
                    'O valor unitário não pode ser negativo.',
                ]);
            }

            $item->tipo = $tipo;
            $item->peca_id = $peca?->id;

            if (array_key_exists(
                'descricao',
                $data
            )) {
                $item->descricao =
                    trim(
                        $data['descricao']
                    );
            } elseif (
                blank($item->descricao) &&
                $peca
            ) {
                $item->descricao =
                    $peca->nome;
            }

            $item->quantidade =
                round($quantidade, 3);

            $item->unidade =
                array_key_exists(
                    'unidade',
                    $data
                )
                ? trim(
                    $data['unidade']
                )
                : $item->unidade;

            $item->valor_unitario =
                round(
                    $valorUnitario,
                    4
                );

            $item->valor_total =
                round(
                    $quantidade *
                        $valorUnitario,
                    2
                );

            $item->consome_estoque =
                $consomeEstoque;

            foreach (
                [
                    'garantia_meses',
                    'garantia_km',
                ] as $field
            ) {
                if (array_key_exists(
                    $field,
                    $data
                )) {
                    $item->{$field} =
                        $data[$field];
                }
            }

            $item->save();

            $this->recalcularCustos(
                $manutencao
            );

            return $item->load(
                'peca:id,codigo,nome,unidade,estoque_atual,custo_medio'
            );
        });
    }

    public function deleteItem(
        string $manutencaoId,
        string $itemId,
        User $actor,
        string $tenantId
    ): void {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        DB::transaction(function () use (
            $manutencaoId,
            $itemId,
            $tenantId
        ) {
            $manutencao = Manutencao::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($manutencaoId)
                ->lockForUpdate()
                ->firstOrFail();

            $this->assertEditable(
                $manutencao
            );

            $item = ManutencaoItem::query()
                ->where('tenant_id', $tenantId)
                ->where(
                    'manutencao_id',
                    $manutencao->id
                )
                ->whereKey($itemId)
                ->firstOrFail();

            if (
                $item->movimentosEstoque()
                ->exists()
            ) {
                throw ValidationException::withMessages([
                    'item' =>
                    'O item possui movimento de estoque e não pode ser eliminado.',
                ]);
            }

            $item->delete();

            $this->recalcularCustos(
                $manutencao
            );
        });
    }

    public function agendar(
        string $id,
        string $data,
        User $actor,
        string $tenantId
    ): Manutencao {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $id,
            $data,
            $actor,
            $tenantId
        ) {
            $manutencao = $this->locked(
                $id,
                $tenantId
            );

            if (!in_array(
                $manutencao->status,
                [
                    'rascunho',
                    'aprovada',
                    'agendada',
                ],
                true
            )) {
                throw ValidationException::withMessages([
                    'status' =>
                    'A manutenção não pode ser agendada no estado atual.',
                ]);
            }


            $this->assertAprovacaoValida(
                $manutencao
            );
            $manutencao->data_agendada =
                $data;

            $manutencao->status =
                'agendada';

            $manutencao->updated_by =
                $actor->id;

            $manutencao->save();

            return $this->load(
                $manutencao
            );
        });
    }

    public function iniciar(
        string $id,
        User $actor,
        string $tenantId
    ): Manutencao {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $id,
            $actor,
            $tenantId
        ) {
            $manutencao = $this->locked(
                $id,
                $tenantId
            );

            if (!in_array(
                $manutencao->status,
                [
                    'rascunho',
                    'aprovada',
                    'agendada',
                ],
                true
            )) {
                throw ValidationException::withMessages([
                    'status' =>
                    'A manutenção não pode ser iniciada no estado atual.',
                ]);
            }

            $this->assertAprovacaoValida(
                $manutencao
            );

            $manutencao->status =
                'em_andamento';

            $manutencao->data_entrada =
                $manutencao->data_entrada
                ?? now();

            $manutencao->updated_by =
                $actor->id;

            $manutencao->save();

            if (
                $manutencao
                ->indisponibiliza_veiculo
            ) {
                $this->veiculoOperacaoService
                    ->indisponibilizarPorManutencao(
                        $manutencao->veiculo_id,
                        $tenantId,
                        "Manutenção {$manutencao->numero_ordem} em andamento."
                    );
            }

            return $this->load(
                $manutencao
            );
        });
    }

    public function aguardarPecas(
        string $id,
        User $actor,
        string $tenantId
    ): Manutencao {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $id,
            $actor,
            $tenantId
        ) {
            $manutencao = $this->locked(
                $id,
                $tenantId
            );

            if (
                $manutencao->status !==
                'em_andamento'
            ) {
                throw ValidationException::withMessages([
                    'status' =>
                    'Apenas uma manutenção em andamento pode ficar aguardando peças.',
                ]);
            }

            $manutencao->status =
                'aguardando_pecas';

            $manutencao->updated_by =
                $actor->id;

            $manutencao->save();

            if (
                $manutencao
                ->indisponibiliza_veiculo
            ) {
                $this->veiculoOperacaoService
                    ->indisponibilizarPorManutencao(
                        $manutencao->veiculo_id,
                        $tenantId,
                        "Manutenção {$manutencao->numero_ordem} aguardando peças."
                    );
            }

            return $this->load(
                $manutencao
            );
        });
    }

    public function retomar(
        string $id,
        User $actor,
        string $tenantId
    ): Manutencao {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $id,
            $actor,
            $tenantId
        ) {
            $manutencao = $this->locked(
                $id,
                $tenantId
            );

            if (
                $manutencao->status !==
                'aguardando_pecas'
            ) {
                throw ValidationException::withMessages([
                    'status' =>
                    'Apenas uma manutenção aguardando peças pode ser retomada.',
                ]);
            }

            $manutencao->status =
                'em_andamento';

            $manutencao->updated_by =
                $actor->id;

            $manutencao->save();

            if (
                $manutencao
                ->indisponibiliza_veiculo
            ) {
                $this->veiculoOperacaoService
                    ->indisponibilizarPorManutencao(
                        $manutencao->veiculo_id,
                        $tenantId,
                        "Manutenção {$manutencao->numero_ordem} em andamento."
                    );
            }

            return $this->load(
                $manutencao
            );
        });
    }

    public function concluir(
        string $id,
        User $actor,
        string $tenantId
    ): Manutencao {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $id,
            $actor,
            $tenantId
        ) {
            $manutencao = Manutencao::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($id)
                ->with([
                    'itens.peca',
                ])
                ->lockForUpdate()
                ->firstOrFail();

            if (!in_array(
                $manutencao->status,
                [
                    'em_andamento',
                    'aguardando_pecas',
                ],
                true
            )) {
                throw ValidationException::withMessages([
                    'status' =>
                    'Apenas uma manutenção em andamento pode ser concluída.',
                ]);
            }

            foreach (
                $manutencao->itens
                as $item
            ) {
                if (
                    !$item->consome_estoque
                ) {
                    continue;
                }

                if (!$item->peca_id) {
                    throw ValidationException::withMessages([
                        'estoque' =>
                        "O item {$item->descricao} está configurado para consumir estoque, mas não possui peça associada.",
                    ]);
                }

                $movimento = EstoqueMovimento::query()
                    ->where('tenant_id', $tenantId)
                    ->where(
                        'manutencao_item_id',
                        $item->id
                    )
                    ->where(
                        'origem',
                        'manutencao'
                    )
                    ->where(
                        'tipo',
                        'saida'
                    )
                    ->first();

                if (!$movimento) {
                    $movimento =
                        $this->estoqueService
                        ->saida(
                            $item->peca_id,
                            (float)$item
                                ->quantidade,
                            $actor,
                            $tenantId,
                            'manutencao',
                            null,
                            $manutencao->id,
                            $item->id,
                            "Consumo na manutenção {$manutencao->numero_ordem}."
                        );
                }

                if (!$item->estoque_consumido_em) {
                    $item->estoque_consumido_em = now();
                    $item->save();
                }

                /*
                 * Para peça retirada do nosso estoque,
                 * o custo real é o custo médio do ledger.
                 */
                $item->valor_unitario =
                    $movimento
                    ->valor_unitario;

                $item->valor_total = round(
                    (float)$item->quantidade *
                        (float)$movimento
                            ->valor_unitario,
                    2
                );

                $item->save();
            }

            $this->recalcularCustos(
                $manutencao
            );

            $manutencao->status =
                'concluida';

            $manutencao->data_conclusao =
                now();

            $manutencao->updated_by =
                $actor->id;

            $manutencao->save();

            if ($manutencao->km !== null) {
                $this->veiculoOperacaoService
                    ->atualizarKmSeMaior(
                        $manutencao->veiculo_id,
                        (int)$manutencao->km,
                        $tenantId,
                        'manutencao'
                    );
            }

            foreach (
                $manutencao->itens()
                    ->get()
                as $item
            ) {
                $this->garantiaService
                    ->criarParaItem(
                        $manutencao,
                        $item,
                        $actor,
                        $tenantId
                    );
            }

            if ($manutencao->plano_id) {
                $this->planoService
                    ->sincronizarConclusao(
                        $manutencao,
                        $actor,
                        $tenantId
                    );
            }

            $this->diagnosticoService
                ->resolverDaManutencao(
                    $manutencao->id,
                    $tenantId
                );

            $this->veiculoOperacaoService
                ->recalcularDisponibilidade(
                    $manutencao->veiculo_id,
                    $tenantId
                );

            return $this->load(
                $manutencao->refresh()
            );
        });
    }

    public function cancelar(
        string $id,
        User $actor,
        string $tenantId,
        ?string $motivo = null
    ): Manutencao {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $id,
            $actor,
            $tenantId,
            $motivo
        ) {
            $manutencao = $this->locked(
                $id,
                $tenantId
            );

            if (
                $manutencao->status ===
                'concluida'
            ) {
                throw ValidationException::withMessages([
                    'status' =>
                    'Uma manutenção concluída não pode ser cancelada.',
                ]);
            }

            if (
                $manutencao->status ===
                'cancelada'
            ) {
                return $this->load(
                    $manutencao
                );
            }

            $manutencao->status =
                'cancelada';

            if (!blank($motivo)) {
                $texto = 'Cancelamento: ' .
                    trim($motivo);

                $manutencao->observacoes =
                    blank(
                        $manutencao
                            ->observacoes
                    )
                    ? $texto
                    : $manutencao
                    ->observacoes .
                    "\n\n" .
                    $texto;
            }

            $manutencao->updated_by =
                $actor->id;

            $manutencao->save();

            $manutencao
                ->aprovacoes()
                ->where(
                    'status',
                    'pendente'
                )
                ->update([
                    'status' => 'expirada',
                    'updated_at' => now(),
                ]);

            $this->veiculoOperacaoService
                ->recalcularDisponibilidade(
                    $manutencao->veiculo_id,
                    $tenantId
                );

            return $this->load(
                $manutencao
            );
        });
    }

    public function delete(
        string $id,
        User $actor,
        string $tenantId
    ): void {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        $manutencao = Manutencao::query()
            ->where('tenant_id', $tenantId)
            ->with('documentos')
            ->findOrFail($id);

        if (
            $manutencao->status !==
            'rascunho'
        ) {
            throw ValidationException::withMessages([
                'manutencao' =>
                'Apenas manutenções em rascunho podem ser eliminadas.',
            ]);
        }

        if (
            $manutencao
            ->movimentosEstoque()
            ->exists()
        ) {
            throw ValidationException::withMessages([
                'manutencao' =>
                'A manutenção possui movimentos de estoque e não pode ser eliminada.',
            ]);
        }

        $paths = $manutencao
            ->documentos
            ->pluck('arquivo_path')
            ->filter()
            ->values()
            ->all();

        DB::transaction(
            fn() => $manutencao->delete()
        );

        foreach ($paths as $path) {
            Storage::disk('local')
                ->delete($path);
        }
    }

    public function createFromChecklist(
        string $checklistId,
        array $data,
        User $actor,
        string $tenantId
    ): Manutencao {
        $checklist = ChecklistRecord::query()
            ->where('tenant_id', $tenantId)
            ->findOrFail($checklistId);

        if (!$checklist->veiculo_id) {
            throw ValidationException::withMessages([
                'checklist' =>
                'O checklist não possui veículo associado.',
            ]);
        }

        return $this->create(
            [
                ...$data,
                'origem' => 'checklist',
                'veiculo_id' =>
                $checklist->veiculo_id,
                'motorista_id' =>
                $data['motorista_id']
                    ?? $checklist->motorista_id,
                'checklist_record_id' =>
                $checklist->id,
                'km' => $data['km']
                    ?? $checklist
                    ->quilometragem,
                'problema_reportado' =>
                $data['problema_reportado']
                    ?? $checklist
                    ->observacoes,
            ],
            $actor,
            $tenantId
        );
    }

    public function createFromSinistro(
        string $sinistroId,
        array $data,
        User $actor,
        string $tenantId
    ): Manutencao {
        $sinistro = Sinistro::query()
            ->where('tenant_id', $tenantId)
            ->findOrFail($sinistroId);

        return $this->create(
            [
                ...$data,
                'origem' => 'sinistro',
                'veiculo_id' =>
                $sinistro->veiculo_id,
                'motorista_id' =>
                $data['motorista_id']
                    ?? $sinistro
                    ->motorista_id,
                'sinistro_id' =>
                $sinistro->id,
                'problema_reportado' =>
                $data['problema_reportado']
                    ?? $sinistro
                    ->descricao,
            ],
            $actor,
            $tenantId
        );
    }

    public function createFromDiagnostico(
        string $diagnosticoId,
        array $data,
        User $actor,
        string $tenantId
    ): Manutencao {
        $diagnostico =
            VeiculoDiagnostico::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->findOrFail(
                $diagnosticoId
            );

        if ($diagnostico->status !== 'aberto') {
            throw ValidationException::withMessages([
                'diagnostico' =>
                'Apenas diagnósticos abertos podem gerar manutenção.',
            ]);
        }

        if ($diagnostico->manutencao_id) {
            return $this->load(
                Manutencao::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->findOrFail(
                        $diagnostico
                            ->manutencao_id
                    )
            );
        }

        return $this->create(
            [
                ...$data,
                'origem' => 'diagnostico',
                'veiculo_id' =>
                $diagnostico
                    ->veiculo_id,
                'diagnostico_id' =>
                $diagnostico->id,
                'prioridade' =>
                $data['prioridade']
                    ?? $this
                    ->prioridadeDiagnostico(
                        $diagnostico
                            ->severidade
                    ),
                'problema_reportado' =>
                $data['problema_reportado']
                    ?? trim(
                        implode(
                            "\n",
                            array_filter([
                                $diagnostico
                                    ->codigo_dtc,
                                $diagnostico
                                    ->titulo,
                                $diagnostico
                                    ->descricao,
                            ])
                        )
                    ),
            ],
            $actor,
            $tenantId
        );
    }

    public function recalcularCustos(
        Manutencao $manutencao
    ): Manutencao {
        $totais = $manutencao
            ->itens()
            ->selectRaw(
                'tipo, COALESCE(SUM(valor_total),0) as total'
            )
            ->groupBy('tipo')
            ->pluck(
                'total',
                'tipo'
            );

        $pecas = $this->money(
            $totais['peca'] ?? 0
        );

        $maoObra = $this->money(
            $totais['mao_obra'] ?? 0
        );

        $outros = $this->money(
            $totais['outro'] ?? 0
        );

        $manutencao->custo_pecas =
            $pecas;

        $manutencao->custo_mao_obra =
            $maoObra;

        $manutencao->custo_outros =
            $outros;

        $manutencao->custo_total =
            $this->money(
                $pecas +
                    $maoObra +
                    $outros
            );

        $manutencao->save();

        return $manutencao;
    }

    private function createItem(
        Manutencao $manutencao,
        array $data,
        string $tenantId,
        ?int $index = null
    ): ManutencaoItem {
        $prefix = $index === null
            ? ''
            : "itens.{$index}.";

        $tipo = $data['tipo'] ?? null;

        if (!in_array(
            $tipo,
            self::TIPOS_ITEM,
            true
        )) {
            throw ValidationException::withMessages([
                "{$prefix}tipo" =>
                'Tipo de item inválido.',
            ]);
        }

        $peca = $this->resolvePeca(
            $data['peca_id'] ?? null,
            $tenantId
        );

        $consomeEstoque = (bool)(
            $data['consome_estoque']
            ?? false
        );

        $this->assertItemEstoque(
            $tipo,
            $peca,
            $consomeEstoque,
            $prefix
        );

        $quantidade = (float)(
            $data['quantidade'] ?? 1
        );

        if ($quantidade <= 0) {
            throw ValidationException::withMessages([
                "{$prefix}quantidade" =>
                'A quantidade deve ser superior a zero.',
            ]);
        }

        $valorUnitario =
            array_key_exists(
                'valor_unitario',
                $data
            )
            ? (float)$data['valor_unitario']
            : (
                $tipo === 'peca' &&
                $peca
                ? (float)$peca
                    ->custo_medio
                : 0
            );

        if ($valorUnitario < 0) {
            throw ValidationException::withMessages([
                "{$prefix}valor_unitario" =>
                'O valor unitário não pode ser negativo.',
            ]);
        }

        $descricao = trim(
            $data['descricao']
                ?? $peca?->nome
                ?? ''
        );

        if (blank($descricao)) {
            throw ValidationException::withMessages([
                "{$prefix}descricao" =>
                'Informe a descrição do item.',
            ]);
        }

        $item = new ManutencaoItem([
            'peca_id' => $peca?->id,
            'tipo' => $tipo,
            'descricao' => $descricao,
            'quantidade' => $quantidade,
            'unidade' => trim(
                $data['unidade']
                    ?? (
                        $tipo === 'mao_obra'
                        ? 'hora'
                        : (
                            $peca?->unidade
                            ?? 'un'
                        )
                    )
            ),
            'valor_unitario' =>
            $valorUnitario,
            'consome_estoque' =>
            $consomeEstoque,
            'garantia_meses' =>
            $data['garantia_meses']
                ?? null,
            'garantia_km' =>
            $data['garantia_km']
                ?? null,
        ]);

        $item->tenant_id = $tenantId;

        $item->manutencao_id =
            $manutencao->id;

        $item->valor_total =
            round(
                $quantidade *
                    $valorUnitario,
                2
            );

        $item->save();

        return $item;
    }

    private function assertItemEstoque(
        string $tipo,
        ?Peca $peca,
        bool $consomeEstoque,
        string $prefix = ''
    ): void {
        if (
            $consomeEstoque &&
            $tipo !== 'peca'
        ) {
            throw ValidationException::withMessages([
                "{$prefix}consome_estoque" =>
                'Apenas itens do tipo peça podem consumir estoque.',
            ]);
        }

        if (
            $consomeEstoque &&
            !$peca
        ) {
            throw ValidationException::withMessages([
                "{$prefix}peca_id" =>
                'Selecione a peça que será retirada do estoque.',
            ]);
        }
    }

    private function assertOrigem(
        string $origem,
        Veiculo $veiculo,
        ?ManutencaoPlano $plano,
        ?ChecklistRecord $checklist,
        ?Sinistro $sinistro,
        ?VeiculoDiagnostico $diagnostico
    ): void {
        if (
            $origem === 'preventiva' &&
            !$plano
        ) {
            throw ValidationException::withMessages([
                'plano_id' =>
                'Manutenção preventiva exige um plano de manutenção.',
            ]);
        }

        if (
            $origem === 'checklist' &&
            !$checklist
        ) {
            throw ValidationException::withMessages([
                'checklist_record_id' =>
                'Informe o checklist que originou a manutenção.',
            ]);
        }

        if (
            $origem === 'sinistro' &&
            !$sinistro
        ) {
            throw ValidationException::withMessages([
                'sinistro_id' =>
                'Informe o sinistro que originou a manutenção.',
            ]);
        }

        if (
            $origem === 'diagnostico' &&
            !$diagnostico
        ) {
            throw ValidationException::withMessages([
                'diagnostico_id' =>
                'Informe o diagnóstico que originou a manutenção.',
            ]);
        }

        if (
            $checklist &&
            $checklist->veiculo_id !==
            $veiculo->id
        ) {
            throw ValidationException::withMessages([
                'checklist_record_id' =>
                'O checklist pertence a outro veículo.',
            ]);
        }

        if (
            $sinistro &&
            $sinistro->veiculo_id !==
            $veiculo->id
        ) {
            throw ValidationException::withMessages([
                'sinistro_id' =>
                'O sinistro pertence a outro veículo.',
            ]);
        }

        if (
            $diagnostico &&
            $diagnostico->veiculo_id !==
            $veiculo->id
        ) {
            throw ValidationException::withMessages([
                'diagnostico_id' =>
                'O diagnóstico pertence a outro veículo.',
            ]);
        }
    }

    private function resolveVeiculo(
        string $id,
        string $tenantId
    ): Veiculo {
        $veiculo = Veiculo::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$veiculo) {
            throw ValidationException::withMessages([
                'veiculo_id' =>
                'O veículo selecionado não pertence a esta organização.',
            ]);
        }

        return $veiculo;
    }

    private function resolveMotorista(
        ?string $id,
        string $tenantId
    ): ?Motorista {
        if (blank($id)) {
            return null;
        }

        $motorista = Motorista::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$motorista) {
            throw ValidationException::withMessages([
                'motorista_id' =>
                'O motorista selecionado não pertence a esta organização.',
            ]);
        }

        return $motorista;
    }

    private function resolveFornecedor(
        ?string $id,
        string $tenantId
    ): ?Fornecedor {
        if (blank($id)) {
            return null;
        }

        $fornecedor = Fornecedor::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$fornecedor) {
            throw ValidationException::withMessages([
                'fornecedor_id' =>
                'O fornecedor selecionado não pertence a esta organização.',
            ]);
        }

        return $fornecedor;
    }

    private function resolvePlano(
        ?string $id,
        string $tenantId
    ): ?ManutencaoPlano {
        if (blank($id)) {
            return null;
        }

        $plano = ManutencaoPlano::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$plano) {
            throw ValidationException::withMessages([
                'plano_id' =>
                'O plano selecionado não pertence a esta organização.',
            ]);
        }

        return $plano;
    }

    private function resolveChecklist(
        ?string $id,
        string $tenantId
    ): ?ChecklistRecord {
        if (blank($id)) {
            return null;
        }

        $checklist = ChecklistRecord::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$checklist) {
            throw ValidationException::withMessages([
                'checklist_record_id' =>
                'O checklist selecionado não pertence a esta organização.',
            ]);
        }

        return $checklist;
    }

    private function resolveSinistro(
        ?string $id,
        string $tenantId
    ): ?Sinistro {
        if (blank($id)) {
            return null;
        }

        $sinistro = Sinistro::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$sinistro) {
            throw ValidationException::withMessages([
                'sinistro_id' =>
                'O sinistro selecionado não pertence a esta organização.',
            ]);
        }

        return $sinistro;
    }

    private function resolveDiagnostico(
        ?string $id,
        string $tenantId
    ): ?VeiculoDiagnostico {
        if (blank($id)) {
            return null;
        }

        $diagnostico =
            VeiculoDiagnostico::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->find($id);

        if (!$diagnostico) {
            throw ValidationException::withMessages([
                'diagnostico_id' =>
                'O diagnóstico selecionado não pertence a esta organização.',
            ]);
        }

        return $diagnostico;
    }

    private function resolvePeca(
        ?string $id,
        string $tenantId
    ): ?Peca {
        if (blank($id)) {
            return null;
        }

        $peca = Peca::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$peca) {
            throw ValidationException::withMessages([
                'peca_id' =>
                'A peça selecionada não pertence a esta organização.',
            ]);
        }

        return $peca;
    }

    private function assertEditable(
        Manutencao $manutencao
    ): void {
        if (in_array(
            $manutencao->status,
            [
                'concluida',
                'cancelada',
            ],
            true
        )) {
            throw ValidationException::withMessages([
                'manutencao' =>
                'Uma manutenção concluída ou cancelada não pode ser alterada.',
            ]);
        }
    }

    private function locked(
        string $id,
        string $tenantId
    ): Manutencao {
        return Manutencao::query()
            ->where('tenant_id', $tenantId)
            ->whereKey($id)
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function generateOrderNumber(
        string $tenantId
    ): string {
        $prefix = 'MAN-' .
            now()->format('Ymd') .
            '-';

        do {
            $numero = $prefix .
                Str::upper(
                    Str::random(6)
                );
        } while (
            Manutencao::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'numero_ordem',
                $numero
            )
            ->exists()
        );

        return $numero;
    }

    private function prioridadeDiagnostico(
        string $severidade
    ): string {
        return match ($severidade) {
            'critica' => 'critica',
            'alta' => 'alta',
            'media' => 'normal',
            default => 'baixa',
        };
    }

    private function money(
        mixed $value
    ): float {
        return round(
            (float)$value,
            2
        );
    }

    private function nullableTrim(
        ?string $value
    ): ?string {
        return blank($value)
            ? null
            : trim($value);
    }

    private function load(
        Manutencao $manutencao
    ): Manutencao {
        return $manutencao->load([
            'veiculo:id,proprietario_id,matricula,marca,modelo,km_atual,disponibilidade',
            'veiculo.proprietario:id,tipo,nome_completo,nome_empresa,user_id',
            'motorista:id,nome_completo,nif,email,user_id',
            'fornecedor:id,tipo,nome,nif,email,telemovel',
            'plano:id,nome,tipo_servico,intervalo_km,intervalo_meses',
            'checklist:id,tipo,estado,quilometragem,data_operacao',
            'sinistro:id,numero_processo,status,data_sinistro',
            'itens.peca:id,codigo,nome,unidade,estoque_atual,estoque_minimo,custo_medio',
            'documentos.createdBy:id,name',
            'aprovacoes.solicitadoPor:id,name',
            'aprovacoes.aprovadoPor:id,name',
            'garantias.peca:id,codigo,nome',
            'garantias.fornecedor:id,nome',
            'diagnosticos:id,manutencao_id,fonte,codigo_dtc,severidade,status,titulo,detectado_em',
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);
    }

    private function assertCanConfigure(
        User $actor,
        string $tenantId
    ): void {
        if (!$this->permissionService->allows(
            $actor,
            'manutencao',
            'configurar',
            $tenantId
        )) {
            abort(
                403,
                'Sem permissão suficiente para gerir manutenções.'
            );
        }
    }
    private function assertAprovacaoValida(
        Manutencao $manutencao
    ): void {
        if (!$manutencao->aprovacao_obrigatoria) {
            return;
        }

        $aprovada = $manutencao
            ->aprovacoes()
            ->where('status', 'aprovada')
            ->where(
                'valor_orcamento',
                $manutencao->valor_orcamento
            )
            ->exists();

        if (!$aprovada) {
            throw ValidationException::withMessages([
                'aprovacao' =>
                'Esta manutenção exige aprovação válida do orçamento.',
            ]);
        }
    }
}
