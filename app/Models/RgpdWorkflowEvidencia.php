<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use LogicException;

final class RgpdWorkflowEvidencia extends Model
{
    use HasUuids;

    protected $table =
        'rgpd_workflow_evidencias';

    protected $fillable = [
        'codigo_etapa',
        'referencia',
        'documento_sha256',
        'assinatura_sha256',
        'pdf_sha256',
        'ocorrido_em',
        'integridade_hmac',
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
                    'Evidência RGPD imutável.'
                );
            }
        );

        static::deleting(
            static function (): void {
                throw new LogicException(
                    'Evidência RGPD não pode ser eliminada.'
                );
            }
        );
    }

    /*
     * FROTAPRO_4R1041_EVIDENCE_HMAC
     *
     * O HMAC deteta alteracoes no registo.
     * A chave depende de APP_KEY e deve
     * ser preservada em rotacoes de chaves.
     */
    public function calcularHmac(): string
    {
        $campos = [
            (string)$this->tenant_id,
            (string)$this->rgpd_registo_id,
            (string)$this->ator_id,
            (string)$this->codigo_etapa,
            (string)$this->referencia,
            (string)$this->documento_sha256,
            (string)($this->assinatura_sha256 ?? ''),
            (string)($this->pdf_sha256 ?? ''),
            $this->ocorrido_em
                ?->format('Y-m-d H:i:s') ?? '',
        ];

        return hash_hmac(
            'sha256',
            implode("\n", $campos),
            (string)config('app.key')
        );
    }

    public function integridadeValida(): bool
    {
        return hash_equals(
            (string)$this->integridade_hmac,
            $this->calcularHmac()
        );
    }
}
