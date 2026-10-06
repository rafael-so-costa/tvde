<?php

namespace App\Http\Requests;

use App\Services\HelpdeskService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class HelpdeskIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search'=>['nullable','string','max:150'],
            'type'=>[
                'nullable',
                Rule::in(
                    HelpdeskService::typeCodes()
                ),
            ],
            'category'=>[
                'nullable',
                Rule::in(
                    HelpdeskService::categoryCodes()
                ),
            ],
            'priority'=>[
                'nullable',
                Rule::in(
                    HelpdeskService::priorityCodes()
                ),
            ],
            'status'=>[
                'nullable',
                Rule::in(
                    HelpdeskService::statusCodes()
                ),
            ],
            'tenant_id'=>['nullable','uuid'],
            'assigned_to_user_id'=>['nullable','uuid'],
            'unread'=>['nullable','boolean'],
            'inicio'=>['nullable','date'],
            'fim'=>[
                'nullable',
                'date',
                'after_or_equal:inicio',
            ],
            'page'=>['nullable','integer','min:1'],
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
