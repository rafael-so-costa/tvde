<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContratoRequest extends FormRequest
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
            'status'=>['prohibited'],
            'versao_atual'=>['prohibited'],
            'valor_semanal'=>['prohibited'],
            'data_assinatura'=>['prohibited'],
            'pdf_gerado_url'=>['prohibited'],
            'assinatura_proprietario_url'=>['prohibited'],
            'assinatura_motorista_url'=>['prohibited'],
            'contrato_pai_id'=>['prohibited'],
            'renovacao_count'=>['prohibited'],
            'hash_documento'=>['prohibited'],
            'bloqueado'=>['prohibited'],

            'tipo_contrato_id'=>[
                'nullable',
                'uuid',
                Rule::exists('tipos_contrato','id')
                    ->where(fn($query)=>$query
                        ->where('tenant_id',$tenantId)
                        ->where('ativo',true)),
            ],

            'template_id'=>[
                'nullable',
                'uuid',
                Rule::exists('templates_contrato','id')
                    ->where(fn($query)=>$query
                        ->where('tenant_id',$tenantId)
                        ->where('ativo',true)),
            ],

            'tipo'=>[
                'nullable',
                'required_without:tipo_contrato_id',
                'string',
                'max:100',
                'regex:/^[a-z0-9_]+$/',
            ],

            'empresa_id'=>[
                'nullable',
                'uuid',
                Rule::exists('empresas','id')
                    ->where(fn($query)=>$query
                        ->where('tenant_id',$tenantId)
                        ->where('ativo',true)),
            ],

            'proprietario_id'=>[
                'nullable',
                'uuid',
                Rule::exists('proprietarios','id')
                    ->where(fn($query)=>$query
                        ->where('tenant_id',$tenantId)
                        ->where('ativo',true)),
            ],

            'motorista_id'=>[
                'nullable',
                'uuid',
                Rule::exists('motoristas','id')
                    ->where(fn($query)=>$query
                        ->where('tenant_id',$tenantId)
                        ->where('ativo',true)),
            ],

            'veiculo_id'=>[
                'nullable',
                'uuid',
                Rule::exists('veiculos','id')
                    ->where(fn($query)=>$query
                        ->where('tenant_id',$tenantId)
                        ->where('ativo',true)),
            ],

            'data_inicio'=>[
                'nullable',
                'date',
            ],

            'data_fim'=>[
                'nullable',
                'date',
                'after_or_equal:data_inicio',
            ],

            'valor_diaria'=>[
                'nullable',
                'numeric',
                'min:0',
            ],

            'valor_caucao'=>[
                'nullable',
                'numeric',
                'min:0',
            ],

            'valor_total'=>[
                'nullable',
                'numeric',
                'min:0',
            ],

            'campos_preenchidos'=>[
                'sometimes',
                'array',
            ],

            'assinaturas'=>[
                'sometimes',
                'array',
                'max:20',
            ],

            'assinaturas.*.placeholder'=>[
                'required',
                'string',
                'distinct',
                Rule::in([
                    'ASSINATURA_MOTORISTA',
                    'ASSINATURA_PROPRIETARIO',
                    'ASSINATURA_EMPRESA',
                    'ASSINATURA_TESTEMUNHA',
                    'ASSINATURA_TITULAR',
                ]),
            ],

            'assinaturas.*.modo'=>[
                'required',
                Rule::in([
                    'presencial',
                    'remota',
                ]),
            ],

            'assinaturas.*.assinatura_url'=>[
                'nullable',
                'string',
            ],

            'assinaturas.*.signatario_nome'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'assinaturas.*.signatario_email'=>[
                'nullable',
                'email',
                'max:255',
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        if($this->has('tipo')){
            $this->merge([
                'tipo'=>strtolower(
                    trim((string)$this->input('tipo'))
                ),
            ]);
        }
    }
}
