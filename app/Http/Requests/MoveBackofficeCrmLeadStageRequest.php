<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MoveBackofficeCrmLeadStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'stage_id' => [
                'required',
                'uuid',
                'exists:crm_pipeline_stages,id',
            ],

            'note' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'lost_reason' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'next_follow_up_at' => [
                'nullable',
                'date',
            ],
        ];
    }
}
