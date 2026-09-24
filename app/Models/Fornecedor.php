<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Fornecedor extends Model
{
    use HasUuids;

    // app/Models/Fornecedor.php
protected $table='fornecedores';

    protected $attributes=[
        'tipo'=>'geral',
        'ativo'=>true,
    ];

    protected $fillable=[
        'tipo',
        'nome',
        'nif',
        'email',
        'telemovel',
        'morada',
        'contacto_responsavel',
        'observacoes',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'ativo'=>'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function pecasPreferenciais(): HasMany
    {
        return $this->hasMany(
            Peca::class,
            'fornecedor_preferencial_id'
        );
    }

    public function compras(): HasMany
    {
        return $this->hasMany(Compra::class);
    }

    public function manutencoes(): HasMany
    {
        return $this->hasMany(Manutencao::class);
    }

    public function garantias(): HasMany
    {
        return $this->hasMany(
            ManutencaoGarantia::class
        );
    }
}
