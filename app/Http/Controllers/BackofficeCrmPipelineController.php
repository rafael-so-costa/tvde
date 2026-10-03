<?php

namespace App\Http\Controllers;

use App\Models\CrmPipelineStage;
use Illuminate\Http\JsonResponse;

class BackofficeCrmPipelineController extends Controller
{
    public function index(): JsonResponse
    {
        $stages =
            CrmPipelineStage::query()
                ->where(
                    'is_active',
                    true
                )
                ->withCount(
                    'leads'
                )
                ->orderBy(
                    'position'
                )
                ->get();

        return response()->json([
            'data' => $stages
                ->map(
                    fn (
                        CrmPipelineStage $stage
                    ): array => [
                        'id' => $stage->id,

                        'code' => $stage->code,

                        'name' => $stage->name,

                        'category' => $stage->category,

                        'color' => $stage->color,

                        'position' => $stage->position,

                        'is_default' => $stage->is_default,

                        'is_terminal' => $stage->is_terminal,

                        'is_active' => $stage->is_active,

                        'leads_count' => $stage
                            ->leads_count,
                    ]
                )
                ->values(),
        ]);
    }
}
