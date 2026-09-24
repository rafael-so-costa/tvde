<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePecaRequest;
use App\Http\Requests\UpdatePecaRequest;
use App\Models\Peca;
use App\Services\PecaService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PecaController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private PecaService $service
    ){}

    public function index(Request $request): JsonResponse
    {
        $validated=$request->validate([
            'ativo'=>[
                'nullable',
                'boolean',
            ],
            'fornecedor_id'=>[
                'nullable',
                'uuid',
            ],
            'estoque_baixo'=>[
                'nullable',
                'boolean',
            ],
            'search'=>[
                'nullable',
                'string',
                'max:100',
            ],
        ]);

        $query=Peca::query()
            ->where('tenant_id',$this->tenantId())
            ->with(
                'fornecedorPreferencial:id,nome,nif'
            )
            ->orderBy('nome');

        if(array_key_exists('ativo',$validated)){
            $query->where(
                'ativo',
                (bool)$validated['ativo']
            );
        }

        if(!empty($validated['fornecedor_id'])){
            $query->where(
                'fornecedor_preferencial_id',
                $validated['fornecedor_id']
            );
        }

        if(
            !empty(
                $validated['estoque_baixo']
            )
        ){
            $query->whereColumn(
                'estoque_atual',
                '<=',
                'estoque_minimo'
            );
        }

        if(!empty($validated['search'])){
            $search=trim($validated['search']);

            $query->where(function(Builder $query) use($search){
                $query
                    ->where(
                        'codigo',
                        'like',
                        "%{$search}%"
                    )
                    ->orWhere(
                        'nome',
                        'like',
                        "%{$search}%"
                    )
                    ->orWhere(
                        'fabricante',
                        'like',
                        "%{$search}%"
                    );
            });
        }

        return response()->json([
            'data'=>$query->get(),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $peca=Peca::query()
            ->where('tenant_id',$this->tenantId())
            ->with([
                'fornecedorPreferencial:id,nome,nif',
                'movimentosEstoque'=>fn($query)=>
                    $query
                        ->latest()
                        ->limit(100),
            ])
            ->findOrFail($id);

        return response()->json([
            'data'=>$peca,
        ]);
    }

    public function store(
        StorePecaRequest $request
    ): JsonResponse {
        $peca=$this->service->create(
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Peça criada com sucesso.',
            'data'=>$peca,
        ],201);
    }

    public function update(
        UpdatePecaRequest $request,
        string $id
    ): JsonResponse {
        $peca=$this->service->update(
            $id,
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Peça atualizada com sucesso.',
            'data'=>$peca,
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): JsonResponse {
        $this->service->delete(
            $id,
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Peça eliminada com sucesso.',
        ]);
    }

    private function tenantId(): string
    {
        if(!$this->tenantContext->hasTenant()){
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        return $this->tenantContext->requireId();
    }
}
