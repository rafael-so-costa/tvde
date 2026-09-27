<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSaasOnboardingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_name' => [
                'required',
                'string',
                'max:255',
            ],

            'company_email' => [
                'required',
                'email',
                'max:190',
            ],

            'company_phone' => [
                'required',
                'string',
                'max:50',
            ],

            'manager_name' => [
                'required',
                'string',
                'max:255',
            ],

            'address_street' => [
                'required',
                'string',
                'max:255',
            ],

            'address_number' => [
                'required',
                'string',
                'max:50',
            ],

            'address_complement' => [
                'nullable',
                'string',
                'max:255',
            ],

            'address_postal_code' => [
                'required',
                'string',
                'max:30',
            ],

            'address_city' => [
                'required',
                'string',
                'max:150',
            ],

            'certificate_tvde' => [
                'nullable',
                'string',
                'max:255',
            ],

            'certificate_tvde_valid_until' => [
                'nullable',
                'date',
            ],
        ];
    }

    public function attributes(): array
    {
        return [
            'company_name' => 'nome da empresa',
            'company_email' => 'e-mail da empresa',
            'company_phone' => 'telefone da empresa',
            'manager_name' => 'nome do gerente',
            'address_street' => 'rua',
            'address_number' => 'número',
            'address_complement' => 'complemento',
            'address_postal_code' => 'código postal',
            'address_city' => 'cidade',
            'certificate_tvde' => 'certificado TVDE',
            'certificate_tvde_valid_until' => 'validade do certificado TVDE',
        ];
    }
}
