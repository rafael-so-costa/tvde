<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBackofficeCrmTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim(
                (string) $this->input(
                    'name',
                    ''
                )
            ),

            'is_active' => $this->has(
                'is_active'
            )
                ? $this->boolean(
                    'is_active'
                )
                : true,
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:100',
                'unique:crm_tags,name',
            ],

            'color' => [
                'nullable',
                'string',
                'max:30',
            ],

            'description' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'is_active' => [
                'required',
                'boolean',
            ],
        ];
    }
}
