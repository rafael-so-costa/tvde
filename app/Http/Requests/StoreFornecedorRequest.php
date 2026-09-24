<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFornecedorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tipo'=>[
                'required',
                Rule::in([
                    'oficina',
                    'pecas',
                    'geral',
                ]),
            ],

            'nome'=>[
                'required',
                'string',
                'max:255',
            ],

            'nif'=>[
                'nullable',
                'string',
                'max:30',
            ],

            'email'=>[
                'nullable',
                'email',
                'max:255',
            ],

            'telemovel'=>[
                'nullable',
                'string',
                'max:50',
            ],

            'morada'=>[
                'nullable',
                'string',
                'max:2000',
            ],

            'contacto_responsavel'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'observacoes'=>[
                'nullable',
                'string',
                'max:10000',
            ],

            'ativo'=>[
                'required',
                'boolean',
            ],

            'tenant_id'=>['prohibited'],
        ];
    }
}
