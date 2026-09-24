<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VeiculoDiagnostico extends Model
{
    use HasUuids;
    protected $table = 'veiculo_diagnosticos';
    protected $attributes = [
        'fonte' => 'manual',
        'severidade' => 'info',
        'status' => 'aberto',
    ];

    protected $fillable = [
        'veiculo_id',
        'fonte',
        'external_id',
        'codigo_dtc',
        'severidade',
        'titulo',
        'descricao',
        'dados_brutos',
        'detectado_em',
    ];

    protected function casts(): array
    {
        return [
            'dados_brutos' => 'array',
            'detectado_em' => 'datetime',
            'resolvido_em' => 'datetime',
            'gerou_manutencao_em' => 'datetime',
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

    public function manutencao(): BelongsTo
    {
        return $this->belongsTo(Manutencao::class);
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
        return $this->belongsTo(User::class, 'updated_by');
    }
}
