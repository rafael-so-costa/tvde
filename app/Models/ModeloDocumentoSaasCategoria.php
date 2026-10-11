<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModeloDocumentoSaasCategoria extends Model
{
    use HasUuids;

    protected $table =
        'modelo_documento_saas_categorias';

    protected $fillable = [
        'nome',
        'slug',
        'descricao',
        'ordem',
        'ativo',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'ordem' => 'integer',
            'ativo' => 'boolean',
        ];
    }

    public function modelos(): HasMany
    {
        return $this->hasMany(
            ModeloDocumentoSaas::class,
            'categoria_id'
        );
    }
}
