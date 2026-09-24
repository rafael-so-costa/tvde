<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Manutencao extends Model
{
    use HasUuids;

    protected $table='manutencoes';

    protected $attributes=[
        'origem'=>'manual',
        'prioridade'=>'normal',
        'status'=>'rascunho',
        'aprovacao_obrigatoria'=>false,
        'indisponibiliza_veiculo'=>true,
        'custo_pecas'=>0,
        'custo_mao_obra'=>0,
        'custo_outros'=>0,
        'custo_total'=>0,
    ];

    protected $fillable=[
        'veiculo_id',
        'motorista_id',
        'plano_id',
        'checklist_record_id',
        'sinistro_id',
        'fornecedor_id',
        'origem',
        'tipo_servico',
        'prioridade',
        'problema_reportado',
        'km',
        'data_solicitacao',
        'data_agendada',
        'aprovacao_obrigatoria',
        'indisponibiliza_veiculo',
        'valor_orcamento',
        'proxima_revisao_km',
        'proxima_revisao_data',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'km'=>'integer',
            'data_solicitacao'=>'date:Y-m-d',
            'data_agendada'=>'date:Y-m-d',
            'data_entrada'=>'datetime',
            'data_conclusao'=>'datetime',
            'aprovacao_obrigatoria'=>'boolean',
            'indisponibiliza_veiculo'=>'boolean',
            'valor_orcamento'=>'decimal:2',
            'custo_pecas'=>'decimal:2',
            'custo_mao_obra'=>'decimal:2',
            'custo_outros'=>'decimal:2',
            'custo_total'=>'decimal:2',
            'proxima_revisao_km'=>'integer',
            'proxima_revisao_data'=>'date:Y-m-d',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class);
    }

    public function motorista(): BelongsTo
    {
        return $this->belongsTo(Motorista::class);
    }

    public function plano(): BelongsTo
    {
        return $this->belongsTo(
            ManutencaoPlano::class,
            'plano_id'
        );
    }

    public function checklist(): BelongsTo
    {
        return $this->belongsTo(
            ChecklistRecord::class,
            'checklist_record_id'
        );
    }

    public function sinistro(): BelongsTo
    {
        return $this->belongsTo(Sinistro::class);
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Fornecedor::class);
    }

    public function itens(): HasMany
    {
        return $this->hasMany(
            ManutencaoItem::class
        )->orderBy('created_at');
    }

    public function documentos(): HasMany
    {
        return $this->hasMany(
            ManutencaoDocumento::class
        )->orderBy('created_at');
    }

    public function aprovacoes(): HasMany
    {
        return $this->hasMany(
            ManutencaoAprovacao::class
        )->orderByDesc('created_at');
    }

    public function garantias(): HasMany
    {
        return $this->hasMany(
            ManutencaoGarantia::class
        )->orderByDesc('created_at');
    }

    public function movimentosEstoque(): HasMany
    {
        return $this->hasMany(
            EstoqueMovimento::class
        );
    }

    public function diagnosticos(): HasMany
    {
        return $this->hasMany(
            VeiculoDiagnostico::class
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
