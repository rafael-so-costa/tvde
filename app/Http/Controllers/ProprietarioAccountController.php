<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateProprietarioAccountRequest;
use App\Http\Requests\UpdateProprietarioPasswordRequest;
use App\Models\Proprietario;
use App\Services\ProprietarioAccountService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;

class ProprietarioAccountController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private ProprietarioAccountService $accountService
    ) {}

    public function store(
        CreateProprietarioAccountRequest $request,
        string $id
    ): JsonResponse {
        $proprietario = $this->findProprietario($id);

        $user = $this->accountService->create(
            $proprietario,
            $request->string('password')->toString()
        );

        return response()->json([
            'message' => 'Conta de acesso criada com sucesso.',
            'data' => [
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'ativo' => $user->ativo,
            ],
        ], 201);
    }

    public function password(
        UpdateProprietarioPasswordRequest $request,
        string $id
    ): JsonResponse {
        $proprietario = $this->findProprietario($id);

        $this->accountService->updatePassword(
            $proprietario,
            $request->string('password')->toString()
        );

        return response()->json([
            'message' => 'Senha atualizada com sucesso.',
        ]);
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
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        return $this->tenantContext->requireId();
    }
}
