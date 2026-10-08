<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTipoContratoRequest;
use App\Http\Requests\UpdateTipoContratoRequest;
use App\Models\TipoContrato;
use App\Services\TenantContext;
use App\Services\TipoContratoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TipoContratoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private TipoContratoService $service
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query=TipoContrato::query()
            ->where('tenant_id',$this->tenantId())
            ->with([
                'template:id,nome,tipo_arquivo,ativo',
                'checklistProcessTemplate:id,codigo,nome,ativo,versao',
            ])
            ->withCount('contratos')
            ->orderBy('ordem')
            ->orderBy('nome');

        if(!$request->boolean('incluir_inativos')){
            $query->where('ativo',true);
        }

        if($request->boolean('menu')){
            $query
                ->where('ativo',true)
                ->where('mostrar_menu',true);
        }

        return response()->json([
            'data'=>$query->get(),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $tipo=TipoContrato::query()
            ->where('tenant_id',$this->tenantId())
            ->with([
                'template',
                'checklistProcessTemplate.items',
                'criador:id,name',
                'atualizador:id,name',
            ])
            ->withCount('contratos')
            ->findOrFail($id);

        return response()->json([
            'data'=>$tipo,
        ]);
    }

    public function store(
        StoreTipoContratoRequest $request
    ): JsonResponse {
        return response()->json([
            'message'=>'Tipo de contrato criado com sucesso.',
            'data'=>$this->service->create(
                $request->validated(),
                $this->tenantId(),
                $request->user()
            ),
        ],201);
    }

    public function update(
        UpdateTipoContratoRequest $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'message'=>'Tipo de contrato atualizado com sucesso.',
            'data'=>$this->service->update(
                $id,
                $request->validated(),
                $this->tenantId(),
                $request->user()
            ),
        ]);
    }

    public function archive(
        Request $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'message'=>'Tipo de contrato arquivado com sucesso.',
            'data'=>$this->service->archive(
                $id,
                $this->tenantId(),
                $request->user()
            ),
        ]);
    }

    private function tenantId(): string
    {
        return $this->tenantContext->requireId();
    }
}
