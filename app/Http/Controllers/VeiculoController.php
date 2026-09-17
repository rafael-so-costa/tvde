<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVeiculoRequest;
use App\Http\Requests\UpdateVeiculoRequest;
use App\Http\Requests\UpdateVeiculoStatusRequest;
use App\Models\Veiculo;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class VeiculoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function index(): JsonResponse
    {
        $veiculos = Veiculo::query()
            ->with([
                'proprietario:id,nome_completo,nome_empresa,tipo',
            ])
            ->where('tenant_id', $this->tenantId())
            ->latest()
            ->get();

        return response()->json([
            'data' => $veiculos,
        ]);
    }

    public function store(
        StoreVeiculoRequest $request
    ): JsonResponse {
        $veiculo = new Veiculo($request->validated());

        $veiculo->tenant_id = $this->tenantId();
        $veiculo->sincronizarCadastro();
        $veiculo->save();

        $veiculo->load([
            'proprietario:id,nome_completo,nome_empresa,tipo',
        ]);

        return response()->json([
            'message' => 'Veículo criado com sucesso.',
            'data' => $veiculo,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $veiculo = $this->findVeiculo($id);

        $veiculo->load([
            'proprietario:id,nome_completo,nome_empresa,tipo',
        ]);

        return response()->json([
            'data' => $veiculo,
        ]);
    }

    public function update(
        UpdateVeiculoRequest $request,
        string $id
    ): JsonResponse {
        $veiculo = $this->findVeiculo($id);

        $veiculo->fill($request->validated());
        $veiculo->sincronizarCadastro();
        $veiculo->save();

        $veiculo->load([
            'proprietario:id,nome_completo,nome_empresa,tipo',
        ]);

        return response()->json([
            'message' => 'Veículo atualizado com sucesso.',
            'data' => $veiculo,
        ]);
    }

    public function status(
        UpdateVeiculoStatusRequest $request,
        string $id
    ): JsonResponse {
        $veiculo = $this->findVeiculo($id);

        if (
            $request->boolean('ativo') &&
            !$veiculo->cadastroCompleto()
        ) {
            return response()->json([
                'message' => 'O veículo possui cadastro incompleto e não pode ser ativado.',
            ], 422);
        }

        $veiculo->ativo = $request->boolean('ativo');
        $veiculo->save();

        return response()->json([
            'message' => $veiculo->ativo
                ? 'Veículo ativado com sucesso.'
                : 'Veículo inativado com sucesso.',
            'data' => $veiculo,
        ]);
    }

    public function destroy(string $id): Response
    {
        $veiculo = $this->findVeiculo($id);

        $veiculo->delete();

        return response()->noContent();
    }

    private function findVeiculo(string $id): Veiculo
    {
        return Veiculo::query()
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
