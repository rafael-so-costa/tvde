<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBackofficePlanRequest;
use App\Http\Requests\UpdateBackofficePlanRequest;
use App\Models\SaasPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class BackofficePlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = SaasPlan::query()
            ->withCount(
                'tenants'
            )
            ->orderBy(
                'ordem'
            )
            ->orderBy(
                'nome'
            )
            ->get()
            ->map(
                fn (
                    SaasPlan $plan
                ): array => $this
                    ->serializePlan(
                        $plan
                    )
            )
            ->values();

        return response()->json([
            'data' => $plans,
        ]);
    }

    public function store(
        StoreBackofficePlanRequest $request
    ): JsonResponse {
        $plan = SaasPlan::create(
            $request->validated()
        );

        $plan->loadCount(
            'tenants'
        );

        return response()->json([
            'message' => 'Plano criado com sucesso.',

            'data' => $this
                ->serializePlan(
                    $plan
                ),
        ], 201);
    }

    public function show(
        string $id
    ): JsonResponse {
        $plan = SaasPlan::query()
            ->withCount(
                'tenants'
            )
            ->findOrFail(
                $id
            );

        return response()->json([
            'data' => $this
                ->serializePlan(
                    $plan
                ),
        ]);
    }

    public function update(
        UpdateBackofficePlanRequest $request,
        string $id
    ): JsonResponse {
        $plan = SaasPlan::query()
            ->findOrFail(
                $id
            );

        $data =
            $request->validated();

        $this->guardStarterPlan(
            $plan,
            $data
        );

        $plan->fill(
            $data
        );

        $plan->save();

        $plan->refresh();

        $plan->loadCount(
            'tenants'
        );

        return response()->json([
            'message' => 'Plano atualizado com sucesso.',

            'data' => $this
                ->serializePlan(
                    $plan
                ),
        ]);
    }

    private function guardStarterPlan(
        SaasPlan $plan,
        array $data
    ): void {
        if (
            $plan->codigo !==
            'starter'
        ) {
            return;
        }

        $errors = [];

        if (
            $data['codigo'] !==
            'starter'
        ) {
            $errors['codigo'] = [
                'O código do plano Starter não pode ser alterado.',
            ];
        }

        if (
            ! $data['ativo']
        ) {
            $errors['ativo'] = [
                'O plano Starter deve permanecer ativo.',
            ];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages(
                $errors
            );
        }
    }

    private function serializePlan(
        SaasPlan $plan
    ): array {
        return [
            'id' => $plan->id,

            'codigo' => $plan->codigo,

            'nome' => $plan->nome,

            'descricao' => $plan->descricao,

            'ativo' => $plan->ativo,

            'ordem' => $plan->ordem,

            'limits' => [
                'empresas' => data_get(
                    $plan->limits,
                    'empresas'
                ),

                'veiculos' => data_get(
                    $plan->limits,
                    'veiculos'
                ),

                'motoristas' => data_get(
                    $plan->limits,
                    'motoristas'
                ),

                'utilizadores' => data_get(
                    $plan->limits,
                    'utilizadores'
                ),
            ],

            'features' => [
                'multi_company' => (bool) data_get(
                    $plan->features,
                    'multi_company',
                    false
                ),

                'integracoes' => (bool) data_get(
                    $plan->features,
                    'integracoes',
                    false
                ),

                'relatorios_avancados' => (bool) data_get(
                    $plan->features,
                    'relatorios_avancados',
                    false
                ),
            ],

            'tenants_count' => $plan->tenants_count
                ?? $plan
                    ->tenants()
                    ->count(),

            'created_at' => $plan->created_at,

            'updated_at' => $plan->updated_at,
        ];
    }
}
