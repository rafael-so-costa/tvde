<?php

namespace App\Providers;

use App\Models\ChecklistProcessRunItem;
use App\Models\ChecklistRecord;
use App\Services\AuditService;
use App\Services\ChecklistProcessService;
use App\Services\DocumentoRegistryService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Throwable;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->scoped(
            TenantContext::class,
            fn()=>new TenantContext()
        );
    }

    public function boot(): void
    {
        foreach([
            'created',
            'updated',
            'deleted',
        ] as $action){
            Event::listen(
                "eloquent.{$action}: *",
                function(
                    string $eventName,
                    array $data
                ) use($action){
                    $model=$data[0]??null;

                    if(!$model instanceof Model){
                        return;
                    }

                    app(AuditService::class)
                        ->capture(
                            $model,
                            $action
                        );

                    if($action==='deleted'){
                        return;
                    }

                    try{
                        app(DocumentoRegistryService::class)
                            ->sync($model);
                    }catch(Throwable $exception){
                        report($exception);
                    }

                    if(
                        $model instanceof ChecklistRecord &&
                        $model->estado==='finalizado' &&
                        $model->process_run_item_id
                    ){
                        try{
                            $item=ChecklistProcessRunItem::query()
                                ->with('run')
                                ->find(
                                    $model->process_run_item_id
                                );

                            if(
                                $item &&
                                $item->tipo==='checklist_veiculo' &&
                                $item->run
                            ){
                                app(ChecklistProcessService::class)
                                    ->completeByCode(
                                        $model->tenant_id,
                                        $item->run->entidade_tipo,
                                        $item->run->entidade_id,
                                        $item->codigo,
                                        [
                                            'checklist_id'=>$model->id,
                                            'tipo'=>$model->tipo,
                                            'finalizado_em'=>$model
                                                ->finalizado_em
                                                ?->toISOString(),
                                        ],
                                        $model->realizado_por
                                    );
                            }
                        }catch(Throwable $exception){
                            report($exception);
                        }
                    }
                }
            );
        }
    }
}
