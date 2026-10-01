<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBackofficeClientPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'plan_id' => [
                'required',
                'uuid',
                Rule::exists(
                    'saas_plans',
                    'id'
                )->where(
                    fn ($query) => $query
                        ->where(
                            'ativo',
                            true
                        )
                ),
            ],
        ];
    }
}
