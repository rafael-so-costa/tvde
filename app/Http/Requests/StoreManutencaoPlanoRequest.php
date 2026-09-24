<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreManutencaoPlanoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nome'=>[
                'required',
                'string',
                'max:255',
            ],

            'tipo_servico'=>[
                'required',
                'string',
                'max:150',
            ],

            'descricao'=>[
                'nullable',
                'string',
                'max:10000',
            ],

            'intervalo_km'=>[
                'nullable',
                'integer',
                'min:1',
                'max:999999999',
                'required_without:intervalo_meses',
            ],

            'intervalo_meses'=>[
                'nullable',
                'integer',
                'min:1',
                'max:600',
                'required_without:intervalo_km',
            ],

            'alerta_antecedencia_km'=>[
                'required',
                'integer',
                'min:0',
                'max:999999999',
            ],

            'alerta_antecedencia_dias'=>[
                'required',
                'integer',
                'min:0',
                'max:3650',
            ],

            'ativo'=>[
                'required',
                'boolean',
            ],

            'tenant_id'=>['prohibited'],
            'created_by'=>['prohibited'],
            'updated_by'=>['prohibited'],
        ];
    }
}
