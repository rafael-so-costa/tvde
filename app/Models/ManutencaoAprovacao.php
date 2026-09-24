<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManutencaoAprovacao extends Model
{
    use HasUuids;

    protected $table='manutencao_aprovacoes';

    protected $attributes=[
        'status'=>'pendente',
    ];

    protected $fillable=[
        'aprovador_nome',
        'aprovador_email',
        'observacoes',
    ];

    protected $hidden=[
        'token_hash',
    ];

    protected function casts(): array
    {
        return [
            'valor_orcamento'=>'decimal:2',
            'expires_at'=>'datetime',
            'respondido_em'=>'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function manutencao(): BelongsTo
    {
        return $this->belongsTo(Manutencao::class);
    }

    public function solicitadoPor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'solicitado_por'
        );
    }

    public function aprovadoPor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'aprovado_por'
        );
    }
}
