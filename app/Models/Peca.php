<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Peca extends Model
{
    use HasUuids;
protected $table='pecas';
    protected $attributes=[
        'unidade'=>'un',
        'estoque_atual'=>0,
        'estoque_minimo'=>0,
        'custo_medio'=>0,
        'ativo'=>true,
    ];

    protected $fillable=[
        'fornecedor_preferencial_id',
        'codigo',
        'nome',
        'fabricante',
        'unidade',
        'estoque_minimo',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'estoque_atual'=>'decimal:3',
            'estoque_minimo'=>'decimal:3',
            'custo_medio'=>'decimal:4',
            'ativo'=>'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function fornecedorPreferencial(): BelongsTo
    {
        return $this->belongsTo(
            Fornecedor::class,
            'fornecedor_preferencial_id'
        );
    }

    public function compraItens(): HasMany
    {
        return $this->hasMany(CompraItem::class);
    }

    public function manutencaoItens(): HasMany
    {
        return $this->hasMany(
            ManutencaoItem::class
        );
    }

    public function movimentosEstoque(): HasMany
    {
        return $this->hasMany(
            EstoqueMovimento::class
        );
    }

    public function garantias(): HasMany
    {
        return $this->hasMany(
            ManutencaoGarantia::class
        );
    }
}
