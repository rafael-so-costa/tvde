<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

final class RgpdEvento extends Model
{
    use HasUuids;

    protected $table = 'rgpd_eventos';

    protected $fillable = [
        'finalidade',
        'tipo',
        'escolha',
        'ocorrido_em',
    ];

    protected function casts(): array
    {
        return [
            'ocorrido_em' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(
            static function (): void {
                throw new LogicException(
                    'Eventos RGPD são imutáveis.'
                );
            }
        );

        static::deleting(
            static function (): void {
                throw new LogicException(
                    'Eventos RGPD não podem ser apagados.'
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
}
