<?php

namespace App\Http\Controllers;

use App\Models\ChecklistProcessRunItem;
use App\Models\ChecklistRecord;
use App\Models\Contrato;
use App\Models\Documento;
use App\Services\ChecklistProcessService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChecklistPendingController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function index(): JsonResponse
    {
        $tenantId=$this->tenantContext->requireId();

        $items=ChecklistProcessRunItem::query()
            ->where('tipo','checklist_veiculo')
            ->whereNotIn('status',[
                ChecklistProcessService::ITEM_DONE,
                ChecklistProcessService::ITEM_WAIVED,
            ])
            ->whereHas('run',fn($q)=>$q
                ->where('tenant_id',$tenantId)
                ->where(
                    'entidade_tipo',
                    ChecklistProcessService::ENTITY_CONTRATO
                ))
            ->with('run')
            ->orderBy('ordem')
            ->get();

        $contratoIds=$items
            ->pluck('run.entidade_id')
            ->filter()
            ->unique()
            ->values();

        $contratos=Contrato::query()
            ->where('tenant_id',$tenantId)
            ->whereIn('id',$contratoIds)
            ->with([
                'motorista:id,nome_completo',
                'veiculo:id,matricula,marca,modelo',
                'tipoContrato:id,nome,codigo',
            ])
            ->get()
            ->keyBy('id');

        $records=ChecklistRecord::query()
            ->where('tenant_id',$tenantId)
            ->whereIn(
                'process_run_item_id',
                $items->pluck('id')
            )
            ->get()
            ->keyBy('process_run_item_id');

        $documentos=Documento::query()
            ->where('tenant_id',$tenantId)
            ->where('entidade_tipo','contrato')
            ->whereIn('entidade_id',$contratoIds)
            ->get()
            ->keyBy('entidade_id');

        $data=$items
            ->map(function($item) use(
                $contratos,
                $records,
                $documentos
            ){
                $contrato=$contratos->get(
                    $item->run->entidade_id
                );

                if(!$contrato){
                    return null;
                }

                $record=$records->get($item->id);

                $blocked=ChecklistProcessRunItem::query()
                    ->where('run_id',$item->run_id)
                    ->where('obrigatorio',true)
                    ->where('ordem','<',$item->ordem)
                    ->whereNotIn('status',[
                        ChecklistProcessService::ITEM_DONE,
                        ChecklistProcessService::ITEM_WAIVED,
                    ])
                    ->exists();

                return [
                    'item_id'=>$item->id,
                    'contrato_id'=>$contrato->id,
                    'contrato_codigo'=>$documentos
                        ->get($contrato->id)
                        ?->codigo,
                    'tipo_contrato'=>$contrato
                        ->tipoContrato
                        ?->nome
                        ??$contrato->tipo,
                    'motorista'=>$contrato->motorista,
                    'veiculo'=>$contrato->veiculo,
                    'checklist_tipo'=>data_get(
                        $item->configuracao_snapshot,
                        'checklist_tipo',
                        'entrega'
                    ),
                    'titulo'=>$item->titulo_snapshot,
                    'descricao'=>$item->descricao_snapshot,
                    'status'=>$record
                        ?'iniciado'
                        :($blocked?'bloqueado':'pendente'),
                    'checklist'=>$record,
                ];
            })
            ->filter()
            ->values();

        return response()->json([
            'data'=>$data,
            'meta'=>[
                'total'=>$data->count(),
                'pendentes'=>$data
                    ->where('status','pendente')
                    ->count(),
                'iniciados'=>$data
                    ->where('status','iniciado')
                    ->count(),
                'bloqueados'=>$data
                    ->where('status','bloqueado')
                    ->count(),
            ],
        ]);
    }

    public function start(
        Request $request,
        string $itemId
    ): JsonResponse {
        $tenantId=$this->tenantContext->requireId();

        $checklist=DB::transaction(function() use(
            $tenantId,
            $itemId,
            $request
        ){
            $item=ChecklistProcessRunItem::query()
                ->whereKey($itemId)
                ->where('tipo','checklist_veiculo')
                ->with('run')
                ->lockForUpdate()
                ->firstOrFail();

            if(
                !$item->run ||
                $item->run->tenant_id!==$tenantId ||
                $item->run->entidade_tipo!==
                    ChecklistProcessService::ENTITY_CONTRATO
            ){
                abort(404);
            }

            $existing=ChecklistRecord::query()
                ->where('tenant_id',$tenantId)
                ->where('process_run_item_id',$item->id)
                ->first();

            if($existing){
                return $existing;
            }

            $blocked=ChecklistProcessRunItem::query()
                ->where('run_id',$item->run_id)
                ->where('obrigatorio',true)
                ->where('ordem','<',$item->ordem)
                ->whereNotIn('status',[
                    ChecklistProcessService::ITEM_DONE,
                    ChecklistProcessService::ITEM_WAIVED,
                ])
                ->exists();

            if($blocked){
                throw ValidationException::withMessages([
                    'checklist'=>'Existem etapas obrigatórias anteriores ainda pendentes.',
                ]);
            }

            $contrato=Contrato::query()
                ->where('tenant_id',$tenantId)
                ->with(['motorista','veiculo'])
                ->lockForUpdate()
                ->findOrFail($item->run->entidade_id);

            if($contrato->status!=='assinado'){
                throw ValidationException::withMessages([
                    'contrato'=>'O contrato precisa estar assinado antes da inspeção do veículo.',
                ]);
            }

            if(
                !$contrato->motorista_id ||
                !$contrato->veiculo_id
            ){
                throw ValidationException::withMessages([
                    'checklist'=>'O contrato precisa possuir motorista e veículo.',
                ]);
            }

            $tipo=data_get(
                $item->configuracao_snapshot,
                'checklist_tipo',
                'entrega'
            );

            if(!in_array($tipo,['entrega','recolha'],true)){
                $tipo='entrega';
            }

            $checklist=new ChecklistRecord([
                'contrato_id'=>$contrato->id,
                'process_run_item_id'=>$item->id,
                'tipo'=>$tipo,
                'origem'=>'workflow',
                'motorista_id'=>$contrato->motorista_id,
                'veiculo_id'=>$contrato->veiculo_id,
                'data_operacao'=>now()->toDateString(),
            ]);

            $checklist->tenant_id=$tenantId;
            $checklist->estado='rascunho';
            $checklist->realizado_por=$request->user()->id;
            $checklist->motorista_nome_snapshot=
                $contrato->motorista?->nome_completo;
            $checklist->matricula_snapshot=
                $contrato->veiculo?->matricula;
            $checklist->modelo_snapshot=trim(
                ($contrato->veiculo?->marca??'').' '.
                ($contrato->veiculo?->modelo??'')
            );

            $checklist->save();

            return $checklist;
        });

        return response()->json([
            'message'=>'Checklist iniciado com sucesso.',
            'data'=>$checklist->load([
                'motorista:id,nome_completo',
                'veiculo:id,matricula,marca,modelo',
                'contrato:id,tipo,tipo_contrato_id',
                'mediaFiles',
            ]),
        ],201);
    }
}
