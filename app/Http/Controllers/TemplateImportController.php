<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportTemplateContratoRequest;
use App\Http\Requests\PreviewTemplateImportRequest;
use App\Services\TemplateImportService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;

class TemplateImportController extends Controller
{
    public function __construct(
        private TemplateImportService $importService,
        private TenantContext $tenantContext
    ) {}

    public function preview(
        PreviewTemplateImportRequest $request
    ): JsonResponse {
        $result = $this->importService
            ->preview(
                $request->file(
                    'arquivo'
                )
            );

        return response()->json([
            'data' => $result,
        ]);
    }

    public function store(
        ImportTemplateContratoRequest $request
    ): JsonResponse {
        if (
            !$this->tenantContext
                ->hasTenant()
        ) {
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        $validated =
            $request->validated();

        $template =
            $this->importService
                ->import(
                    $request->file(
                        'arquivo'
                    ),
                    $this->tenantContext
                        ->requireId(),
                    $validated['nome'],
                    $validated[
                        'perfil_id'
                    ] ?? null
                );

        return response()->json([
            'message' =>
                'Template importado com sucesso.',
            'data' => $template,
        ], 201);
    }
}
