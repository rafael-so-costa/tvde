<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContratoRequest extends FormRequest
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

            'tipo_contrato_id'=>['prohibited'],
            'template_id'=>['prohibited'],
            'tipo'=>['prohibited'],

            'empresa_id'=>['prohibited'],

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
            'assinaturas'=>['prohibited'],

            'proprietario_id'=>[
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('proprietarios','id')
                    ->where(fn($query)=>$query
                        ->where('tenant_id',$tenantId)),
            ],

            'motorista_id'=>[
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('motoristas','id')
                    ->where(fn($query)=>$query
                        ->where('tenant_id',$tenantId)),
            ],

            'veiculo_id'=>[
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('veiculos','id')
                    ->where(fn($query)=>$query
                        ->where('tenant_id',$tenantId)),
            ],

            'data_inicio'=>[
                'sometimes',
                'nullable',
                'date',
            ],

            'data_fim'=>[
                'sometimes',
                'nullable',
                'date',
            ],

            'valor_diaria'=>[
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'valor_caucao'=>[
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'valor_total'=>[
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'campos_preenchidos'=>[
                'sometimes',
                'array',
            ],
        ];
    }
}
