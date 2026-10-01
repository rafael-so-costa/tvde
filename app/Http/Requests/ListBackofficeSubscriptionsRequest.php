<?php

namespace App\Http\Requests;

use App\Models\SaasSubscription;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListBackofficeSubscriptionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('search')) {
            $this->merge([
                'search' => trim(
                    (string) $this->input('search')
                ),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'search' => [
                'nullable',
                'string',
                'max:255',
            ],

            'status' => [
                'nullable',
                Rule::in([
                    SaasSubscription::STATUS_TRIALING,
                    SaasSubscription::STATUS_ACTIVE,
                    SaasSubscription::STATUS_PAST_DUE,
                    SaasSubscription::STATUS_SUSPENDED,
                    SaasSubscription::STATUS_CANCELED,
                ]),
            ],

            'billing_cycle' => [
                'nullable',
                Rule::in([
                    SaasSubscription::BILLING_MONTHLY,
                    SaasSubscription::BILLING_YEARLY,
                ]),
            ],

            'per_page' => [
                'nullable',
                'integer',
                'min:1',
                'max:100',
            ],
        ];
    }
}
