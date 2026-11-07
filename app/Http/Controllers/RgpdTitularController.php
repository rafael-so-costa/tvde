<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\RgpdRevogacaoService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RgpdTitularController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private RgpdRevogacaoService $service
    ) {}

    private function enabled(): void
    {
        if (
            config(
                'rgpd.api_enabled',
                false
            ) !== true
        ) {
            abort(404);
        }
    }

    public function show(
        Request $request,
        string $id
    ): JsonResponse {
        $this->enabled();

        return response()->json([
            'data' => $this->service->consultar(
                $this->tenantContext->requireId(),
                (string)$request->user()->id,
                $id
            ),
        ]);
    }

    /*
     * Requer autenticacao e confirmacao
     * expressa do proprio titular.
     *
     * A operacao nao modifica a assinatura
     * nem remove eventos anteriores.
     */
    public function retirar(
        Request $request,
        string $id,
        string $finalidade
    ): JsonResponse {
        $this->enabled();

        $request->validate([
            'confirmacao' => [
                'required',
                'accepted',
            ],
        ]);

        $resultado = $this->service->retirar(
            $this->tenantContext->requireId(),
            (string)$request->user()->id,
            $id,
            $finalidade
        );

        return response()->json([
            'message' =>
                'Autorização retirada. O histórico '.
                'original foi preservado.',

            'data' => $resultado,
        ]);
    }
}
