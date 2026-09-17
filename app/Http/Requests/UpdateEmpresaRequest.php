<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmpresaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tenant_id' => ['prohibited'],

            'nome_empresa' => ['sometimes', 'required', 'string', 'max:255'],
            'nif' => ['sometimes', 'required', 'string', 'max:50'],

            'email' => ['sometimes', 'nullable', 'email', 'max:190'],
            'telemovel' => ['sometimes', 'nullable', 'string', 'max:50'],
            'nome_gerente' => ['sometimes', 'nullable', 'string', 'max:255'],

            'endereco_rua' => ['sometimes', 'nullable', 'string', 'max:255'],
            'endereco_numero' => ['sometimes', 'nullable', 'string', 'max:50'],
            'endereco_complemento' => ['sometimes', 'nullable', 'string', 'max:255'],
            'endereco_cep' => ['sometimes', 'nullable', 'string', 'max:30'],
            'endereco_cidade' => ['sometimes', 'nullable', 'string', 'max:150'],

            'iban' => ['sometimes', 'nullable', 'string', 'max:64'],
            'capital_social' => ['sometimes', 'nullable', 'numeric', 'min:0'],

            'certificado_tvde' => ['sometimes', 'nullable', 'string', 'max:255'],
            'certificado_tvde_valid_until' => ['sometimes', 'nullable', 'date'],

            'logo_url' => ['sometimes', 'nullable', 'string', 'max:2048'],

            'ativo' => ['sometimes', 'boolean'],

            'status_cadastro' => [
                'sometimes',
                Rule::in([
                    'pendente',
                    'ativo',
                    'incompleto',
                    'inativo',
                ]),
            ],
        ];
    }
}
