<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistoCriminal extends Model
{
    use HasUuids;

    protected $table='registos_criminais';

    protected $attributes=[
        'status'=>'pendente_validacao',
    ];

    protected $fillable=[
        'motorista_id',
        'codigo_consulta',
        'data_emissao',
        'data_validade',
        'dados_extraidos',
    ];

    protected $appends=[
        'situacao_validade',
        'dias_restantes',
    ];

    protected function casts(): array
    {
        return [
            'data_emissao'=>'date',
            'data_validade'=>'date',
            'dados_extraidos'=>'array',
            'validado_em'=>'datetime',
            'rejeitado_em'=>'datetime',
            'arquivo_tamanho'=>'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function motorista(): BelongsTo
    {
        return $this->belongsTo(Motorista::class);
    }

    public function enviadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class,'enviado_por');
    }

    public function validadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class,'validado_por');
    }

    public function rejeitadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class,'rejeitado_por');
    }

    public function getSituacaoValidadeAttribute(): string
    {
        if($this->data_validade->lt(today())){
            return 'expirado';
        }

        if($this->data_validade->lte(today()->addDays(30))){
            return 'a_expirar';
        }

        return 'valido';
    }

    public function getDiasRestantesAttribute(): int
    {
        return (int) today()->diffInDays(
            $this->data_validade,
            false
        );
    }
}
