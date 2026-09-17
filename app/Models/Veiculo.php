<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Veiculo extends Model
{
    use HasUuids;

    protected $attributes = [
        'fotos_galeria' => '[]',
        'ativo' => true,
        'status_cadastro' => 'pendente',
    ];

    protected $fillable = [
        'proprietario_id',
        'matricula',
        'data_matricula',
        'marca',
        'modelo',
        'chassi',
        'cilindrada',
        'potencia',
        'combustivel',
        'lugares',
        'portas',
        'cor',
        'carta_verde',
        'carta_verde_valid_until',
        'inspecao_tvde',
        'inspecao_tvde_valid_until',
        'uber_valid_until',
        'bolt_valid_until',
        'extintor_valid_until',
        'foto_principal_url',
        'fotos_galeria',
        'valor_caucao',
        'valor_aluguel',
        'via_verde',
    ];

    protected function casts(): array
    {
        return [
            'data_matricula' => 'date',
            'carta_verde_valid_until' => 'date',
            'inspecao_tvde_valid_until' => 'date',
            'uber_valid_until' => 'date',
            'bolt_valid_until' => 'date',
            'extintor_valid_until' => 'date',
            'fotos_galeria' => 'array',
            'valor_caucao' => 'decimal:2',
            'valor_aluguel' => 'decimal:2',
            'cilindrada' => 'integer',
            'potencia' => 'integer',
            'lugares' => 'integer',
            'portas' => 'integer',
            'ativo' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function proprietario(): BelongsTo
    {
        return $this->belongsTo(Proprietario::class);
    }

    public function setMatriculaAttribute(?string $value): void
    {
        $this->attributes['matricula'] = mb_strtoupper(
            trim((string) $value)
        );
    }

    public function cadastroCompleto(): bool
    {
        foreach ([
            'matricula',
            'marca',
            'modelo',
            'cor',
            'chassi',
            'data_matricula',
            'carta_verde',
            'carta_verde_valid_until',
            'inspecao_tvde',
            'inspecao_tvde_valid_until',
            'proprietario_id',
        ] as $campo) {
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
