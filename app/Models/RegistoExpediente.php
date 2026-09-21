<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistoExpediente extends Model
{
    use HasUuids;

    protected $table='registos_expediente';

    protected $fillable=[
        'data_hora',
        'tipo',
        'data_local',
        'origem',
        'ip_address',
        'user_agent',
        'observacoes_correcao',
    ];

    protected function casts(): array
    {
        return [
            'data_hora'=>'datetime',

            'corrigido'=>'boolean',
            'corrigido_em'=>'datetime',
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

    public function corrigidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class,'corrigido_por');
    }
}
