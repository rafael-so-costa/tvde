<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFuncionarioAccessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ativo'=>[
                'required',
                'boolean',
            ],

            'user_id'=>['prohibited'],
            'tenant_id'=>['prohibited'],
        ];
    }
}
