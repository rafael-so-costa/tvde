<?php

namespace App\Services;

use App\Models\ChecklistProcessRun;
use App\Models\ChecklistProcessRunItem;
use App\Models\ChecklistProcessTemplate;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChecklistProcessService
{
    public const ENTITY_CONTRATO='contrato';

    public const STATUS_PENDING='pendente';
    public const STATUS_RUNNING='em_andamento';
    public const STATUS_DONE='concluido';
    public const STATUS_CANCELLED='cancelado';

    public const ITEM_PENDING='pendente';
    public const ITEM_RUNNING='em_andamento';
    public const ITEM_DONE='concluido';
    public const ITEM_WAIVED='dispensado';

    public function start(
        string $tenantId,
        ChecklistProcessTemplate $template,
        string $entityType,
        string $entityId,
        array $context=[]
    ): ChecklistProcessRun {
        if($template->tenant_id!==$tenantId){
            throw ValidationException::withMessages([
                'checklist'=>'Checklist de processo inválido para esta organização.',
            ]);
        }

        if(!$template->ativo){
            throw ValidationException::withMessages([
                'checklist'=>'O checklist de processo selecionado está inativo.',
            ]);
        }

        return DB::transaction(function() use(
            $tenantId,
            $template,
            $entityType,
            $entityId,
            $context
        ){
            $existing=ChecklistProcessRun::query()
                ->where('tenant_id',$tenantId)
                ->where('entidade_tipo',$entityType)
                ->where('entidade_id',$entityId)
                ->with('items')
                ->first();

            if($existing){
                return $existing;
            }

            $template->loadMissing('items');

            $run=new ChecklistProcessRun([
                'template_codigo_snapshot'=>$template->codigo,
                'template_nome_snapshot'=>$template->nome,
                'template_versao_snapshot'=>$template->versao,
                'entidade_tipo'=>$entityType,
                'entidade_id'=>$entityId,
                'status'=>$template->items->isEmpty()
                    ?self::STATUS_DONE
                    :self::STATUS_RUNNING,
                'contexto'=>$context,
                'iniciado_em'=>now(),
                'concluido_em'=>$template->items->isEmpty()
                    ?now()
                    :null,
            ]);

            $run->tenant_id=$tenantId;
            $run->template_id=$template->id;
            $run->save();

            foreach($template->items->sortBy('ordem') as $item){
                $runItem=new ChecklistProcessRunItem([
                    'codigo'=>$item->codigo,
                    'ordem'=>$item->ordem,
                    'titulo_snapshot'=>$item->titulo,
                    'descricao_snapshot'=>$item->descricao,
                    'tipo'=>$item->tipo,
                    'obrigatorio'=>$item->obrigatorio,
                    'configuracao_snapshot'=>$item->configuracao,
                    'status'=>self::ITEM_PENDING,
                ]);

                $runItem->run_id=$run->id;
                $runItem->template_item_id=$item->id;
                $runItem->save();
            }

            return $run->load('items');
        });
    }

    public function completeItem(
        string $tenantId,
        string $runId,
        string $itemId,
        string $userId,
        array $result=[]
    ): ChecklistProcessRun {
        return DB::transaction(function() use(
            $tenantId,
            $runId,
            $itemId,
            $userId,
            $result
        ){
            $run=$this->lockedRun($tenantId,$runId);

            if(in_array($run->status,[
                self::STATUS_DONE,
                self::STATUS_CANCELLED,
            ],true)){
                throw ValidationException::withMessages([
                    'checklist'=>'Este checklist de processo já está encerrado.',
                ]);
            }

            $item=ChecklistProcessRunItem::query()
                ->where('run_id',$run->id)
                ->whereKey($itemId)
                ->lockForUpdate()
                ->firstOrFail();

            if($item->status===self::ITEM_DONE){
                throw ValidationException::withMessages([
                    'item'=>'Esta etapa já está concluída.',
                ]);
            }

            if(in_array($item->tipo,[
                'assinatura',
                'gerar_documento',
                'checklist_veiculo',
                'acao_sistema',
            ],true)){
                throw ValidationException::withMessages([
                    'item'=>'Esta etapa é concluída automaticamente pelo sistema.',
                ]);
            }

            $this->completeRunItem(
                $item,
                $result,
                $userId
            );

            $this->recalculate($run);

            return $run->fresh()->load('items');
        });
    }

    public function completeByCode(
        string $tenantId,
        string $entityType,
        string $entityId,
        string $code,
        array $result=[],
        ?string $userId=null
    ): ?ChecklistProcessRun {
        return DB::transaction(function() use(
            $tenantId,
            $entityType,
            $entityId,
            $code,
            $result,
            $userId
        ){
            $run=ChecklistProcessRun::query()
                ->where('tenant_id',$tenantId)
                ->where('entidade_tipo',$entityType)
                ->where('entidade_id',$entityId)
                ->lockForUpdate()
                ->first();

            if(!$run){
                return null;
            }

            $item=ChecklistProcessRunItem::query()
                ->where('run_id',$run->id)
                ->where('codigo',$code)
                ->lockForUpdate()
                ->first();

            if(!$item){
                return $run->load('items');
            }

            if($item->status!==self::ITEM_DONE){
                $this->completeRunItem(
                    $item,
                    $result,
                    $userId
                );
            }

            $this->recalculate($run);

            return $run->fresh()->load('items');
        });
    }

    public function completeSignature(
        string $tenantId,
        string $contratoId,
        string $placeholder,
        array $result=[],
        ?string $userId=null
    ): ?ChecklistProcessRun {
        return DB::transaction(function() use(
            $tenantId,
            $contratoId,
            $placeholder,
            $result,
            $userId
        ){
            $run=$this->contractRun(
                $tenantId,
                $contratoId
            );

            if(!$run){
                return null;
            }

            if(in_array($run->status,[
                self::STATUS_DONE,
                self::STATUS_CANCELLED,
            ],true)){
                return $run->load('items');
            }

            $placeholder=mb_strtoupper(trim($placeholder));

            $items=ChecklistProcessRunItem::query()
                ->where('run_id',$run->id)
                ->where('tipo','assinatura')
                ->lockForUpdate()
                ->get();

            $item=$items->first(
                fn($item)=>
                    mb_strtoupper(
                        trim(
                            (string)data_get(
                                $item->configuracao_snapshot,
                                'placeholder'
                            )
                        )
                    )===$placeholder
            );

            if(!$item){
                return $run->load('items');
            }

            if($item->status!==self::ITEM_DONE){
                $this->completeRunItem(
                    $item,
                    array_merge($result,[
                        'placeholder'=>$placeholder,
                    ]),
                    $userId
                );
            }

            $this->recalculate($run);

            return $run->fresh()->load('items');
        });
    }

    public function completeDocumentGeneration(
        string $tenantId,
        string $contratoId,
        array $result=[],
        ?string $userId=null
    ): ?ChecklistProcessRun {
        return DB::transaction(function() use(
            $tenantId,
            $contratoId,
            $result,
            $userId
        ){
            $run=$this->contractRun(
                $tenantId,
                $contratoId
            );

            if(!$run){
                return null;
            }

            if($run->status===self::STATUS_CANCELLED){
                return $run->load('items');
            }

            $items=ChecklistProcessRunItem::query()
                ->where('run_id',$run->id)
                ->where('tipo','gerar_documento')
                ->lockForUpdate()
                ->get();

            foreach($items as $item){
                if($item->status!==self::ITEM_DONE){
                    $this->completeRunItem(
                        $item,
                        $result,
                        $userId
                    );
                }
            }

            $this->recalculate($run);

            return $run->fresh()->load('items');
        });
    }

    public function isComplete(
        string $tenantId,
        string $entityType,
        string $entityId
    ): bool {
        return ChecklistProcessRun::query()
            ->where('tenant_id',$tenantId)
            ->where('entidade_tipo',$entityType)
            ->where('entidade_id',$entityId)
            ->where('status',self::STATUS_DONE)
            ->exists();
    }

    private function contractRun(
        string $tenantId,
        string $contratoId
    ): ?ChecklistProcessRun {
        return ChecklistProcessRun::query()
            ->where('tenant_id',$tenantId)
            ->where(
                'entidade_tipo',
                self::ENTITY_CONTRATO
            )
            ->where('entidade_id',$contratoId)
            ->lockForUpdate()
            ->first();
    }

    private function lockedRun(
        string $tenantId,
        string $runId
    ): ChecklistProcessRun {
        return ChecklistProcessRun::query()
            ->where('tenant_id',$tenantId)
            ->whereKey($runId)
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function completeRunItem(
        ChecklistProcessRunItem $item,
        array $result,
        ?string $userId
    ): void {
        $item->status=self::ITEM_DONE;
        $item->resultado=$result;
        $item->concluido_por=$userId;
        $item->concluido_em=now();
        $item->save();
    }

    private function recalculate(
        ChecklistProcessRun $run
    ): void {
        $pending=ChecklistProcessRunItem::query()
            ->where('run_id',$run->id)
            ->where('obrigatorio',true)
            ->whereNotIn('status',[
                self::ITEM_DONE,
                self::ITEM_WAIVED,
            ])
            ->exists();

        $run->status=$pending
            ?self::STATUS_RUNNING
            :self::STATUS_DONE;

        $run->concluido_em=$pending
            ?null
            :now();

        $run->save();
    }
}
