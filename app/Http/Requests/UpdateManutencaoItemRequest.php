<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateManutencaoItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'peca_id'=>[
                'sometimes',
                'nullable',
                'uuid',
            ],

            'tipo'=>[
                'sometimes',
                'required',
                Rule::in([
                    'peca',
                    'mao_obra',
                    'outro',
                ]),
            ],

            'descricao'=>[
                'sometimes',
                'required',
                'string',
                'max:500',
            ],

            'quantidade'=>[
                'sometimes',
                'required',
                'numeric',
                'gt:0',
                'max:999999999',
            ],

            'unidade'=>[
                'sometimes',
                'required',
                'string',
                'max:30',
            ],

            'valor_unitario'=>[
                'sometimes',
                'required',
                'numeric',
                'min:0',
                'max:999999999999.9999',
            ],

            'consome_estoque'=>[
                'sometimes',
                'required',
                'boolean',
            ],

            'garantia_meses'=>[
                'sometimes',
                'nullable',
                'integer',
                'min:1',
                'max:600',
            ],

            'garantia_km'=>[
                'sometimes',
                'nullable',
                'integer',
                'min:1',
                'max:999999999',
            ],

            'tenant_id'=>['prohibited'],
            'manutencao_id'=>['prohibited'],
            'valor_total'=>['prohibited'],
        ];
    }
}
