<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Funcionario;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\RgpdEvento;
use App\Models\RgpdRegisto;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class RgpdConsentimentoService
{
    public const FINALIDADES = [
        'imagem',
        'voz',
        'localizacao',
        'dados_sensiveis',
    ];

    public function __construct(
        private FrotaProDocumentCatalog $catalog
    ) {}

    /*
     * FROTAPRO_4R7_RGPD_DRAFT
     *
     * Cria apenas um rascunho.
     *
     * Nao constitui consentimento confirmado.
     * Nao assina ou publica qualquer documento.
     */
    public function criarRascunho(
        string $tenantId,
        string $atorId,
        string $titularTipo,
        ?string $titularId,
        ?string $titularNome,
        array $escolhas,
        array $finalidadesEspecificas = []
    ): RgpdRegisto {
        $this->validarAtor(
            $tenantId,
            $atorId
        );

        $this->validarTitular(
            $tenantId,
            $titularTipo,
            $titularId,
            $titularNome
        );

        $this->validarEscolhas(
            $escolhas,
            $finalidadesEspecificas
        );

        $documento = $this->catalog->find(
            'informacao_tratamento_dados_rgpd'
        );

        if (
            !$documento ||
            ($documento['publicavel'] ?? true) !== false
        ) {
            throw ValidationException::withMessages([
                'modelo' =>
                    'Rascunho global RGPD indisponível '.
                    'ou inesperadamente publicável.',
            ]);
        }

        $conteudo = $this->catalog->content(
            $documento
        );

        return DB::transaction(
            function () use (
                $tenantId,
                $atorId,
                $titularTipo,
                $titularId,
                $titularNome,
                $escolhas,
                $finalidadesEspecificas,
                $documento,
                $conteudo
            ): RgpdRegisto {
                $registo = new RgpdRegisto([
                    'titular_tipo' => $titularTipo,

                    'titular_id' => $titularId,

                    'titular_nome' =>
                        $titularNome
                            ? trim($titularNome)
                            : null,

                    'modelo_codigo' =>
                        $documento['codigo'],

                    'versao_documento' =>
                        $documento['versao'],

                    'documento_sha256' =>
                        hash('sha256', $conteudo),

                    'finalidades_especificas' =>
                        $finalidadesEspecificas,

                    'estado' => 'rascunho',
                ]);

                $registo->tenant_id = $tenantId;
                $registo->criado_por = $atorId;
                $registo->save();

                foreach (
                    self::FINALIDADES
                    as $finalidade
                ) {
                    $evento = new RgpdEvento([
                        'finalidade' => $finalidade,
                        'tipo' => 'decisao',
                        'escolha' =>
                            $escolhas[$finalidade],
                        'ocorrido_em' => now(),
                    ]);

                    $evento->tenant_id = $tenantId;

                    $evento->rgpd_registo_id =
                        $registo->id;

                    $evento->ator_id = $atorId;

                    $evento->save();
                }

                return $registo->load('eventos');
            }
        );
    }

    /*
     * Revoga apenas uma escolha ainda em rascunho.
     *
     * A revogacao de um consentimento ja assinado
     * sera tratada separadamente na integracao
     * com o modulo de assinaturas.
     */
    public function revogarEscolhaRascunho(
        string $tenantId,
        string $atorId,
        string $registoId,
        string $finalidade
    ): RgpdRegisto {
        $this->validarAtor(
            $tenantId,
            $atorId
        );

        if (
            !in_array(
                $finalidade,
                self::FINALIDADES,
                true
            )
        ) {
            throw ValidationException::withMessages([
                'finalidade' =>
                    'Finalidade desconhecida.',
            ]);
        }

        return DB::transaction(
            function () use (
                $tenantId,
                $atorId,
                $registoId,
                $finalidade
            ): RgpdRegisto {
                $registo = RgpdRegisto::query()
                    ->where('tenant_id', $tenantId)
                    ->whereKey($registoId)
                    ->lockForUpdate()
                    ->firstOrFail();

                if (
                    $registo->estado !== 'rascunho'
                ) {
                    throw ValidationException::withMessages([
                        'registo' =>
                            'Esta operação só é permitida '.
                            'em rascunhos.',
                    ]);
                }

                $escolha = RgpdEvento::query()
                    ->where('tenant_id', $tenantId)
                    ->where(
                        'rgpd_registo_id',
                        $registoId
                    )
                    ->where(
                        'finalidade',
                        $finalidade
                    )
                    ->where('tipo', 'decisao')
                    ->first();

                if (
                    !$escolha ||
                    $escolha->escolha !== 'autorizo'
                ) {
                    throw ValidationException::withMessages([
                        'finalidade' =>
                            'Não existe uma autorização '.
                            'em rascunho para retirar.',
                    ]);
                }

                $jaRevogado = RgpdEvento::query()
                    ->where('tenant_id', $tenantId)
                    ->where(
                        'rgpd_registo_id',
                        $registoId
                    )
                    ->where(
                        'finalidade',
                        $finalidade
                    )
                    ->where('tipo', 'revogacao')
                    ->exists();

                if ($jaRevogado) {
                    throw ValidationException::withMessages([
                        'finalidade' =>
                            'Esta escolha já foi retirada.',
                    ]);
                }

                $evento = new RgpdEvento([
                    'finalidade' => $finalidade,
                    'tipo' => 'revogacao',
                    'escolha' => 'revogado',
                    'ocorrido_em' => now(),
                ]);

                $evento->tenant_id = $tenantId;

                $evento->rgpd_registo_id =
                    $registo->id;

                $evento->ator_id = $atorId;

                $evento->save();

                return $registo->load('eventos');
            }
        );
    }

    private function validarAtor(
        string $tenantId,
        string $atorId
    ): void {
        $ativo = User::query()
            ->whereKey($atorId)
            ->where('ativo', true)
            ->exists()

            && TenantUser::query()
                ->where('tenant_id', $tenantId)
                ->where('user_id', $atorId)
                ->where('status', 'ativo')
                ->exists();

        if (!$ativo) {
            throw ValidationException::withMessages([
                'ator' =>
                    'Utilizador sem vínculo ativo ao tenant.',
            ]);
        }
    }

    private function validarTitular(
        string $tenantId,
        string $tipo,
        ?string $id,
        ?string $nome
    ): void {
        $model = match ($tipo) {
            'motorista' => Motorista::class,
            'proprietario' => Proprietario::class,
            'colaborador' => Funcionario::class,
            'outro' => null,
            default => false,
        };

        if ($model === false) {
            throw ValidationException::withMessages([
                'titular_tipo' =>
                    'Tipo de titular inválido.',
            ]);
        }

        if (
            $nome !== null &&
            mb_strlen($nome) > 255
        ) {
            throw ValidationException::withMessages([
                'titular_nome' =>
                    'Nome do titular demasiado longo.',
            ]);
        }

        if ($model === null) {
            if (
                $id !== null ||
                !is_string($nome) ||
                trim($nome) === ''
            ) {
                throw ValidationException::withMessages([
                    'titular' =>
                        'Para outros titulares, indique '.
                        'nome válido e nenhum ID interno.',
                ]);
            }

            return;
        }

        if (
            !$id ||
            !Str::isUuid($id) ||
            !$model::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($id)
                ->exists()
        ) {
            throw ValidationException::withMessages([
                'titular_id' =>
                    'Titular inexistente ou pertencente '.
                    'a outra organização.',
            ]);
        }
    }

    private function validarEscolhas(
        array $escolhas,
        array $especificas
    ): void {
        $enviadas = array_keys($escolhas);
        $esperadas = self::FINALIDADES;

        sort($enviadas);
        sort($esperadas);

        if ($enviadas !== $esperadas) {
            throw ValidationException::withMessages([
                'escolhas' =>
                    'São obrigatórias quatro escolhas '.
                    'independentes, sem campos extra.',
            ]);
        }

        foreach (
            self::FINALIDADES
            as $finalidade
        ) {
            if (
                !in_array(
                    $escolhas[$finalidade],
                    [
                        'autorizo',
                        'nao_autorizo',
                        'nao_aplicavel',
                    ],
                    true
                )
            ) {
                throw ValidationException::withMessages([
                    $finalidade =>
                        'Escolha inválida ou não preenchida.',
                ]);
            }
        }

        $permitidas = [
            'localizacao',
            'dados_sensiveis',
            'artigo_6',
            'artigo_9',
        ];

        foreach (
            $especificas
            as $chave => $valor
        ) {
            if (
                !in_array(
                    $chave,
                    $permitidas,
                    true
                ) ||
                !is_string($valor) ||
                mb_strlen($valor) > 500
            ) {
                throw ValidationException::withMessages([
                    'finalidades_especificas' =>
                        'Campo de finalidade inválido.',
                ]);
            }
        }

        if (
            $escolhas['localizacao'] === 'autorizo' &&
            trim($especificas['localizacao'] ?? '') === ''
        ) {
            throw ValidationException::withMessages([
                'localizacao' =>
                    'Uma autorização de localização '.
                    'precisa de finalidade específica.',
            ]);
        }

        if (
            $escolhas['dados_sensiveis'] === 'autorizo'
        ) {
            foreach (
                [
                    'dados_sensiveis',
                    'artigo_6',
                    'artigo_9',
                ]
                as $chave
            ) {
                if (
                    trim($especificas[$chave] ?? '') === ''
                ) {
                    throw ValidationException::withMessages([
                        'dados_sensiveis' =>
                            'Defina finalidade e fundamentos '.
                            'dos artigos 6.º e 9.º.',
                    ]);
                }
            }
        }
    }
}
