<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\RgpdAssinatura;
use App\Models\RgpdEvento;
use App\Models\RgpdRegisto;
use App\Models\TenantUser;
use App\Models\User;
use Closure;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

final class RgpdAssinaturaConclusaoService
{
    public function __construct(
        private FrotaProDocumentCatalog $catalog
    ) {}

    /*
     * FROTAPRO_4R82_SIGNATURE_CONFIRMATION
     *
     * Assinatura presencial.
     * Valida integridade antes de concluir.
     * Guarda imagem privada e historico.
     */
    public function confirmarPresencial(
        string $tenantId,
        string $atorId,
        string $assinaturaId,
        string $imagemPng,
        bool $confirmacaoTitular,
        ?string $ip = null,
        ?string $userAgent = null
    ): RgpdAssinatura {
        if (!$confirmacaoTitular) {
            $this->invalidar(
                'confirmacao',
                'É necessária a confirmação expressa do titular.'
            );
        }

        $this->validarAtor(
            $tenantId,
            $atorId
        );

        $binario = $this->decodificarPng(
            $imagemPng
        );

        $ficheiro = null;

        try {
            return DB::transaction(
                function () use (
                    $tenantId,
                    $assinaturaId,
                    $atorId,
                    $binario,
                    $ip,
                    $userAgent,
                    &$ficheiro
                ): RgpdAssinatura {
                    $assinatura = RgpdAssinatura::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->whereKey(
                            $assinaturaId
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                    if (
                        $assinatura->modo !== 'presencial' ||
                        $assinatura->status !== 'pendente'
                    ) {
                        $this->invalidar(
                            'assinatura',
                            'Assinatura presencial indisponível ou já concluída.'
                        );
                    }

                    $registo = $this->verificarIntegridade(
                        $assinatura
                    );

                    $ficheiro = $this->caminhoAssinatura(
                        $assinatura,
                        $registo
                    );

                    $this->finalizar(
                        $assinatura,
                        $registo,
                        $binario,
                        $ficheiro,
                        $atorId,
                        $ip,
                        $userAgent
                    );

                    return $assinatura->fresh();
                }
            );
        }
        catch (Throwable $error) {
            if ($ficheiro !== null) {
                Storage::disk('local')->delete(
                    $ficheiro
                );
            }

            throw $error;
        }
    }

    /*
     * Emissao remota:
     *
     * - Desativada por defeito.
     * - Token aleatorio de 256 bits.
     * - OTP de seis digitos.
     * - Apenas hashes na base de dados.
     * - Expiracao em 30 minutos.
     *
     * O callback e interno ao servidor.
     * Nao deve ser exposto diretamente
     * num controlador publico.
     */
    public function iniciarRemota(
        string $tenantId,
        string $atorId,
        string $assinaturaId,
        Closure $entregarPorCanalSeguro
    ): RgpdAssinatura {
        if (
            config(
                'rgpd.remote_issuance_enabled',
                false
            ) !== true
        ) {
            $this->invalidar(
                'assinatura',
                'A emissão remota RGPD ainda não está ativa.'
            );
        }

        $this->validarAtor(
            $tenantId,
            $atorId
        );

        $token = bin2hex(
            random_bytes(32)
        );

        $otp = (string)random_int(
            100000,
            999999
        );

        $assinatura = DB::transaction(
            function () use (
                $tenantId,
                $assinaturaId,
                $token,
                $otp
            ): RgpdAssinatura {
                $item = RgpdAssinatura::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->whereKey(
                        $assinaturaId
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                if (
                    $item->modo !== 'remota' ||
                    $item->status !== 'pendente' ||
                    $item->token_hash !== null ||
                    !filter_var(
                        $item->signatario_email,
                        FILTER_VALIDATE_EMAIL
                    )
                ) {
                    $this->invalidar(
                        'assinatura',
                        'Pedido remoto inválido ou já iniciado.'
                    );
                }

                $this->verificarIntegridade(
                    $item
                );

                $item->status = 'a_enviar';

                $item->token_hash = hash(
                    'sha256',
                    $token
                );

                $item->otp_hash = Hash::make(
                    $otp
                );

                $item->otp_expira_em = now()
                    ->addMinutes(30);

                $item->otp_tentativas = 0;

                $item->save();

                return $item->fresh();
            }
        );

        try {
            $entregarPorCanalSeguro(
                $assinatura->signatario_email,
                $token,
                $otp,
                $assinatura->otp_expira_em
            );
        }
        catch (Throwable $error) {
            DB::transaction(
                function () use (
                    $assinatura
                ): void {
                    $item = RgpdAssinatura::query()
                        ->whereKey(
                            $assinatura->id
                        )
                        ->where(
                            'tenant_id',
                            $assinatura->tenant_id
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                    if (
                        $item->status === 'a_enviar'
                    ) {
                        $item->status = 'falha_envio';

                        $item->token_hash = null;
                        $item->otp_hash = null;
                        $item->otp_expira_em = null;

                        $item->save();
                    }
                }
            );

            throw $error;
        }

        return DB::transaction(
            function () use (
                $assinatura
            ): RgpdAssinatura {
                $item = RgpdAssinatura::query()
                    ->whereKey(
                        $assinatura->id
                    )
                    ->where(
                        'tenant_id',
                        $assinatura->tenant_id
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                if (
                    $item->status !== 'a_enviar'
                ) {
                    $this->invalidar(
                        'assinatura',
                        'O desafio remoto deixou de estar disponível.'
                    );
                }

                $this->verificarIntegridade(
                    $item
                );

                $item->status = 'pendente';

                $item->save();

                return $item->fresh();
            }
        );
    }

    /*
     * Confirmacao remota:
     *
     * O token e uma credencial aleatoria.
     * A futura rota publica devera usar
     * throttle e apresentar o documento
     * e as escolhas antes da assinatura.
     */
    public function confirmarRemota(
        string $token,
        string $codigoOtp,
        string $imagemPng,
        string $documentoHashConfirmado,
        string $escolhasHashConfirmado,
        bool $confirmacaoTitular,
        ?string $ip = null,
        ?string $userAgent = null
    ): RgpdAssinatura {
        if (!$confirmacaoTitular) {
            $this->invalidar(
                'confirmacao',
                'Confirme a leitura do documento e as escolhas.'
            );
        }

        if (
            !preg_match(
                '/^[a-f0-9]{64}$/D',
                $token
            ) ||
            !preg_match(
                '/^\d{6}$/D',
                $codigoOtp
            )
        ) {
            $this->invalidar(
                'codigo_otp',
                'Credenciais de assinatura inválidas.'
            );
        }

        $binario = $this->decodificarPng(
            $imagemPng
        );

        $tokenHash = hash(
            'sha256',
            $token
        );

        $ficheiro = null;

        try {
            $resultado = DB::transaction(
                function () use (
                    $tokenHash,
                    $codigoOtp,
                    $documentoHashConfirmado,
                    $escolhasHashConfirmado,
                    $binario,
                    $ip,
                    $userAgent,
                    &$ficheiro
                ): array {
                    $assinatura = RgpdAssinatura::query()
                        ->where(
                            'token_hash',
                            $tokenHash
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                    if (
                        $assinatura->modo !== 'remota' ||
                        $assinatura->status !== 'pendente'
                    ) {
                        return [
                            'erro' =>
                                'Assinatura indisponível ou já concluída.',
                        ];
                    }

                    if (
                        !$assinatura->otp_expira_em ||
                        $assinatura->otp_expira_em->isPast()
                    ) {
                        $assinatura->status = 'expirado';

                        $assinatura->token_hash = null;
                        $assinatura->otp_hash = null;

                        $assinatura->save();

                        return [
                            'erro' =>
                                'Código expirado.',
                        ];
                    }

                    if (
                        $assinatura->otp_tentativas >= 5
                    ) {
                        $assinatura->status = 'bloqueado';

                        $assinatura->token_hash = null;
                        $assinatura->otp_hash = null;

                        $assinatura->save();

                        return [
                            'erro' =>
                                'Limite de tentativas atingido.',
                        ];
                    }

                    if (
                        !$assinatura->otp_hash ||
                        !Hash::check(
                            $codigoOtp,
                            $assinatura->otp_hash
                        )
                    ) {
                        $assinatura->otp_tentativas =
                            (int)$assinatura->otp_tentativas + 1;

                        if (
                            $assinatura->otp_tentativas >= 5
                        ) {
                            $assinatura->status = 'bloqueado';

                            $assinatura->token_hash = null;
                            $assinatura->otp_hash = null;
                        }

                        $assinatura->save();

                        return [
                            'erro' =>
                                'Código OTP inválido.',
                        ];
                    }

                    if (
                        !hash_equals(
                            (string)$assinatura->documento_sha256,
                            $documentoHashConfirmado
                        ) ||
                        !hash_equals(
                            (string)$assinatura->escolhas_sha256,
                            $escolhasHashConfirmado
                        )
                    ) {
                        $this->invalidar(
                            'documento',
                            'O documento ou as escolhas apresentados são diferentes.'
                        );
                    }

                    $registo = $this->verificarIntegridade(
                        $assinatura
                    );

                    $ficheiro = $this->caminhoAssinatura(
                        $assinatura,
                        $registo
                    );

                    $this->finalizar(
                        $assinatura,
                        $registo,
                        $binario,
                        $ficheiro,
                        null,
                        $ip,
                        $userAgent
                    );

                    return [
                        'assinatura' =>
                            $assinatura->fresh(),
                    ];
                }
            );
        }
        catch (Throwable $error) {
            if ($ficheiro !== null) {
                Storage::disk('local')->delete(
                    $ficheiro
                );
            }

            throw $error;
        }

        if (
            isset(
                $resultado['erro']
            )
        ) {
            $this->invalidar(
                'codigo_otp',
                $resultado['erro']
            );
        }

        return $resultado['assinatura'];
    }

    private function caminhoAssinatura(
        RgpdAssinatura $assinatura,
        RgpdRegisto $registo
    ): string {
        return
            'rgpd-signatures/'.
            $assinatura->tenant_id.
            '/'.
            $registo->id.
            '/'.
            $assinatura->id.
            '.png';
    }

    /*
     * Conclusao transacional.
     *
     * Armazena assinatura em disco privado.
     * Altera estado do pedido e do registo.
     * Cria evento de auditoria.
     */
    private function finalizar(
        RgpdAssinatura $assinatura,
        RgpdRegisto $registo,
        string $binario,
        string $caminho,
        ?string $atorId,
        ?string $ip,
        ?string $userAgent
    ): void {
        if (
            !Storage::disk('local')->put(
                $caminho,
                $binario
            )
        ) {
            throw new RuntimeException(
                'Não foi possível guardar a assinatura privada.'
            );
        }

        $assinatura->assinatura_path =
            $caminho;

        $assinatura->assinatura_sha256 =
            hash(
                'sha256',
                $binario
            );

        $assinatura->assinado_em = now();

        $assinatura->ip_address = $ip;

        $assinatura->user_agent =
            $userAgent === null
                ? null
                : mb_substr(
                    $userAgent,
                    0,
                    2000
                );

        $assinatura->status = 'assinado';

        $assinatura->token_hash = null;
        $assinatura->otp_hash = null;
        $assinatura->otp_expira_em = null;

        $assinatura->save();

        $registo->estado = 'assinado';

        $registo->save();

        $evento = new RgpdEvento([
            'finalidade' => 'documento',
            'tipo' => 'assinatura',
            'escolha' => 'assinado',
            'ocorrido_em' => now(),
        ]);

        $evento->tenant_id =
            $registo->tenant_id;

        $evento->rgpd_registo_id =
            $registo->id;

        $evento->ator_id =
            $atorId;

        $evento->save();
    }

    /*
     * Compara a versao e as escolhas atuais
     * com os hashes preparados anteriormente.
     */
    private function verificarIntegridade(
        RgpdAssinatura $assinatura
    ): RgpdRegisto {
        $registo = RgpdRegisto::query()
            ->where(
                'tenant_id',
                $assinatura->tenant_id
            )
            ->whereKey(
                $assinatura->rgpd_registo_id
            )
            ->lockForUpdate()
            ->firstOrFail();

        if (
            $registo->estado !== 'rascunho'
        ) {
            $this->invalidar(
                'registo',
                'O registo RGPD não está em rascunho.'
            );
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
                $documento['versao'] ||
            !hash_equals(
                (string)$registo->documento_sha256,
                hash(
                    'sha256',
                    $this->catalog->content(
                        $documento
                    )
                )
            ) ||
            !hash_equals(
                (string)$assinatura->documento_sha256,
                (string)$registo->documento_sha256
            )
        ) {
            $this->invalidar(
                'documento',
                'Versão ou conteúdo RGPD não correspondem ao pedido.'
            );
        }

        $eventos = $registo->eventos()
            ->get();

        if (
            $eventos
                ->where(
                    'tipo',
                    'revogacao'
                )
                ->isNotEmpty()
        ) {
            $this->invalidar(
                'escolhas',
                'Existem escolhas retiradas depois da preparação.'
            );
        }

        $decisoes = $eventos
            ->where(
                'tipo',
                'decisao'
            );

        $escolhas = [];

        foreach (
            RgpdConsentimentoService::FINALIDADES
            as $finalidade
        ) {
            $decisao = $decisoes->where(
                'finalidade',
                $finalidade
            );

            if (
                $decisao->count() !== 1
            ) {
                $this->invalidar(
                    'escolhas',
                    'As quatro decisões RGPD são obrigatórias.'
                );
            }

            $valor = $decisao
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
                $this->invalidar(
                    'escolhas',
                    'Uma decisão RGPD é inválida.'
                );
            }

            $escolhas[$finalidade] = $valor;
        }

        if (
            $decisoes->count() !== 4 ||
            $eventos
                ->where(
                    'tipo',
                    'assinatura'
                )
                ->isNotEmpty()
        ) {
            $this->invalidar(
                'escolhas',
                'Foram encontrados eventos RGPD inesperados.'
            );
        }

        $snapshot = [
            'tenant_id' =>
                $assinatura->tenant_id,

            'registo_id' =>
                $registo->id,

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
                $escolhas,

            'finalidades_especificas' =>
                $registo->finalidades_especificas ?? [],
        ];

        $snapshotJson = json_encode(
            $snapshot,
            JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES |
            JSON_THROW_ON_ERROR
        );

        $esperado = hash(
            'sha256',
            $snapshotJson
        );

        if (
            !hash_equals(
                (string)$assinatura->escolhas_sha256,
                $esperado
            )
        ) {
            $this->invalidar(
                'escolhas',
                'O conteúdo das escolhas foi alterado.'
            );
        }

        return $registo;
    }

    private function validarAtor(
        string $tenantId,
        string $atorId
    ): void {
        $ativo = User::query()
            ->whereKey(
                $atorId
            )
            ->where(
                'ativo',
                true
            )
            ->exists();

        $vinculo = TenantUser::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'user_id',
                $atorId
            )
            ->where(
                'status',
                'ativo'
            )
            ->exists();

        if (
            !$ativo ||
            !$vinculo
        ) {
            $this->invalidar(
                'ator',
                'O operador não possui vínculo ativo ao tenant.'
            );
        }
    }

    /*
     * Validacao da imagem PNG.
     * Limite maximo: 1 MB.
     */
    private function decodificarPng(
        string $imagem
    ): string {
        $prefixo =
            'data:image/png;base64,';

        if (
            !str_starts_with(
                $imagem,
                $prefixo
            ) ||
            strlen($imagem) > 1500000
        ) {
            $this->invalidar(
                'assinatura',
                'Envie uma imagem PNG de até 1 MB.'
            );
        }

        $binario = base64_decode(
            substr(
                $imagem,
                strlen($prefixo)
            ),
            true
        );

        if (
            $binario === false ||
            strlen($binario) < 60 ||
            strlen($binario) > 1024 * 1024 ||
            !str_starts_with(
                $binario,
                "\x89PNG\r\n\x1a\n"
            ) ||
            @getimagesizefromstring(
                $binario
            ) === false
        ) {
            $this->invalidar(
                'assinatura',
                'A imagem PNG da assinatura é inválida.'
            );
        }

        return $binario;
    }

    private function invalidar(
        string $campo,
        string $mensagem
    ): never {
        throw ValidationException::withMessages([
            $campo => $mensagem,
        ]);
    }
}
