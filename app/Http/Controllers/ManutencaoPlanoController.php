<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreManutencaoPlanoRequest;
use App\Http\Requests\UpdateManutencaoPlanoRequest;
use App\Models\ManutencaoPlano;
use App\Services\ManutencaoPlanoService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManutencaoPlanoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private ManutencaoPlanoService $service
    ){}

    public function index(Request $request): JsonResponse
    {
        $validated=$request->validate([
            'ativo'=>['nullable','boolean'],
            'search'=>['nullable','string','max:100'],
        ]);

        $query=ManutencaoPlano::query()
            ->where('tenant_id',$this->tenantId())
            ->with([
                'veiculos.veiculo:id,matricula,marca,modelo,km_atual,disponibilidade',
                'createdBy:id,name',
                'updatedBy:id,name',
            ])
            ->orderBy('nome');

        if(array_key_exists('ativo',$validated)){
            $query->where(
                'ativo',
                (bool)$validated['ativo']
            );
        }

        if(!empty($validated['search'])){
            $search=trim($validated['search']);

            $query->where(function(Builder $query) use($search){
                $query
                    ->where(
                        'nome',
                        'like',
                        "%{$search}%"
                    )
                    ->orWhere(
                        'tipo_servico',
                        'like',
                        "%{$search}%"
                    );
            });
        }

        $planos=$query->get();

        foreach($planos as $plano){
            foreach($plano->veiculos as $vinculo){
                $vinculo->setAttribute(
                    'situacao',
                    $this->service->situacao(
                        $vinculo,
                        $vinculo->veiculo?->km_atual
                    )
                );
            }
        }

        return response()->json([
            'data'=>$planos,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $plano=ManutencaoPlano::query()
            ->where('tenant_id',$this->tenantId())
            ->with([
                'veiculos.veiculo:id,matricula,marca,modelo,km_atual,disponibilidade',
                'manutencoes:id,plano_id,veiculo_id,numero_ordem,status,data_conclusao',
                'createdBy:id,name',
                'updatedBy:id,name',
            ])
            ->findOrFail($id);

        foreach($plano->veiculos as $vinculo){
            $vinculo->setAttribute(
                'situacao',
                $this->service->situacao(
                    $vinculo,
                    $vinculo->veiculo?->km_atual
                )
            );
        }

        return response()->json([
            'data'=>$plano,
        ]);
    }

    public function store(
        StoreManutencaoPlanoRequest $request
    ): JsonResponse {
        $plano=$this->service->create(
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Plano de manutenção criado com sucesso.',
            'data'=>$plano,
        ],201);
    }

    public function update(
        UpdateManutencaoPlanoRequest $request,
        string $id
    ): JsonResponse {
        $plano=$this->service->update(
            $id,
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Plano de manutenção atualizado com sucesso.',
            'data'=>$plano,
        ]);
    }

    public function associarVeiculo(
        Request $request,
        string $id
    ): JsonResponse {
        $validated=$request->validate([
            'veiculo_id'=>[
                'required',
                'uuid',
            ],
            'ultimo_km'=>[
                'nullable',
                'integer',
                'min:0',
                'max:999999999',
            ],
            'ultima_data'=>[
                'nullable',
                'date',
            ],
            'ativo'=>[
                'nullable',
                'boolean',
            ],
        ]);

        $vinculo=$this->service->associarVeiculo(
            $id,
            $validated['veiculo_id'],
            $validated,
            $request->user(),
            $this->tenantId()
        );

        $vinculo->setAttribute(
            'situacao',
            $this->service->situacao(
                $vinculo,
                $vinculo->veiculo?->km_atual
            )
        );

        return response()->json([
            'message'=>'Veículo associado ao plano com sucesso.',
            'data'=>$vinculo,
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
            'message'=>'Plano de manutenção eliminado com sucesso.',
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
