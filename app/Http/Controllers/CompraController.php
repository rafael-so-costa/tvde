<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReceiveCompraRequest;
use App\Http\Requests\StoreCompraRequest;
use App\Http\Requests\UpdateCompraRequest;
use App\Models\Compra;
use App\Services\CompraService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompraController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private CompraService $service
    ){}

    public function index(Request $request): JsonResponse
    {
        $validated=$request->validate([
            'status'=>[
                'nullable',
                Rule::in([
                    'rascunho',
                    'encomendada',
                    'parcialmente_recebida',
                    'recebida',
                    'cancelada',
                ]),
            ],
            'fornecedor_id'=>[
                'nullable',
                'uuid',
            ],
            'data_inicio'=>[
                'nullable',
                'date',
            ],
            'data_fim'=>[
                'nullable',
                'date',
                'after_or_equal:data_inicio',
            ],
            'search'=>[
                'nullable',
                'string',
                'max:100',
            ],
        ]);

        $query=Compra::query()
            ->where('tenant_id',$this->tenantId())
            ->with([
                'fornecedor:id,nome,nif,tipo',
                'createdBy:id,name',
                'updatedBy:id,name',
            ])
            ->withCount('itens')
            ->orderByDesc('created_at');

        if(!empty($validated['status'])){
            $query->where(
                'status',
                $validated['status']
            );
        }

        if(!empty($validated['fornecedor_id'])){
            $query->where(
                'fornecedor_id',
                $validated['fornecedor_id']
            );
        }

        if(!empty($validated['data_inicio'])){
            $query->whereDate(
                'data_encomenda',
                '>=',
                $validated['data_inicio']
            );
        }

        if(!empty($validated['data_fim'])){
            $query->whereDate(
                'data_encomenda',
                '<=',
                $validated['data_fim']
            );
        }

        if(!empty($validated['search'])){
            $search=trim($validated['search']);

            $query->where(function(Builder $query) use($search){
                $query
                    ->where(
                        'numero_documento',
                        'like',
                        "%{$search}%"
                    )
                    ->orWhereHas(
                        'fornecedor',
                        fn(Builder $query)=>
                            $query->where(
                                'nome',
                                'like',
                                "%{$search}%"
                            )
                    );
            });
        }

        return response()->json([
            'data'=>$query->get(),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $compra=Compra::query()
            ->where('tenant_id',$this->tenantId())
            ->with([
                'fornecedor:id,nome,nif,tipo,email,telemovel',
                'itens.peca:id,codigo,nome,unidade,estoque_atual,custo_medio',
                'movimentosEstoque',
                'createdBy:id,name',
                'updatedBy:id,name',
            ])
            ->findOrFail($id);

        return response()->json([
            'data'=>$compra,
        ]);
    }

    public function store(
        StoreCompraRequest $request
    ): JsonResponse {
        $compra=$this->service->create(
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Compra criada com sucesso.',
            'data'=>$compra,
        ],201);
    }

    public function update(
        UpdateCompraRequest $request,
        string $id
    ): JsonResponse {
        $compra=$this->service->update(
            $id,
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Compra atualizada com sucesso.',
            'data'=>$compra,
        ]);
    }

    public function encomendar(
        Request $request,
        string $id
    ): JsonResponse {
        $compra=$this->service->encomendar(
            $id,
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Compra marcada como encomendada.',
            'data'=>$compra,
        ]);
    }

    public function receber(
        ReceiveCompraRequest $request,
        string $id
    ): JsonResponse {
        $compra=$this->service->receber(
            $id,
            $request->validated('itens'),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Recebimento registado com sucesso.',
            'data'=>$compra,
        ]);
    }

    public function cancelar(
        Request $request,
        string $id
    ): JsonResponse {
        $compra=$this->service->cancel(
            $id,
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Compra cancelada.',
            'data'=>$compra,
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
            'message'=>'Compra eliminada com sucesso.',
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
