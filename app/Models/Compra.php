<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Compra extends Model
{
    use HasUuids;
protected $table='compras';
    protected $attributes=[
        'status'=>'rascunho',
        'subtotal'=>0,
        'impostos'=>0,
        'total'=>0,
    ];

    protected $fillable=[
        'fornecedor_id',
        'numero_documento',
        'status',
        'data_encomenda',
        'data_prevista',
        'data_recebimento',
        'impostos',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'data_encomenda'=>'date:Y-m-d',
            'data_prevista'=>'date:Y-m-d',
            'data_recebimento'=>'date:Y-m-d',
            'subtotal'=>'decimal:2',
            'impostos'=>'decimal:2',
            'total'=>'decimal:2',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Fornecedor::class);
    }

    public function itens(): HasMany
    {
        return $this->hasMany(CompraItem::class);
    }

    public function movimentosEstoque(): HasMany
    {
        return $this->hasMany(
            EstoqueMovimento::class
        );
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'updated_by'
        );
    }
}
