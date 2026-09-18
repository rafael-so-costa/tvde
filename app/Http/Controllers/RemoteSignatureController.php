<?php

namespace App\Http\Controllers;

use App\Http\Requests\ConfirmRemoteSignatureRequest;
use App\Services\ContratoService;
use Illuminate\Http\JsonResponse;

class RemoteSignatureController extends Controller
{
    public function __construct(
        private ContratoService $contratoService
    ) {}

    public function show(
        string $token
    ): JsonResponse {
        return response()->json([
            'data' =>
                $this->contratoService
                    ->remoteSignaturePreview(
                        $token
                    ),
        ]);
    }

    public function confirm(
        ConfirmRemoteSignatureRequest $request,
        string $token
    ): JsonResponse {
        $result =
            $this->contratoService
                ->confirmRemoteSignature(
                    $token,
                    $request->string(
                        'codigo_otp'
                    )->toString(),
                    $request->string(
                        'assinatura'
                    )->toString(),
                    $request->ip(),
                    $request->userAgent()
                );

        return response()->json([
            'message' =>
                'Assinatura registada com sucesso.',
            'data' => $result,
        ]);
    }
}
