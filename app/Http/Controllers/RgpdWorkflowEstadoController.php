<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\RgpdWorkflowEstadoService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;

final class RgpdWorkflowEstadoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private RgpdWorkflowEstadoService $workflow
    ) {}

    public function show(
        string $id
    ): JsonResponse {
        abort_unless(
            config('rgpd.api_enabled', false) === true,
            404
        );

        return response()->json([
            'data' => $this->workflow->consultar(
                $this->tenantContext->requireId(),
                $id
            ),
        ]);
    }
}
