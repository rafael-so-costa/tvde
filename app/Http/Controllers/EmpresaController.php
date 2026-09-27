<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEmpresaRequest;
use App\Http\Requests\UpdateEmpresaRequest;
use App\Models\Empresa;
use App\Models\Tenant;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class EmpresaController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function index(): JsonResponse
    {
        $tenant = $this->tenant();

        $empresas = Empresa::query()
            ->where(
                'tenant_id',
                $tenant->id
            )
            ->latest()
            ->get();

        $multiCompanyEnabled =
            $this->multiCompanyEnabled(
                $tenant
            );

        return response()->json([
            'data' => $empresas,
            'meta' => [
                'multi_company_enabled' => $multiCompanyEnabled,

                'can_create' => $multiCompanyEnabled ||
                    $empresas->isEmpty(),

                'can_delete' => $multiCompanyEnabled,
            ],
        ]);
    }

    public function store(
        StoreEmpresaRequest $request
    ): JsonResponse {
        $tenant = $this->tenant();

        if (
            ! $this->multiCompanyEnabled(
                $tenant
            ) &&
            Empresa::query()
                ->where(
                    'tenant_id',
                    $tenant->id
                )
                ->exists()
        ) {
            abort(
                403,
                'O plano atual permite apenas uma empresa.'
            );
        }

        $empresa = new Empresa(
            $request->validated()
        );

        $empresa->tenant_id =
            $tenant->id;

        $empresa->save();

        return response()->json([
            'message' => 'Empresa criada com sucesso.',

            'data' => $empresa,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json([
            'data' => $this->findEmpresa($id),
        ]);
    }

    public function update(
        UpdateEmpresaRequest $request,
        string $id
    ): JsonResponse {
        $empresa = $this->findEmpresa($id);

        $empresa->fill($request->validated());
        $empresa->save();

        return response()->json([
            'message' => 'Empresa atualizada com sucesso.',
            'data' => $empresa,
        ]);
    }

    public function destroy(
        string $id
    ): Response {
        $tenant = $this->tenant();

        $empresa = Empresa::query()
            ->where(
                'tenant_id',
                $tenant->id
            )
            ->findOrFail(
                $id
            );

        if (
            ! $this->multiCompanyEnabled(
                $tenant
            )
        ) {
            abort(
                403,
                'A empresa principal não pode ser eliminada.'
            );
        }

        $empresa->delete();

        return response()->noContent();
    }

    private function findEmpresa(string $id): Empresa
    {
        return Empresa::query()
            ->where('tenant_id', $this->tenantId())
            ->findOrFail($id);
    }

    private function tenant(): Tenant
    {
        if (
            ! $this->tenantContext
                ->hasTenant()
        ) {
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        return Tenant::query()
            ->findOrFail(
                $this->tenantContext
                    ->requireId()
            );
    }

    private function multiCompanyEnabled(
        Tenant $tenant
    ): bool {
        $settings =
            $tenant->settings ?? [];

        $configured =
            data_get(
                $settings,
                'features.multi_company'
            );

        if ($configured !== null) {
            return (bool) $configured;
        }

        /*
     * Compatibilidade com tenants antigos:
     * tenants sem onboarding pertencem ao
     * modelo anterior e mantêm multiempresa.
     *
     * Tenants criados pelo cadastro SaaS já
     * possuem a chave onboarding e ficam
     * single-company mesmo se forem anteriores
     * à introdução de features.multi_company.
     */
        return ! array_key_exists(
            'onboarding',
            $settings
        );
    }

    private function tenantId(): string
    {
        if (! $this->tenantContext->hasTenant()) {
            abort(403, 'Selecione uma organização para aceder a este recurso.');
        }

        return $this->tenantContext->requireId();
    }
}
