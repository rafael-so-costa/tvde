<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TenantContextController extends Controller
{
    public function options(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            $tenants = Tenant::query()
                ->where('ativo', true)
                ->orderBy('nome')
                ->get([
                    'id',
                    'nome',
                    'slug',
                    'ativo',
                ]);
        } else {
            $tenants = $user->tenants()
                ->where('tenants.ativo', true)
                ->wherePivot('status', 'ativo')
                ->orderBy('tenants.nome')
                ->get([
                    'tenants.id',
                    'tenants.nome',
                    'tenants.slug',
                    'tenants.ativo',
                ]);
        }

        return response()->json([
            'data' => $tenants,
        ]);
    }

    public function select(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => [
                'required',
                'uuid',
            ],
        ]);

        $user = $request->user();

        $tenant = Tenant::query()
            ->whereKey(
                $validated['tenant_id']
            )
            ->where('ativo', true)
            ->first();

        if (!$tenant) {
            throw ValidationException::withMessages([
                'tenant_id' =>
                    'A organização selecionada não está disponível.',
            ]);
        }

        if (
            !$user->isSuperAdmin() &&
            !$user->tenants()
                ->where(
                    'tenants.id',
                    $tenant->id
                )
                ->where(
                    'tenants.ativo',
                    true
                )
                ->wherePivot(
                    'status',
                    'ativo'
                )
                ->exists()
        ) {
            abort(
                403,
                'Acesso à organização não autorizado.'
            );
        }

        $request->session()->put(
            'tenant_id',
            $tenant->id
        );

        return response()->json([
            'message' =>
                'Organização selecionada com sucesso.',
            'data' => $tenant->only([
                'id',
                'nome',
                'slug',
                'ativo',
            ]),
        ]);
    }

    public function clear(Request $request): JsonResponse
    {
        $request->session()
            ->forget('tenant_id');

        return response()->json([
            'message' =>
                'Organização removida do contexto.',
        ]);
    }
}
