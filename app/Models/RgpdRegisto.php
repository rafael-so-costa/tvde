<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class RgpdRegisto extends Model
{
    use HasUuids;

    protected $table = 'rgpd_registos';

    protected $fillable = [
        'titular_tipo',
        'titular_id',
        'titular_nome',
        'modelo_codigo',
        'versao_documento',
        'documento_sha256',
        'finalidades_especificas',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'finalidades_especificas' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::updating(
            static function (self $registo): void {
                if (
                    $registo->getOriginal('estado') ===
                    'assinado'
                ) {
                    throw new \LogicException(
                        'O registo RGPD assinado é imutável.'
                    );
                }
            }
        );

        static::deleting(
            static function (): void {
                throw new \LogicException(
                    'Um registo RGPD não pode ser eliminado por este modelo.'
                );
            }
        );
    }
    public function eventos(): HasMany
    {
        return $this
            ->hasMany(
                RgpdEvento::class,
                'rgpd_registo_id'
            )
            ->orderBy('ocorrido_em')
            ->orderBy('id');
    }
}
