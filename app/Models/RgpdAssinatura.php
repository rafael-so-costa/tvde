<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

final class RgpdAssinatura extends Model
{
    use HasUuids;

    protected $table = 'rgpd_assinaturas';

    protected $fillable = [
        'modo',
        'status',
        'signatario_nome',
        'signatario_email',
        'documento_sha256',
        'escolhas_sha256',
        'solicitado_em',
    ];

    protected $hidden = [
        'token_hash',
        'otp_hash',
        'assinatura_path',
    ];

    protected function casts(): array
    {
        return [
            'otp_expira_em' => 'datetime',
            'solicitado_em' => 'datetime',
            'assinado_em' => 'datetime',
            'otp_tentativas' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::updating(
            static function (self $assinatura): void {
                if (
                    $assinatura->getOriginal('status') ===
                    'assinado'
                ) {
                    throw new LogicException(
                        'Uma assinatura concluida nao pode ser alterada.'
                    );
                }
            }
        );

        static::deleting(
            static function (): void {
                throw new LogicException(
                    'A evidencia de assinatura nao pode ser eliminada.'
                );
            }
        );
    }

    public function registo(): BelongsTo
    {
        return $this->belongsTo(
            RgpdRegisto::class,
            'rgpd_registo_id'
        );
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }
}
