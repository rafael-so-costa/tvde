<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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
        'status',
        'publicado_em',
        'seo_title',
        'seo_description',
        'canonical_url',
        'og_image_path',
        'robots',
    ];

    protected function casts(): array
    {
        return ['publicado_em'=>'datetime'];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(ConteudoCategoria::class,'categoria_id');
    }

    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class,'autor_id');
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

    public function scopePublicados(Builder $query): Builder
    {
        return $query
            ->where('status','publicado')
            ->whereNotNull('publicado_em')
            ->where('publicado_em','<=',now());
    }

    public function getTempoLeituraAttribute(): int
    {
        $palavras=str_word_count(strip_tags((string)$this->conteudo));

        return max(1,(int)ceil($palavras/220));
    }
}
