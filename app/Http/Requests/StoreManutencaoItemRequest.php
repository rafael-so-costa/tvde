<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManutencaoItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'peca_id'=>[
                'nullable',
                'uuid',
            ],

            'tipo'=>[
                'required',
                Rule::in([
                    'peca',
                    'mao_obra',
                    'outro',
                ]),
            ],

            'descricao'=>[
                'nullable',
                'string',
                'max:500',
            ],

            'quantidade'=>[
                'required',
                'numeric',
                'gt:0',
                'max:999999999',
            ],

            'unidade'=>[
                'nullable',
                'string',
                'max:30',
            ],

            'valor_unitario'=>[
                'nullable',
                'numeric',
                'min:0',
                'max:999999999999.9999',
            ],

            'consome_estoque'=>[
                'required',
                'boolean',
            ],

            'garantia_meses'=>[
                'nullable',
                'integer',
                'min:1',
                'max:600',
            ],

            'garantia_km'=>[
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
