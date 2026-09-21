<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMultaDocumentoRequest extends FormRequest
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
                    'comprovativo_transferencia_motorista',
                    'folha_multa',
                    'comprovativo_envio_correio',
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
