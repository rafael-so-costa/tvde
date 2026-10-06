<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSaasOnboardingRequest;
use App\Models\Empresa;
use App\Models\Tenant;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Services\OnboardingProgressService;
use Illuminate\Http\Request;

class SaasOnboardingController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private OnboardingProgressService $progressService
    ) {}


    public function progress(
        Request $request
    ): JsonResponse {
        return response()->json([
            'data' =>
            $this
                ->progressService
                ->forUser(
                    $request->user(),
                    $this
                        ->tenantContext
                        ->requireId()
                ),
        ]);
    }
    public function show(): JsonResponse
    {
        return response()->json([
            'data' => $this->data(),
        ]);
    }

    public function update(
        UpdateSaasOnboardingRequest $request
    ): JsonResponse {
        $tenantId =
            $this->tenantContext
            ->requireId();

        $validated =
            $request->validated();

        DB::transaction(
            function () use (
                $tenantId,
                $validated
            ): void {
                $tenant =
                    Tenant::query()
                    ->findOrFail(
                        $tenantId
                    );

                $empresa =
                    Empresa::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->firstOrFail();

                $empresa->fill([
                    'nome_empresa' => $validated['company_name'],

                    'email' => $validated['company_email'],

                    'telemovel' => $validated['company_phone'],

                    'nome_gerente' => $validated['manager_name'],

                    'endereco_rua' => $validated['address_street'],

                    'endereco_numero' => $validated['address_number'],

                    'endereco_complemento' => $validated['address_complement'] ?? null,

                    'endereco_cep' => $validated['address_postal_code'],

                    'endereco_cidade' => $validated['address_city'],

                    'certificado_tvde' => $validated['certificate_tvde'] ?? null,

                    'certificado_tvde_valid_until' => $validated['certificate_tvde_valid_until'] ?? null,

                    'status_cadastro' => 'ativo',

                    'ativo' => true,
                ]);

                $empresa->save();

                $tenant->fill([
                    'nome' => $validated['company_name'],

                    'email' => $validated['company_email'],

                    'telefone' => $validated['company_phone'],
                ]);

                $settings =
                    $tenant->settings ?? [];

                $onboarding =
                    $settings['onboarding'] ?? [];

                $settings['onboarding'] = array_merge(
                    $onboarding,
                    [
                        'required' => false,

                        'completed_at' => now()
                            ->toIso8601String(),
                    ]
                );

                $tenant->settings =
                    $settings;

                $tenant->save();
            }
        );

        return response()->json([
            'message' => 'Configuração inicial concluída com sucesso.',

            'data' => $this->data(),
        ]);
    }

    private function data(): array
    {
        $tenantId =
            $this->tenantContext
            ->requireId();

        $tenant =
            Tenant::query()
            ->findOrFail(
                $tenantId
            );

        $empresa =
            Empresa::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->first();

        $settings =
            $tenant->settings ?? [];

        $onboarding =
            $settings['onboarding'] ?? [];

        return [
            'required' => (bool) (
                $onboarding['required'] ?? false
            ),

            'completed_at' => $onboarding['completed_at'] ?? null,

            'empresa' => $empresa,
        ];
    }
}
