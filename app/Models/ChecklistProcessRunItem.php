<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChecklistProcessRunItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'codigo',
        'ordem',
        'titulo_snapshot',
        'descricao_snapshot',
        'tipo',
        'obrigatorio',
        'configuracao_snapshot',
        'status',
        'resultado',
        'concluido_por',
        'concluido_em',
    ];

    protected $attributes = [
        'ordem' => 0,
        'obrigatorio' => true,
        'configuracao_snapshot' => '{}',
        'status' => 'pendente',
    ];

    protected function casts(): array
    {
        return [
            'ordem' =>
                'integer',

            'obrigatorio' =>
                'boolean',

            'configuracao_snapshot' =>
                'array',

            'resultado' =>
                'array',

            'concluido_em' =>
                'datetime',
        ];
    }

    public function run(): BelongsTo
    {
        return $this->belongsTo(
            ChecklistProcessRun::class,
            'run_id'
        );
    }

    public function templateItem(): BelongsTo
    {
        return $this->belongsTo(
            ChecklistProcessTemplateItem::class,
            'template_item_id'
        );
    }

    public function concluidoPor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'concluido_por'
        );
    }
}
