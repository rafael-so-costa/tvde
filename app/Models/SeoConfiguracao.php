<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeoConfiguracao extends Model
{
    use HasUuids;

    protected $table='seo_configuracoes';

    protected $fillable=[
        'chave',
        'titulo',
        'descricao',
        'canonical_url',
        'robots',
        'og_title',
        'og_description',
        'og_image_path',
        'favicon_path',
        'social_image_path',
        'twitter_card',
        'schema_type',
        'configuracao',
    ];

    protected function casts(): array
    {
        return [
            'configuracao'=>'array',
        ];
    }

    public function atualizadoPor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'updated_by'
        );
    }
}