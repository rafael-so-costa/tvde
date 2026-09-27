<?php

namespace App\Http\Controllers;

use App\Services\ProprietarioDashboardService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProprietarioDashboardController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private ProprietarioDashboardService $service
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
