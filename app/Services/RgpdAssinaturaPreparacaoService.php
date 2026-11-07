<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\RgpdAssinatura;
use App\Models\RgpdRegisto;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class RgpdAssinaturaPreparacaoService
{
    public function __construct(
        private FrotaProDocumentCatalog $catalog
    ) {}

    /*
     * FROTAPRO_4R81_SIGNATURE_SNAPSHOT
     *
     * Apenas prepara um pedido interno.
     * Nao recolhe assinatura, nao envia OTP,
     * nao gera PDF e nao confirma consentimento.
     */
    public function preparar(
        string $tenantId,
        string $atorId,
        string $registoId,
        string $modo,
        string $signatarioNome,
        ?string $signatarioEmail = null
    ): RgpdAssinatura {
        if (
            !in_array(
                $modo,
                ['presencial', 'remota'],
                true
            )
        ) {
            throw ValidationException::withMessages([
                'modo' => 'Modo de assinatura invalido.',
            ]);
        }

        $signatarioNome = trim($signatarioNome);

        if (
            $signatarioNome === '' ||
            mb_strlen($signatarioNome) > 255
        ) {
            throw ValidationException::withMessages([
                'signatario_nome' =>
                    'Identificacao do signatario obrigatoria.',
            ]);
        }

        $signatarioEmail = $signatarioEmail === null
            ? null
            : mb_strtolower(trim($signatarioEmail));

        if (
            $signatarioEmail !== null &&
            (
                !filter_var(
                    $signatarioEmail,
                    FILTER_VALIDATE_EMAIL
                ) ||
                mb_strlen($signatarioEmail) > 190
            )
        ) {
            throw ValidationException::withMessages([
                'signatario_email' =>
                    'Endereco de email invalido.',
            ]);
        }

        if (
            $modo === 'remota' &&
            !$signatarioEmail
        ) {
            throw ValidationException::withMessages([
                'signatario_email' =>
                    'A assinatura remota exige email.',
            ]);
        }

        $this->validarAtor($tenantId, $atorId);

        return DB::transaction(
            function () use (
                $tenantId,
                $atorId,
                $registoId,
                $modo,
                $signatarioNome,
                $signatarioEmail
            ): RgpdAssinatura {
                $registo = RgpdRegisto::query()
                    ->where('tenant_id', $tenantId)
                    ->whereKey($registoId)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($registo->estado !== 'rascunho') {
                    throw ValidationException::withMessages([
                        'registo' =>
                            'Apenas rascunhos podem iniciar assinaturas.',
                    ]);
                }

                if (
                    $registo->titular_nome !== null &&
                    trim($registo->titular_nome) !==
                    $signatarioNome
                ) {
                    throw ValidationException::withMessages([
                        'signatario_nome' =>
                            'O signatario difere do titular identificado.',
                    ]);
                }

                $documento = $this->catalog->find(
                    'informacao_tratamento_dados_rgpd'
                );

                if (
                    !$documento ||
                    ($documento['publicavel'] ?? true) !== false ||
                    $registo->modelo_codigo !==
                        $documento['codigo'] ||
                    $registo->versao_documento !==
                        $documento['versao']
                ) {
                    throw ValidationException::withMessages([
                        'modelo' =>
                            'Modelo ou versao RGPD inconsistentes.',
                    ]);
                }

                $conteudo = $this->catalog->content(
                    $documento
                );

                $hash = hash('sha256', $conteudo);

                if (
                    !hash_equals(
                        $hash,
                        (string)$registo->documento_sha256
                    )
                ) {
                    throw ValidationException::withMessages([
                        'documento' =>
                            'O texto RGPD mudou. Crie um novo rascunho.',
                    ]);
                }

                $eventos = $registo->eventos()
                    ->get();

                if (
                    $eventos
                        ->where('tipo', 'revogacao')
                        ->isNotEmpty()
                ) {
                    throw ValidationException::withMessages([
                        'escolhas' =>
                            'Existem escolhas retiradas. '.
                            'Crie um novo rascunho antes de assinar.',
                    ]);
                }

                $decisoes = $eventos
                    ->where('tipo', 'decisao');

                $escolhas = [];

                foreach (
                    RgpdConsentimentoService::FINALIDADES
                    as $finalidade
                ) {
                    $porFinalidade = $decisoes->where(
                        'finalidade',
                        $finalidade
                    );

                    if ($porFinalidade->count() !== 1) {
                        throw ValidationException::withMessages([
                            'escolhas' =>
                                'Faltam escolhas RGPD obrigatorias.',
                        ]);
                    }

                    $valor = $porFinalidade
                        ->first()
                        ->escolha;

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
                        throw ValidationException::withMessages([
                            'escolhas' =>
                                'Existe uma escolha RGPD invalida.',
                        ]);
                    }

                    $escolhas[$finalidade] = $valor;
                }

                if (
                    $decisoes->count() !==
                    count(RgpdConsentimentoService::FINALIDADES)
                ) {
                    throw ValidationException::withMessages([
                        'escolhas' =>
                            'Existem decisoes adicionais inesperadas.',
                    ]);
                }

                $snapshot = [
                    'tenant_id' => $tenantId,
                    'registo_id' => $registo->id,

                    'titular_tipo' =>
                        $registo->titular_tipo,

                    'titular_id' =>
                        $registo->titular_id,

                    'titular_nome' =>
                        $signatarioNome,

                    'modelo_codigo' =>
                        $registo->modelo_codigo,

                    'versao' =>
                        $registo->versao_documento,

                    'documento_sha256' => $hash,

                    'escolhas' => $escolhas,

                    'finalidades_especificas' =>
                        $registo->finalidades_especificas
                        ?? [],
                ];

                $snapshotJson = json_encode(
                    $snapshot,
                    JSON_UNESCAPED_UNICODE |
                    JSON_UNESCAPED_SLASHES |
                    JSON_THROW_ON_ERROR
                );

                $escolhasHash = hash(
                    'sha256',
                    $snapshotJson
                );

                $existente = RgpdAssinatura::query()
                    ->where('tenant_id', $tenantId)
                    ->where(
                        'rgpd_registo_id',
                        $registoId
                    )
                    ->lockForUpdate()
                    ->first();

                if ($existente) {
                    if (
                        $existente->status !== 'pendente' ||
                        $existente->modo !== $modo ||
                        $existente->signatario_nome !==
                            $signatarioNome ||
                        $existente->signatario_email !==
                            $signatarioEmail ||
                        !hash_equals(
                            (string)$existente->documento_sha256,
                            $hash
                        ) ||
                        !hash_equals(
                            (string)$existente->escolhas_sha256,
                            $escolhasHash
                        )
                    ) {
                        throw ValidationException::withMessages([
                            'assinatura' =>
                                'Ja existe uma preparacao diferente '.
                                'para este rascunho.',
                        ]);
                    }

                    return $existente;
                }

                $assinatura = new RgpdAssinatura([
                    'modo' => $modo,
                    'status' => 'pendente',
                    'signatario_nome' =>
                        $signatarioNome,
                    'signatario_email' =>
                        $signatarioEmail,
                    'documento_sha256' => $hash,
                    'escolhas_sha256' => $escolhasHash,
                    'solicitado_em' => now(),
                ]);

                $assinatura->tenant_id = $tenantId;

                $assinatura->rgpd_registo_id =
                    $registo->id;

                $assinatura->solicitado_por =
                    $atorId;

                $assinatura->save();

                return $assinatura;
            }
        );
    }

    private function validarAtor(
        string $tenantId,
        string $atorId
    ): void {
        $utilizadorAtivo = User::query()
            ->whereKey($atorId)
            ->where('ativo', true)
            ->exists();

        $vinculoAtivo = TenantUser::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $atorId)
            ->where('status', 'ativo')
            ->exists();

        if (
            !$utilizadorAtivo ||
            !$vinculoAtivo
        ) {
            throw ValidationException::withMessages([
                'ator' =>
                    'Utilizador sem vinculo ativo ao tenant.',
            ]);
        }
    }
}
