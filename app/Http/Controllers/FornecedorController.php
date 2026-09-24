<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFornecedorRequest;
use App\Http\Requests\UpdateFornecedorRequest;
use App\Models\Fornecedor;
use App\Services\FornecedorService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FornecedorController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private FornecedorService $service
    ){}

    public function index(Request $request): JsonResponse
    {
        $validated=$request->validate([
            'tipo'=>[
                'nullable',
                Rule::in([
                    'oficina',
                    'pecas',
                    'geral',
                ]),
            ],
            'ativo'=>[
                'nullable',
                'boolean',
            ],
            'search'=>[
                'nullable',
                'string',
                'max:100',
            ],
        ]);

        $query=Fornecedor::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->orderBy('nome');

        if(!empty($validated['tipo'])){
            $query->where(
                'tipo',
                $validated['tipo']
            );
        }

        if(array_key_exists('ativo',$validated)){
            $query->where(
                'ativo',
                (bool)$validated['ativo']
            );
        }

        if(!empty($validated['search'])){
            $search=trim(
                $validated['search']
            );

            $query->where(
                function(Builder $query) use($search){
                    $query
                        ->where(
                            'nome',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'nif',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'email',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'telemovel',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'contacto_responsavel',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'morada',
                            'like',
                            "%{$search}%"
                        );
                }
            );
        }

        return response()->json([
            'data'=>$query->get(),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $fornecedor=Fornecedor::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->withCount([
                'pecasPreferenciais',
                'compras',
                'manutencoes',
                'garantias',
            ])
            ->findOrFail($id);

        return response()->json([
            'data'=>$fornecedor,
        ]);
    }

    public function store(
        StoreFornecedorRequest $request
    ): JsonResponse {
        $fornecedor=$this->service->create(
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>
                'Fornecedor criado com sucesso.',
            'data'=>$fornecedor,
        ],201);
    }

    public function update(
        UpdateFornecedorRequest $request,
        string $id
    ): JsonResponse {
        $fornecedor=$this->service->update(
            $id,
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>
                'Fornecedor atualizado com sucesso.',
            'data'=>$fornecedor,
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
            'message'=>
                'Fornecedor eliminado com sucesso.',
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
