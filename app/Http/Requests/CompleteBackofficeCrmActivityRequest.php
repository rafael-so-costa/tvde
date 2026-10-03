<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompleteBackofficeCrmActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'outcome' => [
                'nullable',
                'string',
            ],

            'completed_at' => [
                'nullable',
                'date',
            ],
        ];
    }
}
