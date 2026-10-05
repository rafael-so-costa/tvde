<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RelatorioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'inicio'=>[
                'nullable',
                'date',
            ],

            'fim'=>[
                'nullable',
                'date',
                'after_or_equal:inicio',
            ],

            'dias'=>[
                'nullable',
                'integer',
                Rule::in([
                    7,
                    15,
                    30,
                    60,
                    90,
                    180,
                    365,
                ]),
            ],

            'entidade'=>[
                'nullable',
                Rule::in([
                    'empresa',
                    'proprietario',
                    'motorista',
                    'veiculo',
                ]),
            ],

            'situacao'=>[
                'nullable',
                Rule::in([
                    'vencido',
                    'a_vencer',
                    'valido',
                ]),
            ],

            'tipo'=>[
                'nullable',
                Rule::in([
                    'multa',
                    'sinistro',
                ]),
            ],

            'status'=>[
                'nullable',
                Rule::in([
                    'pendente',
                    'paga',
                    'contestada',

                    'aberto',
                    'em_andamento',
                    'encerrado',

                    'rascunho',
                    'ativo',
                    'finalizado',
                    'cancelado',
                ]),
            ],

            'status_cadastro'=>[
                'nullable',
                Rule::in([
                    'pendente',
                    'ativo',
                    'incompleto',
                    'inativo',
                ]),
            ],

            'ativo'=>[
                'nullable',
                'boolean',
            ],

            'disponibilidade'=>[
                'nullable',
                'string',
                'max:30',
            ],

            'motorista_id'=>[
                'nullable',
                'uuid',
            ],

            'veiculo_id'=>[
                'nullable',
                'uuid',
            ],

            'proprietario_id'=>[
                'nullable',
                'uuid',
            ],
        ];
    }
}
