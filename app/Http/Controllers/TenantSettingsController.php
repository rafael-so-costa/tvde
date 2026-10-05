<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateTenantSettingsRequest;
use App\Models\Tenant;
use App\Services\TenantContext;
use App\Services\TenantSettingsService;
use Illuminate\Http\JsonResponse;

class TenantSettingsController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private TenantSettingsService $settingsService
    ){}

    public function show(): JsonResponse
    {
        $tenant=$this->tenant();

        return response()->json([
            'data'=>[
                'tenant'=>[
                    'id'=>$tenant->id,
                    'nome'=>$tenant->nome,
                    'nif'=>$tenant->nif,
                    'email'=>$tenant->email,
                    'telefone'=>$tenant->telefone,
                ],

                'settings'=>
                    $this
                        ->settingsService
                        ->get($tenant),
            ],

            'options'=>
                $this
                    ->settingsService
                    ->options(),
        ]);
    }

    public function update(
        UpdateTenantSettingsRequest $request
    ): JsonResponse {
        $tenant=$this->tenant();

        $settings=
            $this
                ->settingsService
                ->update(
                    $tenant,
                    $request->validated()
                );

        return response()->json([
            'message'=>
                'Configurações da frota atualizadas.',

            'data'=>[
                'tenant'=>[
                    'id'=>$tenant->id,
                    'nome'=>$tenant->nome,
                    'nif'=>$tenant->nif,
                    'email'=>$tenant->email,
                    'telefone'=>$tenant->telefone,
                ],

                'settings'=>$settings,
            ],
        ]);
    }

    private function tenant(): Tenant
    {
        return Tenant::query()
            ->findOrFail(
                $this
                    ->tenantContext
                    ->requireId()
            );
    }
}
