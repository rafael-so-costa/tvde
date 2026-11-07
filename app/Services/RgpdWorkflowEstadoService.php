<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\RgpdAssinatura;
use App\Models\RgpdWorkflowEvidencia;
use App\Models\RgpdComprovativo;
use App\Models\RgpdRegisto;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class RgpdWorkflowEstadoService
{
    private const WORKFLOW =
        'rgpd_informacao_autorizacoes';

    private const ETAPAS = [
        'identificar_titular',
        'validar_informacao',
        'gerar_documento_rgpd',
        'comprovar_disponibilizacao',
        'registar_autorizacoes',
        'comprovar_assinatura_titular',
        'conferencia_rgpd',
    ];

    public function __construct(
        private FrotaProWorkflowCatalog $catalogo
    ) {}

    /*
     * FROTAPRO_4R103_WORKFLOW_EVIDENCE
     *
     * Projecao somente de leitura.
     *
     * Nenhuma etapa e concluida por
     * simples pedido de um operador.
     *
     * Validacoes humanas, disponibilizacao
     * do documento e conferencia final
     * permanecem pendentes ate existir
     * prova auditavel dessas operacoes.
     */
    public function consultar(
        string $tenantId,
        string $registoId
    ): array {
        $registo = RgpdRegisto::query()
            ->where('tenant_id', $tenantId)
            ->whereKey($registoId)
            ->firstOrFail();

        $workflow = collect(
            $this->catalogo->all()
        )->firstWhere(
            'codigo',
            self::WORKFLOW
        );

        if (
            !$workflow ||
            ($workflow['publicavel'] ?? true) !== false
        ) {
            throw new RuntimeException(
                'Workflow RGPD de rascunho indisponível.'
            );
        }

        $itens = collect(
            $workflow['items'] ?? []
        )
            ->sortBy('ordem')
            ->values();

        if (
            $itens->pluck('codigo')->all()
            !== self::ETAPAS
        ) {
            throw new RuntimeException(
                'As sete etapas RGPD diferem do catálogo.'
            );
        }

        $eventos = $registo->eventos()->get();

        $decisoes = $eventos->where(
            'tipo',
            'decisao'
        );

        $escolhas = [];

        $escolhasValidas =
            $decisoes->count() === 4;

        foreach (
            RgpdConsentimentoService::FINALIDADES
            as $finalidade
        ) {
            $encontradas = $decisoes->where(
                'finalidade',
                $finalidade
            );

            if (
                $encontradas->count() !== 1
            ) {
                $escolhasValidas = false;
                continue;
            }

            $valor = $encontradas
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
                $escolhasValidas = false;
                continue;
            }

            $escolhas[$finalidade] = $valor;
        }

        /*
         * Snapshot documental.
         *
         * Conferir o texto historico
         * e nao a versao atual do catalogo.
         */
        $texto = $registo
            ->documento_texto_snapshot;

        $snapshotValido =
            is_string($texto) &&
            trim($texto) !== '' &&
            hash_equals(
                (string)$registo->documento_sha256,
                hash('sha256', $texto)
            );

        $identificado = in_array(
            $registo->titular_tipo,
            [
                'motorista',
                'proprietario',
                'colaborador',
                'outro',
            ],
            true
        ) && filled(
            $registo->titular_nome
        );

        /*
         * Evidencia da assinatura.
         *
         * Verificar os hashes originais,
         * as quatro escolhas, o ficheiro
         * privado e o evento de assinatura.
         */
        $assinatura = RgpdAssinatura::query()
            ->where('tenant_id', $tenantId)
            ->where(
                'rgpd_registo_id',
                $registo->id
            )
            ->first();

        $assinaturaValida = false;

        if (
            $snapshotValido &&
            $escolhasValidas &&
            $identificado &&
            $assinatura &&
            $registo->estado === 'assinado' &&
            $assinatura->status === 'assinado' &&
            $assinatura->assinado_em !== null &&
            $eventos->where(
                'tipo',
                'assinatura'
            )->count() === 1 &&
            hash_equals(
                (string)$registo->documento_sha256,
                (string)$assinatura->documento_sha256
            )
        ) {
            $snapshot = [
                'tenant_id' => $tenantId,

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
                    $registo->finalidades_especificas
                    ?? [],
            ];

            $hash = hash(
                'sha256',
                json_encode(
                    $snapshot,
                    JSON_UNESCAPED_UNICODE |
                    JSON_UNESCAPED_SLASHES |
                    JSON_THROW_ON_ERROR
                )
            );

            $disk = Storage::disk('local');

            $path = (string)$assinatura
                ->assinatura_path;

            if (
                $path !== '' &&
                $disk->exists($path) &&
                hash_equals(
                    (string)$assinatura->escolhas_sha256,
                    $hash
                )
            ) {
                $imagem = $disk->get($path);

                $assinaturaValida =
                    str_starts_with(
                        $imagem,
                        "\x89PNG\r\n\x1a\n"
                    ) &&
                    hash_equals(
                        (string)$assinatura->assinatura_sha256,
                        hash('sha256', $imagem)
                    );
            }
        }

        /*
         * Verificar o PDF original, caso exista.
         *
         * O PDF nao comprova, por si so,
         * que foi disponibilizado ao titular.
         */
        $pdfValido = false;

        $comprovativo = RgpdComprovativo::query()
            ->where('tenant_id', $tenantId)
            ->where(
                'rgpd_registo_id',
                $registo->id
            )
            ->where(
                'tipo',
                'original_assinado'
            )
            ->first();

        if (
            $assinaturaValida &&
            $comprovativo
        ) {
            $path = (string)$comprovativo
                ->arquivo_path;

            $disk = Storage::disk('local');

            if (
                $path !== '' &&
                $disk->exists($path) &&
                hash_equals(
                    (string)$comprovativo->documento_sha256,
                    (string)$registo->documento_sha256
                ) &&
                hash_equals(
                    (string)$comprovativo->assinatura_sha256,
                    (string)$assinatura->assinatura_sha256
                )
            ) {
                $bytes = $disk->get($path);

                $pdfValido =
                    str_starts_with(
                        $bytes,
                        '%PDF-'
                    ) &&
                    hash_equals(
                        (string)$comprovativo->arquivo_sha256,
                        hash('sha256', $bytes)
                    );
            }
        }

        /*
         * Estados baseados exclusivamente
         * nas evidencias ja implementadas.
         */
        $concluidas = [
            'identificar_titular' =>
                $identificado,

            'validar_informacao' =>
                false,

            'gerar_documento_rgpd' =>
                $snapshotValido,

            'comprovar_disponibilizacao' =>
                false,

            'registar_autorizacoes' =>
                $escolhasValidas,

            'comprovar_assinatura_titular' =>
                $assinaturaValida,

            'conferencia_rgpd' =>
                false,
        ];

        /*
         * FROTAPRO_4R1041_WORKFLOW_EVIDENCE_READ
         *
         * Confirmar evidencias imutaveis.
         * Nenhuma etapa humana e concluida
         * sem HMAC valido e dependencias reais.
         */
        $evidencias = RgpdWorkflowEvidencia::query()
            ->where('tenant_id', $tenantId)
            ->where(
                'rgpd_registo_id',
                $registo->id
            )
            ->get()
            ->keyBy('codigo_etapa');

        $evidenciaValida = static function (
            string $codigo,
            ?string $assinaturaHash = null,
            ?string $pdfHash = null
        ) use (
            $evidencias,
            $registo
        ): bool {
            $item = $evidencias->get($codigo);

            if (
                !$item ||
                !$item->integridadeValida() ||
                !hash_equals(
                    (string)$registo->documento_sha256,
                    (string)$item->documento_sha256
                )
            ) {
                return false;
            }

            if (
                $item->assinatura_sha256 !==
                $assinaturaHash ||
                $item->pdf_sha256 !== $pdfHash
            ) {
                return false;
            }

            return true;
        };

        $concluidas['validar_informacao'] =
            $identificado &&
            $snapshotValido &&
            $escolhasValidas &&
            $evidenciaValida(
                'validar_informacao'
            );

        $concluidas['comprovar_disponibilizacao'] =
            $concluidas['validar_informacao'] &&
            $evidenciaValida(
                'comprovar_disponibilizacao'
            );

        $concluidas['conferencia_rgpd'] =
            $concluidas['identificar_titular'] &&
            $concluidas['validar_informacao'] &&
            $concluidas['gerar_documento_rgpd'] &&
            $concluidas['comprovar_disponibilizacao'] &&
            $concluidas['registar_autorizacoes'] &&
            $concluidas['comprovar_assinatura_titular'] &&
            $pdfValido &&
            $assinatura !== null &&
            $comprovativo !== null &&
            $evidenciaValida(
                'conferencia_rgpd',
                (string)$assinatura?->assinatura_sha256,
                (string)$comprovativo?->arquivo_sha256
            ) &&
            $evidencias->get('validar_informacao')?->ator_id !==
                $evidencias->get('conferencia_rgpd')?->ator_id;
        $justificacoes = [
            'identificar_titular' =>
                $identificado
                    ? 'Identificação do titular presente.'
                    : 'Identificação incompleta.',

            'validar_informacao' =>
                'Pendente de validação humana auditada.',

            'gerar_documento_rgpd' =>
                $snapshotValido
                    ? 'Texto integral congelado e confirmado por SHA-256.'
                    : 'Snapshot documental ausente ou divergente.',

            'comprovar_disponibilizacao' =>
                'Falta comprovativo verificável da disponibilização ao titular.',

            'registar_autorizacoes' =>
                $escolhasValidas
                    ? 'Quatro decisões explícitas preservadas no histórico.'
                    : 'Decisões incompletas ou inconsistentes.',

            'comprovar_assinatura_titular' =>
                $assinaturaValida
                    ? 'Assinatura e escolhas confirmadas por hashes e ficheiro privado.'
                    : 'Falta assinatura concluída com integridade confirmada.',

            'conferencia_rgpd' =>
                'Pendente de conferência final auditada.',
        ];

        if ($concluidas['validar_informacao']) {
            $justificacoes['validar_informacao'] =
                'Validação identificada, auditada e íntegra.';
        }

        if ($concluidas['comprovar_disponibilizacao']) {
            $justificacoes['comprovar_disponibilizacao'] =
                'Titular autenticado confirmou o documento apresentado.';
        }

        if ($concluidas['conferencia_rgpd']) {
            $justificacoes['conferencia_rgpd'] =
                'Conferência concluída por segundo responsável com PDF íntegro.';
        }
        return [
            'codigo' => self::WORKFLOW,

            'registo_id' =>
                $registo->id,

            'estado_registo' =>
                $registo->estado,

            'publicavel' =>
                false,

            'etapas' => $itens->map(
                fn (array $item): array => [
                    'codigo' =>
                        $item['codigo'],

                    'ordem' =>
                        $item['ordem'],

                    'titulo' =>
                        $item['titulo'],

                    'tipo' =>
                        $item['tipo'],

                    'estado' =>
                        $concluidas[$item['codigo']]
                            ? 'concluido'
                            : 'pendente',

                    'evidencia' =>
                        $justificacoes[$item['codigo']],
                ]
            )->all(),

            'resumo' => [
                'etapas_concluidas' =>
                    count(array_filter($concluidas)),

                'etapas_total' =>
                    count(self::ETAPAS),

                'snapshot_integro' =>
                    $snapshotValido,

                'assinatura_integra' =>
                    $assinaturaValida,

                'comprovativo_pdf_integro' =>
                    $pdfValido,

                'revogacoes_registadas' =>
                    $eventos->where(
                        'tipo',
                        'revogacao'
                    )->count(),

                'conferencia_final_pendente' =>
                    !$concluidas['conferencia_rgpd'],
            ],
        ];
    }
}
