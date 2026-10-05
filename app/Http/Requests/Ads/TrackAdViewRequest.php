<?php

namespace App\Http\Requests\Ads;

use Illuminate\Foundation\Http\FormRequest;

class TrackAdViewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'delivery_token' => [
                'required',
                'string',
                'size:64',
                'regex:/^[A-Za-z0-9]+$/',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'delivery_token.required' => 'O identificador da entrega é obrigatório.',

            'delivery_token.size' => 'O identificador da entrega não é válido.',

            'delivery_token.regex' => 'O identificador da entrega não é válido.',
        ];
    }
}
