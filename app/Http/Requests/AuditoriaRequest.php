<?php

namespace App\Http\Requests;

use App\Services\AuditService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AuditoriaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'inicio'=>[
                'nullable',
                'date',
            ],

            'fim'=>[
                'nullable',
                'date',
                'after_or_equal:inicio',
            ],

            'module'=>[
                'nullable',
                Rule::in(
                    array_keys(
                        AuditService::moduleLabels()
                    )
                ),
            ],

            'action'=>[
                'nullable',
                Rule::in(
                    array_keys(
                        AuditService::actionLabels()
                    )
                ),
            ],

            'source'=>[
                'nullable',
                Rule::in([
                    'web',
                    'system',
                ]),
            ],

            'user_id'=>[
                'nullable',
                'uuid',
            ],

            'search'=>[
                'nullable',
                'string',
                'max:150',
            ],

            'page'=>[
                'nullable',
                'integer',
                'min:1',
            ],

            'per_page'=>[
                'nullable',
                'integer',
                Rule::in([
                    10,
                    25,
                    50,
                    100,
                ]),
            ],
        ];
    }
}
