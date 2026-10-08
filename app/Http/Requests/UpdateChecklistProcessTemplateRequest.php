<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateChecklistProcessTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId=app(TenantContext::class)->requireId();
        $id=(string)$this->route('id');

        return [
            'tenant_id'=>['prohibited'],
            'versao'=>['prohibited'],

            'codigo'=>[
                'sometimes',
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('checklist_process_templates','codigo')
                    ->where(fn($query)=>$query->where('tenant_id',$tenantId))
                    ->ignore($id),
            ],

            'nome'=>[
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'descricao'=>[
                'sometimes',
                'nullable',
                'string',
            ],

            'ativo'=>[
                'sometimes',
                'boolean',
            ],

            'items'=>[
                'sometimes',
                'array',
                'min:1',
                'max:100',
            ],

            'items.*.codigo'=>[
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9_]+$/',
                'distinct',
            ],

            'items.*.ordem'=>[
                'required',
                'integer',
                'min:0',
            ],

            'items.*.titulo'=>[
                'required',
                'string',
                'max:255',
            ],

            'items.*.descricao'=>[
                'nullable',
                'string',
            ],

            'items.*.tipo'=>[
                'required',
                Rule::in([
                    'tarefa',
                    'preenchimento',
                    'assinatura',
                    'upload',
                    'aprovacao',
                    'gerar_documento',
                    'checklist_veiculo',
                    'validacao',
                    'acao_sistema',
                ]),
            ],

            'items.*.obrigatorio'=>[
                'required',
                'boolean',
            ],

            'items.*.configuracao'=>[
                'sometimes',
                'array',
            ],

            'items.*.configuracao.placeholder'=>[
                'nullable',
                'string',
                Rule::in([
                    'ASSINATURA_MOTORISTA',
                    'ASSINATURA_PROPRIETARIO',
                    'ASSINATURA_EMPRESA',
                    'ASSINATURA_TESTEMUNHA',
                ]),
            ],

            'items.*.configuracao.action'=>[
                'nullable',
                'string',
                Rule::in([
                    'motorista_acesso',
                ]),
            ],

            'items.*.configuracao.checklist_tipo'=>[
                'nullable',
                'string',
                Rule::in([
                    'entrega',
                    'recolha',
                ]),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $data=$this->all();

        if(array_key_exists('codigo',$data)){
            $data['codigo']=strtolower(
                trim((string)$data['codigo'])
            );
        }

        if(array_key_exists('nome',$data)){
            $data['nome']=trim(
                (string)$data['nome']
            );
        }

        if(isset($data['items']) && is_array($data['items'])){
            foreach($data['items'] as $index=>$item){
                if(isset($item['codigo'])){
                    $data['items'][$index]['codigo']=strtolower(
                        trim((string)$item['codigo'])
                    );
                }

                if(isset($item['titulo'])){
                    $data['items'][$index]['titulo']=trim(
                        (string)$item['titulo']
                    );
                }

                if(isset($item['configuracao']['placeholder'])){
                    $data['items'][$index]['configuracao']['placeholder']=mb_strtoupper(
                        trim((string)$item['configuracao']['placeholder'])
                    );
                }

                if(isset($item['configuracao']['action'])){
                    $data['items'][$index]['configuracao']['action']=strtolower(
                        trim((string)$item['configuracao']['action'])
                    );
                }

                if(isset($item['configuracao']['checklist_tipo'])){
                    $data['items'][$index]['configuracao']['checklist_tipo']=strtolower(
                        trim((string)$item['configuracao']['checklist_tipo'])
                    );
                }
            }
        }

        $this->replace($data);
    }

    public function withValidator($validator): void
    {
        $validator->after(function($validator): void{
            foreach((array)$this->input('items',[]) as $index=>$item){
                $tipo=$item['tipo']??null;

                if($tipo==='assinatura'){
                    $placeholder=data_get(
                        $item,
                        'configuracao.placeholder'
                    );

                    if(blank($placeholder)){
                        $validator->errors()->add(
                            "items.{$index}.configuracao.placeholder",
                            'Etapas de assinatura precisam indicar o placeholder da assinatura.'
                        );
                    }
                }

                if($tipo==='acao_sistema'){
                    $action=data_get(
                        $item,
                        'configuracao.action'
                    );

                    if(blank($action)){
                        $validator->errors()->add(
                            "items.{$index}.configuracao.action",
                            'A etapa de ação do sistema precisa indicar a ação a executar.'
                        );
                    }
                }

                if($tipo==='checklist_veiculo'){
                    $checklistTipo=data_get(
                        $item,
                        'configuracao.checklist_tipo'
                    );

                    if(
                        filled($checklistTipo) &&
                        !in_array(
                            $checklistTipo,
                            ['entrega','recolha'],
                            true
                        )
                    ){
                        $validator->errors()->add(
                            "items.{$index}.configuracao.checklist_tipo",
                            'O tipo de checklist deve ser entrega ou recolha.'
                        );
                    }
                }
            }
        });
    }
}
