<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SnoozeAlertRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'snoozed_until'=>[
                'required',
                'date',
                'after:now',
            ],
        ];
    }
}
