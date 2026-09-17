<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VersaoContrato extends Model
{
    use HasUuids;

    protected $table = 'versoes_contrato';

    public $timestamps = false;

    protected $fillable = [
        'versao_numero',
        'dados_campos',
        'criado_por',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'versao_numero' => 'integer',
            'dados_campos' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function contrato(): BelongsTo
    {
        return $this->belongsTo(
            Contrato::class,
            'contrato_id'
        );
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
