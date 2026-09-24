<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVeiculoDiagnosticoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'veiculo_id'=>[
                'required',
                'uuid',
            ],

            'fonte'=>[
                'required',
                Rule::in([
                    'manual',
                    'obd',
                    'tesla',
                    'geotab',
                    'outro',
                ]),
            ],

            'external_id'=>[
                'nullable',
                'string',
                'max:150',
            ],

            'codigo_dtc'=>[
                'nullable',
                'string',
                'max:50',
            ],

            'severidade'=>[
                'required',
                Rule::in([
                    'info',
                    'baixa',
                    'media',
                    'alta',
                    'critica',
                ]),
            ],

            'titulo'=>[
                'required',
                'string',
                'max:255',
            ],

            'descricao'=>[
                'nullable',
                'string',
                'max:10000',
            ],

            'dados_brutos'=>[
                'nullable',
                'array',
            ],

            'detectado_em'=>[
                'required',
                'date',
            ],

            'tenant_id'=>['prohibited'],
            'manutencao_id'=>['prohibited'],
            'status'=>['prohibited'],
            'resolvido_em'=>['prohibited'],
            'gerou_manutencao_em'=>['prohibited'],
            'created_by'=>['prohibited'],
        ];
    }
}
