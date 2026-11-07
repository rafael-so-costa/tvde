<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\RgpdComprovativoPdfService;
use App\Services\RgpdRevogacaoService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class RgpdComprovativoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private RgpdComprovativoPdfService $pdf,
        private RgpdRevogacaoService $revogacao
    ) {}

    private function enabled(): void
    {
        abort_unless(
            config('rgpd.api_enabled', false) === true,
            404
        );
    }

    public function emitir(
        string $id
    ): JsonResponse {
        $this->enabled();

        $item = $this->pdf->emitir(
            $this->tenantContext->requireId(),
            $id
        );

        return response()->json([
            'data' => [
                'id' => $item->id,

                'tipo' => $item->tipo,

                'arquivo_sha256' =>
                    $item->arquivo_sha256,

                'emitido_em' =>
                    $item->emitido_em
                        ?->toIso8601String(),
            ],
        ]);
    }

    public function descarregar(
        string $id
    ): Response {
        $this->enabled();

        return $this->responderPdf(
            $this->tenantContext->requireId(),
            $id
        );
    }

    public function descarregarTitular(
        Request $request,
        string $id
    ): Response {
        $this->enabled();

        $tenantId =
            $this->tenantContext->requireId();

        /*
         * Verifica que o utilizador
         * autenticado é o titular vinculado.
         */
        $this->revogacao->consultar(
            $tenantId,
            (string)$request->user()->id,
            $id
        );

        return $this->responderPdf(
            $tenantId,
            $id
        );
    }

    private function responderPdf(
        string $tenantId,
        string $id
    ): Response {
        [, $binario] = $this->pdf->obter(
            $tenantId,
            $id
        );

        return response(
            $binario,
            200,
            [
                'Content-Type' =>
                    'application/pdf',

                'Content-Disposition' =>
                    'attachment; filename="RGPD-'.$id.'.pdf"',

                'Cache-Control' =>
                    'private, no-store, max-age=0',

                'X-Content-Type-Options' =>
                    'nosniff',
            ]
        );
    }
}
