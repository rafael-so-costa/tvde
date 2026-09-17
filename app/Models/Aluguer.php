<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Aluguer extends Model
{
    use HasUuids;

    protected $table = 'alugueres';

    protected $attributes = [
        'status' => 'rascunho',
        'rascunho_passo' => 1,
        'rascunho_dados' => '{}',
        'devolucao_dias_atraso' => 0,
        'devolucao_valor_dia' => 0,
        'devolucao_multa_atraso' => 0,
        'devolucao_multas_adicionais' => '[]',
        'devolucao_penalizacoes_checklist' => 0,
        'devolucao_total_pagar' => 0,
        'devolucao_declaracao_aceite' => false,
    ];

    protected $fillable = [
        'motorista_id',
        'veiculo_id',
        'proprietario_id',
        'contrato_aluguer_id',
        'contrato_prestacao_id',
        'checklist_entrega_id',
        'checklist_devolucao_id',
        'data_inicio',
        'data_fim',
        'rascunho_passo',
        'rascunho_dados',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'data_inicio' => 'date',
            'data_fim' => 'date',
            'data_finalizacao' => 'datetime',
            'rascunho_passo' => 'integer',
            'rascunho_dados' => 'array',
            'devolucao_dias_atraso' => 'integer',
            'devolucao_valor_dia' => 'decimal:2',
            'devolucao_multa_atraso' => 'decimal:2',
            'devolucao_multas_adicionais' => 'array',
            'devolucao_penalizacoes_checklist' => 'decimal:2',
            'devolucao_total_pagar' => 'decimal:2',
            'devolucao_declaracao_aceite' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function motorista(): BelongsTo
    {
        return $this->belongsTo(Motorista::class);
    }

    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class);
    }

    public function proprietario(): BelongsTo
    {
        return $this->belongsTo(Proprietario::class);
    }
}
