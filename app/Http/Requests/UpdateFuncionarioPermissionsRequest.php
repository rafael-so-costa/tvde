<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFuncionarioPermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'permissions'=>[
                'required',
                'array',
                'max:100',
            ],

            'permissions.*'=>[
                'nullable',
                Rule::in([
                    'nenhum',
                    'visualizar',
                    'configurar',
                ]),
            ],

            'user_id'=>['prohibited'],
            'tenant_id'=>['prohibited'],
            'role'=>['prohibited'],
        ];
    }
}
