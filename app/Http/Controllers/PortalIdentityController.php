<?php

namespace App\Http\Controllers;

use App\Services\PortalIdentityService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortalIdentityController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private PortalIdentityService $identityService
    ) {}

    public function show(
        Request $request
    ): JsonResponse {
        return response()->json([
            'data' =>
                $this
                    ->identityService
                    ->resolve(
                        $request->user(),
                        $this
                            ->tenantContext
                            ->id()
                    ),
        ]);
    }
}
