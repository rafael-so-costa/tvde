<?php

namespace App\Http\Requests\Ads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class BackofficeAdCampaignActionRequest extends FormRequest
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
                    'submit',
                    'start_review',
                    'approve',
                    'request_changes',
                    'reject',
                    'mark_paid',
                    'activate',
                    'pause',
                    'resume',
                    'complete',
                    'cancel',
                    'suspend',
                ]),
            ],
            'reason' => ['nullable', 'string', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (
                    in_array(
                        $this->input('action'),
                        ['request_changes', 'reject', 'suspend'],
                        true
                    ) &&
                    ! trim((string) $this->input('reason'))
                ) {
                    $validator->errors()->add(
                        'reason',
                        'Informe o motivo desta decisão.'
                    );
                }
            },
        ];
    }
}
