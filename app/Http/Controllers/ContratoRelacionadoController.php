<?php

namespace App\Http\Controllers;

use App\Services\ContratoRelacionadoService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContratoRelacionadoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private ContratoRelacionadoService $service
    ) {}

    public function show(
        string $contratoId,
        string $itemId
    ): JsonResponse {
        return response()->json([
            'data' => $this->service
                ->status(
                    $this
                        ->tenantContext
                        ->requireId(),
                    $contratoId,
                    $itemId
                ),
        ]);
    }

    public function configureTargetType(
        Request $request,
        string $contratoId,
        string $itemId
    ): JsonResponse {
        $validated =
            $request->validate([
                'tipo_contrato_id' => [
                    'required',
                    'uuid',
                ],
            ]);

        return response()->json([
            'message' => 'Tipo de contrato relacionado definido com sucesso.',

            'data' => $this->service
                ->configureTargetType(
                    $this
                        ->tenantContext
                        ->requireId(),
                    $contratoId,
                    $itemId,
                    $validated[
                        'tipo_contrato_id'
                    ]
                ),
        ]);
    }

    public function link(
        Request $request,
        string $contratoId,
        string $itemId
    ): JsonResponse {
        $validated =
            $request->validate([
                'contrato_relacionado_id' => [
                    'required',
                    'uuid',
                ],
            ]);

        return response()->json([
            'message' => 'Contrato relacionado associado com sucesso.',

            'data' => $this->service
                ->link(
                    $this
                        ->tenantContext
                        ->requireId(),
                    $contratoId,
                    $itemId,
                    $validated[
                        'contrato_relacionado_id'
                    ],
                    $request->user()
                ),
        ], 201);
    }
}
