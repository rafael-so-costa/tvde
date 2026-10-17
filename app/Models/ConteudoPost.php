<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConteudoPost extends Model
{
    use HasUuids;

    protected $table='conteudo_posts';

    protected $attributes=[
        'tipo'=>'artigo',
        'status'=>'rascunho',
        'robots'=>'index,follow',
    ];

    protected $fillable=[
        'categoria_id',
        'tipo',
        'titulo',
        'slug',
        'resumo',
        'conteudo',
        'imagem_destaque_path',
        'imagem_capa_path',
        'status',
        'publicado_em',
        'seo_title',
        'seo_description',
        'canonical_url',
        'og_image_path',
        'robots',
    ];

    protected $appends=[
        'tempo_leitura',
        'numero_palavras',
    ];

    protected function casts(): array
    {
        return [
            'publicado_em'=>'datetime',
        ];
    }

    /*
     * Mantido por compatibilidade com dados antigos.
     */
    public function categoria(): BelongsTo
    {
        return $this->belongsTo(
            ConteudoCategoria::class,
            'categoria_id'
        );
    }

    public function categorias(): BelongsToMany
    {
        return $this->belongsToMany(
            ConteudoCategoria::class,
            'conteudo_post_categoria',
            'post_id',
            'categoria_id'
        );
    }

    public function autor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'autor_id'
        );
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(
            ConteudoTag::class,
            'conteudo_post_tag',
            'post_id',
            'tag_id'
        );
    }

    public function analyticsEventos(): HasMany
    {
        return $this->hasMany(
            AnalyticsEvento::class,
            'content_post_id'
        );
    }

    public function scopePublicados(
        Builder $query
    ): Builder {
        return $query
            ->where(
                'status',
                'publicado'
            )
            ->whereNotNull(
                'publicado_em'
            )
            ->where(
                'publicado_em',
                '<=',
                now()
            );
    }

    public function getNumeroPalavrasAttribute(): int
    {
        return str_word_count(
            strip_tags(
                (string)$this->conteudo
            )
        );
    }

    public function getTempoLeituraAttribute(): int
    {
        return max(
            1,
            (int)ceil(
                $this->numero_palavras / 220
            )
        );
    }
}