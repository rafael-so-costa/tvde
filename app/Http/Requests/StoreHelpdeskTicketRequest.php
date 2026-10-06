<?php

namespace App\Http\Requests;

use App\Services\HelpdeskService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHelpdeskTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'=>[
                'required',
                Rule::in(
                    HelpdeskService::typeCodes()
                ),
            ],
            'category'=>[
                'required',
                Rule::in(
                    HelpdeskService::categoryCodes()
                ),
            ],
            'priority'=>[
                'required',
                Rule::in(
                    HelpdeskService::priorityCodes()
                ),
            ],
            'subject'=>[
                'required',
                'string',
                'max:255',
            ],
            'body'=>[
                'nullable',
                'string',
                'max:50000',
            ],
            'feature_key'=>[
                'nullable',
                Rule::in(
                    HelpdeskService::featureCodes()
                ),
            ],
            'origin_url'=>[
                'nullable',
                'string',
                'max:1000',
            ],
            'attachments'=>[
                'nullable',
                'array',
                'max:5',
            ],
            'attachments.*'=>[
                'file',
                'mimes:jpg,jpeg,png,webp,pdf,txt,csv,doc,docx,xls,xlsx',
                'max:20480',
            ],

            'tenant_id'=>['prohibited'],
            'status'=>['prohibited'],
            'opened_by_user_id'=>['prohibited'],
            'assigned_to_user_id'=>['prohibited'],
        ];
    }
}
