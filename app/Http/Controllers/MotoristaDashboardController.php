<?php

namespace App\Http\Controllers;

use App\Services\MotoristaDashboardService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MotoristaDashboardController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private MotoristaDashboardService $service
    ){}

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data'=>$this->service->data(
                $request->user(),
                $this->tenantContext->requireId()
            ),
        ]);
    }
}
