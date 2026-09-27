<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use App\Models\Motorista;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Veiculo;
use Illuminate\Http\JsonResponse;

class BackofficeDashboardController extends Controller
{
    public function show(): JsonResponse
    {
        $recentTenants = Tenant::query()
            ->select([
                'id',
                'nome',
                'slug',
                'nif',
                'email',
                'telefone',
                'ativo',
                'settings',
                'created_at',
            ])
            ->withCount([
                'users',
                'empresas',
                'veiculos',
                'motoristas',
            ])
            ->latest('created_at')
            ->limit(8)
            ->get()
            ->map(
                fn (Tenant $tenant): array => [
                    'id' => $tenant->id,
                    'nome' => $tenant->nome,
                    'slug' => $tenant->slug,
                    'nif' => $tenant->nif,
                    'email' => $tenant->email,
                    'telefone' => $tenant->telefone,
                    'ativo' => $tenant->ativo,
                    'created_at' => $tenant->created_at,
                    'onboarding_required' => (bool) data_get(
                        $tenant->settings,
                        'onboarding.required',
                        false
                    ),
                    'users_count' => $tenant->users_count,
                    'empresas_count' => $tenant->empresas_count,
                    'veiculos_count' => $tenant->veiculos_count,
                    'motoristas_count' => $tenant->motoristas_count,
                ]
            );

        return response()->json([
            'data' => [
                'metrics' => [
                    'tenants_total' => Tenant::query()->count(),

                    'tenants_active' => Tenant::query()
                        ->where('ativo', true)
                        ->count(),

                    'tenants_last_30_days' => Tenant::query()
                        ->where(
                            'created_at',
                            '>=',
                            now()->subDays(30)
                        )
                        ->count(),

                    'users_active' => User::query()
                        ->where('ativo', true)
                        ->count(),

                    'empresas_active' => Empresa::query()
                        ->where('ativo', true)
                        ->count(),

                    'veiculos_total' => Veiculo::query()
                        ->count(),

                    'motoristas_total' => Motorista::query()
                        ->count(),
                ],

                'recent_tenants' => $recentTenants,
            ],
        ]);
    }
}
