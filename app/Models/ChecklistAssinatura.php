<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChecklistAssinatura extends Model
{
    use HasUuids;

    protected $table=
        'checklist_assinaturas';

    protected $fillable=[
        'papel',
        'modo',
        'signatario_nome',
        'signatario_email',
        'assinatura_path',
        'token_verificacao',
        'codigo_otp',
        'otp_expira_em',
        'status',
        'verificado',
        'solicitado_por',
        'solicitado_em',
        'assinado_em',
        'ip_address',
        'user_agent',
    ];

    protected $hidden=[
        'codigo_otp',
        'token_verificacao',
    ];

    protected function casts():array
    {
        return[
            'verificado'=>
                'boolean',

            'otp_expira_em'=>
                'datetime',

            'solicitado_em'=>
                'datetime',

            'assinado_em'=>
                'datetime',
        ];
    }

    public function checklist():BelongsTo
    {
        return $this->belongsTo(
            ChecklistRecord::class,
            'checklist_record_id'
        );
    }

    public function tenant():BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }
}