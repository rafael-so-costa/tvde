<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFuncionarioStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'estado'=>[
                'required',
                Rule::in([
                    'ativo',
                    'inativo',
                    'suspenso',
                    'desligado',
                ]),
            ],

            'data_saida'=>[
                'nullable',
                'date',
            ],

            'tenant_id'=>['prohibited'],
            'user_id'=>['prohibited'],
        ];
    }
}
