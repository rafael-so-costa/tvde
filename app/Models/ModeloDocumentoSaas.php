<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModeloDocumentoSaas extends Model
{
    use HasUuids;

    protected $table =
        'modelos_documento_saas';

    protected $fillable = [
        'categoria_id',
        'nome',
        'slug',
        'resumo',
        'descricao',
        'tipo_documento',
        'pais',
        'idioma',
        'conteudo',
        'conteudo_parametrizado',
        'campos_detectados',
        'campos_mapeados',
        'entidades_requeridas',
        'assinaturas_requeridas',
        'warnings',
        'status',
        'versao',
        'versao_publicada',
        'tecnicamente_validado',
        'juridicamente_revisto',
        'destaque',
        'ativo',
        'ordem',
        'publicado_em',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'campos_detectados' => 'array',
            'campos_mapeados' => 'array',
            'entidades_requeridas' => 'array',
            'assinaturas_requeridas' => 'array',
            'warnings' => 'array',

            'tecnicamente_validado' =>
                'boolean',

            'juridicamente_revisto' =>
                'boolean',

            'destaque' => 'boolean',
            'ativo' => 'boolean',
            'ordem' => 'integer',
            'publicado_em' => 'datetime',
        ];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(
            ModeloDocumentoSaasCategoria::class,
            'categoria_id'
        );
    }

    public function versoes(): HasMany
    {
        return $this->hasMany(
            ModeloDocumentoSaasVersao::class,
            'modelo_documento_saas_id'
        );
    }

    public function templatesTenant(): HasMany
    {
        return $this->hasMany(
            TemplateContrato::class,
            'modelo_documento_saas_id'
        );
    }

    public function isPublicado(): bool
    {
        return
            $this->status ===
            'publicado' &&
            $this->ativo &&
            $this->versao_publicada !== null;
    }
}
