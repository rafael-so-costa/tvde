<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePlatformNotificationRequest extends FormRequest
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
                Rule::in([
                    'news',
                    'platform_status',
                    'maintenance',
                    'system',
                    'account',
                ]),
            ],

            'title'=>[
                'sometimes',
                'string',
                'max:255',
            ],

            'message'=>[
                'sometimes',
                'string',
                'max:10000',
            ],

            'severity'=>[
                'sometimes',
                Rule::in([
                    'low',
                    'medium',
                    'high',
                    'critical',
                ]),
            ],

            'target_scope'=>[
                'sometimes',
                Rule::in([
                    'all',
                    'selected',
                ]),
            ],

            'tenant_ids'=>[
                'sometimes',
                'array',
            ],

            'tenant_ids.*'=>[
                'uuid',
                'exists:tenants,id',
            ],

            'audiences'=>[
                'sometimes',
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
                'sometimes',
                'array',
            ],

            'channels.*'=>[
                Rule::in([
                    'in_app',
                    'email',
                ]),
            ],

            'action_url'=>[
                'sometimes',
                'nullable',
                'string',
                'max:500',
            ],

            'active'=>[
                'sometimes',
                'boolean',
            ],

            'published_at'=>[
                'sometimes',
                'nullable',
                'date',
            ],

            'expires_at'=>[
                'sometimes',
                'nullable',
                'date',
            ],
        ];
    }
}
