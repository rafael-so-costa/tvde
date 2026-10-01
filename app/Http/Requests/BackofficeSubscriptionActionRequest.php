<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BackofficeSubscriptionActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'action' => [
                'required',
                Rule::in([
                    'suspend',
                    'reactivate',
                    'schedule_cancel',
                    'clear_cancel',
                    'cancel_now',
                    'start_trial',
                    'end_trial',
                ]),
            ],

            'trial_days' => [
                'nullable',
                'required_if:action,start_trial',
                'integer',
                'min:1',
                'max:365',
            ],
        ];
    }
}
