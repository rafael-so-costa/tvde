<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Funcionario;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\RgpdComprovativo;
use App\Models\RgpdRegisto;
use App\Models\RgpdWorkflowEvidencia;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class RgpdWorkflowEvidenciaService
{
    /*
     * FROTAPRO_4R1041_WORKFLOW_AUDIT
     *
     * Nenhuma acao altera a assinatura,
     * o texto ou as escolhas do titular.
     *
     * As evidencias sao registos novos
     * e imutaveis, com ator identificado.
     */

    public function validarInformacao(
        string $tenantId,
        string $atorId,
        string $registoId,
        string $referencia
    ): RgpdWorkflowEvidencia {
        return DB::transaction(
            function () use (
                $tenantId,
                $atorId,
                $registoId,
                $referencia
            ): RgpdWorkflowEvidencia {
                $registo = $this->registo(
                    $tenantId,
                    $registoId,
                    true
                );

                $this->exigirOperador(
                    $tenantId,
                    $atorId
                );

                if (
                    $registo->estado !== 'rascunho'
                ) {
                    $this->falhar(
                        'registo',
                        'A validação inicial deve ocorrer antes da assinatura.'
                    );
                }

                $estado = $this->workflow(
                    $tenantId,
                    $registoId
                );

                foreach (
                    [
                        'identificar_titular',
                        'gerar_documento_rgpd',
                        'registar_autorizacoes',
                    ] as $etapa
                ) {
                    $this->exigirEtapa(
                        $estado,
                        $etapa
                    );
                }

                return $this->registar(
                    $registo,
                    $atorId,
                    'validar_informacao',
                    $referencia,
                    null,
                    null
                );
            }
        );
    }

    public function apresentarDocumento(
        string $tenantId,
        string $userId,
        string $registoId
    ): array {
        $registo = $this->registo(
            $tenantId,
            $registoId
        );

        $this->exigirTitular(
            $registo,
            $userId
        );

        $estado = $this->workflow(
            $tenantId,
            $registoId
        );

        $this->exigirEtapa(
            $estado,
            'validar_informacao'
        );

        if (
            !$estado['resumo']['snapshot_integro']
        ) {
            $this->falhar(
                'documento',
                'O texto do documento não está íntegro.'
            );
        }

        return [
            'registo_id' =>
                $registo->id,

            'documento_texto' =>
                $registo->documento_texto_snapshot,

            'documento_sha256' =>
                $registo->documento_sha256,

            'versao_documento' =>
                $registo->versao_documento,
        ];
    }

    public function confirmarDisponibilizacao(
        string $tenantId,
        string $userId,
        string $registoId,
        string $hashConfirmado
    ): RgpdWorkflowEvidencia {
        return DB::transaction(
            function () use (
                $tenantId,
                $userId,
                $registoId,
                $hashConfirmado
            ): RgpdWorkflowEvidencia {
                $registo = $this->registo(
                    $tenantId,
                    $registoId,
                    true
                );

                $this->exigirTitular(
                    $registo,
                    $userId
                );

                $estado = $this->workflow(
                    $tenantId,
                    $registoId
                );

                $this->exigirEtapa(
                    $estado,
                    'validar_informacao'
                );

                if (
                    !$estado['resumo']['snapshot_integro'] ||
                    !hash_equals(
                        (string)$registo->documento_sha256,
                        $hashConfirmado
                    )
                ) {
                    $this->falhar(
                        'documento',
                        'A versão confirmada não corresponde ao documento.'
                    );
                }

                return $this->registar(
                    $registo,
                    $userId,
                    'comprovar_disponibilizacao',
                    'confirmacao_expressa_portal_autenticado',
                    null,
                    null
                );
            }
        );
    }

    public function conferir(
        string $tenantId,
        string $atorId,
        string $registoId,
        string $referencia
    ): RgpdWorkflowEvidencia {
        return DB::transaction(
            function () use (
                $tenantId,
                $atorId,
                $registoId,
                $referencia
            ): RgpdWorkflowEvidencia {
                $registo = $this->registo(
                    $tenantId,
                    $registoId,
                    true
                );

                $this->exigirOperador(
                    $tenantId,
                    $atorId
                );

                $estado = $this->workflow(
                    $tenantId,
                    $registoId
                );

                foreach (
                    [
                        'identificar_titular',
                        'validar_informacao',
                        'gerar_documento_rgpd',
                        'comprovar_disponibilizacao',
                        'registar_autorizacoes',
                        'comprovar_assinatura_titular',
                    ] as $etapa
                ) {
                    $this->exigirEtapa(
                        $estado,
                        $etapa
                    );
                }

                if (
                    !$estado['resumo']['comprovativo_pdf_integro']
                ) {
                    $this->falhar(
                        'pdf',
                        'O comprovativo PDF não está íntegro.'
                    );
                }

                $validacao = RgpdWorkflowEvidencia::query()
                    ->where('tenant_id', $tenantId)
                    ->where(
                        'rgpd_registo_id',
                        $registoId
                    )
                    ->where(
                        'codigo_etapa',
                        'validar_informacao'
                    )
                    ->firstOrFail();

                if (
                    !$validacao->integridadeValida() ||
                    $validacao->ator_id === $atorId
                ) {
                    $this->falhar(
                        'conferencia',
                        'A conferência exige outro responsável autorizado.'
                    );
                }

                $assinatura = \App\Models\RgpdAssinatura::query()
                    ->where('tenant_id', $tenantId)
                    ->where(
                        'rgpd_registo_id',
                        $registoId
                    )
                    ->where('status', 'assinado')
                    ->firstOrFail();

                $pdf = RgpdComprovativo::query()
                    ->where('tenant_id', $tenantId)
                    ->where(
                        'rgpd_registo_id',
                        $registoId
                    )
                    ->where(
                        'tipo',
                        'original_assinado'
                    )
                    ->firstOrFail();

                return $this->registar(
                    $registo,
                    $atorId,
                    'conferencia_rgpd',
                    $referencia,
                    (string)$assinatura->assinatura_sha256,
                    (string)$pdf->arquivo_sha256
                );
            }
        );
    }

    private function registar(
        RgpdRegisto $registo,
        string $atorId,
        string $codigo,
        string $referencia,
        ?string $assinaturaHash,
        ?string $pdfHash
    ): RgpdWorkflowEvidencia {
        $referencia = trim($referencia);

        if (
            mb_strlen($referencia) < 10 ||
            mb_strlen($referencia) > 500
        ) {
            $this->falhar(
                'referencia',
                'A referência deve ter entre 10 e 500 caracteres.'
            );
        }

        $existente = RgpdWorkflowEvidencia::query()
            ->where(
                'tenant_id',
                $registo->tenant_id
            )
            ->where(
                'rgpd_registo_id',
                $registo->id
            )
            ->where(
                'codigo_etapa',
                $codigo
            )
            ->first();

        if ($existente) {
            if (
                !$existente->integridadeValida() ||
                $existente->ator_id !== $atorId ||
                $existente->documento_sha256 !==
                    $registo->documento_sha256 ||
                $existente->assinatura_sha256 !==
                    $assinaturaHash ||
                $existente->pdf_sha256 !==
                    $pdfHash
            ) {
                $this->falhar(
                    'evidencia',
                    'A etapa já possui uma evidência diferente ou inválida.'
                );
            }

            return $existente;
        }

        $item = new RgpdWorkflowEvidencia([
            'codigo_etapa' => $codigo,

            'referencia' => $referencia,

            'documento_sha256' =>
                $registo->documento_sha256,

            'assinatura_sha256' =>
                $assinaturaHash,

            'pdf_sha256' =>
                $pdfHash,

            'ocorrido_em' => now(),
        ]);

        $item->tenant_id =
            $registo->tenant_id;

        $item->rgpd_registo_id =
            $registo->id;

        $item->ator_id =
            $atorId;

        $item->integridade_hmac =
            $item->calcularHmac();

        $item->save();

        return $item;
    }

    private function registo(
        string $tenantId,
        string $registoId,
        bool $lock = false
    ): RgpdRegisto {
        $query = RgpdRegisto::query()
            ->where('tenant_id', $tenantId)
            ->whereKey($registoId);

        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->firstOrFail();
    }

    private function workflow(
        string $tenantId,
        string $registoId
    ): array {
        return app(
            RgpdWorkflowEstadoService::class
        )->consultar(
            $tenantId,
            $registoId
        );
    }

    private function exigirEtapa(
        array $workflow,
        string $codigo
    ): void {
        foreach (
            $workflow['etapas']
            as $item
        ) {
            if (
                $item['codigo'] === $codigo &&
                $item['estado'] === 'concluido'
            ) {
                return;
            }
        }

        $this->falhar(
            'workflow',
            'Etapa obrigatória pendente: '.$codigo
        );
    }

    private function exigirOperador(
        string $tenantId,
        string $userId
    ): void {
        $this->exigirConta(
            $tenantId,
            $userId
        );

        $user = User::query()
            ->findOrFail($userId);

        if (
            !app(
                PermissionService::class
            )->allows(
                $user,
                'templates',
                'configurar',
                $tenantId
            )
        ) {
            abort(403);
        }
    }

    private function exigirTitular(
        RgpdRegisto $registo,
        string $userId
    ): void {
        $this->exigirConta(
            $registo->tenant_id,
            $userId
        );

        $class = match (
            $registo->titular_tipo
        ) {
            'motorista' =>
                Motorista::class,

            'proprietario' =>
                Proprietario::class,

            'colaborador' =>
                Funcionario::class,

            default => null,
        };

        if (
            !$class ||
            !$registo->titular_id
        ) {
            abort(404);
        }

        $vinculo = $class::query()
            ->where(
                'tenant_id',
                $registo->tenant_id
            )
            ->whereKey(
                $registo->titular_id
            )
            ->where(
                'user_id',
                $userId
            )
            ->exists();

        if (!$vinculo) {
            abort(404);
        }
    }

    private function exigirConta(
        string $tenantId,
        string $userId
    ): void {
        $user = User::query()
            ->whereKey($userId)
            ->where('ativo', true)
            ->exists();

        $vinculo = TenantUser::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->where('status', 'ativo')
            ->exists();

        if (!$user || !$vinculo) {
            abort(404);
        }
    }

    private function falhar(
        string $campo,
        string $mensagem
    ): never {
        throw ValidationException::withMessages([
            $campo => $mensagem,
        ]);
    }
}
