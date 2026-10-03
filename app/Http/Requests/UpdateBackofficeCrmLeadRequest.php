<?php

namespace App\Http\Requests;

use App\Models\CrmLead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBackofficeCrmLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('nif')) {
            $nif = preg_replace(
                '/\D+/',
                '',
                (string) $this->input(
                    'nif',
                    ''
                )
            );

            $this->merge([
                'nif' => $nif !== ''
                    ? $nif
                    : null,
            ]);
        }
    }

    public function rules(): array
    {
        $leadId = $this->route(
            'id'
        );

        return [
            'company_name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'nif' => [
                'sometimes',
                'nullable',
                'digits:9',
                Rule::unique(
                    'crm_leads',
                    'nif'
                )->ignore(
                    $leadId
                ),
            ],

            'contact_name' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:255',
            ],

            'phone' => [
                'sometimes',
                'nullable',
                'string',
                'max:50',
            ],

            'website' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'district' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],

            'municipality' => [
                'sometimes',
                'nullable',
                'string',
                'max:150',
            ],

            'source' => [
                'sometimes',
                Rule::in(
                    CrmLead::sources()
                ),
            ],

            'source_detail' => [
                'sometimes',
                'nullable',
                'string',
                'max:150',
            ],

            'priority' => [
                'sometimes',
                Rule::in(
                    CrmLead::priorities()
                ),
            ],

            'assigned_to_user_id' => [
                'sometimes',
                'nullable',
                'uuid',
                'exists:users,id',
            ],

            'notes' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'next_follow_up_at' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'tag_ids' => [
                'sometimes',
                'array',
            ],

            'tag_ids.*' => [
                'uuid',
                'distinct',
                'exists:crm_tags,id',
            ],
        ];
    }
}
