<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEmpresaRequest;
use App\Http\Requests\UpdateEmpresaRequest;
use App\Models\Empresa;
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
        $empresas = Empresa::query()
            ->where('tenant_id', $this->tenantId())
            ->latest()
            ->get();

        return response()->json([
            'data' => $empresas,
        ]);
    }

    public function store(StoreEmpresaRequest $request): JsonResponse
    {
        $empresa = new Empresa($request->validated());

        $empresa->tenant_id = $this->tenantId();

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

    public function destroy(string $id): Response
    {
        $empresa = $this->findEmpresa($id);

        $empresa->delete();

        return response()->noContent();
    }

    private function findEmpresa(string $id): Empresa
    {
        return Empresa::query()
            ->where('tenant_id', $this->tenantId())
            ->findOrFail($id);
    }

    private function tenantId(): string
    {
        if (!$this->tenantContext->hasTenant()) {
            abort(403, 'Selecione uma organização para aceder a este recurso.');
        }

        return $this->tenantContext->requireId();
    }
}
