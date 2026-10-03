<?php

namespace App\Http\Requests;

use App\Models\CrmLead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateBackofficeCrmLeadsFromOperatorsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'priority' => $this->input(
                'priority',
                CrmLead::PRIORITY_NORMAL
            ),
        ]);
    }

    public function rules(): array
    {
        return [
            'operator_ids' => [
                'required',
                'array',
                'min:1',
                'max:100',
            ],

            'operator_ids.*' => [
                'required',
                'uuid',
                'distinct',
                'exists:tvde_operators,id',
            ],

            'assigned_to_user_id' => [
                'nullable',
                'uuid',
                'exists:users,id',
            ],

            'priority' => [
                'required',
                Rule::in(
                    CrmLead::priorities()
                ),
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
