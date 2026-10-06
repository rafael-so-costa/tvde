<?php

namespace App\Http\Requests;

use App\Services\HelpdeskService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHelpdeskTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'=>[
                'sometimes',
                Rule::in(
                    HelpdeskService::typeCodes()
                ),
            ],
            'category'=>[
                'sometimes',
                Rule::in(
                    HelpdeskService::categoryCodes()
                ),
            ],
            'priority'=>[
                'sometimes',
                Rule::in(
                    HelpdeskService::priorityCodes()
                ),
            ],
            'status'=>[
                'sometimes',
                Rule::in(
                    HelpdeskService::statusCodes()
                ),
            ],
            'feature_key'=>[
                'sometimes',
                'nullable',
                Rule::in(
                    HelpdeskService::featureCodes()
                ),
            ],
            'assigned_to_user_id'=>[
                'sometimes',
                'nullable',
                'uuid',
                'exists:users,id',
            ],
        ];
    }
}
