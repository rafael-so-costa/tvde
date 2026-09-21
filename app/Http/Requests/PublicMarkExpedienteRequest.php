<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PublicMarkExpedienteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nif'=>['required','string','regex:/^\d{9}$/'],
            'tenant_id'=>[
                'nullable',
                'uuid',
                Rule::exists('tenants','id')->where(fn($query)=>$query->where('ativo',true)),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'nif.regex'=>'Introduza os 9 dígitos do NIF.',
        ];
    }
}
