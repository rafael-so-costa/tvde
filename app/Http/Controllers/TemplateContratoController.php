<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTemplateContratoRequest;
use App\Http\Requests\UpdateTemplateContratoRequest;
use App\Models\TemplateContrato;
use App\Services\TenantContext;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class TemplateContratoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function index(
        Request $request
    ): JsonResponse {
        $tenantId = $this->tenantId();

        $validated = $request->validate([
            'perfil_id' => [
                'nullable',
                'uuid',
                Rule::exists(
                    'perfis_template',
                    'id'
                )->where(
                    fn($query) => $query
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                ),
            ],
        ]);

        $query = TemplateContrato::query()
            ->where('tenant_id', $tenantId)
            ->with([
                'perfil:id,nome',
                'checklistProcessTemplate.items',
                    'modeloDocumentoSaas:id,nome,slug,versao_publicada,status,ativo',
            ])
            ->latest('created_at');

        if (
            array_key_exists(
                'perfil_id',
                $validated
            ) &&
            $validated['perfil_id']
        ) {
            $query->where(
                'perfil_id',
                $validated['perfil_id']
            );
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function store(
        StoreTemplateContratoRequest $request
    ): JsonResponse {
        $template = new TemplateContrato(
            $request->validated()
        );

        $template->tenant_id =
            $this->tenantId();

        $template->save();
        $template->load([
            'perfil:id,nome',
            'checklistProcessTemplate.items',
                    'modeloDocumentoSaas:id,nome,slug,versao_publicada,status,ativo',
        ]);

        return response()->json([
            'message' =>
            'Template criado com sucesso.',
            'data' => $template,
        ], 201);
    }

    public function show(
        string $id
    ): JsonResponse {
        return response()->json([
            'data' => $this
                ->findTemplate($id)
                ->load([
                    'perfil:id,nome',
                    'checklistProcessTemplate.items',
                    'modeloDocumentoSaas:id,nome,slug,versao_publicada,status,ativo',
                ])
        ]);
    }

    public function update(
        UpdateTemplateContratoRequest $request,
        string $id
    ): JsonResponse {
        $template = $this->findTemplate($id);

        $template->fill(
            $request->validated()
        );

        $template->save();
        $template->load([
            'perfil:id,nome',
            'checklistProcessTemplate.items',
                    'modeloDocumentoSaas:id,nome,slug,versao_publicada,status,ativo',
        ]);

        return response()->json([
            'message' =>
            'Template atualizado com sucesso.',
            'data' => $template,
        ]);
    }

    public function destroy(
        string $id
    ): Response {
        $template = $this->findTemplate($id);

        $arquivo = $template->arquivo_url;

        $template->delete();

        if (
            $arquivo &&
            $this->isArquivoPrivadoDoTenant(
                $template,
                $arquivo
            )
        ) {
            Storage::disk('local')
                ->delete($arquivo);
        }

        return response()->noContent();
    }

    private function findTemplate(
        string $id
    ): TemplateContrato {
        return TemplateContrato::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->findOrFail($id);
    }


    private function isArquivoPrivadoDoTenant(
        TemplateContrato $template,
        string $path
    ): bool {
        if (
            str_contains(
                str_replace('\\', '/', $path),
                '../'
            )
        ) {
            return false;
        }

        return str_starts_with(
            str_replace('\\', '/', $path),
            'contract-templates/' .
                $template->tenant_id .
                '/'
        );
    }

    private function tenantId(): string
    {
        if (!$this->tenantContext->hasTenant()) {
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        return $this->tenantContext
            ->requireId();
    }
}
