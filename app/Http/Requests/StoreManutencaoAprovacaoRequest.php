<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreManutencaoAprovacaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'valor_orcamento'=>[
                'nullable',
                'numeric',
                'gt:0',
                'max:999999999999.99',
            ],

            'aprovador_nome'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'aprovador_email'=>[
                'nullable',
                'email',
                'max:255',
            ],

            'validade_dias'=>[
                'nullable',
                'integer',
                'min:1',
                'max:90',
            ],

            'observacoes'=>[
                'nullable',
                'string',
                'max:5000',
            ],

            'status'=>['prohibited'],
            'token'=>['prohibited'],
            'token_hash'=>['prohibited'],
            'solicitado_por'=>['prohibited'],
            'aprovado_por'=>['prohibited'],
            'respondido_em'=>['prohibited'],
        ];
    }
}
