<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportTemplateContratoRequest;
use App\Http\Requests\PreviewTemplateImportRequest;
use App\Http\Requests\PreviewTemplateTextRequest;
use App\Http\Requests\StoreTemplateTextRequest;
use App\Models\TemplateContrato;
use App\Services\TemplateImportService;
use App\Services\TemplateTextAnalyzerService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TemplateImportController extends Controller
{
    public function __construct(
        private TemplateImportService $importService,
        private TemplateTextAnalyzerService $textAnalyzer,
        private TenantContext $tenantContext
    ) {}

    public function preview(
        PreviewTemplateImportRequest $request
    ): JsonResponse {
        $result = $this
            ->importService
            ->preview(
                $request->file(
                    'arquivo'
                )
            );

        return response()->json([
            'data' => $result,
        ]);
    }

    public function previewText(
        PreviewTemplateTextRequest $request
    ): JsonResponse {
        if (
            !$this->tenantContext
                ->hasTenant()
        ) {
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        $result = $this
            ->textAnalyzer
            ->analyze(
                $request->validated()[
                    'conteudo'
                ]
            );

        return response()->json([
            'data' => $result,
        ]);
    }

    public function storeText(
        StoreTemplateTextRequest $request
    ): JsonResponse {
        if (
            !$this->tenantContext
                ->hasTenant()
        ) {
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        $tenantId = $this
            ->tenantContext
            ->requireId();

        $validated =
            $request->validated();

        $analysis = $this
            ->textAnalyzer
            ->analyze(
                $validated[
                    'conteudo'
                ]
            );

        $fields = collect(
            $analysis[
                'campos_detectados'
            ] ?? []
        )
            ->pluck(
                'name'
            )
            ->filter()
            ->values();

        $allowedFields =
            $fields->flip();

        $reviewedMappings =
            $validated[
                'campos_mapeados'
            ] ?? [];

        foreach (
            array_keys(
                $reviewedMappings
            ) as $field
        ) {
            if (
                !$allowedFields->has(
                    $field
                )
            ) {
                throw ValidationException::withMessages([
                    "campos_mapeados.{$field}" =>
                        "O campo {$field} não foi detectado no conteúdo analisado.",
                ]);
            }
        }

        $mappings =
            $analysis[
                'campos_mapeados'
            ] ?? [];

        foreach (
            $reviewedMappings
            as $field => $review
        ) {
            $current =
                $mappings[
                    $field
                ] ?? [];

            foreach (
                [
                    'tipo',
                    'origem',
                    'campo',
                ] as $attribute
            ) {
                if (
                    array_key_exists(
                        $attribute,
                        $review
                    )
                ) {
                    $current[
                        $attribute
                    ] =
                        $review[
                            $attribute
                        ];
                }
            }

            $mappings[
                $field
            ] = $current;
        }

        $template = DB::transaction(
            function () use (
                $tenantId,
                $validated,
                $analysis,
                $mappings
            ): TemplateContrato {
                $template =
                    new TemplateContrato([
                        'perfil_id' =>
                            $validated[
                                'perfil_id'
                            ] ?? null,

                        'nome' =>
                            $validated[
                                'nome'
                            ],

                        'tipo_arquivo' =>
                            'txt',

                        'conteudo_original' =>
                            $analysis[
                                'conteudo_parametrizado'
                            ],

                        'campos_detectados' =>
                            $analysis[
                                'campos_detectados'
                            ],

                        'campos_mapeados' =>
                            $mappings,
                    ]);

                $template->tenant_id =
                    $tenantId;

                $template->save();

                return $template;
            }
        );

        $template->load([
            'perfil:id,nome',
            'checklistProcessTemplate.items',
        ]);

        return response()->json([
            'message' =>
                'Modelo de documento criado com sucesso.',

            'data' =>
                $template,

            'analysis' => [
                'warnings' =>
                    $analysis[
                        'warnings'
                    ] ?? [],

                'stats' =>
                    $analysis[
                        'stats'
                    ] ?? [],
            ],
        ], 201);
    }

    public function store(
        ImportTemplateContratoRequest $request
    ): JsonResponse {
        if (
            !$this->tenantContext
                ->hasTenant()
        ) {
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        $validated =
            $request->validated();

        $template = $this
            ->importService
            ->import(
                $request->file(
                    'arquivo'
                ),
                $this->tenantContext
                    ->requireId(),
                $validated[
                    'nome'
                ],
                $validated[
                    'perfil_id'
                ] ?? null
            );

        return response()->json([
            'message' =>
                'Template importado com sucesso.',

            'data' =>
                $template,
        ], 201);
    }
}
