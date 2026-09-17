<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAluguerRequest;
use App\Http\Requests\UpdateAluguerRequest;
use App\Models\Aluguer;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class AluguerController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => [
                'nullable',
                Rule::in([
                    'rascunho',
                    'ativo',
                    'finalizado',
                    'cancelado',
                ]),
            ],
        ]);

        $query = Aluguer::query()
            ->with([
                'motorista:id,nome_completo',
                'veiculo:id,matricula,marca,modelo',
                'proprietario:id,tipo,nome_completo,nome_empresa',
            ])
            ->where('tenant_id', $this->tenantId())
            ->latest('updated_at');

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function store(
        StoreAluguerRequest $request
    ): JsonResponse {
        $aluguer = new Aluguer($request->validated());

        $aluguer->tenant_id = $this->tenantId();
        $aluguer->status = 'rascunho';
        $aluguer->created_by = $request->user()->id;
        $aluguer->save();

        $aluguer->load([
            'motorista:id,nome_completo',
            'veiculo:id,matricula,marca,modelo',
            'proprietario:id,tipo,nome_completo,nome_empresa',
        ]);

        return response()->json([
            'message' => 'Rascunho de aluguer criado com sucesso.',
            'data' => $aluguer,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $aluguer = $this->findAluguer($id);

        $aluguer->load([
            'motorista:id,nome_completo',
            'veiculo:id,matricula,marca,modelo',
            'proprietario:id,tipo,nome_completo,nome_empresa',
        ]);

        return response()->json([
            'data' => $aluguer,
        ]);
    }

    public function update(
        UpdateAluguerRequest $request,
        string $id
    ): JsonResponse {
        $aluguer = $this->findAluguer($id);

        if ($aluguer->status !== 'rascunho') {
            return response()->json([
                'message' => 'Apenas alugueres em rascunho podem ser alterados por esta operação.',
            ], 422);
        }

        $aluguer->fill($request->validated());
        $aluguer->save();

        $aluguer->load([
            'motorista:id,nome_completo',
            'veiculo:id,matricula,marca,modelo',
            'proprietario:id,tipo,nome_completo,nome_empresa',
        ]);

        return response()->json([
            'message' => 'Rascunho de aluguer atualizado com sucesso.',
            'data' => $aluguer,
        ]);
    }

    public function destroy(string $id): Response|JsonResponse
    {
        $aluguer = $this->findAluguer($id);

        if ($aluguer->status === 'finalizado') {
            return response()->json([
                'message' => 'Alugueres finalizados não podem ser eliminados.',
            ], 422);
        }

        $aluguer->delete();

        return response()->noContent();
    }

    private function findAluguer(string $id): Aluguer
    {
        return Aluguer::query()
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
