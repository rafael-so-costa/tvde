<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\RgpdAssinatura;
use App\Models\RgpdRegisto;
use App\Services\RgpdAssinaturaPreparacaoService;
use App\Services\RgpdConsentimentoService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class RgpdRegistoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private RgpdConsentimentoService $consentimentos,
        private RgpdAssinaturaPreparacaoService $assinaturas
    ) {}

    /*
     * FROTAPRO_4R91_API_GUARD
     *
     * Esta API permanece desligada
     * ate ao fim da integracao RGPD.
     *
     * O modelo global continua visivel
     * no backoffice SaaS independentemente
     * desta configuracao.
     */
    private function enabled(): void
    {
        if (
            config(
                'rgpd.api_enabled',
                false
            ) !== true
        ) {
            abort(
                404,
                'Modulo RGPD ainda indisponivel.'
            );
        }
    }

    private function tenantId(): string
    {
        return $this->tenantContext->requireId();
    }

    /*
     * GET /api/rgpd
     *
     * Apenas registos do tenant.
     */
    public function index(): JsonResponse
    {
        $this->enabled();

        $registos = RgpdRegisto::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'data' => $registos->items(),

            'pagination' => [
                'current_page' =>
                    $registos->currentPage(),

                'last_page' =>
                    $registos->lastPage(),

                'per_page' =>
                    $registos->perPage(),

                'total' =>
                    $registos->total(),
            ],
        ]);
    }

    /*
     * GET /api/rgpd/{id}
     *
     * Historico de decisoes e estado
     * da assinatura, sem expor tokens,
     * OTP ou ficheiros privados.
     */
    public function show(
        string $id
    ): JsonResponse {
        $this->enabled();

        $tenantId = $this->tenantId();

        $registo = RgpdRegisto::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereKey($id)
            ->with('eventos')
            ->firstOrFail();

        $assinatura = RgpdAssinatura::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'rgpd_registo_id',
                $id
            )
            ->first([
                'id',
                'modo',
                'status',
                'signatario_nome',
                'signatario_email',
                'documento_sha256',
                'escolhas_sha256',
                'solicitado_em',
                'assinado_em',
            ]);

        return response()->json([
            'data' => [
                'registo' => $registo,
                'assinatura' => $assinatura,
            ],
        ]);
    }

    /*
     * POST /api/rgpd/rascunhos
     *
     * Nunca cria consentimento assinado.
     * Todas as escolhas sao obrigatorias.
     */
    public function store(
        Request $request
    ): JsonResponse {
        $this->enabled();

        $validated = $request->validate([
            'titular_tipo' => [
                'required',
                Rule::in([
                    'motorista',
                    'proprietario',
                    'colaborador',
                    'outro',
                ]),
            ],

            'titular_id' => [
                'nullable',
                'uuid',
            ],

            'titular_nome' => [
                'nullable',
                'string',
                'max:255',
            ],

            'escolhas' => [
                'required',
                'array',
                'size:4',
            ],

            'escolhas.imagem' => [
                'required',
                Rule::in([
                    'autorizo',
                    'nao_autorizo',
                    'nao_aplicavel',
                ]),
            ],

            'escolhas.voz' => [
                'required',
                Rule::in([
                    'autorizo',
                    'nao_autorizo',
                    'nao_aplicavel',
                ]),
            ],

            'escolhas.localizacao' => [
                'required',
                Rule::in([
                    'autorizo',
                    'nao_autorizo',
                    'nao_aplicavel',
                ]),
            ],

            'escolhas.dados_sensiveis' => [
                'required',
                Rule::in([
                    'autorizo',
                    'nao_autorizo',
                    'nao_aplicavel',
                ]),
            ],

            'finalidades_especificas' => [
                'sometimes',
                'array',
            ],

            'finalidades_especificas.*' => [
                'required',
                'string',
                'max:500',
            ],
        ]);

        $registo = $this->consentimentos
            ->criarRascunho(
                $this->tenantId(),
                (string)$request->user()->id,
                $validated['titular_tipo'],
                $validated['titular_id'] ?? null,
                $validated['titular_nome'] ?? null,
                $validated['escolhas'],
                $validated['finalidades_especificas']
                    ?? []
            );

        return response()->json([
            'message' =>
                'Rascunho RGPD criado. '.
                'Ainda nao constitui consentimento assinado.',

            'data' => $registo,
        ], 201);
    }

    /*
     * POST /api/rgpd/{id}/assinatura/preparar
     *
     * Apenas prepara o pedido.
     * Nao envia OTP nem marca como assinado.
     */
    public function prepararAssinatura(
        Request $request,
        string $id
    ): JsonResponse {
        $this->enabled();

        $validated = $request->validate([
            'modo' => [
                'required',
                Rule::in([
                    'presencial',
                    'remota',
                ]),
            ],

            'signatario_nome' => [
                'required',
                'string',
                'max:255',
            ],

            'signatario_email' => [
                'nullable',
                'email',
                'max:190',
            ],
        ]);

        $assinatura = $this->assinaturas
            ->preparar(
                $this->tenantId(),
                (string)$request->user()->id,
                $id,
                $validated['modo'],
                $validated['signatario_nome'],
                $validated['signatario_email']
                    ?? null
            );

        return response()->json([
            'message' =>
                'Preparacao da assinatura RGPD registada.',

            'data' => [
                'id' =>
                    $assinatura->id,

                'rgpd_registo_id' =>
                    $assinatura->rgpd_registo_id,

                'modo' =>
                    $assinatura->modo,

                'status' =>
                    $assinatura->status,

                'documento_sha256' =>
                    $assinatura->documento_sha256,

                'escolhas_sha256' =>
                    $assinatura->escolhas_sha256,
            ],
        ]);
    }

    /*
     * POST /api/rgpd/{id}/escolhas/{finalidade}/revogar
     *
     * Apenas revoga uma escolha
     * de um rascunho ainda nao assinado.
     */
    public function revogarRascunho(
        Request $request,
        string $id,
        string $finalidade
    ): JsonResponse {
        $this->enabled();

        $registo = $this->consentimentos
            ->revogarEscolhaRascunho(
                $this->tenantId(),
                (string)$request->user()->id,
                $id,
                $finalidade
            );

        return response()->json([
            'message' =>
                'Escolha retirada do rascunho. '.
                'O historico foi preservado.',

            'data' => $registo,
        ]);
    }
}
