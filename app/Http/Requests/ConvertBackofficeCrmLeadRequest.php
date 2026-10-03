<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConvertBackofficeCrmLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('tenant_slug')) {
            $this->merge([
                'tenant_slug' => trim(
                    strtolower(
                        (string) $this->input(
                            'tenant_slug'
                        )
                    )
                ),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'saas_plan_id' => [
                'required',
                'uuid',
                'exists:saas_plans,id',
            ],

            'tenant_name' => [
                'nullable',
                'string',
                'max:255',
            ],

            'tenant_slug' => [
                'nullable',
                'string',
                'max:120',
                'alpha_dash',
                'unique:tenants,slug',
            ],

            'email' => [
                'nullable',
                'email',
                'max:190',
            ],

            'phone' => [
                'nullable',
                'string',
                'max:30',
            ],

            'trial_days' => [
                'nullable',
                'integer',
                'min:0',
                'max:365',
            ],
        ];
    }
}
