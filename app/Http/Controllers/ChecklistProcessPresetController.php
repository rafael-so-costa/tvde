<?php

namespace App\Http\Controllers;

use App\Services\ChecklistProcessPresetService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChecklistProcessPresetController extends Controller
{
    public function __construct(
        private ChecklistProcessPresetService $service,
        private TenantContext $tenantContext
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' =>
                $this->service
                    ->catalog(
                        $this->tenantContext
                            ->requireId()
                    ),
        ]);
    }

    public function usePreset(
        Request $request,
        string $code
    ): JsonResponse {
        $validated =
            $request->validate([
                'nome' => [
                    'sometimes',
                    'nullable',
                    'string',
                    'max:255',
                ],
            ]);

        return response()->json([
            'message' =>
                'Workflow recomendado adicionado à sua empresa.',

            'data' =>
                $this->service
                    ->copyToTenant(
                        $this->tenantContext
                            ->requireId(),
                        $code,
                        $validated
                    ),
        ], 201);
    }
}