<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TemplateContrato extends Model
{
    use HasUuids;

    protected $table = 'templates_contrato';

    protected $attributes = [
        'tipo_arquivo' => 'pdf',
        'campos_detectados' => '[]',
        'campos_mapeados' => '{}',
    ];

    protected $fillable = [
        'perfil_id',
        'nome',
        'arquivo_url',
        'tipo_arquivo',
        'conteudo_original',
        'campos_detectados',
        'campos_mapeados',
    ];

    protected function casts(): array
    {
        return [
            'campos_detectados' => 'array',
            'campos_mapeados' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function perfil(): BelongsTo
    {
        return $this->belongsTo(
            PerfilTemplate::class,
            'perfil_id'
        );
    }

    public function contratos(): HasMany
    {
        return $this->hasMany(
            Contrato::class,
            'template_id'
        );
    }
}
