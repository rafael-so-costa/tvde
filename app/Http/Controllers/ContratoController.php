<?php

namespace App\Http\Controllers;

use App\Http\Requests\EncerrarContratoRequest;
use App\Http\Requests\StoreContratoRequest;
use App\Http\Requests\UpdateContratoRequest;
use App\Models\Contrato;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Services\ContratoService;
use App\Services\PermissionService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class ContratoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private ContratoService $contratoService,
        private PermissionService $permissionService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => [
                'nullable',
                Rule::in([
                    'rascunho',
                    'enviado',
                    'assinado',
                    'cancelado',
                    'renovado',
                    'expirado',
                    'encerrado',
                ]),
            ],
            'tipo' => [
                'nullable',
                Rule::in([
                    'prestacao_servico',
                    'aluguer',
                    'checklist_entrega',
                    'checklist_devolucao',
                ]),
            ],
        ]);

        $query = $this->leituraQuery($request)
            ->with([
                'template',
                'motorista',
                'proprietario',
                'veiculo',
            ])
            ->latest('created_at');

        if (!empty($validated['status'])) {
            $query->where(
                'status',
                $validated['status']
            );
        }

        if (!empty($validated['tipo'])) {
            $query->where(
                'tipo',
                $validated['tipo']
            );
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function store(
        StoreContratoRequest $request
    ): JsonResponse {
        $contrato = $this->contratoService
            ->create(
                $request->validated(),
                $request->user(),
                $this->tenantId(),
                $request->ip(),
                $request->userAgent()
            );

        return response()->json([
            'message' =>
                'Contrato criado com sucesso.',
            'data' =>
                $contrato,
        ], 201);
    }

    public function show(
        Request $request,
        string $id
    ): JsonResponse {
        $contrato = $this->leituraQuery($request)
            ->with([
                'template',
                'motorista',
                'proprietario',
                'veiculo',
                'versoes' =>
                    fn ($query) =>
                        $query->orderByDesc(
                            'versao_numero'
                        ),
                'assinaturas',
                'logsAuditoria' =>
                    fn ($query) =>
                        $query->latest(
                            'created_at'
                        ),
            ])
            ->findOrFail($id);

        return response()->json([
            'data' => $contrato,
        ]);
    }

    public function update(
        UpdateContratoRequest $request,
        string $id
    ): JsonResponse {
        $contrato = $this->contratoService
            ->updateDraft(
                $id,
                $this->tenantId(),
                $request->validated(),
                $request->user(),
                $request->ip()
            );

        return response()->json([
            'message' =>
                'Contrato atualizado com sucesso.',
            'data' =>
                $contrato,
        ]);
    }

    public function encerrar(
        EncerrarContratoRequest $request,
        string $id
    ): JsonResponse {
        $contrato = $this->contratoService
            ->encerrar(
                $id,
                $this->tenantId(),
                $request->user(),
                $request->validated(
                    'data_fim'
                ),
                $request->ip()
            );

        return response()->json([
            'message' =>
                'Contrato encerrado com sucesso.',
            'data' =>
                $contrato,
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): Response {
        $this->contratoService->delete(
            $id,
            $this->tenantId(),
            $request->user(),
            $request->ip()
        );

        return response()->noContent();
    }

    private function leituraQuery(
        Request $request
    ): Builder {
        $tenantId = $this->tenantId();
        $user = $request->user();

        $query = Contrato::query()
            ->where(
                'tenant_id',
                $tenantId
            );

        if (
            $this->permissionService
                ->allows(
                    $user,
                    'contratos',
                    'visualizar',
                    $tenantId
                )
        ) {
            return $query;
        }

        $temEscopoProprio = false;

        if (
            $user->hasRole(
                'motorista',
                $tenantId
            )
        ) {
            $temEscopoProprio = true;

            $motoristaId =
                Motorista::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        'user_id',
                        $user->id
                    )
                    ->value('id');

            if (!$motoristaId) {
                $query->whereRaw(
                    '1 = 0'
                );
            } else {
                $query->where(
                    'motorista_id',
                    $motoristaId
                );
            }
        }

        if (
            $user->hasRole(
                'proprietario',
                $tenantId
            )
        ) {
            $temEscopoProprio = true;

            $proprietarioId =
                Proprietario::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        'user_id',
                        $user->id
                    )
                    ->value('id');

            if (!$proprietarioId) {
                $query->whereRaw(
                    '1 = 0'
                );
            } else {
                $query->where(
                    'proprietario_id',
                    $proprietarioId
                );
            }
        }

        if (!$temEscopoProprio) {
            abort(
                403,
                'Sem permissão suficiente para este recurso.'
            );
        }

        return $query;
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

        return $this->tenantContext
            ->requireId();
    }
}
