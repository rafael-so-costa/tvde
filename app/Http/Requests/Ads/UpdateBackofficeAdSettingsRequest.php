<?php

namespace App\Http\Requests\Ads;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBackofficeAdSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tenant_internal_free_enabled' => [
                'required',
                'boolean',
            ],

            'tenant_internal_requires_approval' => [
                'required',
                'boolean',
            ],

            'tenant_internal_max_active' => [
                'required',
                'integer',
                'min:0',
                'max:1000',
            ],

            'tenant_internal_max_days' => [
                'required',
                'integer',
                'min:1',
                'max:3650',
            ],

            'tenant_internal_allow_partners' => [
                'required',
                'boolean',
            ],

            'public_marketplace_enabled' => [
                'required',
                'boolean',
            ],

            'manager_panel_external_ads_enabled' => [
                'required',
                'boolean',
            ],

            'saas_inventory_reserved_percent' => [
                'required',
                'integer',
                'min:0',
                'max:100',
            ],

            'default_frequency_cap_daily' => [
                'required',
                'integer',
                'min:1',
                'max:100',
            ],

            'currency' => [
                'required',
                'string',
                'size:3',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'tenant_internal_free_enabled.required' => 'Informe se as campanhas internas gratuitas estão habilitadas.',
            'tenant_internal_free_enabled.boolean' => 'A configuração de campanhas internas gratuitas não é válida.',

            'tenant_internal_requires_approval.required' => 'Informe se as campanhas internas exigem aprovação.',
            'tenant_internal_requires_approval.boolean' => 'A configuração de aprovação das campanhas internas não é válida.',

            'tenant_internal_max_active.required' => 'Informe o máximo de campanhas internas ativas.',
            'tenant_internal_max_active.integer' => 'O máximo de campanhas internas deve ser um número inteiro.',
            'tenant_internal_max_active.min' => 'O máximo de campanhas internas não pode ser negativo.',
            'tenant_internal_max_active.max' => 'O máximo de campanhas internas não pode ultrapassar 1.000.',

            'tenant_internal_max_days.required' => 'Informe a duração máxima das campanhas internas gratuitas.',
            'tenant_internal_max_days.integer' => 'A duração máxima deve ser um número inteiro.',
            'tenant_internal_max_days.min' => 'A duração máxima deve ser de pelo menos 1 dia.',
            'tenant_internal_max_days.max' => 'A duração máxima não pode ultrapassar 3.650 dias.',

            'tenant_internal_allow_partners.required' => 'Informe se parceiros do tenant podem ser divulgados.',
            'tenant_internal_allow_partners.boolean' => 'A configuração de parceiros do tenant não é válida.',

            'public_marketplace_enabled.required' => 'Informe se o marketplace público está ativo.',
            'public_marketplace_enabled.boolean' => 'A configuração do marketplace público não é válida.',

            'manager_panel_external_ads_enabled.required' => 'Informe a política de publicidade externa no painel do gestor.',
            'manager_panel_external_ads_enabled.boolean' => 'A política de publicidade externa no painel do gestor não é válida.',

            'saas_inventory_reserved_percent.required' => 'Informe a percentagem de inventário reservada ao FrotaPro.',
            'saas_inventory_reserved_percent.integer' => 'A reserva de inventário deve ser um número inteiro.',
            'saas_inventory_reserved_percent.min' => 'A reserva de inventário não pode ser negativa.',
            'saas_inventory_reserved_percent.max' => 'A reserva de inventário não pode ultrapassar 100%.',

            'default_frequency_cap_daily.required' => 'Informe o limite diário padrão de frequência.',
            'default_frequency_cap_daily.integer' => 'O limite diário deve ser um número inteiro.',
            'default_frequency_cap_daily.min' => 'O limite diário deve ser de pelo menos 1 impressão.',
            'default_frequency_cap_daily.max' => 'O limite diário não pode ultrapassar 100 impressões.',

            'currency.required' => 'Informe a moeda padrão.',
            'currency.string' => 'A moeda informada não é válida.',
            'currency.size' => 'A moeda deve utilizar um código de três letras, por exemplo EUR.',
        ];
    }

    public function attributes(): array
    {
        return [
            'tenant_internal_free_enabled' => 'campanhas internas gratuitas',
            'tenant_internal_requires_approval' => 'aprovação das campanhas internas',
            'tenant_internal_max_active' => 'máximo de campanhas internas ativas',
            'tenant_internal_max_days' => 'duração máxima gratuita',
            'tenant_internal_allow_partners' => 'parceiros do tenant',
            'public_marketplace_enabled' => 'marketplace público',
            'manager_panel_external_ads_enabled' => 'publicidade externa no painel do gestor',
            'saas_inventory_reserved_percent' => 'reserva de inventário FrotaPro',
            'default_frequency_cap_daily' => 'frequency cap diário',
            'currency' => 'moeda',
        ];
    }
}
