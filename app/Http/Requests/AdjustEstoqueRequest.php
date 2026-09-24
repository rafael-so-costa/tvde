<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdjustEstoqueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'estoque'=>[
                'required',
                'numeric',
                'min:0',
                'max:999999999',
            ],

            'observacoes'=>[
                'nullable',
                'string',
                'max:2000',
            ],
        ];
    }
}
