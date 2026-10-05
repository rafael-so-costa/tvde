<?php

namespace App\Http\Controllers;

use App\Http\Requests\AuditoriaRequest;
use App\Services\AuditService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;

class AuditoriaController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private AuditService $audit
    ){}

    public function index(
        AuditoriaRequest $request
    ): JsonResponse {
        return response()->json(
            $this->audit->paginate(
                $this->tenantId(),
                $request->validated()
            )
        );
    }

    public function show(
        string $id
    ): JsonResponse {
        return response()->json([
            'data'=>
                $this->audit->detail(
                    $this->tenantId(),
                    $id
                ),
        ]);
    }

    private function tenantId(): string
    {
        return $this
            ->tenantContext
            ->requireId();
    }
}
