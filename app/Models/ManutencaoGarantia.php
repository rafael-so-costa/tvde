<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManutencaoGarantia extends Model
{
    use HasUuids;
protected $table='manutencao_garantias';
    protected $attributes=[
        'status'=>'ativa',
    ];

    protected $fillable=[
        'manutencao_item_id',
        'peca_id',
        'fornecedor_id',
        'descricao',
        'data_inicio',
        'data_fim',
        'km_limite',
        'status',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'data_inicio'=>'date:Y-m-d',
            'data_fim'=>'date:Y-m-d',
            'km_limite'=>'integer',
            'utilizada_em'=>'datetime',
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

    public function item(): BelongsTo
    {
        return $this->belongsTo(
            ManutencaoItem::class,
            'manutencao_item_id'
        );
    }

    public function peca(): BelongsTo
    {
        return $this->belongsTo(Peca::class);
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Fornecedor::class);
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
