<?php

namespace App\Http\Controllers;

use App\Http\Requests\HelpCenterIndexRequest;
use App\Services\HelpCenterService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HelpCenterController extends Controller
{
    public function __construct(
        private HelpCenterService $service,
        private TenantContext $tenantContext
    ){}

    public function index(HelpCenterIndexRequest $request): JsonResponse
    {
        return response()->json(
            $this->service->userIndex(
                $request->user(),
                $this->tenantContext->requireId(),
                $request->validated()
            )
        );
    }

    public function meta(Request $request): JsonResponse
    {
        return response()->json([
            'data'=>$this->service->userMeta(
                $request->user(),
                $this->tenantContext->requireId()
            ),
        ]);
    }

    public function show(Request $request,string $slug): JsonResponse
    {
        return response()->json([
            'data'=>$this->service->userShow(
                $request->user(),
                $this->tenantContext->requireId(),
                $slug
            ),
        ]);
    }

    public function view(Request $request,string $id): JsonResponse
    {
        return response()->json([
            'data'=>$this->service->recordView(
                $request->user(),
                $this->tenantContext->requireId(),
                $id
            ),
        ]);
    }
}
