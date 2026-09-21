<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSinistroDocumentoRequest extends FormRequest
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
                    'declaracao_amigavel',
                    'folha_peritagem',
                    'foto_acidente',
                    'boletim_ocorrencia',
                    'outro',
                ]),
            ],

            'arquivo'=>[
                'required',
                'file',
                'max:20480',
                'mimes:pdf,jpg,jpeg,png',
            ],
        ];
    }
}
