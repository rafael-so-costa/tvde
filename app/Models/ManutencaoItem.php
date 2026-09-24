<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ManutencaoItem extends Model
{
    use HasUuids;
protected $table='manutencao_itens';
    protected $attributes=[
        'quantidade'=>1,
        'unidade'=>'un',
        'valor_unitario'=>0,
        'valor_total'=>0,
        'consome_estoque'=>false,
    ];

    protected $fillable=[
        'peca_id',
        'tipo',
        'descricao',
        'quantidade',
        'unidade',
        'valor_unitario',
        'consome_estoque',
        'garantia_meses',
        'garantia_km',
    ];

    protected function casts(): array
    {
        return [
            'quantidade'=>'decimal:3',
            'valor_unitario'=>'decimal:4',
            'valor_total'=>'decimal:2',
            'consome_estoque'=>'boolean',
            'garantia_meses'=>'integer',
            'garantia_km'=>'integer',
            'estoque_consumido_em'=>'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function manutencao(): BelongsTo
    {
        return $this->belongsTo(Manutencao::class);
    }

    public function peca(): BelongsTo
    {
        return $this->belongsTo(Peca::class);
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
