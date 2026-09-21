<?php

namespace App\Http\Controllers;

use App\Http\Requests\CorrectRegistoExpedienteRequest;
use App\Models\Motorista;
use App\Services\ExpedienteService;
use App\Services\PermissionService;
use App\Services\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpedienteController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private ExpedienteService $service
    ){}

    public function index(Request $request): JsonResponse
    {
        $validated=$request->validate([
            'data_inicio'=>['nullable','date'],
            'data_fim'=>['nullable','date','after_or_equal:data_inicio'],
            'motorista_id'=>['nullable','uuid'],
            'tipo'=>['nullable',Rule::in(['entrada','saida'])],
        ]);

        $inicio=$validated['data_inicio']
            ?? CarbonImmutable::now('Europe/Lisbon')->subDays(44)->toDateString();

        $fim=$validated['data_fim']
            ?? CarbonImmutable::now('Europe/Lisbon')->toDateString();

        $query=$this->service
            ->queryForUser($request->user(),$this->tenantId())
            ->with([
                'motorista:id,nome_completo,nif,email,telemovel,user_id',
                'corrigidoPor:id,name',
            ])
            ->whereBetween('data_local',[$inicio,$fim])
            ->orderByDesc('data_hora');

        if(!empty($validated['motorista_id'])){
            $query->where('motorista_id',$validated['motorista_id']);
        }

        if(!empty($validated['tipo'])){
            $query->where('tipo',$validated['tipo']);
        }

        return response()->json([
            'data'=>$query->get(),
            'periodo'=>[
                'data_inicio'=>$inicio,
                'data_fim'=>$fim,
            ],
        ]);
    }

    public function estado(Request $request): JsonResponse
    {
        $tenantId=$this->tenantId();
        $user=$request->user();

        $validated=$request->validate([
            'motorista_id'=>['nullable','uuid'],
        ]);

        if($this->permissionService->allows($user,'expediente','visualizar',$tenantId)){
            if(empty($validated['motorista_id'])){
                return response()->json([
                    'message'=>'Informe o motorista_id.',
                ],422);
            }

            $motorista=Motorista::query()
                ->where('tenant_id',$tenantId)
                ->findOrFail($validated['motorista_id']);
        }else{
            $motorista=$this->service->motoristaForUser($user,$tenantId);
        }

        return response()->json([
            'data'=>$this->service->estado($motorista),
        ]);
    }

    public function marcar(Request $request): JsonResponse
    {
        $registo=$this->service->markAuthenticated(
            $request->user(),
            $this->tenantId(),
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'message'=>$registo->tipo==='entrada'
                ? 'Início de expediente registado.'
                : 'Fim de expediente registado.',
            'data'=>$registo,
        ],201);
    }

    public function corrigir(CorrectRegistoExpedienteRequest $request,string $id): JsonResponse
    {
        $registo=$this->service->correct(
            $id,
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Registo corrigido com sucesso.',
            'data'=>$registo,
        ]);
    }

    public function estatisticas(Request $request): JsonResponse
    {
        $tenantId=$this->tenantId();

        if(!$this->permissionService->allows(
            $request->user(),
            'expediente',
            'visualizar',
            $tenantId
        )){
            abort(403,'Sem permissão suficiente para consultar estatísticas.');
        }

        $validated=$request->validate([
            'data_inicio'=>['nullable','date'],
            'data_fim'=>['nullable','date','after_or_equal:data_inicio'],
        ]);

        $inicio=$validated['data_inicio']
            ?? CarbonImmutable::now('Europe/Lisbon')->subDays(29)->toDateString();

        $fim=$validated['data_fim']
            ?? CarbonImmutable::now('Europe/Lisbon')->toDateString();

        return response()->json([
            'data'=>$this->service->statistics($tenantId,$inicio,$fim),
            'periodo'=>[
                'data_inicio'=>$inicio,
                'data_fim'=>$fim,
            ],
        ]);
    }

    private function tenantId(): string
    {
        if(!$this->tenantContext->hasTenant()){
            abort(403,'Selecione uma organização para aceder a este recurso.');
        }

        return $this->tenantContext->requireId();
    }
}
