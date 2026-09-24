<?php

namespace App\Services;

use App\Models\EstoqueMovimento;
use App\Models\Peca;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EstoqueService
{
    private const TIPOS=[
        'entrada',
        'saida',
        'ajuste_entrada',
        'ajuste_saida',
    ];

    private const ORIGENS=[
        'compra',
        'manutencao',
        'ajuste',
        'devolucao',
    ];

    public function entrada(
        string $pecaId,
        float $quantidade,
        float $valorUnitario,
        User $actor,
        string $tenantId,
        string $origem='ajuste',
        ?string $compraId=null,
        ?string $manutencaoId=null,
        ?string $manutencaoItemId=null,
        ?string $observacoes=null,
        bool $recalcularCustoMedio=true,
        ?string $compraItemId=null
    ): EstoqueMovimento {
        return $this->movimentar(
            $pecaId,
            'entrada',
            $origem,
            $quantidade,
            $valorUnitario,
            $actor,
            $tenantId,
            $compraId,
            $manutencaoId,
            $manutencaoItemId,
            $observacoes,
            $recalcularCustoMedio,
            $compraItemId
        );
    }

    public function saida(
        string $pecaId,
        float $quantidade,
        User $actor,
        string $tenantId,
        string $origem='manutencao',
        ?string $compraId=null,
        ?string $manutencaoId=null,
        ?string $manutencaoItemId=null,
        ?string $observacoes=null,
        ?string $compraItemId=null
    ): EstoqueMovimento {
        return $this->movimentar(
            $pecaId,
            'saida',
            $origem,
            $quantidade,
            0,
            $actor,
            $tenantId,
            $compraId,
            $manutencaoId,
            $manutencaoItemId,
            $observacoes,
            false,
            $compraItemId
        );
    }

    public function ajustar(
        string $pecaId,
        float $novoSaldo,
        User $actor,
        string $tenantId,
        ?string $observacoes=null
    ): ?EstoqueMovimento {
        if($novoSaldo<0){
            throw ValidationException::withMessages([
                'estoque'=>'O estoque não pode ficar negativo.',
            ]);
        }

        return DB::transaction(function() use(
            $pecaId,
            $novoSaldo,
            $actor,
            $tenantId,
            $observacoes
        ){
            $peca=Peca::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($pecaId)
                ->lockForUpdate()
                ->firstOrFail();

            $atual=(float)$peca->estoque_atual;

            if(abs($novoSaldo-$atual)<0.0001){
                return null;
            }

            $tipo=$novoSaldo>$atual
                ? 'ajuste_entrada'
                : 'ajuste_saida';

            $quantidade=abs(
                $novoSaldo-$atual
            );

            return $this->registrarMovimento(
                $peca,
                $tipo,
                'ajuste',
                $quantidade,
                (float)$peca->custo_medio,
                $actor,
                $tenantId,
                null,
                null,
                null,
                $observacoes,
                false,
                null
            );
        });
    }

    private function movimentar(
        string $pecaId,
        string $tipo,
        string $origem,
        float $quantidade,
        float $valorUnitario,
        User $actor,
        string $tenantId,
        ?string $compraId,
        ?string $manutencaoId,
        ?string $manutencaoItemId,
        ?string $observacoes,
        bool $recalcularCustoMedio,
        ?string $compraItemId
    ): EstoqueMovimento {
        if(!in_array(
            $tipo,
            self::TIPOS,
            true
        )){
            throw ValidationException::withMessages([
                'tipo'=>'Tipo de movimento inválido.',
            ]);
        }

        if(!in_array(
            $origem,
            self::ORIGENS,
            true
        )){
            throw ValidationException::withMessages([
                'origem'=>'Origem do movimento inválida.',
            ]);
        }

        if($quantidade<=0){
            throw ValidationException::withMessages([
                'quantidade'=>
                    'A quantidade deve ser superior a zero.',
            ]);
        }

        if($valorUnitario<0){
            throw ValidationException::withMessages([
                'valor_unitario'=>
                    'O valor unitário não pode ser negativo.',
            ]);
        }

        return DB::transaction(function() use(
            $pecaId,
            $tipo,
            $origem,
            $quantidade,
            $valorUnitario,
            $actor,
            $tenantId,
            $compraId,
            $manutencaoId,
            $manutencaoItemId,
            $observacoes,
            $recalcularCustoMedio,
            $compraItemId
        ){
            $peca=Peca::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($pecaId)
                ->lockForUpdate()
                ->firstOrFail();

            return $this->registrarMovimento(
                $peca,
                $tipo,
                $origem,
                $quantidade,
                $valorUnitario,
                $actor,
                $tenantId,
                $compraId,
                $manutencaoId,
                $manutencaoItemId,
                $observacoes,
                $recalcularCustoMedio,
                $compraItemId
            );
        });
    }

    private function registrarMovimento(
        Peca $peca,
        string $tipo,
        string $origem,
        float $quantidade,
        float $valorUnitario,
        User $actor,
        string $tenantId,
        ?string $compraId,
        ?string $manutencaoId,
        ?string $manutencaoItemId,
        ?string $observacoes,
        bool $recalcularCustoMedio,
        ?string $compraItemId
    ): EstoqueMovimento {
        $entrada=in_array(
            $tipo,
            [
                'entrada',
                'ajuste_entrada',
            ],
            true
        );

        if(
            !$entrada &&
            $valorUnitario<=0
        ){
            $valorUnitario=
                (float)$peca->custo_medio;
        }

        $saldoAnterior=
            (float)$peca->estoque_atual;

        $saldoPosterior=$entrada
            ? $saldoAnterior+$quantidade
            : $saldoAnterior-$quantidade;

        if($saldoPosterior<0){
            throw ValidationException::withMessages([
                'estoque'=>
                    "Estoque insuficiente para a peça {$peca->nome}.",
            ]);
        }

        if(
            $entrada &&
            $recalcularCustoMedio &&
            $valorUnitario>=0
        ){
            $valorEstoqueAnterior=
                $saldoAnterior*
                (float)$peca->custo_medio;

            $valorEntrada=
                $quantidade*
                $valorUnitario;

            $peca->custo_medio=
                $saldoPosterior>0
                    ? round(
                        (
                            $valorEstoqueAnterior+
                            $valorEntrada
                        )/$saldoPosterior,
                        4
                    )
                    : 0;
        }

        $peca->estoque_atual=
            round(
                $saldoPosterior,
                3
            );

        $peca->save();

        $movimento=
            new EstoqueMovimento();

        $movimento->tenant_id=
            $tenantId;

        $movimento->peca_id=
            $peca->id;

        $movimento->tipo=
            $tipo;

        $movimento->origem=
            $origem;

        $movimento->quantidade=
            round(
                $quantidade,
                3
            );

        $movimento->valor_unitario=
            round(
                $valorUnitario,
                4
            );

        $movimento->saldo_anterior=
            round(
                $saldoAnterior,
                3
            );

        $movimento->saldo_posterior=
            round(
                $saldoPosterior,
                3
            );

        $movimento->compra_id=
            $compraId;

        $movimento->compra_item_id=
            $compraItemId;

        $movimento->manutencao_id=
            $manutencaoId;

        $movimento->manutencao_item_id=
            $manutencaoItemId;

        $movimento->observacoes=
            blank($observacoes)
                ? null
                : trim($observacoes);

        $movimento->created_by=
            $actor->id;

        $movimento->save();

        return $movimento->load(
            'peca:id,codigo,nome,unidade,estoque_atual,custo_medio'
        );
    }
}
