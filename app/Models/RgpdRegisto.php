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
        /*
         * FROTAPRO_4R102_TEXT_SNAPSHOT
         *
         * Guarda o texto exato no registo.
         * Nao depende de futuras alteracoes
         * ao modelo documental global.
         */
        static::creating(
            static function (self $registo): void {
                $catalogo = app(
                    \App\Services\FrotaProDocumentCatalog::class
                );

                $documento = $catalogo->find(
                    (string)$registo->modelo_codigo
                );

                if (
                    !$documento ||
                    ($documento['publicavel'] ?? true) !== false
                ) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'modelo' =>
                            'Modelo RGPD em rascunho não encontrado.',
                    ]);
                }

                $texto = $catalogo->content(
                    $documento
                );

                if (
                    !hash_equals(
                        (string)$registo->documento_sha256,
                        hash('sha256', $texto)
                    )
                ) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'documento' =>
                            'O hash RGPD não corresponde ao modelo.',
                    ]);
                }

                $registo->documento_texto_snapshot =
                    $texto;
            }
        );

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
