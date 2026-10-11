<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChecklistProcessTemplate extends Model
{
    use HasUuids;

    protected $fillable = [
        'codigo',
        'nome',
        'descricao',
        'ativo',
        'versao',
    ];

    protected $attributes = [
        'ativo' => true,
        'versao' => 1,
    ];

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
            'versao' => 'integer',
            'preset_versao' => 'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(
            ChecklistProcessTemplateItem::class,
            'template_id'
        )->orderBy('ordem');
    }

    public function documentTemplates(): HasMany
    {
        return $this->hasMany(
            TemplateContrato::class,
            'checklist_process_template_id'
        );
    }

    public function runs(): HasMany
    {
        return $this->hasMany(
            ChecklistProcessRun::class,
            'template_id'
        );
    }

    public function originadoDePresetFrotaPro(): bool
    {
        return $this->preset_codigo !== null;
    }
}