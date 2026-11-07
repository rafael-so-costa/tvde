<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\RgpdWorkflowEvidenciaService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

final class RgpdWorkflowEvidenciaController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private RgpdWorkflowEvidenciaService $service
    ) {}

    private function enabled(): void
    {
        abort_unless(
            config('rgpd.api_enabled', false) === true,
            404
        );
    }

    public function validar(
        Request $request,
        string $id
    ): JsonResponse {
        $this->enabled();

        $data = $request->validate([
            'referencia' => [
                'required',
                'string',
                'min:10',
                'max:500',
            ],

            'confirmacao' => [
                'required',
                'accepted',
            ],
        ]);

        $item = $this->service->validarInformacao(
            $this->tenantContext->requireId(),
            (string)$request->user()->id,
            $id,
            $data['referencia']
        );

        return response()->json([
            'data' => [
                'id' => $item->id,
                'codigo_etapa' =>
                    $item->codigo_etapa,
            ],
        ]);
    }

    public function documento(
        Request $request,
        string $id
    ): JsonResponse {
        $this->enabled();

        $data = $this->service->apresentarDocumento(
            $this->tenantContext->requireId(),
            (string)$request->user()->id,
            $id
        );

        /*
         * A confirmacao posterior exige
         * que o documento tenha sido servido
         * nesta sessao autenticada.
         */
        $request->session()->put(
            'rgpd_documento_exibido_'.$id,
            $data['documento_sha256']
        );

        return response()->json([
            'data' => $data,
        ]);
    }

    public function confirmarDisponibilizacao(
        Request $request,
        string $id
    ): JsonResponse {
        $this->enabled();

        $data = $request->validate([
            'documento_sha256' => [
                'required',
                'string',
                'size:64',
                'regex:/\A[a-f0-9]{64}\z/',
            ],

            'confirmacao' => [
                'required',
                'accepted',
            ],
        ]);

        $exibido = $request->session()->get(
            'rgpd_documento_exibido_'.$id
        );

        if (
            !is_string($exibido) ||
            !hash_equals(
                $exibido,
                $data['documento_sha256']
            )
        ) {
            throw ValidationException::withMessages([
                'documento' =>
                    'O documento deve ser consultado nesta sessão antes da confirmação.',
            ]);
        }

        $item = $this->service
            ->confirmarDisponibilizacao(
                $this->tenantContext->requireId(),
                (string)$request->user()->id,
                $id,
                $data['documento_sha256']
            );

        $request->session()->forget(
            'rgpd_documento_exibido_'.$id
        );

        return response()->json([
            'data' => [
                'id' => $item->id,
                'codigo_etapa' =>
                    $item->codigo_etapa,
            ],
        ]);
    }

    public function conferir(
        Request $request,
        string $id
    ): JsonResponse {
        $this->enabled();

        $data = $request->validate([
            'referencia' => [
                'required',
                'string',
                'min:10',
                'max:500',
            ],

            'confirmacao' => [
                'required',
                'accepted',
            ],
        ]);

        $item = $this->service->conferir(
            $this->tenantContext->requireId(),
            (string)$request->user()->id,
            $id,
            $data['referencia']
        );

        return response()->json([
            'data' => [
                'id' => $item->id,
                'codigo_etapa' =>
                    $item->codigo_etapa,
            ],
        ]);
    }
}
