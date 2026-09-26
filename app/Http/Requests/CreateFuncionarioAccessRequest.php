<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateFuncionarioAccessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'confirm_existing_user'=>[
                'sometimes',
                'boolean',
            ],

            'email'=>['prohibited'],
            'user_id'=>['prohibited'],
            'tenant_id'=>['prohibited'],
            'role'=>['prohibited'],
        ];
    }
}
