<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFornecedorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tipo'=>[
                'sometimes',
                'required',
                Rule::in([
                    'oficina',
                    'pecas',
                    'geral',
                ]),
            ],

            'nome'=>[
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'nif'=>[
                'sometimes',
                'nullable',
                'string',
                'max:30',
            ],

            'email'=>[
                'sometimes',
                'nullable',
                'email',
                'max:255',
            ],

            'telemovel'=>[
                'sometimes',
                'nullable',
                'string',
                'max:50',
            ],

            'morada'=>[
                'sometimes',
                'nullable',
                'string',
                'max:2000',
            ],

            'contacto_responsavel'=>[
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'observacoes'=>[
                'sometimes',
                'nullable',
                'string',
                'max:10000',
            ],

            'ativo'=>[
                'sometimes',
                'required',
                'boolean',
            ],

            'tenant_id'=>['prohibited'],
        ];
    }
}
