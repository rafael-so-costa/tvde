<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManutencaoPlanoVeiculo extends Model
{
    use HasUuids;
protected $table='manutencao_plano_veiculos';
    protected $attributes=[
        'ativo'=>true,
    ];

    protected $fillable=[
        'plano_id',
        'veiculo_id',
        'ultimo_km',
        'ultima_data',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'ultimo_km'=>'integer',
            'ultima_data'=>'date:Y-m-d',
            'proximo_km'=>'integer',
            'proxima_data'=>'date:Y-m-d',
            'ativo'=>'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plano(): BelongsTo
    {
        return $this->belongsTo(
            ManutencaoPlano::class,
            'plano_id'
        );
    }

    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class);
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
