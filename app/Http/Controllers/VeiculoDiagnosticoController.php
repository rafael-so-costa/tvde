<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVeiculoDiagnosticoRequest;
use App\Models\VeiculoDiagnostico;
use App\Services\TenantContext;
use App\Services\VeiculoDiagnosticoService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VeiculoDiagnosticoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private VeiculoDiagnosticoService $service
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'veiculo_id' => [
                'nullable',
                'uuid',
            ],
            'fonte' => [
                'nullable',
                Rule::in([
                    'manual',
                    'obd',
                    'tesla',
                    'geotab',
                    'outro',
                ]),
            ],
            'severidade' => [
                'nullable',
                Rule::in([
                    'info',
                    'baixa',
                    'media',
                    'alta',
                    'critica',
                ]),
            ],
            'status' => [
                'nullable',
                Rule::in([
                    'aberto',
                    'resolvido',
                    'ignorado',
                ]),
            ],
            'data_inicio' => [
                'nullable',
                'date',
            ],
            'data_fim' => [
                'nullable',
                'date',
                'after_or_equal:data_inicio',
            ],
            'search' => [
                'nullable',
                'string',
                'max:100',
            ],
        ]);

        $query = VeiculoDiagnostico::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->with([
                'veiculo:id,matricula,marca,modelo,km_atual,disponibilidade',
                'manutencao:id,numero_ordem,status',
                'createdBy:id,name',
            ])
            ->orderByRaw(
                "CASE
                    WHEN severidade='critica' THEN 1
                    WHEN severidade='alta' THEN 2
                    WHEN severidade='media' THEN 3
                    WHEN severidade='baixa' THEN 4
                    ELSE 5
                END"
            )
            ->orderByDesc('detectado_em');

        foreach (
            [
                'veiculo_id',
                'fonte',
                'severidade',
                'status',
            ] as $field
        ) {
            if (!empty($validated[$field])) {
                $query->where(
                    $field,
                    $validated[$field]
                );
            }
        }

        if (!empty($validated['data_inicio'])) {
            $query->whereDate(
                'detectado_em',
                '>=',
                $validated['data_inicio']
            );
        }

        if (!empty($validated['data_fim'])) {
            $query->whereDate(
                'detectado_em',
                '<=',
                $validated['data_fim']
            );
        }

        if (!empty($validated['search'])) {
            $search = trim($validated['search']);

            $query->where(
                function (Builder $query) use ($search) {
                    $query
                        ->where(
                            'codigo_dtc',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'titulo',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'descricao',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhereHas(
                            'veiculo',
                            fn(Builder $query) =>
                            $query->where(
                                'matricula',
                                'like',
                                "%{$search}%"
                            )
                        );
                }
            );
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $diagnostico = VeiculoDiagnostico::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->with([
                'veiculo:id,matricula,marca,modelo,km_atual,disponibilidade',
                'manutencao:id,numero_ordem,status,tipo_servico',
                'createdBy:id,name',
            ])
            ->findOrFail($id);

        return response()->json([
            'data' => $diagnostico,
        ]);
    }

    public function store(
        StoreVeiculoDiagnosticoRequest $request
    ): JsonResponse {
        $diagnostico = $this->service->create(
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Diagnóstico registado com sucesso.',
            'data' => $diagnostico,
        ], 201);
    }

    public function resolver(
        Request $request,
        string $id
    ): JsonResponse {
        $diagnostico = $this->service->resolver(
            $id,
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Diagnóstico marcado como resolvido.',
            'data' => $diagnostico,
        ]);
    }

    public function ignorar(
        Request $request,
        string $id
    ): JsonResponse {
        $diagnostico = $this->service->ignorar(
            $id,
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Diagnóstico marcado como ignorado.',
            'data' => $diagnostico,
        ]);
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
