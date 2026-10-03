<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBackofficeCrmTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name')) {
            $this->merge([
                'name' => trim(
                    (string) $this->input(
                        'name'
                    )
                ),
            ]);
        }

        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => $this->boolean(
                    'is_active'
                ),
            ]);
        }
    }

    public function rules(): array
    {
        $tagId = $this->route(
            'id'
        );

        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique(
                    'crm_tags',
                    'name'
                )->ignore(
                    $tagId
                ),
            ],

            'color' => [
                'sometimes',
                'nullable',
                'string',
                'max:30',
            ],

            'description' => [
                'sometimes',
                'nullable',
                'string',
                'max:2000',
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],
        ];
    }
}
