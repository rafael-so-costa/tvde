<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateBackofficeNifEnrichmentBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'force_refresh' => $this->boolean(
                'force_refresh'
            ),
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => [
                'nullable',
                'string',
                'max:255',
            ],

            'operator_ids' => [
                'required',
                'array',
                'min:1',
                'max:100',
            ],

            'operator_ids.*' => [
                'required',
                'uuid',
                'distinct',
                'exists:tvde_operators,id',
            ],

            'force_refresh' => [
                'required',
                'boolean',
            ],
        ];
    }
}
