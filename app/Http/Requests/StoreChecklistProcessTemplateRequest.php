<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreChecklistProcessTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId=app(TenantContext::class)->requireId();

        return [
            'tenant_id'=>['prohibited'],
            'versao'=>['prohibited'],
            'preset_codigo'=>['prohibited'],
            'preset_versao'=>['prohibited'],

            'codigo'=>[
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('checklist_process_templates','codigo')
                    ->where(fn($query)=>$query->where('tenant_id',$tenantId)),
            ],

            'nome'=>[
                'required',
                'string',
                'max:255',
            ],

            'descricao'=>[
                'nullable',
                'string',
            ],

            'ativo'=>[
                'sometimes',
                'boolean',
            ],

            'items'=>[
                'required',
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
                    'contrato_relacionado',
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

            'items.*.configuracao.tipo_contrato_codigo'=>[
                'nullable',
                'string',
                'max:100',
                'regex:/^[a-z0-9_]+$/',
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

                if(isset($item['configuracao']['tipo_contrato_codigo'])){
                    $data['items'][$index]['configuracao']['tipo_contrato_codigo']=strtolower(
                        trim((string)$item['configuracao']['tipo_contrato_codigo'])
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

                    if(blank($checklistTipo)){
                        $validator->errors()->add(
                            "items.{$index}.configuracao.checklist_tipo",
                            'A etapa de checklist do veículo precisa indicar entrega ou recolha.'
                        );
                    }
                }

                if($tipo==='contrato_relacionado'){
                    $codigo=data_get(
                        $item,
                        'configuracao.tipo_contrato_codigo'
                    );

                    if(blank($codigo)){
                        $validator->errors()->add(
                            "items.{$index}.configuracao.tipo_contrato_codigo",
                            'A etapa de contrato relacionado precisa indicar o código do tipo de contrato.'
                        );
                    }
                }
            }
        });
    }
}