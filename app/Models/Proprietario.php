<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Proprietario extends Model
{
    use HasUuids;

    protected $attributes = [
        'filhos' => 0,
        'fotos_galeria' => '[]',
        'ativo' => true,
        'status_cadastro' => 'pendente',
    ];

    protected $fillable = [
        'tipo',
        'nome_completo',
        'data_nascimento',
        'filhos',
        'estado_civil',
        'tipo_documento',
        'numero_documento',
        'documento_valid_until',
        'nome_empresa',
        'nif',
        'iban',
        'certidao_permanente',
        'certidao_valid_until',
        'certificado_tvde',
        'certificado_tvde_valid_until',
        'capital_social',
        'nome_gerente',
        'email',
        'telemovel',
        'endereco',
        'endereco_rua',
        'endereco_numero',
        'endereco_complemento',
        'endereco_cidade',
        'endereco_cep',
        'foto_perfil_url',
        'fotos_galeria',
        'cartao_frota',
    ];

    protected function casts(): array
    {
        return [
            'data_nascimento' => 'date',
            'documento_valid_until' => 'date',
            'certidao_valid_until' => 'date',
            'certificado_tvde_valid_until' => 'date',
            'capital_social' => 'decimal:2',
            'filhos' => 'integer',
            'fotos_galeria' => 'array',
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
        $campos = [
            'nif',
            'email',
            'telemovel',
            'endereco_rua',
            'endereco_cidade',
            'endereco_cep',
        ];

        if ($this->tipo === 'empresa') {
            $campos = array_merge($campos, [
                'nome_empresa',
                'nome_gerente',
                'certidao_permanente',
                'certidao_valid_until',
                'certificado_tvde',
                'certificado_tvde_valid_until',
            ]);
        }

        if ($this->tipo === 'pessoa_fisica') {
            $campos = array_merge($campos, [
                'nome_completo',
                'data_nascimento',
                'tipo_documento',
                'numero_documento',
                'documento_valid_until',
            ]);
        }

        foreach ($campos as $campo) {
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
}
