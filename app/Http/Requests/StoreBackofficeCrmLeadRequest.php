<?php

namespace App\Http\Requests;

use App\Models\CrmLead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBackofficeCrmLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
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

            'source' => $this->input(
                'source',
                CrmLead::SOURCE_MANUAL
            ),

            'priority' => $this->input(
                'priority',
                CrmLead::PRIORITY_NORMAL
            ),
        ]);
    }

    public function rules(): array
    {
        return [
            'company_name' => [
                'required',
                'string',
                'max:255',
            ],

            'nif' => [
                'nullable',
                'digits:9',
                'unique:crm_leads,nif',
            ],

            'contact_name' => [
                'nullable',
                'string',
                'max:255',
            ],

            'email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'phone' => [
                'nullable',
                'string',
                'max:50',
            ],

            'website' => [
                'nullable',
                'string',
                'max:255',
            ],

            'district' => [
                'nullable',
                'string',
                'max:100',
            ],

            'municipality' => [
                'nullable',
                'string',
                'max:150',
            ],

            'source' => [
                'required',
                Rule::in(
                    CrmLead::sources()
                ),
            ],

            'source_detail' => [
                'nullable',
                'string',
                'max:150',
            ],

            'priority' => [
                'required',
                Rule::in(
                    CrmLead::priorities()
                ),
            ],

            'current_stage_id' => [
                'nullable',
                'uuid',
                'exists:crm_pipeline_stages,id',
            ],

            'assigned_to_user_id' => [
                'nullable',
                'uuid',
                'exists:users,id',
            ],

            'notes' => [
                'nullable',
                'string',
            ],

            'next_follow_up_at' => [
                'nullable',
                'date',
            ],

            'tag_ids' => [
                'nullable',
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
