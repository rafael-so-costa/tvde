<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModeloDocumentoSaasVersao extends Model
{
    use HasUuids;

    protected $table =
        'modelo_documento_saas_versoes';

    protected $fillable = [
        'modelo_documento_saas_id',
        'versao',
        'conteudo_original',
        'conteudo_parametrizado',
        'campos_detectados',
        'campos_mapeados',
        'entidades_requeridas',
        'assinaturas_requeridas',
        'checksum',
        'juridicamente_revisto',
        'publicado_em',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'campos_detectados' => 'array',
            'campos_mapeados' => 'array',
            'entidades_requeridas' => 'array',
            'assinaturas_requeridas' => 'array',

            'juridicamente_revisto' =>
                'boolean',

            'publicado_em' => 'datetime',
        ];
    }

    public function modelo(): BelongsTo
    {
        return $this->belongsTo(
            ModeloDocumentoSaas::class,
            'modelo_documento_saas_id'
        );
    }

    public function templatesTenant(): HasMany
    {
        return $this->hasMany(
            TemplateContrato::class,
            'modelo_documento_saas_versao_id'
        );
    }
}
