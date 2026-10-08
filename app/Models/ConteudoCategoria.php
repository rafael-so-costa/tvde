<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConteudoCategoria extends Model
{
    use HasUuids;

    protected $table='conteudo_categorias';

    protected $fillable=[
        'nome',
        'slug',
        'descricao',
        'ativo',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'ativo'=>'boolean',
            'ordem'=>'integer',
        ];
    }

    public function posts(): HasMany
    {
        return $this->hasMany(ConteudoPost::class,'categoria_id');
    }
}
