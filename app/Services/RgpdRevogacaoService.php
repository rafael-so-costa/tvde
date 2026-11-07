<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Funcionario;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\RgpdAssinatura;
use App\Models\RgpdEvento;
use App\Models\RgpdRegisto;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class RgpdRevogacaoService
{
    /*
     * FROTAPRO_4R101_REVOGACAO_ASSINADA
     *
     * A retirada nao altera o registo
     * nem a assinatura anteriormente emitidos.
     *
     * A decisao original permanece guardada.
     * O estado efetivo considera a revogacao.
     */

    public function consultar(
        string $tenantId,
        string $userId,
        string $registoId
    ): array {
        return $this->estadoAtual(
            $tenantId,
            $userId,
            $registoId,
            false
        );
    }

    public function retirar(
        string $tenantId,
        string $userId,
        string $registoId,
        string $finalidade
    ): array {
        if (
            !in_array(
                $finalidade,
                RgpdConsentimentoService::FINALIDADES,
                true
            )
        ) {
            $this->falhar(
                'finalidade',
                'Finalidade RGPD desconhecida.'
            );
        }

        return DB::transaction(
            function () use (
                $tenantId,
                $userId,
                $registoId,
                $finalidade
            ): array {
                $estado = $this->estadoAtual(
                    $tenantId,
                    $userId,
                    $registoId,
                    true
                );

                if (
                    $estado['finalidades'][$finalidade]['estado']
                    !== 'autorizado'
                ) {
                    $this->falhar(
                        'finalidade',
                        'Não existe uma autorização ativa '.
                        'para retirar nesta finalidade.'
                    );
                }

                $evento = new RgpdEvento([
                    'finalidade' => $finalidade,
                    'tipo' => 'revogacao',
                    'escolha' => 'revogado',
                    'ocorrido_em' => now(),
                ]);

                $evento->tenant_id = $tenantId;

                $evento->rgpd_registo_id =
                    $registoId;

                $evento->ator_id = $userId;

                $evento->save();

                return $this->estadoAtual(
                    $tenantId,
                    $userId,
                    $registoId,
                    false
                );
            }
        );
    }

    private function estadoAtual(
        string $tenantId,
        string $userId,
        string $registoId,
        bool $lock
    ): array {
        $this->verificarConta(
            $tenantId,
            $userId
        );

        $query = RgpdRegisto::query()
            ->where('tenant_id', $tenantId)
            ->whereKey($registoId);

        if ($lock) {
            $query->lockForUpdate();
        }

        $registo = $query->firstOrFail();

        $this->verificarTitular(
            $registo,
            $tenantId,
            $userId
        );

        if ($registo->estado !== 'assinado') {
            $this->falhar(
                'registo',
                'Este documento ainda não possui '.
                'assinatura concluída.'
            );
        }

        $assinatura = RgpdAssinatura::query()
            ->where('tenant_id', $tenantId)
            ->where(
                'rgpd_registo_id',
                $registoId
            )
            ->first();

        if (
            !$assinatura ||
            $assinatura->status !== 'assinado' ||
            !$assinatura->assinado_em
        ) {
            $this->falhar(
                'assinatura',
                'Não existe uma assinatura válida '.
                'para este registo.'
            );
        }

        if (
            !hash_equals(
                (string)$registo->documento_sha256,
                (string)$assinatura->documento_sha256
            )
        ) {
            $this->falhar(
                'documento',
                'A integridade do documento '.
                'não foi confirmada.'
            );
        }

        $eventos = $registo->eventos()->get();

        $assinaturas = $eventos->where(
            'tipo',
            'assinatura'
        );

        if ($assinaturas->count() !== 1) {
            $this->falhar(
                'assinatura',
                'O histórico da assinatura é inconsistente.'
            );
        }

        $decisoes = $eventos->where(
            'tipo',
            'decisao'
        );

        $revogacoes = $eventos->where(
            'tipo',
            'revogacao'
        );

        if (
            $decisoes->count() !==
            count(RgpdConsentimentoService::FINALIDADES)
        ) {
            $this->falhar(
                'escolhas',
                'O histórico das escolhas está incompleto.'
            );
        }

        $escolhasOriginais = [];
        $finalidades = [];

        foreach (
            RgpdConsentimentoService::FINALIDADES
            as $finalidade
        ) {
            $decisao = $decisoes->where(
                'finalidade',
                $finalidade
            );

            if ($decisao->count() !== 1) {
                $this->falhar(
                    'escolhas',
                    'Decisões RGPD duplicadas ou inexistentes.'
                );
            }

            $valor = $decisao->first()->escolha;

            if (
                !in_array(
                    $valor,
                    [
                        'autorizo',
                        'nao_autorizo',
                        'nao_aplicavel',
                    ],
                    true
                )
            ) {
                $this->falhar(
                    'escolhas',
                    'O histórico contém uma decisão inválida.'
                );
            }

            $escolhasOriginais[$finalidade] =
                $valor;

            $retiradas = $revogacoes->where(
                'finalidade',
                $finalidade
            );

            if ($retiradas->count() > 1) {
                $this->falhar(
                    'escolhas',
                    'O histórico contém revogações duplicadas.'
                );
            }

            if (
                $retiradas->isNotEmpty() &&
                $valor !== 'autorizo'
            ) {
                $this->falhar(
                    'escolhas',
                    'Foi encontrada uma revogação '.
                    'sem autorização original.'
                );
            }

            $revogada = $retiradas->isNotEmpty();

            $estado = $revogada
                ? 'revogado'
                : match ($valor) {
                    'autorizo' =>
                        'autorizado',

                    'nao_autorizo' =>
                        'nao_autorizado',

                    default =>
                        'nao_aplicavel',
                };

            $finalidades[$finalidade] = [
                'decisao_original' => $valor,

                'estado' => $estado,

                'autorizado' =>
                    $valor === 'autorizo' &&
                    !$revogada,

                'revogado_em' =>
                    $revogada
                        ? $retiradas
                            ->first()
                            ->ocorrido_em
                            ->toIso8601String()
                        : null,
            ];
        }

        foreach ($eventos as $evento) {
            if (
                !in_array(
                    $evento->tipo,
                    [
                        'decisao',
                        'assinatura',
                        'revogacao',
                    ],
                    true
                )
            ) {
                $this->falhar(
                    'historico',
                    'O histórico contém eventos inesperados.'
                );
            }
        }

        /*
         * Verificar o snapshot do documento
         * preparado para assinatura.
         */
        $snapshot = [
            'tenant_id' => $tenantId,

            'registo_id' => $registo->id,

            'titular_tipo' =>
                $registo->titular_tipo,

            'titular_id' =>
                $registo->titular_id,

            'titular_nome' =>
                $assinatura->signatario_nome,

            'modelo_codigo' =>
                $registo->modelo_codigo,

            'versao' =>
                $registo->versao_documento,

            'documento_sha256' =>
                $registo->documento_sha256,

            'escolhas' =>
                $escolhasOriginais,

            'finalidades_especificas' =>
                $registo->finalidades_especificas ?? [],
        ];

        $snapshotJson = json_encode(
            $snapshot,
            JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES |
            JSON_THROW_ON_ERROR
        );

        $expectedHash = hash(
            'sha256',
            $snapshotJson
        );

        if (
            !hash_equals(
                (string)$assinatura->escolhas_sha256,
                $expectedHash
            )
        ) {
            $this->falhar(
                'integridade',
                'O histórico não corresponde às '.
                'escolhas originalmente assinadas.'
            );
        }

        return [
            'registo_id' => $registo->id,

            'versao_documento' =>
                $registo->versao_documento,

            'documento_sha256' =>
                $registo->documento_sha256,

            'assinado_em' =>
                $assinatura
                    ->assinado_em
                    ->toIso8601String(),

            'finalidades' => $finalidades,
        ];
    }

    private function verificarConta(
        string $tenantId,
        string $userId
    ): void {
        $ativo = User::query()
            ->whereKey($userId)
            ->where('ativo', true)
            ->exists();

        $vinculo = TenantUser::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->where('status', 'ativo')
            ->exists();

        if (!$ativo || !$vinculo) {
            abort(404);
        }
    }

    /*
     * Nao confundir permissao administrativa
     * com identidade do titular.
     *
     * Mesmo um gestor nao pode retirar
     * a autorizacao de outra pessoa por
     * ter permissoes sobre o tenant.
     */
    private function verificarTitular(
        RgpdRegisto $registo,
        string $tenantId,
        string $userId
    ): void {
        $model = match (
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
            !$model ||
            !$registo->titular_id
        ) {
            abort(404);
        }

        $pertence = $model::query()
            ->where('tenant_id', $tenantId)
            ->whereKey(
                $registo->titular_id
            )
            ->where('user_id', $userId)
            ->exists();

        if (!$pertence) {
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
