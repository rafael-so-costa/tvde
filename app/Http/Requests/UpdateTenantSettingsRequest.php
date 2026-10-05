<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTenantSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tenant_id'=>['prohibited'],

            'nome'=>[
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'email'=>[
                'sometimes',
                'nullable',
                'email',
                'max:190',
            ],

            'telefone'=>[
                'sometimes',
                'nullable',
                'string',
                'max:30',
            ],

            'general'=>[
                'sometimes',
                'array',
            ],

            'general.commercial_name'=>[
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'general.website'=>[
                'sometimes',
                'nullable',
                'url:http,https',
                'max:2048',
            ],

            'general.address'=>[
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'general.postal_code'=>[
                'sometimes',
                'nullable',
                'string',
                'max:20',
            ],

            'general.city'=>[
                'sometimes',
                'nullable',
                'string',
                'max:120',
            ],

            'general.district'=>[
                'sometimes',
                'nullable',
                'string',
                'max:120',
            ],

            'general.contact_name'=>[
                'sometimes',
                'nullable',
                'string',
                'max:190',
            ],

            'operation'=>[
                'sometimes',
                'array',
            ],

            'operation.base_city'=>[
                'sometimes',
                'nullable',
                'string',
                'max:120',
            ],

            'operation.platforms'=>[
                'sometimes',
                'array',
                'max:4',
            ],

            'operation.platforms.*'=>[
                'string',
                Rule::in([
                    'uber',
                    'bolt',
                    'freenow',
                    'other',
                ]),
                'distinct',
            ],

            'operation.operation_types'=>[
                'sometimes',
                'array',
                'max:3',
            ],

            'operation.operation_types.*'=>[
                'string',
                Rule::in([
                    'owned',
                    'third_party',
                    'rental',
                ]),
                'distinct',
            ],

            'alerts'=>[
                'sometimes',
                'array',
            ],

            'alerts.insurance_days'=>[
                'sometimes',
                'integer',
                'min:0',
                'max:365',
            ],

            'alerts.inspection_days'=>[
                'sometimes',
                'integer',
                'min:0',
                'max:365',
            ],

            'alerts.iuc_days'=>[
                'sometimes',
                'integer',
                'min:0',
                'max:365',
            ],

            'alerts.criminal_record_days'=>[
                'sometimes',
                'integer',
                'min:0',
                'max:365',
            ],

            'alerts.driver_documents_days'=>[
                'sometimes',
                'integer',
                'min:0',
                'max:365',
            ],

            'vehicles'=>[
                'sometimes',
                'array',
            ],

            'vehicles.revision_interval_km'=>[
                'sometimes',
                'integer',
                'min:1000',
                'max:200000',
            ],

            'vehicles.revision_alert_km'=>[
                'sometimes',
                'integer',
                'min:0',
                'max:50000',
            ],

            'rentals'=>[
                'sometimes',
                'array',
            ],

            'rentals.periodicity'=>[
                'sometimes',
                Rule::in([
                    'weekly',
                    'fortnightly',
                    'monthly',
                    'flexible',
                ]),
            ],

            'rentals.due_weekday'=>[
                'sometimes',
                'integer',
                'min:1',
                'max:7',
            ],

            'rentals.default_deposit'=>[
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
                'max:999999.99',
            ],

            'rentals.included_km'=>[
                'sometimes',
                'nullable',
                'integer',
                'min:0',
                'max:1000000',
            ],

            'regional'=>[
                'sometimes',
                'array',
            ],

            'regional.timezone'=>[
                'sometimes',
                Rule::in([
                    'Europe/Lisbon',
                ]),
            ],

            'regional.currency'=>[
                'sometimes',
                Rule::in([
                    'EUR',
                ]),
            ],

            'regional.date_format'=>[
                'sometimes',
                Rule::in([
                    'DD/MM/YYYY',
                ]),
            ],

            'regional.language'=>[
                'sometimes',
                Rule::in([
                    'pt-PT',
                ]),
            ],
        ];
    }
}
