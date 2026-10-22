<?php

namespace App\Http\Controllers;

use App\Http\Requests\PreviewContratoRequest;
use App\Services\ContratoPreviewService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;

class ContratoPreviewController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private ContratoPreviewService $previewService
    ) {}

    public function preview(
        PreviewContratoRequest $request
    ): JsonResponse {
        if(
            !$this
                ->tenantContext
                ->hasTenant()
        ){
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        $result=
            $this
                ->previewService
                ->preview(
                    $request->validated(),
                    $this
                        ->tenantContext
                        ->requireId()
                );

        return response()->json([
            'data'=>$result,
        ]);
    }
}
