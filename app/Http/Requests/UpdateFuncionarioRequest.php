<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFuncionarioRequest extends FormRequest
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

        $id=$this->route('id');

        return [
            'numero_funcionario'=>[
                'sometimes',
                'nullable',
                'string',
                'max:50',

                Rule::unique(
                    'funcionarios',
                    'numero_funcionario'
                )
                    ->where(
                        fn($query)=>
                        $query->where(
                            'tenant_id',
                            $tenantId
                        )
                    )
                    ->ignore($id),
            ],

            'nome'=>[
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'nif'=>[
                'sometimes',
                'nullable',
                'string',
                'max:20',

                Rule::unique(
                    'funcionarios',
                    'nif'
                )
                    ->where(
                        fn($query)=>
                        $query->where(
                            'tenant_id',
                            $tenantId
                        )
                    )
                    ->ignore($id),
            ],

            'email'=>[
                'sometimes',
                'nullable',
                'email',
                'max:190',

                Rule::unique(
                    'funcionarios',
                    'email'
                )
                    ->where(
                        fn($query)=>
                        $query->where(
                            'tenant_id',
                            $tenantId
                        )
                    )
                    ->ignore($id),
            ],

            'telefone'=>[
                'sometimes',
                'nullable',
                'string',
                'max:30',
            ],

            'data_nascimento'=>[
                'sometimes',
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'cargo'=>[
                'sometimes',
                'nullable',
                'string',
                'max:150',
            ],

            'departamento'=>[
                'sometimes',
                'nullable',
                'string',
                'max:150',
            ],

            'data_admissao'=>[
                'sometimes',
                'date',
            ],

            'observacoes'=>[
                'sometimes',
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
