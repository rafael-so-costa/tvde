<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CompraItem extends Model
{
    use HasUuids;
    protected $table = 'compra_itens';
    protected $attributes = [
        'quantidade_recebida' => 0,
        'valor_unitario' => 0,
        'valor_total' => 0,
    ];

    protected $fillable = [
        'peca_id',
        'descricao',
        'quantidade',
        'valor_unitario',
    ];

    protected function casts(): array
    {
        return [
            'quantidade' => 'decimal:3',
            'quantidade_recebida' => 'decimal:3',
            'valor_unitario' => 'decimal:4',
            'valor_total' => 'decimal:2',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function compra(): BelongsTo
    {
        return $this->belongsTo(Compra::class);
    }

    public function peca(): BelongsTo
    {
        return $this->belongsTo(Peca::class);
    }
    public function movimentosEstoque(): HasMany
    {
        return $this->hasMany(
            EstoqueMovimento::class,
            'compra_item_id'
        );
    }
}
