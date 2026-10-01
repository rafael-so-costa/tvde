<?php

namespace App\Http\Requests;

use App\Models\SaasSubscription;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateBackofficeSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('currency')) {
            $this->merge([
                'currency' => Str::upper(
                    trim(
                        (string) $this->input(
                            'currency'
                        )
                    )
                ),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'billing_cycle' => [
                'required',
                Rule::in([
                    SaasSubscription::BILLING_MONTHLY,
                    SaasSubscription::BILLING_YEARLY,
                ]),
            ],

            'price_amount' => [
                'nullable',
                'numeric',
                'min:0',
                'max:99999999.99',
            ],

            'currency' => [
                'required',
                'string',
                'size:3',
                'alpha',
            ],
        ];
    }
}
