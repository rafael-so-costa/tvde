<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManutencaoDocumento extends Model
{
    use HasUuids;
protected $table='manutencao_documentos';
    protected $attributes=[
        'processamento_status'=>'pendente',
    ];

    protected $fillable=[
        'tipo',
    ];

    protected function casts(): array
    {
        return [
            'arquivo_tamanho'=>'integer',
            'dados_extraidos'=>'array',
            'processado_em'=>'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
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
}
