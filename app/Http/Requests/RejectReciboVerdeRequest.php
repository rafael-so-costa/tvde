<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejectReciboVerdeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'motivo'=>[
                'required',
                'string',
                'max:5000',
            ],
        ];
    }
}
