<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChecklistProcessRun extends Model
{
    use HasUuids;

    protected $fillable = [
        'template_codigo_snapshot',
        'template_nome_snapshot',
        'template_versao_snapshot',
        'entidade_tipo',
        'entidade_id',
        'status',
        'contexto',
        'iniciado_em',
        'concluido_em',
    ];

    protected $attributes = [
        'status' => 'pendente',
        'contexto' => '{}',
    ];

    protected function casts(): array
    {
        return [
            'template_versao_snapshot' =>
                'integer',

            'contexto' =>
                'array',

            'iniciado_em' =>
                'datetime',

            'concluido_em' =>
                'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(
            ChecklistProcessTemplate::class,
            'template_id'
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(
            ChecklistProcessRunItem::class,
            'run_id'
        )->orderBy('ordem');
    }
}
