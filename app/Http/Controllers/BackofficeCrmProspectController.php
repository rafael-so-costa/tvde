<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateBackofficeCrmLeadsFromOperatorsRequest;
use App\Services\CrmLeadService;
use Illuminate\Http\JsonResponse;

class BackofficeCrmProspectController extends Controller
{
    public function __construct(
        private readonly CrmLeadService $leads
    ) {}

    public function store(
        CreateBackofficeCrmLeadsFromOperatorsRequest $request
    ): JsonResponse {
        $data =
            $request->validated();

        $result =
            $this
                ->leads
                ->createFromOperators(
                    operatorIds: $data[
                            'operator_ids'
                        ],

                    actor: $request->user(),

                    assignedToUserId: $data[
                            'assigned_to_user_id'
                        ] ?? null,

                    priority: $data[
                            'priority'
                        ],

                    tagIds: $data[
                            'tag_ids'
                        ] ?? []
                );

        return response()->json([
            'message' => $this->message(
                $result[
                    'counts'
                ]
            ),

            'data' => $result,
        ], 201);
    }

    private function message(
        array $counts
    ): string {
        if (
            $counts['created'] === 0
        ) {
            return 'Nenhum novo lead foi criado; os operadores selecionados já eram leads ou clientes.';
        }

        return sprintf(
            '%d lead(s) criado(s) com sucesso.',
            $counts['created']
        );
    }
}
