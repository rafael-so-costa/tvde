<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstoqueMovimento extends Model
{
    use HasUuids;
    protected $table = 'estoque_movimentos';
    protected $fillable = [];

    protected function casts(): array
    {
        return [
            'quantidade' => 'decimal:3',
            'valor_unitario' => 'decimal:4',
            'saldo_anterior' => 'decimal:3',
            'saldo_posterior' => 'decimal:3',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function peca(): BelongsTo
    {
        return $this->belongsTo(Peca::class);
    }

    public function compra(): BelongsTo
    {
        return $this->belongsTo(Compra::class);
    }
    public function compraItem(): BelongsTo
    {
        return $this->belongsTo(
            CompraItem::class,
            'compra_item_id'
        );
    }

    public function manutencao(): BelongsTo
    {
        return $this->belongsTo(Manutencao::class);
    }

    public function manutencaoItem(): BelongsTo
    {
        return $this->belongsTo(
            ManutencaoItem::class,
            'manutencao_item_id'
        );
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }
}
