<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReciboVerdeRequest extends FormRequest
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
            'empresa_id'=>['prohibited'],
            'ano'=>['prohibited'],
            'mes'=>['prohibited'],
            'status'=>['prohibited'],
            'arquivo_path'=>['prohibited'],
            'arquivo_nome'=>['prohibited'],
            'arquivo_mime'=>['prohibited'],
            'arquivo_tamanho'=>['prohibited'],
            'hash_arquivo'=>['prohibited'],
            'avisos_validacao'=>['prohibited'],
            'observacoes_empresa'=>['prohibited'],
            'created_by'=>['prohibited'],
            'validado_por'=>['prohibited'],
            'validado_em'=>['prohibited'],
            'rejeitado_por'=>['prohibited'],
            'rejeitado_em'=>['prohibited'],

            'motorista_id'=>[
                'nullable',
                'uuid',
                Rule::exists(
                    'motoristas',
                    'id'
                )->where(
                    fn($query)=>
                        $query->where(
                            'tenant_id',
                            $tenantId
                        )
                ),
            ],

            'numero_documento'=>[
                'required',
                'string',
                'max:150',
            ],

            'data_emissao'=>[
                'required',
                'date',
            ],

            'nif_emitente'=>[
                'required',
                'string',
                'max:20',
            ],

            'nome_emitente'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'nif_adquirente'=>[
                'required',
                'string',
                'max:20',
            ],

            'nome_adquirente'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'valor_base'=>[
                'required',
                'numeric',
                'min:0',
                'max:9999999999999.99',
            ],

            'valor_iva'=>[
                'nullable',
                'numeric',
                'min:0',
                'max:9999999999999.99',
            ],

            'retencao_irs'=>[
                'nullable',
                'numeric',
                'min:0',
                'max:9999999999999.99',
            ],

            'valor_total'=>[
                'required',
                'numeric',
                'min:0',
                'max:9999999999999.99',
            ],

            'arquivo'=>[
                'required',
                'file',
                'mimes:pdf',
                'max:20480',
            ],

            'dados_extraidos'=>[
                'nullable',
                'array',
            ],

            'dados_extraidos.texto'=>[
                'nullable',
                'string',
                'max:50000',
            ],

            'dados_extraidos.metodo'=>[
                'nullable',
                'string',
                'max:50',
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
