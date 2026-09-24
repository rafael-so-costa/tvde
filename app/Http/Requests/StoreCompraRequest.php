<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCompraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fornecedor_id'=>[
                'nullable',
                'uuid',
            ],

            'numero_documento'=>[
                'nullable',
                'string',
                'max:100',
            ],

            'status'=>[
                'required',
                Rule::in([
                    'rascunho',
                    'encomendada',
                ]),
            ],

            'data_encomenda'=>[
                'nullable',
                'date',
            ],

            'data_prevista'=>[
                'nullable',
                'date',
            ],

            'impostos'=>[
                'required',
                'numeric',
                'min:0',
                'max:999999999999.99',
            ],

            'observacoes'=>[
                'nullable',
                'string',
                'max:10000',
            ],

            'itens'=>[
                'required',
                'array',
                'min:1',
                'max:500',
            ],

            'itens.*.peca_id'=>[
                'nullable',
                'uuid',
            ],

            'itens.*.descricao'=>[
                'nullable',
                'string',
                'max:500',
            ],

            'itens.*.quantidade'=>[
                'required',
                'numeric',
                'gt:0',
                'max:999999999',
            ],

            'itens.*.valor_unitario'=>[
                'required',
                'numeric',
                'min:0',
                'max:999999999999.9999',
            ],

            'itens.*.quantidade_recebida'=>[
                'prohibited',
            ],

            'itens.*.valor_total'=>[
                'prohibited',
            ],

            'tenant_id'=>['prohibited'],
            'subtotal'=>['prohibited'],
            'total'=>['prohibited'],
            'data_recebimento'=>['prohibited'],
            'created_by'=>['prohibited'],
            'updated_by'=>['prohibited'],
        ];
    }
}
