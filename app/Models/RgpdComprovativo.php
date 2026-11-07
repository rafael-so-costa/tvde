<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

final class RgpdComprovativo extends Model
{
    use HasUuids;

    protected $table = 'rgpd_comprovativos';

    protected $fillable = [
        'tipo',
        'arquivo_path',
        'arquivo_sha256',
        'documento_sha256',
        'assinatura_sha256',
        'emitido_em',
    ];

    protected $hidden = [
        'arquivo_path',
    ];

    protected function casts(): array
    {
        return [
            'emitido_em' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(
            static function (): void {
                throw new LogicException(
                    'O comprovativo RGPD original é imutável.'
                );
            }
        );

        static::deleting(
            static function (): void {
                throw new LogicException(
                    'O comprovativo RGPD não pode ser eliminado.'
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

    public function assinatura(): BelongsTo
    {
        return $this->belongsTo(
            RgpdAssinatura::class,
            'rgpd_assinatura_id'
        );
    }
}
