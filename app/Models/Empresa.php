<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Empresa extends Model
{
    use HasUuids;

    protected $attributes = [
        'ativo' => true,
        'status_cadastro' => 'pendente',
    ];

    protected $fillable = [
        'nome_empresa',
        'nif',
        'email',
        'telemovel',
        'nome_gerente',
        'endereco_rua',
        'endereco_numero',
        'endereco_complemento',
        'endereco_cep',
        'endereco_cidade',
        'iban',
        'capital_social',
        'certificado_tvde',
        'certificado_tvde_valid_until',
        'logo_url',
        'ativo',
        'status_cadastro',
    ];

    protected function casts(): array
    {
        return [
            'capital_social' => 'decimal:2',
            'certificado_tvde_valid_until' => 'date',
            'ativo' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
    public function recibosVerdes(): HasMany
    {
        return $this->hasMany(
            ReciboVerde::class
        );
    }
}
