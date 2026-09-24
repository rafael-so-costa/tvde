<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePecaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fornecedor_preferencial_id'=>[
                'nullable',
                'uuid',
            ],

            'codigo'=>[
                'required',
                'string',
                'max:100',
            ],

            'nome'=>[
                'required',
                'string',
                'max:255',
            ],

            'fabricante'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'unidade'=>[
                'required',
                'string',
                'max:30',
            ],

            'estoque_minimo'=>[
                'required',
                'numeric',
                'min:0',
                'max:999999999',
            ],

            'ativo'=>[
                'required',
                'boolean',
            ],

            /*
             * Estoque e custo só mudam pelo ledger.
             */
            'estoque_atual'=>['prohibited'],
            'custo_medio'=>['prohibited'],
            'tenant_id'=>['prohibited'],
        ];
    }
}
