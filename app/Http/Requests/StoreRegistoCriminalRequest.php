<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRegistoCriminalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId=app(TenantContext::class)
            ->requireId();

        return [
            'tenant_id'=>['prohibited'],
            'status'=>['prohibited'],
            'arquivo_path'=>['prohibited'],
            'arquivo_nome'=>['prohibited'],
            'arquivo_mime'=>['prohibited'],
            'arquivo_tamanho'=>['prohibited'],
            'hash_arquivo'=>['prohibited'],
            'enviado_por'=>['prohibited'],
            'validado_por'=>['prohibited'],
            'validado_em'=>['prohibited'],
            'rejeitado_por'=>['prohibited'],
            'rejeitado_em'=>['prohibited'],
            'observacoes_empresa'=>['prohibited'],

            'motorista_id'=>[
                'nullable',
                'uuid',
                Rule::exists('motoristas','id')
                    ->where(
                        fn($query)=>
                            $query->where(
                                'tenant_id',
                                $tenantId
                            )
                    ),
            ],

            'codigo_consulta'=>[
                'required',
                'string',
                'max:120',
            ],

            'data_emissao'=>[
                'nullable',
                'date',
                'before_or_equal:data_validade',
            ],

            'data_validade'=>[
                'required',
                'date',
            ],

            'arquivo'=>[
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:10240',
            ],

            'dados_extraidos'=>[
                'nullable',
                'array',
            ],

            'dados_extraidos.texto'=>[
                'nullable',
                'string',
                'max:30000',
            ],

            'dados_extraidos.nome_titular'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'dados_extraidos.codigo_consulta'=>[
                'nullable',
                'string',
                'max:120',
            ],

            'dados_extraidos.data_emissao'=>[
                'nullable',
                'string',
                'max:30',
            ],

            'dados_extraidos.data_validade'=>[
                'nullable',
                'string',
                'max:30',
            ],

            'dados_extraidos.confianca'=>[
                'nullable',
                'array',
            ],

            'dados_extraidos.confianca.*'=>[
                'nullable',
                'numeric',
                'between:0,1',
            ],
        ];
    }
}
