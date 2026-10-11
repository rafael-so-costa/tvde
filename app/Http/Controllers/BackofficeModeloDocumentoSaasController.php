<?php

namespace App\Http\Controllers;

use App\Services\ModeloDocumentoSaasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BackofficeModeloDocumentoSaasController extends Controller
{
    public function __construct(
        private ModeloDocumentoSaasService $service
    ) {}

    public function index(
        Request $request
    ): JsonResponse {
        $validated =
            $request->validate([
                'categoria_id' => [
                    'nullable',
                    'uuid',
                ],

                'status' => [
                    'nullable',
                    Rule::in([
                        'rascunho',
                        'publicado',
                        'arquivado',
                    ]),
                ],

                'ativo' => [
                    'nullable',
                    'boolean',
                ],

                'search' => [
                    'nullable',
                    'string',
                    'max:255',
                ],
            ]);

        return response()->json(
            $this->service
                ->backofficeIndex(
                    $validated
                )
        );
    }

    public function store(
        Request $request
    ): JsonResponse {
        $validated =
            $request->validate(
                $this->rules(
                    false
                )
            );

        return response()->json([
            'message' =>
                'Modelo recomendado criado com sucesso.',

            'data' =>
                $this->service
                    ->storeModel(
                        $request->user(),
                        $validated
                    ),
        ], 201);
    }

    public function show(
        string $id
    ): JsonResponse {
        return response()->json([
            'data' =>
                $this->service
                    ->backofficeShow(
                        $id
                    ),
        ]);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
        $validated =
            $request->validate(
                $this->rules(
                    true
                )
            );

        return response()->json([
            'message' =>
                'Modelo recomendado atualizado com sucesso.',

            'data' =>
                $this->service
                    ->updateModel(
                        $request->user(),
                        $id,
                        $validated
                    ),
        ]);
    }

    public function publish(
        Request $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'message' =>
                'Versão publicada com sucesso.',

            'data' =>
                $this->service
                    ->publish(
                        $request->user(),
                        $id
                    ),
        ], 201);
    }

    public function archive(
        Request $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'message' =>
                'Modelo arquivado com sucesso.',

            'data' =>
                $this->service
                    ->archive(
                        $request->user(),
                        $id
                    ),
        ]);
    }

    public function versions(
        string $id
    ): JsonResponse {
        return response()->json([
            'data' =>
                $this->service
                    ->versions(
                        $id
                    ),
        ]);
    }

    private function rules(
        bool $update
    ): array {
        $required =
            $update
                ? 'sometimes'
                : 'required';

        return [
            'categoria_id' => [
                $required,
                'uuid',

                Rule::exists(
                    'modelo_documento_saas_categorias',
                    'id'
                ),
            ],

            'nome' => [
                $required,
                'string',
                'max:255',
            ],

            'slug' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'resumo' => [
                'sometimes',
                'nullable',
                'string',
                'max:2000',
            ],

            'descricao' => [
                'sometimes',
                'nullable',
                'string',
                'max:10000',
            ],

            'tipo_documento' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],

            'pais' => [
                'sometimes',
                'string',
                'size:2',
            ],

            'idioma' => [
                'sometimes',
                'string',
                'max:10',
            ],

            'conteudo' => [
                $required,
                'string',
                'min:10',
                'max:250000',
            ],

            'versao' => [
                'sometimes',
                'string',
                'max:50',
                'regex:/^[0-9]+\.[0-9]+(?:\.[0-9]+)?$/',
            ],

            'juridicamente_revisto' => [
                'sometimes',
                'boolean',
            ],

            'destaque' => [
                'sometimes',
                'boolean',
            ],

            'ativo' => [
                'sometimes',
                'boolean',
            ],

            'ordem' => [
                'sometimes',
                'integer',
                'min:0',
            ],
        ];
    }
}
