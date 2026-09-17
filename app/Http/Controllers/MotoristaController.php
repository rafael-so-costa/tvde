<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMotoristaRequest;
use App\Http\Requests\UpdateMotoristaRequest;
use App\Http\Requests\UpdateMotoristaStatusRequest;
use App\Models\Motorista;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class MotoristaController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function index(): JsonResponse
    {
        $motoristas = Motorista::query()
            ->where('tenant_id', $this->tenantId())
            ->latest()
            ->get();

        return response()->json([
            'data' => $motoristas,
        ]);
    }

    public function store(
        StoreMotoristaRequest $request
    ): JsonResponse {
        $motorista = new Motorista($request->validated());

        $motorista->tenant_id = $this->tenantId();
        $motorista->sincronizarCadastro();
        $motorista->save();

        return response()->json([
            'message' => 'Motorista criado com sucesso.',
            'data' => $motorista,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json([
            'data' => $this->findMotorista($id),
        ]);
    }

    public function update(
        UpdateMotoristaRequest $request,
        string $id
    ): JsonResponse {
        $motorista = $this->findMotorista($id);

        $motorista->fill($request->validated());
        $motorista->sincronizarCadastro();
        $motorista->save();

        return response()->json([
            'message' => 'Motorista atualizado com sucesso.',
            'data' => $motorista,
        ]);
    }

    public function status(
        UpdateMotoristaStatusRequest $request,
        string $id
    ): JsonResponse {
        $motorista = $this->findMotorista($id);

        if (
            $request->boolean('ativo') &&
            !$motorista->cadastroCompleto()
        ) {
            return response()->json([
                'message' => 'O motorista possui cadastro incompleto e não pode ser ativado.',
            ], 422);
        }

        $motorista->ativo = $request->boolean('ativo');
        $motorista->save();

        return response()->json([
            'message' => $motorista->ativo
                ? 'Motorista ativado com sucesso.'
                : 'Motorista inativado com sucesso.',
            'data' => $motorista,
        ]);
    }

    public function destroy(string $id): Response
    {
        $motorista = $this->findMotorista($id);

        $motorista->delete();

        return response()->noContent();
    }

    private function findMotorista(string $id): Motorista
    {
        return Motorista::query()
            ->where('tenant_id', $this->tenantId())
            ->findOrFail($id);
    }

    private function tenantId(): string
    {
        if (!$this->tenantContext->hasTenant()) {
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        return $this->tenantContext->requireId();
    }
}
