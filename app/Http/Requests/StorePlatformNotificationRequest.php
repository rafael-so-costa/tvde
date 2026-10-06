<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePlatformNotificationRequest extends FormRequest
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
                Rule::in([
                    'news',
                    'platform_status',
                    'maintenance',
                    'system',
                    'account',
                ]),
            ],

            'title'=>[
                'required',
                'string',
                'max:255',
            ],

            'message'=>[
                'required',
                'string',
                'max:10000',
            ],

            'severity'=>[
                'required',
                Rule::in([
                    'low',
                    'medium',
                    'high',
                    'critical',
                ]),
            ],

            'target_scope'=>[
                'required',
                Rule::in([
                    'all',
                    'selected',
                ]),
            ],

            'tenant_ids'=>[
                'nullable',
                'array',
                'required_if:target_scope,selected',
            ],

            'tenant_ids.*'=>[
                'uuid',
                'exists:tenants,id',
            ],

            'audiences'=>[
                'required',
                'array',
                'min:1',
            ],

            'audiences.*'=>[
                Rule::in([
                    'admin_empresa',
                    'funcionario',
                    'motorista',
                    'proprietario',
                ]),
            ],

            'channels'=>[
                'nullable',
                'array',
            ],

            'channels.*'=>[
                Rule::in([
                    'in_app',
                    'email',
                ]),
            ],

            'action_url'=>[
                'nullable',
                'string',
                'max:500',
            ],

            'active'=>[
                'required',
                'boolean',
            ],

            'published_at'=>[
                'nullable',
                'date',
            ],

            'expires_at'=>[
                'nullable',
                'date',
            ],
        ];
    }
}
