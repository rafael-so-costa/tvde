<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSinistroRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'veiculo_id' => [
                'sometimes',
                'required',
                'uuid',
            ],

            'motorista_id' => [
                'sometimes',
                'nullable',
                'uuid',
            ],

            'data_sinistro' => [
                'sometimes',
                'required',
                'date',
                'before_or_equal:today',
            ],

            'status' => [
                'sometimes',
                'required',
                Rule::in([
                    'aberto',
                    'em_andamento',
                    'encerrado',
                ]),
            ],

            'data_peritagem' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'peritagem_realizada' => [
                'sometimes',
                'required',
                'boolean',
            ],

            'seguradora' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'apolice' => [
                'sometimes',
                'nullable',
                'string',
                'max:150',
            ],

            'numero_processo' => [
                'sometimes',
                'nullable',
                'string',
                'max:150',
            ],

            'itens_danificados' => [
                'sometimes',
                'nullable',
                'array',
                'max:100',
            ],

            'itens_danificados.*' => [
                'nullable',
                'string',
                'max:255',
            ],

            'descricao' => [
                'sometimes',
                'nullable',
                'string',
                'max:10000',
            ],

            'teve_testemunha' => [
                'sometimes',
                'required',
                'boolean',
            ],

            'nome_testemunha' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'telemovel_testemunha' => [
                'sometimes',
                'nullable',
                'string',
                'max:50',
            ],
        ];
    }
}
