<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExecuteChecklistWorkflowActionRequest;
use App\Services\ChecklistWorkflowActionService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;

class ChecklistWorkflowActionController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private ChecklistWorkflowActionService $service
    ) {}

    public function show(
        string $contratoId,
        string $itemId
    ): JsonResponse {
        return response()->json([
            'data'=>$this->service->inspect(
                $this->tenantContext->requireId(),
                $contratoId,
                $itemId
            ),
        ]);
    }

    public function execute(
        ExecuteChecklistWorkflowActionRequest $request,
        string $contratoId,
        string $itemId
    ): JsonResponse {
        return response()->json([
            'message'=>'Ação executada com sucesso.',
            'data'=>$this->service->execute(
                $this->tenantContext->requireId(),
                $contratoId,
                $itemId,
                $request->user(),
                $request->validated()
            ),
        ]);
    }
}
