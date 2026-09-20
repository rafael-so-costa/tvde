<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompleteChecklistProcessItemRequest;
use App\Models\ChecklistProcessRun;
use App\Models\Contrato;
use App\Services\ChecklistProcessService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;

class ChecklistProcessRunController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private ChecklistProcessService $processService
    ) {}

    public function showForContrato(
        string $id
    ): JsonResponse {
        $this->findContrato(
            $id
        );

        $run =
            ChecklistProcessRun::query()
                ->where(
                    'tenant_id',
                    $this->tenantId()
                )
                ->where(
                    'entidade_tipo',
                    ChecklistProcessService::ENTITY_CONTRATO
                )
                ->where(
                    'entidade_id',
                    $id
                )
                ->with('items')
                ->firstOrFail();

        return response()->json([
            'data' =>
                $run,
        ]);
    }

    public function completeItem(
        CompleteChecklistProcessItemRequest $request,
        string $id,
        string $itemId
    ): JsonResponse {
        $this->findContrato(
            $id
        );

        $run =
            ChecklistProcessRun::query()
                ->where(
                    'tenant_id',
                    $this->tenantId()
                )
                ->where(
                    'entidade_tipo',
                    ChecklistProcessService::ENTITY_CONTRATO
                )
                ->where(
                    'entidade_id',
                    $id
                )
                ->firstOrFail();

        $updated =
            $this->processService
                ->completeItem(
                    $this->tenantId(),
                    $run->id,
                    $itemId,
                    $request->user()->id,
                    $request->validated(
                        'resultado'
                    ) ?? []
                );

        return response()->json([
            'message' =>
                'Etapa concluída com sucesso.',

            'data' =>
                $updated,
        ]);
    }

    private function findContrato(
        string $id
    ): Contrato {
        return Contrato::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->findOrFail($id);
    }

    private function tenantId(): string
    {
        if (
            !$this->tenantContext
                ->hasTenant()
        ) {
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        return $this
            ->tenantContext
            ->requireId();
    }
}
