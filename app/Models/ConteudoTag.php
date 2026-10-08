<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ConteudoTag extends Model
{
    use HasUuids;

    protected $table='conteudo_tags';

    protected $fillable=['nome','slug'];

    public function posts(): BelongsToMany
    {
        return $this->belongsToMany(
            ConteudoPost::class,
            'conteudo_post_tag',
            'tag_id',
            'post_id'
        );
    }
}
