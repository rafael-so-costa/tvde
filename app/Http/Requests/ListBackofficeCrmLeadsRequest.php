<?php

namespace App\Http\Requests;

use App\Models\CrmLead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListBackofficeCrmLeadsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'search' => $this->filled('search')
                ? trim((string) $this->input('search'))
                : null,

            'district' => $this->filled('district')
                ? trim((string) $this->input('district'))
                : null,

            'municipality' => $this->filled('municipality')
                ? trim((string) $this->input('municipality'))
                : null,
        ]);
    }

    public function rules(): array
    {
        return [
            'search' => [
                'nullable',
                'string',
                'max:150',
            ],

            'stage_id' => [
                'nullable',
                'uuid',
                'exists:crm_pipeline_stages,id',
            ],

            'assigned_to_user_id' => [
                'nullable',
                'uuid',
                'exists:users,id',
            ],

            'priority' => [
                'nullable',
                Rule::in(
                    CrmLead::priorities()
                ),
            ],

            'source' => [
                'nullable',
                Rule::in(
                    CrmLead::sources()
                ),
            ],

            'tag_id' => [
                'nullable',
                'uuid',
                'exists:crm_tags,id',
            ],

            'converted' => [
                'nullable',
                Rule::in([
                    'yes',
                    'no',
                ]),
            ],

            'follow_up' => [
                'nullable',
                Rule::in([
                    'overdue',
                    'today',
                    'upcoming',
                    'none',
                ]),
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

            'per_page' => [
                'nullable',
                'integer',
                'min:10',
                'max:100',
            ],

            'page' => [
                'nullable',
                'integer',
                'min:1',
            ],
        ];
    }
}
