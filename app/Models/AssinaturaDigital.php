<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssinaturaDigital extends Model
{
    use HasUuids;

    protected $table = 'assinaturas_digitais';

    public $timestamps = false;

    protected $attributes = [
        'verificado' => false,
        'status' => 'pendente',
    ];

    protected $fillable = [
        'signatario_tipo',
        'signatario_id',
        'signatario_user_id',
        'signatario_nome',
        'signatario_email',
        'assinatura_url',
        'ip_address',
        'user_agent',
        'hash_documento',
        'token_verificacao',
        'codigo_otp',
        'otp_expira_em',
        'status',
        'solicitado_por',
        'solicitado_em',
        'placeholder',
    ];

    protected $hidden = [
        'codigo_otp',
        'token_verificacao',
    ];

    protected function casts(): array
    {
        return [
            'verificado' => 'boolean',
            'otp_expira_em' => 'datetime',
            'assinado_em' => 'datetime',
            'solicitado_em' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function contrato(): BelongsTo
    {
        return $this->belongsTo(Contrato::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
