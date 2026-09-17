<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contrato extends Model
{
    use HasUuids;

    protected $attributes = [
        'status' => 'rascunho',
        'renovacao_count' => 0,
        'campos_preenchidos' => '{}',
        'versao_atual' => 1,
        'bloqueado' => false,
    ];

    protected $fillable = [
        'template_id',
        'tipo',
        'proprietario_id',
        'motorista_id',
        'veiculo_id',
        'data_inicio',
        'data_fim',
        'valor_diaria',
        'valor_caucao',
        'valor_total',
        'campos_preenchidos',
    ];

    protected function casts(): array
    {
        return [
            'data_inicio' => 'date',
            'data_fim' => 'date',
            'data_assinatura' => 'datetime',
            'valor_diaria' => 'decimal:2',
            'valor_semanal' => 'decimal:2',
            'valor_caucao' => 'decimal:2',
            'valor_total' => 'decimal:2',
            'renovacao_count' => 'integer',
            'campos_preenchidos' => 'array',
            'versao_atual' => 'integer',
            'bloqueado' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(
            TemplateContrato::class,
            'template_id'
        );
    }

    public function motorista(): BelongsTo
    {
        return $this->belongsTo(Motorista::class);
    }

    public function proprietario(): BelongsTo
    {
        return $this->belongsTo(Proprietario::class);
    }

    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class);
    }

    public function contratoPai(): BelongsTo
    {
        return $this->belongsTo(
            self::class,
            'contrato_pai_id'
        );
    }

    public function renovacoes(): HasMany
    {
        return $this->hasMany(
            self::class,
            'contrato_pai_id'
        );
    }

    public function versoes(): HasMany
    {
        return $this->hasMany(
            VersaoContrato::class,
            'contrato_id'
        );
    }

    public function assinaturas(): HasMany
    {
        return $this->hasMany(
            AssinaturaDigital::class,
            'contrato_id'
        );
    }

    public function logsAuditoria(): HasMany
    {
        return $this->hasMany(
            LogAuditoriaContrato::class,
            'contrato_id'
        );
    }

    public function atribuicoesVeiculo(): HasMany
    {
        return $this->hasMany(
            ContratoAtivoVeiculo::class,
            'contrato_id'
        );
    }
}
