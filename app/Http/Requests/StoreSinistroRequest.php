<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSinistroRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'veiculo_id' => [
                'required',
                'uuid',
            ],

            'motorista_id' => [
                'nullable',
                'uuid',
            ],

            'data_sinistro' => [
                'required',
                'date',
                'before_or_equal:today',
            ],

            'status' => [
                'required',
                Rule::in([
                    'aberto',
                    'em_andamento',
                    'encerrado',
                ]),
            ],

            'data_peritagem' => [
                'nullable',
                'date',
                'after_or_equal:data_sinistro',
            ],

            'peritagem_realizada' => [
                'required',
                'boolean',
            ],

            'seguradora' => [
                'nullable',
                'string',
                'max:255',
            ],

            'apolice' => [
                'nullable',
                'string',
                'max:150',
            ],

            'numero_processo' => [
                'nullable',
                'string',
                'max:150',
            ],

            'itens_danificados' => [
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
                'nullable',
                'string',
                'max:10000',
            ],

            'teve_testemunha' => [
                'required',
                'boolean',
            ],

            'nome_testemunha' => [
                'nullable',
                'string',
                'max:255',
            ],

            'telemovel_testemunha' => [
                'nullable',
                'string',
                'max:50',
            ],
        ];
    }
}
