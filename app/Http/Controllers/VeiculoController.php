<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVeiculoRequest;
use App\Http\Requests\UpdateVeiculoRequest;
use App\Http\Requests\UpdateVeiculoStatusRequest;
use App\Models\ContratoAtivoVeiculo;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\Veiculo;
use App\Services\PermissionService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class VeiculoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService
    ){}

    public function index(Request $request): JsonResponse
    {
        $veiculos=$this->leituraQuery($request)
            ->with('proprietario:id,nome_completo,nome_empresa,tipo,user_id')
            ->latest()
            ->get();

        return response()->json(['data'=>$veiculos]);
    }

    public function show(Request $request,string $id): JsonResponse
    {
        $veiculo=$this->leituraQuery($request)
            ->with('proprietario:id,nome_completo,nome_empresa,tipo,user_id')
            ->findOrFail($id);

        return response()->json(['data'=>$veiculo]);
    }

    public function store(StoreVeiculoRequest $request): JsonResponse
    {
        $veiculo=new Veiculo($request->validated());
        $veiculo->tenant_id=$this->tenantId();
        $veiculo->sincronizarCadastro();
        $veiculo->save();

        $veiculo->load('proprietario:id,nome_completo,nome_empresa,tipo,user_id');

        return response()->json([
            'message'=>'Veículo criado com sucesso.',
            'data'=>$veiculo,
        ],201);
    }

    public function update(UpdateVeiculoRequest $request,string $id): JsonResponse
    {
        $veiculo=$this->findManagementVehicle($id);
        $veiculo->fill($request->validated());
        $veiculo->sincronizarCadastro();
        $veiculo->save();

        $veiculo->load('proprietario:id,nome_completo,nome_empresa,tipo,user_id');

        return response()->json([
            'message'=>'Veículo atualizado com sucesso.',
            'data'=>$veiculo,
        ]);
    }

    public function status(UpdateVeiculoStatusRequest $request,string $id): JsonResponse
    {
        $veiculo=$this->findManagementVehicle($id);

        if($request->boolean('ativo')&&!$veiculo->cadastroCompleto()){
            return response()->json([
                'message'=>'O veículo possui cadastro incompleto e não pode ser ativado.',
            ],422);
        }

        $veiculo->ativo=$request->boolean('ativo');
        $veiculo->save();

        return response()->json([
            'message'=>$veiculo->ativo
                ?'Veículo ativado com sucesso.'
                :'Veículo inativado com sucesso.',
            'data'=>$veiculo,
        ]);
    }

    public function destroy(string $id): Response
    {
        $veiculo=$this->findManagementVehicle($id);
        $veiculo->delete();

        return response()->noContent();
    }

    private function leituraQuery(Request $request): Builder
    {
        $tenantId=$this->tenantId();
        $user=$request->user();

        $query=Veiculo::query()->where('tenant_id',$tenantId);

        if($this->permissionService->allows($user,'veiculos','visualizar',$tenantId)){
            return $query;
        }

        $proprietarioId=null;
        $motoristaId=null;

        if($user->hasRole('proprietario',$tenantId)){
            $proprietarioId=Proprietario::query()
                ->where('tenant_id',$tenantId)
                ->where('user_id',$user->id)
                ->value('id');
        }

        if($user->hasRole('motorista',$tenantId)){
            $motoristaId=Motorista::query()
                ->where('tenant_id',$tenantId)
                ->where('user_id',$user->id)
                ->value('id');
        }

        if(!$proprietarioId&&!$motoristaId){
            abort(403,'Sem permissão suficiente para consultar veículos.');
        }

        return $query->where(function(Builder $query) use($tenantId,$proprietarioId,$motoristaId){
            $hasScope=false;

            if($proprietarioId){
                $query->where('proprietario_id',$proprietarioId);
                $hasScope=true;
            }

            if($motoristaId){
                $vehicleIds=ContratoAtivoVeiculo::query()
                    ->select('veiculo_id')
                    ->where('tenant_id',$tenantId)
                    ->where('motorista_id',$motoristaId)
                    ->where('ativo',true);

                if($hasScope){
                    $query->orWhereIn('id',$vehicleIds);
                }else{
                    $query->whereIn('id',$vehicleIds);
                }
            }
        });
    }

    private function findManagementVehicle(string $id): Veiculo
    {
        return Veiculo::query()
            ->where('tenant_id',$this->tenantId())
            ->findOrFail($id);
    }

    private function tenantId(): string
    {
        if(!$this->tenantContext->hasTenant()){
            abort(403,'Selecione uma organização para aceder a este recurso.');
        }

        return $this->tenantContext->requireId();
    }
}
