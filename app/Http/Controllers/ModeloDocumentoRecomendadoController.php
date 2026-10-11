<?php

namespace App\Http\Controllers;

use App\Services\ModeloDocumentoSaasService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ModeloDocumentoRecomendadoController extends Controller
{
    public function __construct(
        private ModeloDocumentoSaasService $service,
        private TenantContext $tenantContext
    ) {}

    public function index(
        Request $request
    ): JsonResponse {
        $validated =
            $request->validate([
                'categoria_id' => [
                    'nullable',
                    'uuid',
                ],

                'search' => [
                    'nullable',
                    'string',
                    'max:255',
                ],
            ]);

        return response()->json(
            $this->service
                ->catalog(
                    $validated
                )
        );
    }

    public function show(
        string $id
    ): JsonResponse {
        return response()->json([
            'data' =>
                $this->service
                    ->catalogShow(
                        $id
                    ),
        ]);
    }

    public function compareTemplate(
        string $templateId
    ): JsonResponse {
        return response()->json([
            'data' =>
                $this->service
                    ->compareTenantTemplate(
                        $this
                            ->tenantContext
                            ->requireId(),
                        $templateId
                    ),
        ]);
    }

    public function updateTemplate(
        Request $request,
        string $templateId
    ): JsonResponse {
        return response()->json([
            'message' =>
                'Nova versão adotada com sucesso.',

            'data' =>
                $this->service
                    ->adoptLatestVersion(
                        $this
                            ->tenantContext
                            ->requireId(),
                        $templateId,
                        $request->user()
                    ),
        ], 201);
    }
    public function useModel(
        Request $request,
        string $id
    ): JsonResponse {
        $tenantId =
            $this->tenantContext
                ->requireId();

        $validated =
            $request->validate([
                'nome' => [
                    'sometimes',
                    'nullable',
                    'string',
                    'max:255',
                ],

                'perfil_id' => [
                    'sometimes',
                    'nullable',
                    'uuid',

                    Rule::exists(
                        'perfis_template',
                        'id'
                    )->where(
                        fn($query) =>
                            $query->where(
                                'tenant_id',
                                $tenantId
                            )
                    ),
                ],
            ]);

        return response()->json([
            'message' =>
                'Modelo recomendado copiado para a sua empresa.',

            'data' =>
                $this->service
                    ->copyToTenant(
                        $tenantId,
                        $id,
                        $validated
                    ),
        ], 201);
    }
}
