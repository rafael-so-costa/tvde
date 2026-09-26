<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FuncionarioInvitation extends Model
{
    use HasUuids;

    protected $fillable=[
        'email',
        'token_hash',
        'token_ciphertext',
        'expires_at',
        'sent_at',
        'accepted_at',
        'revoked_at',
        'send_attempts',
        'last_error',
    ];

    protected $hidden=[
        'token_hash',
        'token_ciphertext',
    ];

    protected function casts(): array
    {
        return [
            'expires_at'=>'datetime',
            'sent_at'=>'datetime',
            'accepted_at'=>'datetime',
            'revoked_at'=>'datetime',
            'send_attempts'=>'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }

    public function funcionario(): BelongsTo
    {
        return $this->belongsTo(
            Funcionario::class
        );
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }
}
