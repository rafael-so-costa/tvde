<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManutencaoDocumentoRequest extends FormRequest
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
                    'orcamento',
                    'fatura',
                    'ordem_servico',
                    'relatorio_diagnostico',
                    'fotografia',
                    'garantia',
                    'outro',
                ]),
            ],

            'arquivo'=>[
                'required',
                'file',
                'max:20480',
                'mimes:pdf,jpg,jpeg,png,doc,docx',
            ],
        ];
    }
}
