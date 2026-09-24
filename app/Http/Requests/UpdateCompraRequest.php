<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCompraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fornecedor_id'=>[
                'sometimes',
                'nullable',
                'uuid',
            ],
            'numero_documento'=>[
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],
            'data_encomenda'=>[
                'sometimes',
                'nullable',
                'date',
            ],
            'data_prevista'=>[
                'sometimes',
                'nullable',
                'date',
            ],
            'impostos'=>[
                'sometimes',
                'required',
                'numeric',
                'min:0',
                'max:999999999999.99',
            ],
            'observacoes'=>[
                'sometimes',
                'nullable',
                'string',
                'max:10000',
            ],
            'itens'=>[
                'sometimes',
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
                'required_with:itens',
                'numeric',
                'gt:0',
                'max:999999999',
            ],
            'itens.*.valor_unitario'=>[
                'required_with:itens',
                'numeric',
                'min:0',
                'max:999999999999.9999',
            ],

            'status'=>['prohibited'],
            'subtotal'=>['prohibited'],
            'total'=>['prohibited'],
            'data_recebimento'=>['prohibited'],
            'quantidade_recebida'=>['prohibited'],
            'tenant_id'=>['prohibited'],
            'created_by'=>['prohibited'],
            'updated_by'=>['prohibited'],
        ];
    }
}
