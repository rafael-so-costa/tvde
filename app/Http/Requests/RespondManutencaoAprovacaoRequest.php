<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RespondManutencaoAprovacaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'decisao'=>[
                'required',
                Rule::in([
                    'aprovar',
                    'rejeitar',
                ]),
            ],

            'observacoes'=>[
                'nullable',
                'string',
                'max:5000',
            ],
        ];
    }
}
