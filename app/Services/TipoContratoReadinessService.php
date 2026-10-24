<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ChecklistProcessTemplate;
use App\Models\TemplateContrato;
use App\Models\TipoContrato;
use Illuminate\Validation\ValidationException;

final class TipoContratoReadinessService
{
    public function restrictMenuQuery(
        \Illuminate\Database\Eloquent\Builder $query,
        string $tenantId
    ): \Illuminate\Database\Eloquent\Builder {
        return $query
            ->whereHas('template',function($template) use($tenantId){
                $template
                    ->where('tenant_id',$tenantId)
                    ->where('ativo',true)
                    ->whereNotNull('conteudo_original')
                    ->whereRaw("TRIM(conteudo_original) <> ''");
            })
            ->whereHas('checklistProcessTemplate',function($workflow) use($tenantId){
                $workflow
                    ->where('tenant_id',$tenantId)
                    ->where('ativo',true)
                    ->whereHas('items');
            });
    }

    public function problems(TipoContrato $tipo): array
    {
        $errors=[];
        $tenantId=(string)$tipo->tenant_id;

        if(blank($tipo->template_id)){
            $errors['template_id']=
                'Selecione um modelo documental antes de ativar este tipo de contrato.';
        }else{
            $template=TemplateContrato::query()
                ->where('tenant_id',$tenantId)
                ->where('ativo',true)
                ->whereKey($tipo->template_id)
                ->first();

            if(!$template){
                $errors['template_id']=
                    'O modelo documental nao existe, esta inativo ou pertence a outra organizacao. Selecione um modelo valido.';
            }elseif(trim((string)$template->conteudo_original)===''){
                $errors['template_id']=
                    'O modelo documental esta vazio. Preencha o conteudo ou selecione outro modelo.';
            }
        }

        if(blank($tipo->checklist_process_template_id)){
            $errors['checklist_process_template_id']=
                'Selecione um workflow antes de ativar este tipo de contrato.';
        }else{
            $workflow=ChecklistProcessTemplate::query()
                ->where('tenant_id',$tenantId)
                ->where('ativo',true)
                ->whereKey($tipo->checklist_process_template_id)
                ->withCount('items')
                ->first();

            if(!$workflow){
                $errors['checklist_process_template_id']=
                    'O workflow nao existe, esta inativo ou pertence a outra organizacao. Selecione um workflow valido.';
            }elseif((int)$workflow->items_count===0){
                $errors['checklist_process_template_id']=
                    'O workflow nao possui etapas. Configure pelo menos uma etapa antes de ativar este tipo.';
            }
        }

        return $errors;
    }

    public function assertCanActivate(TipoContrato $tipo): void
    {
        if(!(bool)$tipo->ativo){
            return;
        }

        $errors=$this->problems($tipo);

        if($errors!==[]){
            throw ValidationException::withMessages($errors);
        }
    }

    public function assertCanCreateContract(TipoContrato $tipo): void
    {
        $errors=$this->problems($tipo);

        if($errors===[]){
            return;
        }

        throw ValidationException::withMessages([
            'tipo_contrato_id'=>
                'O tipo de contrato selecionado nao esta pronto para utilizacao. '.
                implode(' ',array_values($errors)).
                ' Abra a configuracao do tipo de contrato, corrija as associacoes e tente novamente.',
        ]);
    }
}
