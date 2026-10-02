<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LookupBackofficeTvdeOperatorNifRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'force' => $this->boolean(
                'force'
            ),
        ]);
    }

    public function rules(): array
    {
        return [
            'force' => [
                'required',
                'boolean',
            ],
        ];
    }
}
