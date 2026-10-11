<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContratoRelacao extends Model
{
    use HasUuids;

    protected $table = 'contrato_relacoes';

    protected $fillable = [
        'contrato_origem_id',
        'contrato_relacionado_id',
        'process_run_item_id',
        'tipo_contrato_codigo_snapshot',
        'status_conclusao',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }

    public function contratoOrigem(): BelongsTo
    {
        return $this->belongsTo(
            Contrato::class,
            'contrato_origem_id'
        );
    }

    public function contratoRelacionado(): BelongsTo
    {
        return $this->belongsTo(
            Contrato::class,
            'contrato_relacionado_id'
        );
    }

    public function processRunItem(): BelongsTo
    {
        return $this->belongsTo(
            ChecklistProcessRunItem::class,
            'process_run_item_id'
        );
    }

    public function criador(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }
}
