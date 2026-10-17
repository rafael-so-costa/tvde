<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConteudoBusca extends Model
{
    use HasUuids;

    protected $table='conteudo_buscas';

    protected $fillable=[
        'termo',
        'termo_normalizado',
        'total_buscas',
        'buscas_sem_resultado',
        'ultimo_resultado_count',
        'conteudo_post_id',
        'pauta_criada_em',
        'primeira_busca_em',
        'ultima_busca_em',
    ];

    protected function casts(): array
    {
        return [
            'total_buscas'=>'integer',
            'buscas_sem_resultado'=>'integer',
            'ultimo_resultado_count'=>'integer',
            'pauta_criada_em'=>'datetime',
            'primeira_busca_em'=>'datetime',
            'ultima_busca_em'=>'datetime',
        ];
    }

    public function pauta(): BelongsTo
    {
        return $this->belongsTo(
            ConteudoPost::class,
            'conteudo_post_id'
        );
    }
}