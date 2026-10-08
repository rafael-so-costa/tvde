<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TipoContrato extends Model
{
    use HasUuids;

    protected $table='tipos_contrato';

    protected $attributes=[
        'entidades'=>'{}',
        'campos_configuracao'=>'[]',
        'assinaturas_configuracao'=>'[]',
        'configuracao'=>'{}',
        'ativo'=>true,
        'mostrar_menu'=>true,
        'ordem'=>0,
    ];

    protected $fillable=[
        'nome',
        'slug',
        'codigo',
        'descricao',
        'template_id',
        'checklist_process_template_id',
        'entidades',
        'campos_configuracao',
        'assinaturas_configuracao',
        'configuracao',
        'ativo',
        'mostrar_menu',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'entidades'=>'array',
            'campos_configuracao'=>'array',
            'assinaturas_configuracao'=>'array',
            'configuracao'=>'array',
            'ativo'=>'boolean',
            'mostrar_menu'=>'boolean',
            'ordem'=>'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(TemplateContrato::class);
    }

    public function checklistProcessTemplate(): BelongsTo
    {
        return $this->belongsTo(ChecklistProcessTemplate::class);
    }

    public function contratos(): HasMany
    {
        return $this->hasMany(Contrato::class);
    }

    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class,'created_by');
    }

    public function atualizador(): BelongsTo
    {
        return $this->belongsTo(User::class,'updated_by');
    }
}
