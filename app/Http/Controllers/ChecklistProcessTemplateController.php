<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreChecklistProcessTemplateRequest;
use App\Http\Requests\UpdateChecklistProcessTemplateRequest;
use App\Models\ChecklistProcessTemplate;
use App\Models\ChecklistProcessTemplateItem;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ChecklistProcessTemplateController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function index(): JsonResponse
    {
        $templates =
            ChecklistProcessTemplate::query()
                ->where(
                    'tenant_id',
                    $this->tenantId()
                )
                ->with('items')
                ->orderBy('nome')
                ->get();

        return response()->json([
            'data' => $templates,
        ]);
    }

    public function show(
        string $id
    ): JsonResponse {
        $template =
            $this->findTemplate(
                $id
            );

        return response()->json([
            'data' =>
                $template->load(
                    'items'
                ),
        ]);
    }

    public function store(
        StoreChecklistProcessTemplateRequest $request
    ): JsonResponse {
        $validated =
            $request->validated();

        $items =
            $validated[
                'items'
            ];

        unset(
            $validated[
                'items'
            ]
        );

        $template =
            DB::transaction(
                function () use (
                    $validated,
                    $items
                ) {
                    $template =
                        new ChecklistProcessTemplate(
                            $validated
                        );

                    $template->tenant_id =
                        $this->tenantId();

                    $template->versao =
                        1;

                    $template->save();

                    $this->replaceItems(
                        $template,
                        $items
                    );

                    return $template
                        ->load(
                            'items'
                        );
                }
            );

        return response()->json([
            'message' =>
                'Checklist de processo criado com sucesso.',

            'data' =>
                $template,
        ], 201);
    }

    public function update(
        UpdateChecklistProcessTemplateRequest $request,
        string $id
    ): JsonResponse {
        $template =
            $this->findTemplate(
                $id
            );

        $validated =
            $request->validated();

        $items =
            $validated[
                'items'
            ] ?? null;

        unset(
            $validated[
                'items'
            ]
        );

        $template =
            DB::transaction(
                function () use (
                    $template,
                    $validated,
                    $items
                ) {
                    $template->fill(
                        $validated
                    );

                    $template->versao =
                        $template->versao +
                        1;

                    $template->save();

                    if (
                        $items !== null
                    ) {
                        $this->replaceItems(
                            $template,
                            $items
                        );
                    }

                    return $template
                        ->fresh()
                        ->load(
                            'items'
                        );
                }
            );

        return response()->json([
            'message' =>
                'Checklist de processo atualizado com sucesso.',

            'data' =>
                $template,
        ]);
    }

    public function destroy(
        string $id
    ): Response|JsonResponse {
        $template =
            $this->findTemplate(
                $id
            );

        if (
            $template
                ->documentTemplates()
                ->exists()
        ) {
            return response()->json([
                'message' =>
                    'Este checklist está associado a um template de documento.',
            ], 422);
        }

        if (
            $template
                ->runs()
                ->exists()
        ) {
            return response()->json([
                'message' =>
                    'Este checklist já possui execuções e não pode ser eliminado.',
            ], 422);
        }

        $template->delete();

        return response()
            ->noContent();
    }

    private function replaceItems(
        ChecklistProcessTemplate $template,
        array $items
    ): void {
        $template
            ->items()
            ->delete();

        foreach (
            $items as $itemData
        ) {
            $item =
                new ChecklistProcessTemplateItem(
                    $itemData
                );

            $item->template_id =
                $template->id;

            $item->save();
        }
    }

    private function findTemplate(
        string $id
    ): ChecklistProcessTemplate {
        return ChecklistProcessTemplate::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->findOrFail($id);
    }

    private function tenantId(): string
    {
        if (
            !$this->tenantContext
                ->hasTenant()
        ) {
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        return $this
            ->tenantContext
            ->requireId();
    }
}
