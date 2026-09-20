<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDeclaracaoRequest extends FormRequest
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
                'required',
                Rule::in([
                    'vinculo_motorista',
                    'utilizacao_veiculo',
                    'atividade_tvde',
                    'livre',
                ]),
            ],

            'titulo'=>[
                'required',
                'string',
                'max:255',
            ],

            'destinatario'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'conteudo'=>[
                'required',
                'string',
                'max:30000',
            ],

            'observacoes'=>[
                'nullable',
                'string',
                'max:5000',
            ],

            'empresa_id'=>[
                'nullable',
                'uuid',
                Rule::exists('empresas','id')->where(
                    fn($query)=>$query->where('tenant_id',$tenantId)
                ),
            ],

            'motorista_id'=>[
                'nullable',
                'uuid',
                Rule::exists('motoristas','id')->where(
                    fn($query)=>$query->where('tenant_id',$tenantId)
                ),
            ],

            'proprietario_id'=>[
                'nullable',
                'uuid',
                Rule::exists('proprietarios','id')->where(
                    fn($query)=>$query->where('tenant_id',$tenantId)
                ),
            ],

            'veiculo_id'=>[
                'nullable',
                'uuid',
                Rule::exists('veiculos','id')->where(
                    fn($query)=>$query->where('tenant_id',$tenantId)
                ),
            ],
        ];
    }
}
