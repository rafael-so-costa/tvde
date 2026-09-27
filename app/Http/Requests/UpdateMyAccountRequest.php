<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMyAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'=>[
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'telefone'=>[
                'sometimes',
                'nullable',
                'string',
                'max:30',
            ],

            'timezone'=>[
                'sometimes',
                'required',
                'string',
                'timezone',
                'max:50',
            ],

            'locale'=>[
                'sometimes',
                'required',
                'string',
                Rule::in([
                    'pt_PT',
                    'pt_BR',
                    'en_GB',
                    'en_US',
                ]),
            ],

            'id'=>['prohibited'],
            'user_id'=>['prohibited'],
            'email'=>['prohibited'],
            'nif'=>['prohibited'],
            'data_nascimento'=>['prohibited'],
            'avatar_path'=>['prohibited'],
            'ativo'=>['prohibited'],
            'roles'=>['prohibited'],
            'tenants'=>['prohibited'],
            'super_admin'=>['prohibited'],
        ];
    }
}
