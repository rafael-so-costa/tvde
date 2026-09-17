<?php

namespace App\Http\Middleware;

use App\Services\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->tenantContext->clear();

        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Não autenticado.',
            ], 401);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        if (!$request->hasSession()) {
            return response()->json([
                'message' => 'Sessão necessária para resolver a organização.',
            ], 401);
        }

        $tenantId = $request->session()->get('tenant_id');

        if (!$tenantId) {
            $tenant = $user->tenants()
                ->where('tenants.ativo', true)
                ->wherePivot('status', 'ativo')
                ->orderByDesc('tenant_users.principal')
                ->first();

            if (!$tenant) {
                return response()->json([
                    'message' => 'Nenhuma organização ativa associada a este utilizador.',
                ], 403);
            }

            $tenantId = $tenant->id;

            $request->session()->put('tenant_id', $tenantId);
        }

        $authorized = $user->tenants()
            ->where('tenants.id', $tenantId)
            ->where('tenants.ativo', true)
            ->wherePivot('status', 'ativo')
            ->exists();

        if (!$authorized) {
            $request->session()->forget('tenant_id');
            $this->tenantContext->clear();

            return response()->json([
                'message' => 'Acesso à organização não autorizado.',
            ], 403);
        }

        $this->tenantContext->set($tenantId);

        $request->attributes->set('tenant_id', $tenantId);

        return $next($request);
    }
}
