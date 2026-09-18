<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePerfilTemplateRequest;
use App\Http\Requests\UpdatePerfilTemplateRequest;
use App\Models\PerfilTemplate;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class PerfilTemplateController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function index(): JsonResponse
    {
        $perfis = PerfilTemplate::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->withCount('templates')
            ->orderBy('ordem')
            ->orderBy('nome')
            ->get();

        return response()->json([
            'data' => $perfis,
        ]);
    }

    public function store(
        StorePerfilTemplateRequest $request
    ): JsonResponse {
        $perfil = new PerfilTemplate(
            $request->validated()
        );

        $perfil->tenant_id =
            $this->tenantId();

        $perfil->ordem = 0;
        $perfil->save();

        return response()->json([
            'message' =>
                'Perfil de template criado com sucesso.',
            'data' => $perfil,
        ], 201);
    }

    public function update(
        UpdatePerfilTemplateRequest $request,
        string $id
    ): JsonResponse {
        $perfil = $this->findPerfil($id);

        $perfil->fill(
            $request->validated()
        );

        $perfil->save();

        return response()->json([
            'message' =>
                'Perfil de template atualizado com sucesso.',
            'data' => $perfil,
        ]);
    }

    public function destroy(
        string $id
    ): Response|JsonResponse {
        $perfil = $this->findPerfil($id);

        if ($perfil->templates()->exists()) {
            return response()->json([
                'message' =>
                    'Este perfil ainda contém templates. Mova ou elimine-os antes.',
            ], 422);
        }

        $perfil->delete();

        return response()->noContent();
    }

    private function findPerfil(
        string $id
    ): PerfilTemplate {
        return PerfilTemplate::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
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

        return $this->tenantContext
            ->requireId();
    }
}
