<?php

namespace App\Http\Requests;

use App\Models\CrmActivity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBackofficeCrmActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'status' => $this->input(
                'status',
                CrmActivity::STATUS_PLANNED
            ),
        ]);
    }

    public function rules(): array
    {
        return [
            'type' => [
                'required',
                Rule::in(
                    CrmActivity::types()
                ),
            ],

            'status' => [
                'required',
                Rule::in(
                    CrmActivity::statuses()
                ),
            ],

            'subject' => [
                'required',
                'string',
                'max:255',
            ],

            'description' => [
                'nullable',
                'string',
            ],

            'outcome' => [
                'nullable',
                'string',
            ],

            'assigned_to_user_id' => [
                'nullable',
                'uuid',
                'exists:users,id',
            ],

            'scheduled_at' => [
                'nullable',
                'date',
            ],

            'completed_at' => [
                'nullable',
                'date',
            ],

            'metadata' => [
                'nullable',
                'array',
            ],
        ];
    }
}
