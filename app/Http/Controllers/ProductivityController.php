<?php

namespace App\Http\Controllers;

use App\Services\ProductivityService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductivityController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private ProductivityService $service
    ) {}

    public function search(
        Request $request
    ): JsonResponse {
        $validated =
            $request->validate([
                'q' => [
                    'required',
                    'string',
                    'min:2',
                    'max:100',
                ],

                'limit' => [
                    'nullable',
                    'integer',
                    'min:1',
                    'max:10',
                ],
            ]);

        $term =
            trim(
                $validated['q']
            );

        return response()->json([
            'data' => $this
                ->service
                ->search(
                    $request->user(),
                    $this
                        ->tenantContext
                        ->requireId(),
                    $term,
                    (int) (
                        $validated[
                            'limit'
                        ] ??
                        5
                    )
                ),

            'query' => $term,
        ]);
    }

    public function favorites(
        Request $request
    ): JsonResponse {
        return response()->json([
            'data' => $this
                ->service
                ->favorites(
                    $request->user(),
                    $this
                        ->tenantContext
                        ->requireId()
                ),
        ]);
    }

    public function storeFavorite(
        Request $request
    ): JsonResponse {
        $validated =
            $request->validate([
                'entity_type' => [
                    'required',
                    Rule::in([
                        'empresa',
                        'proprietario',
                        'motorista',
                        'veiculo',
                        'contrato',
                        'documento',
                    ]),
                ],

                'entity_id' => [
                    'required',
                    'uuid',
                ],
            ]);

        $result =
            $this
                ->service
                ->favorite(
                    $request->user(),
                    $this
                        ->tenantContext
                        ->requireId(),
                    $validated[
                        'entity_type'
                    ],
                    $validated[
                        'entity_id'
                    ]
                );

        return response()->json(
            [
                'data' => $result['data'],
            ],
            $result['created']
                ? 201
                : 200
        );
    }

    public function destroyFavorite(
        Request $request,
        string $id
    ) {
        $this
            ->service
            ->removeFavorite(
                $request->user(),
                $this
                    ->tenantContext
                    ->requireId(),
                $id
            );

        return response()->noContent();
    }
}
