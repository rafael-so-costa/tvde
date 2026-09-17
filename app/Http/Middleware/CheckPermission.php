<?php

namespace App\Http\Middleware;

use App\Services\PermissionService;
use App\Services\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function __construct(
        private PermissionService $permissionService,
        private TenantContext $tenantContext
    ) {}

    public function handle(
        Request $request,
        Closure $next,
        string $permission,
        string $requiredLevel = 'visualizar'
    ): Response {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Não autenticado.',
            ], 401);
        }

        $tenantId = $this->tenantContext->id();

        if (!$user->isSuperAdmin() && !$tenantId) {
            return response()->json([
                'message' => 'Nenhuma organização definida.',
            ], 403);
        }

        $currentLevel = $this->permissionService->level(
            $user,
            $permission,
            $tenantId
        );

        if (!$this->permissionService->allows(
            $user,
            $permission,
            $requiredLevel,
            $tenantId
        )) {
            return response()->json([
                'message' => 'Sem permissão suficiente para este recurso.',
            ], 403);
        }

        $request->attributes->set(
            'permission_level',
            $currentLevel
        );

        return $next($request);
    }
}
