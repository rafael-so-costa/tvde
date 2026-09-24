<?php

namespace App\Http\Controllers;

use App\Http\Requests\AdjustEstoqueRequest;
use App\Models\EstoqueMovimento;
use App\Models\Peca;
use App\Services\EstoqueService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EstoqueController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private EstoqueService $service
    ){}

    public function index(Request $request): JsonResponse
    {
        $validated=$request->validate([
            'estoque_baixo'=>[
                'nullable',
                'boolean',
            ],
            'ativo'=>[
                'nullable',
                'boolean',
            ],
        ]);

        $query=Peca::query()
            ->where('tenant_id',$this->tenantId())
            ->with(
                'fornecedorPreferencial:id,nome'
            )
            ->orderBy('nome');

        if(array_key_exists('ativo',$validated)){
            $query->where(
                'ativo',
                (bool)$validated['ativo']
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

        return response()->json([
            'data'=>$query->get(),
        ]);
    }

    public function movimentos(Request $request): JsonResponse
    {
        $validated=$request->validate([
            'peca_id'=>[
                'nullable',
                'uuid',
            ],
            'tipo'=>[
                'nullable',
                Rule::in([
                    'entrada',
                    'saida',
                    'ajuste_entrada',
                    'ajuste_saida',
                ]),
            ],
            'origem'=>[
                'nullable',
                Rule::in([
                    'compra',
                    'manutencao',
                    'ajuste',
                    'devolucao',
                ]),
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
        ]);

        $query=EstoqueMovimento::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->with([
                'peca:id,codigo,nome,unidade',
                'compra:id,numero_documento',
                'manutencao:id,numero_ordem',
                'createdBy:id,name',
            ])
            ->orderByDesc('created_at');

        foreach([
            'peca_id',
            'tipo',
            'origem',
        ] as $field){
            if(!empty($validated[$field])){
                $query->where(
                    $field,
                    $validated[$field]
                );
            }
        }

        if(!empty($validated['data_inicio'])){
            $query->whereDate(
                'created_at',
                '>=',
                $validated['data_inicio']
            );
        }

        if(!empty($validated['data_fim'])){
            $query->whereDate(
                'created_at',
                '<=',
                $validated['data_fim']
            );
        }

        return response()->json([
            'data'=>$query->get(),
        ]);
    }

    public function ajustar(
        AdjustEstoqueRequest $request,
        string $pecaId
    ): JsonResponse {
        $validated=$request->validated();

        $movimento=$this->service->ajustar(
            $pecaId,
            (float)$validated['estoque'],
            $request->user(),
            $this->tenantId(),
            $validated['observacoes']
                ?? null
        );

        return response()->json([
            'message'=>$movimento
                ? 'Estoque ajustado com sucesso.'
                : 'O estoque já possui o saldo informado.',
            'data'=>$movimento,
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
