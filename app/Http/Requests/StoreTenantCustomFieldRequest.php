<?php

namespace App\Http\Requests;

use App\Models\TenantCustomField;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTenantCustomFieldRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tenant_id'=>['prohibited'],

            'entity'=>[
                'required',
                Rule::in(
                    TenantCustomField::ENTITIES
                ),
            ],

            'key'=>[
                'nullable',
                'string',
                'max:80',
                'regex:/^[a-zA-Z0-9_-]+$/',
            ],

            'label'=>[
                'required',
                'string',
                'max:120',
            ],

            'type'=>[
                'required',
                Rule::in(
                    TenantCustomField::TYPES
                ),
            ],

            'required'=>[
                'sometimes',
                'boolean',
            ],

            'active'=>[
                'sometimes',
                'boolean',
            ],

            'options'=>[
                'nullable',
                'array',
                'max:50',
            ],

            'options.*'=>[
                'string',
                'max:120',
                'distinct',
            ],

            'placeholder'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'help_text'=>[
                'nullable',
                'string',
                'max:500',
            ],

            'default_value'=>[
                'nullable',
                'string',
                'max:2000',
            ],

            'sort_order'=>[
                'sometimes',
                'integer',
                'min:0',
                'max:9999',
            ],
        ];
    }
}
