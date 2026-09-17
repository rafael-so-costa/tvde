<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProprietarioRequest;
use App\Http\Requests\UpdateProprietarioRequest;
use App\Http\Requests\UpdateProprietarioStatusRequest;
use App\Models\Proprietario;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ProprietarioController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function index(): JsonResponse
    {
        $proprietarios = Proprietario::query()
            ->where('tenant_id', $this->tenantId())
            ->latest()
            ->get();

        return response()->json([
            'data' => $proprietarios,
        ]);
    }

    public function store(StoreProprietarioRequest $request): JsonResponse
    {
        $proprietario = new Proprietario($request->validated());

        $proprietario->tenant_id = $this->tenantId();
        $proprietario->sincronizarCadastro();
        $proprietario->save();

        return response()->json([
            'message' => 'Proprietário criado com sucesso.',
            'data' => $proprietario,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json([
            'data' => $this->findProprietario($id),
        ]);
    }

    public function update(
        UpdateProprietarioRequest $request,
        string $id
    ): JsonResponse {
        $proprietario = $this->findProprietario($id);

        $proprietario->fill($request->validated());
        $proprietario->sincronizarCadastro();
        $proprietario->save();

        return response()->json([
            'message' => 'Proprietário atualizado com sucesso.',
            'data' => $proprietario,
        ]);
    }

    public function status(
        UpdateProprietarioStatusRequest $request,
        string $id
    ): JsonResponse {
        $proprietario = $this->findProprietario($id);

        if (
            $request->boolean('ativo') &&
            !$proprietario->cadastroCompleto()
        ) {
            return response()->json([
                'message' => 'O proprietário possui cadastro incompleto e não pode ser ativado.',
            ], 422);
        }

        $proprietario->ativo = $request->boolean('ativo');
        $proprietario->save();

        return response()->json([
            'message' => $proprietario->ativo
                ? 'Proprietário ativado com sucesso.'
                : 'Proprietário inativado com sucesso.',
            'data' => $proprietario,
        ]);
    }

    public function destroy(string $id): Response
    {
        $proprietario = $this->findProprietario($id);

        $proprietario->delete();

        return response()->noContent();
    }

    private function findProprietario(string $id): Proprietario
    {
        return Proprietario::query()
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
