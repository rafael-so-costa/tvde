<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmpresaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tenant_id' => ['prohibited'],

            'nome_empresa' => ['required', 'string', 'max:255'],
            'nif' => ['required', 'string', 'max:50'],

            'email' => ['nullable', 'email', 'max:190'],
            'telemovel' => ['nullable', 'string', 'max:50'],
            'nome_gerente' => ['nullable', 'string', 'max:255'],

            'endereco_rua' => ['nullable', 'string', 'max:255'],
            'endereco_numero' => ['nullable', 'string', 'max:50'],
            'endereco_complemento' => ['nullable', 'string', 'max:255'],
            'endereco_cep' => ['nullable', 'string', 'max:30'],
            'endereco_cidade' => ['nullable', 'string', 'max:150'],

            'iban' => ['nullable', 'string', 'max:64'],
            'capital_social' => ['nullable', 'numeric', 'min:0'],

            'certificado_tvde' => ['nullable', 'string', 'max:255'],
            'certificado_tvde_valid_until' => ['nullable', 'date'],

            'logo_url' => ['nullable', 'string', 'max:2048'],

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
