<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Motorista extends Model
{
    use HasUuids;

    protected $attributes = [
        'filhos' => 0,
        'fotos_galeria' => '[]',
        'documentos_upload' => '[]',
        'ativo' => true,
        'status_cadastro' => 'pendente',
    ];

    protected $fillable = [
        'nome_completo',
        'data_nascimento',
        'filhos',
        'estado_civil',
        'tipo_documento',
        'numero_documento',
        'documento_valid_until',
        'carta_numero',
        'carta_valid_until',
        'registo_criminal_valid_until',
        'nif',
        'email',
        'telemovel',
        'endereco',
        'endereco_rua',
        'endereco_numero',
        'endereco_complemento',
        'endereco_cidade',
        'endereco_cep',
        'iban',
        'foto_perfil_url',
        'fotos_galeria',
        'bolt_email',
        'bolt_telemovel',
        'uber_email',
        'uber_telemovel',
        'certificado_tvde',
        'certificado_tvde_valid_until',
        'cartao_frota',
        'contato_urgencia_nome',
        'contato_urgencia_telemovel',
        'documentos_upload',
    ];

    protected function casts(): array
    {
        return [
            'data_nascimento' => 'date',
            'filhos' => 'integer',
            'documento_valid_until' => 'date',
            'carta_valid_until' => 'date',
            'registo_criminal_valid_until' => 'date',
            'certificado_tvde_valid_until' => 'date',
            'fotos_galeria' => 'array',
            'documentos_upload' => 'array',
            'ativo' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cadastroCompleto(): bool
    {
        foreach (
            [
                'nome_completo',
                'nif',
                'email',
                'telemovel',
                'data_nascimento',
                'endereco_rua',
                'endereco_cidade',
                'endereco_cep',
                'tipo_documento',
                'numero_documento',
                'documento_valid_until',
                'carta_numero',
                'carta_valid_until',
                'registo_criminal_valid_until',
            ] as $campo
        ) {
            if (blank($this->getAttribute($campo))) {
                return false;
            }
        }

        return true;
    }

    public function sincronizarCadastro(): void
    {
        if (!$this->cadastroCompleto()) {
            $this->status_cadastro = 'incompleto';
            $this->ativo = false;

            return;
        }

        $this->status_cadastro = 'ativo';
        $this->ativo = true;
    }
    public function checklists(): HasMany
    {
        return $this->hasMany(
            ChecklistRecord::class
        );
    }
    public function registosCriminais(): HasMany
    {
        return $this->hasMany(
            RegistoCriminal::class
        );
    }
    public function recibosVerdes(): HasMany
    {
        return $this->hasMany(
            ReciboVerde::class
        );
    }
    public function registosExpediente(): HasMany
    {
        return $this->hasMany(RegistoExpediente::class);
    }
    public function multas(): HasMany
    {
        return $this->hasMany(Multa::class);
    }
    public function sinistros(): HasMany
    {
        return $this->hasMany(
            Sinistro::class
        );
    }
    public function manutencoes(): HasMany
    {
        return $this->hasMany(
            Manutencao::class
        );
    }
}
