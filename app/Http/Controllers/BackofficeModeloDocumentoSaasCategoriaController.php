<?php

namespace App\Http\Controllers;

use App\Services\ModeloDocumentoSaasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BackofficeModeloDocumentoSaasCategoriaController extends Controller
{
    public function __construct(
        private ModeloDocumentoSaasService $service
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' =>
                $this->service
                    ->categories(),
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
        $validated =
            $request->validate([
                'nome' => [
                    'required',
                    'string',
                    'max:255',
                ],

                'slug' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'descricao' => [
                    'nullable',
                    'string',
                    'max:5000',
                ],

                'ordem' => [
                    'sometimes',
                    'integer',
                    'min:0',
                ],

                'ativo' => [
                    'sometimes',
                    'boolean',
                ],
            ]);

        return response()->json([
            'message' =>
                'Categoria criada com sucesso.',

            'data' =>
                $this->service
                    ->storeCategory(
                        $request->user(),
                        $validated
                    ),
        ], 201);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
        $validated =
            $request->validate([
                'nome' => [
                    'sometimes',
                    'required',
                    'string',
                    'max:255',
                ],

                'slug' => [
                    'sometimes',
                    'required',
                    'string',
                    'max:255',
                ],

                'descricao' => [
                    'sometimes',
                    'nullable',
                    'string',
                    'max:5000',
                ],

                'ordem' => [
                    'sometimes',
                    'integer',
                    'min:0',
                ],

                'ativo' => [
                    'sometimes',
                    'boolean',
                ],
            ]);

        return response()->json([
            'message' =>
                'Categoria atualizada com sucesso.',

            'data' =>
                $this->service
                    ->updateCategory(
                        $request->user(),
                        $id,
                        $validated
                    ),
        ]);
    }

    public function destroy(
        string $id
    ): JsonResponse {
        $this->service
            ->destroyCategory(
                $id
            );

        return response()->json([
            'message' =>
                'Categoria eliminada com sucesso.',
        ]);
    }
}
