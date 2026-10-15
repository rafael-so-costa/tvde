<?php

namespace App\Http\Requests;

use App\Rules\PortugueseIban;
use App\Rules\PortugueseNif;
use App\Rules\PortuguesePhone;
use App\Rules\PortuguesePostalCode;
use App\Services\TenantContext;
use App\Support\PortugueseDataNormalizer;
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
        $tenantId = app(TenantContext::class)
            ->requireId();

        return [
            'tenant_id' => ['prohibited'],

            'nome_empresa' => [
                'required',
                'string',
                'max:255',
            ],

            'nif' => [
                'required',
                'string',
                'max:9',
                new PortugueseNif,
                Rule::unique(
                    'empresas',
                    'nif'
                )->where(
                    fn ($query) => $query
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                ),
            ],

            'email' => [
                'nullable',
                'email',
                'max:190',
            ],

            'telemovel' => [
                'nullable',
                'string',
                'max:20',
                new PortuguesePhone,
            ],

            'nome_gerente' => [
                'nullable',
                'string',
                'max:255',
            ],

            'endereco_rua' => [
                'nullable',
                'string',
                'max:255',
            ],

            'endereco_numero' => [
                'nullable',
                'string',
                'max:50',
            ],

            'endereco_complemento' => [
                'nullable',
                'string',
                'max:255',
            ],

            'endereco_cep' => [
                'nullable',
                'string',
                'max:8',
                new PortuguesePostalCode,
            ],

            'endereco_cidade' => [
                'nullable',
                'string',
                'max:150',
            ],

            'iban' => [
                'nullable',
                'string',
                'size:25',
                new PortugueseIban,
            ],

            'capital_social' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'certificado_tvde' => [
                'nullable',
                'string',
                'max:255',
            ],

            'certificado_tvde_valid_until' => [
                'nullable',
                'date',
            ],

            'logo_url' => [
                'nullable',
                'string',
                'max:2048',
            ],

            'ativo' => [
                'sometimes',
                'boolean',
            ],

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

    protected function prepareForValidation(): void
    {
        $data = [];

        if ($this->has('nif')) {
            $data['nif'] =
                PortugueseDataNormalizer::nif(
                    $this->input('nif')
                );
        }

        if ($this->has('email')) {
            $data['email'] =
                PortugueseDataNormalizer::email(
                    $this->input('email')
                );
        }

        if ($this->has('telemovel')) {
            $data['telemovel'] =
                PortugueseDataNormalizer::phone(
                    $this->input('telemovel')
                );
        }

        if ($this->has('endereco_cep')) {
            $data['endereco_cep'] =
                PortugueseDataNormalizer::postalCode(
                    $this->input('endereco_cep')
                );
        }

        if ($this->has('iban')) {
            $data['iban'] =
                PortugueseDataNormalizer::iban(
                    $this->input('iban')
                );
        }

        if ($data !== []) {
            $this->merge($data);
        }
    }
}
