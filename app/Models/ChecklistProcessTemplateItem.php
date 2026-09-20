<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChecklistProcessTemplateItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'codigo',
        'ordem',
        'titulo',
        'descricao',
        'tipo',
        'obrigatorio',
        'configuracao',
    ];

    protected $attributes = [
        'ordem' => 0,
        'obrigatorio' => true,
        'configuracao' => '{}',
    ];

    protected function casts(): array
    {
        return [
            'ordem' => 'integer',
            'obrigatorio' => 'boolean',
            'configuracao' => 'array',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(
            ChecklistProcessTemplate::class,
            'template_id'
        );
    }
}
