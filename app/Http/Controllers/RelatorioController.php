<?php

namespace App\Http\Controllers;

use App\Http\Requests\RelatorioRequest;
use App\Services\RelatorioService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;

class RelatorioController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private RelatorioService $relatorios
    ){}

    public function resumo(
        RelatorioRequest $request
    ): JsonResponse {
        return $this->response(
            $this
                ->relatorios
                ->resumo(
                    $this->tenantId(),
                    $request->validated()
                )
        );
    }

    public function documentos(
        RelatorioRequest $request
    ): JsonResponse {
        return $this->response(
            $this
                ->relatorios
                ->documentos(
                    $this->tenantId(),
                    $request->validated()
                )
        );
    }

    public function veiculos(
        RelatorioRequest $request
    ): JsonResponse {
        return $this->response(
            $this
                ->relatorios
                ->veiculos(
                    $this->tenantId(),
                    $request->validated()
                )
        );
    }

    public function motoristas(
        RelatorioRequest $request
    ): JsonResponse {
        return $this->response(
            $this
                ->relatorios
                ->motoristas(
                    $this->tenantId(),
                    $request->validated()
                )
        );
    }

    public function ocorrencias(
        RelatorioRequest $request
    ): JsonResponse {
        return $this->response(
            $this
                ->relatorios
                ->ocorrencias(
                    $this->tenantId(),
                    $request->validated()
                )
        );
    }

    public function alugueres(
        RelatorioRequest $request
    ): JsonResponse {
        return $this->response(
            $this
                ->relatorios
                ->alugueres(
                    $this->tenantId(),
                    $request->validated()
                )
        );
    }

    private function response(
        array $data
    ): JsonResponse {
        return response()->json([
            'data'=>$data,
        ]);
    }

    private function tenantId(): string
    {
        return $this
            ->tenantContext
            ->requireId();
    }
}
