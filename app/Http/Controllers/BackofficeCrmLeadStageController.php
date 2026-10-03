<?php

namespace App\Http\Controllers;

use App\Http\Requests\MoveBackofficeCrmLeadStageRequest;
use App\Models\CrmLead;
use App\Models\CrmPipelineStage;
use App\Services\CrmLeadService;
use Illuminate\Http\JsonResponse;

class BackofficeCrmLeadStageController extends Controller
{
    public function __construct(
        private readonly CrmLeadService $leads
    ) {}

    public function update(
        MoveBackofficeCrmLeadStageRequest $request,
        string $id
    ): JsonResponse {
        $data =
            $request->validated();

        $lead =
            CrmLead::query()
                ->findOrFail(
                    $id
                );

        $stage =
            CrmPipelineStage::query()
                ->findOrFail(
                    $data[
                        'stage_id'
                    ]
                );

        $lead =
            $this
                ->leads
                ->moveStage(
                    lead: $lead,
                    stage: $stage,
                    actor: $request->user(),
                    note: $data[
                        'note'
                    ] ?? null,
                    lostReason: $data[
                        'lost_reason'
                    ] ?? null,
                    nextFollowUpAt: $data[
                        'next_follow_up_at'
                    ] ?? null
                );

        return response()->json([
            'message' => 'Etapa do lead atualizada com sucesso.',

            'data' => [
                'id' => $lead->id,

                'current_stage' => [
                    'id' => $lead
                        ->currentStage
                        ->id,

                    'code' => $lead
                        ->currentStage
                        ->code,

                    'name' => $lead
                        ->currentStage
                        ->name,

                    'category' => $lead
                        ->currentStage
                        ->category,

                    'color' => $lead
                        ->currentStage
                        ->color,
                ],

                'lost_reason' => $lead->lost_reason,

                'next_follow_up_at' => $lead
                    ->next_follow_up_at,
            ],
        ]);
    }
}
