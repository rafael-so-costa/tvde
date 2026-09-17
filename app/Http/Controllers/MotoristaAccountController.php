<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateMotoristaAccountRequest;
use App\Http\Requests\UpdateMotoristaPasswordRequest;
use App\Models\Motorista;
use App\Services\MotoristaAccountService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;

class MotoristaAccountController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private MotoristaAccountService $accountService
    ) {}

    public function store(
        CreateMotoristaAccountRequest $request,
        string $id
    ): JsonResponse {
        $motorista = $this->findMotorista($id);

        $user = $this->accountService->create(
            $motorista,
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
        UpdateMotoristaPasswordRequest $request,
        string $id
    ): JsonResponse {
        $motorista = $this->findMotorista($id);

        $this->accountService->updatePassword(
            $motorista,
            $request->string('password')->toString()
        );

        return response()->json([
            'message' => 'Senha atualizada com sucesso.',
        ]);
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
