<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFuncionarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId=
            $this->attributes->get(
                'tenant_id'
            );

        return [
            'numero_funcionario'=>[
                'nullable',
                'string',
                'max:50',
                Rule::unique(
                    'funcionarios',
                    'numero_funcionario'
                )->where(
                    fn($query)=>
                    $query->where(
                        'tenant_id',
                        $tenantId
                    )
                ),
            ],

            'nome'=>[
                'required',
                'string',
                'max:255',
            ],

            'nif'=>[
                'nullable',
                'string',
                'max:20',
                Rule::unique(
                    'funcionarios',
                    'nif'
                )->where(
                    fn($query)=>
                    $query->where(
                        'tenant_id',
                        $tenantId
                    )
                ),
            ],

            'email'=>[
                'nullable',
                'email',
                'max:190',
                Rule::unique(
                    'funcionarios',
                    'email'
                )->where(
                    fn($query)=>
                    $query->where(
                        'tenant_id',
                        $tenantId
                    )
                ),
            ],

            'telefone'=>[
                'nullable',
                'string',
                'max:30',
            ],

            'data_nascimento'=>[
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'cargo'=>[
                'nullable',
                'string',
                'max:150',
            ],

            'departamento'=>[
                'nullable',
                'string',
                'max:150',
            ],

            'data_admissao'=>[
                'nullable',
                'date',
            ],

            'observacoes'=>[
                'nullable',
                'string',
                'max:10000',
            ],

            'id'=>['prohibited'],
            'tenant_id'=>['prohibited'],
            'user_id'=>['prohibited'],
            'estado'=>['prohibited'],
            'data_saida'=>['prohibited'],
            'created_by'=>['prohibited'],
            'updated_by'=>['prohibited'],
        ];
    }
}
