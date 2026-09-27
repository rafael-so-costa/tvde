<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterSaasRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => $this->normalizeEmail(
                $this->input('email')
            ),
            'company_email' => $this->normalizeEmail(
                $this->input('company_email')
            ),
            'company_nif' => preg_replace(
                '/\D+/',
                '',
                (string) $this->input('company_nif')
            ),
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'required',
                'email',
                'max:190',
                Rule::unique('users', 'email'),
            ],

            'phone' => [
                'required',
                'string',
                'max:30',
            ],

            'password' => [
                'required',
                'confirmed',
                Password::min(8)
                    ->letters()
                    ->numbers(),
            ],

            'company_name' => [
                'required',
                'string',
                'max:255',
            ],

            'company_nif' => [
                'required',
                'string',
                'size:9',
                'regex:/^\d{9}$/',
                Rule::unique('tenants', 'nif'),
            ],

            'company_email' => [
                'nullable',
                'email',
                'max:190',
            ],

            'company_phone' => [
                'nullable',
                'string',
                'max:30',
            ],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nome',
            'email' => 'e-mail',
            'phone' => 'telefone',
            'password' => 'palavra-passe',
            'password_confirmation' => 'confirmação da palavra-passe',
            'company_name' => 'nome da empresa',
            'company_nif' => 'NIF da empresa',
            'company_email' => 'e-mail da empresa',
            'company_phone' => 'telefone da empresa',
        ];
    }

    private function normalizeEmail(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = mb_strtolower(
            trim($value)
        );

        return $value !== ''
            ? $value
            : null;
    }
}
