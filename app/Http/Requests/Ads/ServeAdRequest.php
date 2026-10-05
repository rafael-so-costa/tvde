<?php

namespace App\Http\Requests\Ads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ServeAdRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'surface' => [
                'required',
                'string',
                Rule::in([
                    'manager_panel',
                    'driver_portal',
                    'owner_portal',
                ]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'surface.required' => 'Informe onde o anúncio será apresentado.',
            'surface.in' => 'A área de apresentação informada não é válida.',
        ];
    }
}
