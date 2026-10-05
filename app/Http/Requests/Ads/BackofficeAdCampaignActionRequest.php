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

            'reason' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'action.required' => 'Informe a ação que pretende executar.',
            'action.in' => 'A ação selecionada não é suportada.',

            'reason.string' => 'O motivo informado não é válido.',
            'reason.max' => 'O motivo não pode ter mais de 5.000 caracteres.',

            'notes.string' => 'As notas informadas não são válidas.',
            'notes.max' => 'As notas não podem ter mais de 5.000 caracteres.',
        ];
    }

    public function attributes(): array
    {
        return [
            'action' => 'ação',
            'reason' => 'motivo',
            'notes' => 'notas',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (
                    in_array(
                        $this->input('action'),
                        [
                            'request_changes',
                            'reject',
                            'suspend',
                        ],
                        true
                    ) &&
                    ! trim(
                        (string) $this->input(
                            'reason'
                        )
                    )
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'reason',
                            'Informe o motivo desta decisão.'
                        );
                }
            },
        ];
    }
}
