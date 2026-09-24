<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ManutencaoPlano extends Model
{
    use HasUuids;
protected $table='manutencao_planos';
    protected $attributes=[
        'alerta_antecedencia_km'=>0,
        'alerta_antecedencia_dias'=>0,
        'ativo'=>true,
    ];

    protected $fillable=[
        'nome',
        'tipo_servico',
        'descricao',
        'intervalo_km',
        'intervalo_meses',
        'alerta_antecedencia_km',
        'alerta_antecedencia_dias',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'intervalo_km'=>'integer',
            'intervalo_meses'=>'integer',
            'alerta_antecedencia_km'=>'integer',
            'alerta_antecedencia_dias'=>'integer',
            'ativo'=>'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function veiculos(): HasMany
    {
        return $this->hasMany(
            ManutencaoPlanoVeiculo::class,
            'plano_id'
        );
    }

    public function manutencoes(): HasMany
    {
        return $this->hasMany(
            Manutencao::class,
            'plano_id'
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
