<?php

namespace App\Http\Controllers;

use App\Http\Requests\ConvertBackofficeCrmLeadRequest;
use App\Models\CrmLead;
use App\Models\SaasPlan;
use App\Services\CrmConversionService;
use Illuminate\Http\JsonResponse;

class BackofficeCrmConversionController extends Controller
{
    public function __construct(
        private readonly CrmConversionService $conversions
    ) {}

    public function store(
        ConvertBackofficeCrmLeadRequest $request,
        string $id
    ): JsonResponse {
        $data =
            $request->validated();

        $lead =
            CrmLead::query()
                ->findOrFail(
                    $id
                );

        $plan =
            SaasPlan::query()
                ->findOrFail(
                    $data[
                        'saas_plan_id'
                    ]
                );

        $result =
            $this
                ->conversions
                ->convert(
                    lead: $lead,
                    plan: $plan,
                    data: $data,
                    actor: $request->user()
                );

        return response()->json([
            'message' => $result[
                    'tenant_created'
                ]
                    ? 'Lead convertido num novo cliente FrotaPRO com sucesso.'
                    : 'Lead associado ao cliente FrotaPRO existente com sucesso.',

            'data' => [
                'lead_id' => $result[
                        'lead'
                    ]->id,

                'tenant_created' => $result[
                        'tenant_created'
                    ],

                'trial_started' => $result[
                        'trial_started'
                    ],

                'tenant' => [
                    'id' => $result[
                            'tenant'
                        ]->id,

                    'nome' => $result[
                            'tenant'
                        ]->nome,

                    'slug' => $result[
                            'tenant'
                        ]->slug,

                    'nif' => $result[
                            'tenant'
                        ]->nif,

                    'email' => $result[
                            'tenant'
                        ]->email,

                    'telefone' => $result[
                            'tenant'
                        ]->telefone,

                    'ativo' => $result[
                            'tenant'
                        ]->ativo,
                ],

                'subscription' => [
                    'id' => $result[
                            'subscription'
                        ]->id,

                    'status' => $result[
                            'subscription'
                        ]->status,

                    'billing_cycle' => $result[
                            'subscription'
                        ]->billing_cycle,

                    'trial_ends_at' => $result[
                            'subscription'
                        ]->trial_ends_at,

                    'plan' => $result[
                            'subscription'
                        ]->plan
                            ? [
                                'id' => $result[
                                        'subscription'
                                    ]
                                        ->plan
                                        ->id,

                                'codigo' => $result[
                                        'subscription'
                                    ]
                                        ->plan
                                        ->codigo,

                                'nome' => $result[
                                        'subscription'
                                    ]
                                        ->plan
                                        ->nome,
                            ]
                            : null,
                ],
            ],
        ]);
    }
}
