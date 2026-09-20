<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDeclaracaoRequest extends FormRequest
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
            'data_emissao'=>['prohibited'],
            'pdf_url'=>['prohibited'],
            'hash_documento'=>['prohibited'],
            'created_by'=>['prohibited'],
            'emitted_by'=>['prohibited'],

            'tipo'=>[
                'sometimes',
                Rule::in([
                    'vinculo_motorista',
                    'utilizacao_veiculo',
                    'atividade_tvde',
                    'livre',
                ]),
            ],

            'titulo'=>[
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'destinatario'=>[
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'conteudo'=>[
                'sometimes',
                'required',
                'string',
                'max:30000',
            ],

            'observacoes'=>[
                'sometimes',
                'nullable',
                'string',
                'max:5000',
            ],

            'empresa_id'=>[
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('empresas','id')->where(
                    fn($query)=>$query->where('tenant_id',$tenantId)
                ),
            ],

            'motorista_id'=>[
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('motoristas','id')->where(
                    fn($query)=>$query->where('tenant_id',$tenantId)
                ),
            ],

            'proprietario_id'=>[
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('proprietarios','id')->where(
                    fn($query)=>$query->where('tenant_id',$tenantId)
                ),
            ],

            'veiculo_id'=>[
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('veiculos','id')->where(
                    fn($query)=>$query->where('tenant_id',$tenantId)
                ),
            ],
        ];
    }
}
