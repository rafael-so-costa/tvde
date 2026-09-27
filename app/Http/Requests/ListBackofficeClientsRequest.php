<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListBackofficeClientsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'search' => $this->filled('search')
                ? trim((string) $this->input('search'))
                : null,
        ]);
    }

    public function rules(): array
    {
        return [
            'search' => [
                'nullable',
                'string',
                'max:150',
            ],

            'status' => [
                'nullable',
                Rule::in([
                    'ativo',
                    'inativo',
                ]),
            ],

            'onboarding' => [
                'nullable',
                Rule::in([
                    'pendente',
                    'concluido',
                ]),
            ],

            'per_page' => [
                'nullable',
                'integer',
                'min:10',
                'max:100',
            ],

            'page' => [
                'nullable',
                'integer',
                'min:1',
            ],
        ];
    }
}
