<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

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
        'privacidade_contacto_email',
        'privacidade_contacto_telefone',
        'privacidade_epd_nome',
        'privacidade_epd_email',
        'privacidade_destinatarios',
        'privacidade_subcontratantes',
        'privacidade_prazo_identificacao',
        'privacidade_prazo_contratos',
        'privacidade_prazo_fiscal',
        'privacidade_prazo_operacional',
        'privacidade_prazo_consentimentos',
        'privacidade_prazo_localizacao',
        'privacidade_transferencias_internacionais',
        'privacidade_decisoes_automatizadas',
        'privacidade_finalidade_localizacao',
        'privacidade_finalidade_dados_especiais',
        'privacidade_categorias_dados_especiais',
        'privacidade_condicao_artigo9',
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

    protected function logoUrl(): Attribute
    {
        return Attribute::make(
            get: function (?string $value): ?string {
                if (blank($value)) {
                    return null;
                }

                if (
                    Str::startsWith(
                        $value,
                        ['http://', 'https://']
                    )
                ) {
                    return $value;
                }

                if (
                    ! Str::startsWith(
                        $value,
                        'empresas/'
                    ) ||
                    blank($this->id)
                ) {
                    return null;
                }

                return route(
                    'empresas.logo',
                    ['id' => $this->id]
                );
            },
            set: fn ($value) => $value
        );
    }
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
