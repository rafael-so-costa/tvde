<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreBackofficePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('codigo')) {
            $this->merge([
                'codigo' => Str::lower(
                    trim(
                        (string) $this->input(
                            'codigo'
                        )
                    )
                ),
            ]);
        }

        if ($this->has('nome')) {
            $this->merge([
                'nome' => trim(
                    (string) $this->input(
                        'nome'
                    )
                ),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'codigo' => [
                'required',
                'string',
                'max:50',
                'regex:/^[a-z0-9][a-z0-9_-]*$/',
                Rule::unique(
                    'saas_plans',
                    'codigo'
                ),
            ],

            'nome' => [
                'required',
                'string',
                'max:255',
            ],

            'descricao' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'ativo' => [
                'required',
                'boolean',
            ],

            'ordem' => [
                'required',
                'integer',
                'min:0',
                'max:65535',
            ],

            'limits' => [
                'required',
                'array',
            ],

            'limits.empresas' => [
                'present',
                'nullable',
                'integer',
                'min:0',
            ],

            'limits.veiculos' => [
                'present',
                'nullable',
                'integer',
                'min:0',
            ],

            'limits.motoristas' => [
                'present',
                'nullable',
                'integer',
                'min:0',
            ],

            'limits.utilizadores' => [
                'present',
                'nullable',
                'integer',
                'min:0',
            ],

            'features' => [
                'required',
                'array',
            ],

            'features.multi_company' => [
                'required',
                'boolean',
            ],

            'features.integracoes' => [
                'required',
                'boolean',
            ],

            'features.relatorios_avancados' => [
                'required',
                'boolean',
            ],
        ];
    }
}
