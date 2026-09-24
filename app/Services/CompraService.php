<?php

namespace App\Services;

use App\Models\Compra;
use App\Models\CompraItem;
use App\Models\Fornecedor;
use App\Models\Peca;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompraService
{
    public function __construct(
        private PermissionService $permissionService,
        private EstoqueService $estoqueService
    ) {}

    public function create(
        array $data,
        User $actor,
        string $tenantId
    ): Compra {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        $fornecedor = $this->resolveFornecedor(
            $data['fornecedor_id'] ?? null,
            $tenantId
        );

        $itens = $data['itens'] ?? [];

        if (empty($itens)) {
            throw ValidationException::withMessages([
                'itens' =>
                'A compra deve possuir pelo menos um item.',
            ]);
        }

        return DB::transaction(function () use (
            $data,
            $actor,
            $tenantId,
            $fornecedor,
            $itens
        ) {
            $compra = new Compra([
                'fornecedor_id' => $fornecedor?->id,
                'numero_documento' =>
                $this->nullableTrim(
                    $data['numero_documento']
                        ?? null
                ),
                'status' => $data['status']
                    ?? 'rascunho',
                'data_encomenda' =>
                $data['data_encomenda']
                    ?? null,
                'data_prevista' =>
                $data['data_prevista']
                    ?? null,
                'impostos' =>
                round(
                    (float)($data['impostos'] ?? 0),
                    2
                ),
                'observacoes' =>
                $this->nullableTrim(
                    $data['observacoes']
                        ?? null
                ),
            ]);

            if (!in_array(
                $compra->status,
                ['rascunho', 'encomendada'],
                true
            )) {
                throw ValidationException::withMessages([
                    'status' =>
                    'Uma nova compra deve iniciar como rascunho ou encomendada.',
                ]);
            }

            $compra->tenant_id = $tenantId;
            $compra->created_by = $actor->id;
            $compra->updated_by = $actor->id;

            $compra->subtotal = 0;
            $compra->total = 0;

            $compra->save();

            $subtotal = 0;

            foreach ($itens as $index => $dataItem) {
                $item = $this->createItem(
                    $compra,
                    $dataItem,
                    $tenantId,
                    $index
                );

                $subtotal +=
                    (float)$item->valor_total;
            }

            $compra->subtotal =
                round($subtotal, 2);

            $compra->total =
                round(
                    $subtotal +
                        (float)$compra->impostos,
                    2
                );

            $compra->save();

            return $this->load($compra);
        });
    }

    public function update(
        string $id,
        array $data,
        User $actor,
        string $tenantId
    ): Compra {
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
            $compra = Compra::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($compra->status !== 'rascunho') {
                throw ValidationException::withMessages([
                    'compra' =>
                    'Apenas compras em rascunho podem ser alteradas.',
                ]);
            }

            if (array_key_exists(
                'fornecedor_id',
                $data
            )) {
                $compra->fornecedor_id =
                    $this->resolveFornecedor(
                        $data['fornecedor_id'],
                        $tenantId
                    )?->id;
            }

            foreach (
                [
                    'numero_documento',
                    'data_encomenda',
                    'data_prevista',
                    'observacoes',
                ] as $field
            ) {
                if (!array_key_exists($field, $data)) {
                    continue;
                }

                $compra->{$field} =
                    in_array($field, [
                        'numero_documento',
                        'observacoes',
                    ], true)
                    ? $this->nullableTrim(
                        $data[$field]
                    )
                    : $data[$field];
            }

            if (array_key_exists(
                'impostos',
                $data
            )) {
                $compra->impostos = round(
                    (float)$data['impostos'],
                    2
                );
            }

            if (array_key_exists('itens', $data)) {
                $compra->itens()->delete();

                foreach (
                    $data['itens'] ?? []
                    as $index => $item
                ) {
                    $this->createItem(
                        $compra,
                        $item,
                        $tenantId,
                        $index
                    );
                }
            }

            $subtotal = (float)$compra
                ->itens()
                ->sum('valor_total');

            $compra->subtotal =
                round($subtotal, 2);

            $compra->total =
                round(
                    $subtotal +
                        (float)$compra->impostos,
                    2
                );

            $compra->updated_by = $actor->id;
            $compra->save();

            return $this->load($compra);
        });
    }

    public function encomendar(
        string $id,
        User $actor,
        string $tenantId
    ): Compra {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $id,
            $actor,
            $tenantId
        ) {
            $compra = Compra::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($compra->status !== 'rascunho') {
                throw ValidationException::withMessages([
                    'status' =>
                    'Apenas compras em rascunho podem ser encomendadas.',
                ]);
            }

            if (!$compra->itens()->exists()) {
                throw ValidationException::withMessages([
                    'itens' =>
                    'A compra não possui itens.',
                ]);
            }

            $compra->status = 'encomendada';

            $compra->data_encomenda =
                $compra->data_encomenda
                ?? now()->toDateString();

            $compra->updated_by = $actor->id;
            $compra->save();

            return $this->load($compra);
        });
    }

    public function receber(
        string $id,
        array $recebimentos,
        User $actor,
        string $tenantId
    ): Compra {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        if (empty($recebimentos)) {
            throw ValidationException::withMessages([
                'itens' =>
                'Informe os itens recebidos.',
            ]);
        }

        return DB::transaction(function () use (
            $id,
            $recebimentos,
            $actor,
            $tenantId
        ) {
            $compra = Compra::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if (!in_array(
                $compra->status,
                [
                    'encomendada',
                    'parcialmente_recebida',
                ],
                true
            )) {
                throw ValidationException::withMessages([
                    'status' =>
                    'Esta compra não pode receber mercadoria no estado atual.',
                ]);
            }

            foreach (
                $recebimentos
                as $index => $recebimento
            ) {
                $itemId =
                    $recebimento['item_id']
                    ?? null;

                $quantidade =
                    (float)(
                        $recebimento['quantidade']
                        ?? 0
                    );

                if (blank($itemId)) {
                    throw ValidationException::withMessages([
                        "itens.{$index}.item_id" =>
                        'Informe o item da compra.',
                    ]);
                }

                if ($quantidade <= 0) {
                    throw ValidationException::withMessages([
                        "itens.{$index}.quantidade" =>
                        'A quantidade recebida deve ser superior a zero.',
                    ]);
                }

                $item = CompraItem::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        'compra_id',
                        $compra->id
                    )
                    ->whereKey($itemId)
                    ->lockForUpdate()
                    ->first();

                if (!$item) {
                    throw ValidationException::withMessages([
                        "itens.{$index}.item_id" =>
                        'O item não pertence a esta compra.',
                    ]);
                }

                $jaRecebido =
                    (float)$item->quantidade_recebida;

                $encomendado =
                    (float)$item->quantidade;

                if (
                    $jaRecebido +
                    $quantidade >
                    $encomendado + 0.0001
                ) {
                    throw ValidationException::withMessages([
                        "itens.{$index}.quantidade" =>
                        'A quantidade recebida ultrapassa a quantidade encomendada.',
                    ]);
                }

                if ($item->peca_id) {
                    $this->estoqueService->entrada(
                        $item->peca_id,
                        $quantidade,
                        (float)$item->valor_unitario,
                        $actor,
                        $tenantId,
                        'compra',
                        $compra->id,
                        null,
                        null,
                        "Recebimento da compra {$compra->numero_documento}.",
                        true,
                        $item->id
                    );
                }

                $item->quantidade_recebida =
                    round(
                        $jaRecebido +
                            $quantidade,
                        3
                    );

                $item->save();
            }

            $pendentes = $compra
                ->itens()
                ->whereColumn(
                    'quantidade_recebida',
                    '<',
                    'quantidade'
                )
                ->exists();

            if ($pendentes) {
                $compra->status =
                    'parcialmente_recebida';
            } else {
                $compra->status = 'recebida';

                $compra->data_recebimento =
                    now()->toDateString();
            }

            $compra->updated_by = $actor->id;
            $compra->save();

            return $this->load($compra);
        });
    }

    public function cancel(
        string $id,
        User $actor,
        string $tenantId
    ): Compra {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $id,
            $actor,
            $tenantId
        ) {
            $compra = Compra::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if (in_array(
                $compra->status,
                [
                    'parcialmente_recebida',
                    'recebida',
                ],
                true
            )) {
                throw ValidationException::withMessages([
                    'status' =>
                    'Uma compra com mercadoria recebida não pode ser cancelada.',
                ]);
            }

            if ($compra->status === 'cancelada') {
                throw ValidationException::withMessages([
                    'status' =>
                    'A compra já está cancelada.',
                ]);
            }

            $compra->status = 'cancelada';
            $compra->updated_by = $actor->id;
            $compra->save();

            return $this->load($compra);
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

        $compra = Compra::query()
            ->where('tenant_id', $tenantId)
            ->findOrFail($id);

        if ($compra->status !== 'rascunho') {
            throw ValidationException::withMessages([
                'compra' =>
                'Apenas compras em rascunho podem ser eliminadas.',
            ]);
        }

        if ($compra->movimentosEstoque()->exists()) {
            throw ValidationException::withMessages([
                'compra' =>
                'A compra possui movimentos de estoque e não pode ser eliminada.',
            ]);
        }

        $compra->delete();
    }

    private function createItem(
        Compra $compra,
        array $data,
        string $tenantId,
        int $index
    ): CompraItem {
        $quantidade = (float)(
            $data['quantidade'] ?? 0
        );

        $valorUnitario = (float)(
            $data['valor_unitario'] ?? 0
        );

        if ($quantidade <= 0) {
            throw ValidationException::withMessages([
                "itens.{$index}.quantidade" =>
                'A quantidade deve ser superior a zero.',
            ]);
        }

        if ($valorUnitario < 0) {
            throw ValidationException::withMessages([
                "itens.{$index}.valor_unitario" =>
                'O valor unitário não pode ser negativo.',
            ]);
        }

        $peca = $this->resolvePeca(
            $data['peca_id'] ?? null,
            $tenantId
        );

        $descricao = trim(
            $data['descricao']
                ?? $peca?->nome
                ?? ''
        );

        if (blank($descricao)) {
            throw ValidationException::withMessages([
                "itens.{$index}.descricao" =>
                'Informe a descrição do item.',
            ]);
        }

        $item = new CompraItem([
            'peca_id' => $peca?->id,
            'descricao' => $descricao,
            'quantidade' => $quantidade,
            'valor_unitario' => $valorUnitario,
        ]);

        $item->tenant_id = $tenantId;
        $item->compra_id = $compra->id;
        $item->quantidade_recebida = 0;

        $item->valor_total = round(
            $quantidade * $valorUnitario,
            2
        );

        $item->save();

        return $item;
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

    private function load(
        Compra $compra
    ): Compra {
        return $compra->load([
            'fornecedor:id,nome,nif,tipo',
            'itens.peca:id,codigo,nome,unidade,estoque_atual,custo_medio',
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);
    }

    private function nullableTrim(
        ?string $value
    ): ?string {
        return blank($value)
            ? null
            : trim($value);
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
                'Sem permissão suficiente para gerir compras.'
            );
        }
    }
}
