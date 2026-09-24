<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePecaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fornecedor_preferencial_id'=>[
                'sometimes',
                'nullable',
                'uuid',
            ],

            'codigo'=>[
                'sometimes',
                'required',
                'string',
                'max:100',
            ],

            'nome'=>[
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'fabricante'=>[
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'unidade'=>[
                'sometimes',
                'required',
                'string',
                'max:30',
            ],

            'estoque_minimo'=>[
                'sometimes',
                'required',
                'numeric',
                'min:0',
                'max:999999999',
            ],

            'ativo'=>[
                'sometimes',
                'required',
                'boolean',
            ],

            'estoque_atual'=>['prohibited'],
            'custo_medio'=>['prohibited'],
            'tenant_id'=>['prohibited'],
        ];
    }
}
