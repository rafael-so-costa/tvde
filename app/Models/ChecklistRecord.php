<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ChecklistRecord extends Model
{
    use HasUuids;

    protected $attributes=[
        'penalizacao_total'=>0,
        'itens'=>'{}',
        'campos_especiais'=>'{}',
        'danos'=>'[]',
        'itens_faltantes'=>'{}',
        'novos_danos'=>'[]',
        'media'=>'{}',
        'estado'=>'rascunho',
        'origem'=>'manual',
    ];

    protected $fillable=[
        'contrato_id',
        'process_run_item_id',
        'tipo',
        'origem',
        'motorista_id',
        'veiculo_id',
        'entrega_vinculada_id',
        'data_operacao',
        'hora_operacao',
        'quilometragem',
        'nivel_combustivel',
        'penalizacao_total',
        'itens',
        'campos_especiais',
        'danos',
        'itens_faltantes',
        'novos_danos',
        'media',
        'metadados_seguranca',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'data_operacao'=>'date',
            'quilometragem'=>'integer',
            'penalizacao_total'=>'decimal:2',
            'itens'=>'array',
            'campos_especiais'=>'array',
            'danos'=>'array',
            'itens_faltantes'=>'array',
            'novos_danos'=>'array',
            'media'=>'array',
            'metadados_seguranca'=>'array',
            'finalizado_em'=>'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function contrato(): BelongsTo
    {
        return $this->belongsTo(Contrato::class);
    }

    public function processRunItem(): BelongsTo
    {
        return $this->belongsTo(
            ChecklistProcessRunItem::class,
            'process_run_item_id'
        );
    }

    public function motorista(): BelongsTo
    {
        return $this->belongsTo(Motorista::class);
    }

    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class);
    }

    public function entregaVinculada(): BelongsTo
    {
        return $this->belongsTo(
            self::class,
            'entrega_vinculada_id'
        );
    }

    public function recolha(): HasOne
    {
        return $this->hasOne(
            self::class,
            'entrega_vinculada_id'
        );
    }

    public function realizadoPor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'realizado_por'
        );
    }

    public function mediaFiles(): HasMany
    {
        return $this->hasMany(
            ChecklistMedia::class,
            'checklist_record_id'
        )->orderBy('created_at');
    }

    public function aluguerEntrega(): HasOne
    {
        return $this->hasOne(
            Aluguer::class,
            'checklist_entrega_id'
        );
    }

    public function aluguerDevolucao(): HasOne
    {
        return $this->hasOne(
            Aluguer::class,
            'checklist_devolucao_id'
        );
    }

    public function manutencoes(): HasMany
    {
        return $this->hasMany(
            Manutencao::class,
            'checklist_record_id'
        );
    }
}
