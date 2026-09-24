<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateManutencaoPlanoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nome'=>[
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'tipo_servico'=>[
                'sometimes',
                'required',
                'string',
                'max:150',
            ],

            'descricao'=>[
                'sometimes',
                'nullable',
                'string',
                'max:10000',
            ],

            'intervalo_km'=>[
                'sometimes',
                'nullable',
                'integer',
                'min:1',
                'max:999999999',
            ],

            'intervalo_meses'=>[
                'sometimes',
                'nullable',
                'integer',
                'min:1',
                'max:600',
            ],

            'alerta_antecedencia_km'=>[
                'sometimes',
                'required',
                'integer',
                'min:0',
                'max:999999999',
            ],

            'alerta_antecedencia_dias'=>[
                'sometimes',
                'required',
                'integer',
                'min:0',
                'max:3650',
            ],

            'ativo'=>[
                'sometimes',
                'required',
                'boolean',
            ],

            'tenant_id'=>['prohibited'],
            'created_by'=>['prohibited'],
            'updated_by'=>['prohibited'],
        ];
    }
}
