<?php

namespace Database\Seeders;

use App\Models\AdCategory;
use App\Models\AdSetting;
use App\Models\AdZone;
use Illuminate\Database\Seeder;

class AdSeeder extends Seeder
{
    public function run(): void
    {
        AdSetting::query()->updateOrCreate(
            ['scope' => 'global'],
            [
                'tenant_internal_free_enabled' => true,
                'tenant_internal_requires_approval' => true,
                'tenant_internal_max_active' => 3,
                'tenant_internal_max_days' => 30,
                'tenant_internal_allow_partners' => true,
                'public_marketplace_enabled' => true,
                'manager_panel_external_ads_enabled' => false,
                'saas_inventory_reserved_percent' => 30,
                'default_frequency_cap_daily' => 3,
                'currency' => 'EUR',
            ]
        );

        $categories = [
            ['slug' => 'advocacia', 'name' => 'Advocacia'],
            ['slug' => 'contabilidade', 'name' => 'Contabilidade'],
            ['slug' => 'consultoria', 'name' => 'Consultoria'],
            ['slug' => 'oficinas', 'name' => 'Oficinas'],
            ['slug' => 'pneus', 'name' => 'Pneus'],
            ['slug' => 'pecas', 'name' => 'Peças'],
            ['slug' => 'seguros', 'name' => 'Seguros'],
            ['slug' => 'financiamento', 'name' => 'Financiamento'],
            ['slug' => 'aluguer-tvde', 'name' => 'Aluguer TVDE'],
            ['slug' => 'compra-venda', 'name' => 'Compra e venda'],
            ['slug' => 'carregamento-eletrico', 'name' => 'Carregamento elétrico'],
            ['slug' => 'combustivel', 'name' => 'Combustível'],
            ['slug' => 'lavagem', 'name' => 'Lavagem automóvel'],
            ['slug' => 'formacao', 'name' => 'Formação'],
            ['slug' => 'marketing', 'name' => 'Marketing'],
            ['slug' => 'programacao', 'name' => 'Programação'],
            ['slug' => 'gestao-empresarial', 'name' => 'Gestão empresarial'],
            ['slug' => 'servicos-tvde', 'name' => 'Serviços TVDE'],
            ['slug' => 'outros', 'name' => 'Outros'],
        ];

        foreach ($categories as $index => $category) {
            AdCategory::query()->updateOrCreate(
                ['slug' => $category['slug']],
                [
                    ...$category,
                    'active' => true,
                    'allowed_on_public' => true,
                    'requires_special_review' => $category['slug'] === 'advocacia',
                    'sort_order' => ($index + 1) * 10,
                ]
            );
        }

        $zones = [
            [
                'code' => 'manager_dashboard_saas',
                'name' => 'Dashboard Gestor — FrotaPro',
                'channel' => AdZone::CHANNEL_MANAGER,
                'audience' => 'manager',
                'description' => 'Área discreta do dashboard do gestor. Exclusiva para campanhas FrotaPro/SaaS.',
                'max_concurrent_campaigns' => 1,
                'saas_reserved_percent' => 100,
                'allowed_sources' => ['saas'],
                'sort_order' => 10,
            ],
            [
                'code' => 'driver_dashboard_primary',
                'name' => 'Dashboard Motorista — Principal',
                'channel' => AdZone::CHANNEL_DRIVER,
                'audience' => 'driver',
                'description' => 'Card principal patrocinado do portal do motorista.',
                'max_concurrent_campaigns' => 5,
                'saas_reserved_percent' => 30,
                'allowed_sources' => ['saas', 'tenant', 'external'],
                'sort_order' => 20,
            ],
            [
                'code' => 'driver_dashboard_secondary',
                'name' => 'Dashboard Motorista — Secundário',
                'channel' => AdZone::CHANNEL_DRIVER,
                'audience' => 'driver',
                'description' => 'Posição secundária do portal do motorista.',
                'max_concurrent_campaigns' => 8,
                'saas_reserved_percent' => 20,
                'allowed_sources' => ['saas', 'tenant', 'external'],
                'sort_order' => 30,
            ],
            [
                'code' => 'owner_dashboard_primary',
                'name' => 'Dashboard Proprietário — Principal',
                'channel' => AdZone::CHANNEL_OWNER,
                'audience' => 'owner',
                'description' => 'Card patrocinado do portal do proprietário.',
                'max_concurrent_campaigns' => 5,
                'saas_reserved_percent' => 30,
                'allowed_sources' => ['saas', 'tenant', 'external'],
                'sort_order' => 40,
            ],
            [
                'code' => 'public_marketplace_featured',
                'name' => 'Marketplace Público — Destaque',
                'channel' => AdZone::CHANNEL_PUBLIC,
                'audience' => null,
                'description' => 'Área de anúncios destacados da página pública FrotaPro Ads.',
                'max_concurrent_campaigns' => 12,
                'saas_reserved_percent' => 20,
                'allowed_sources' => ['saas', 'tenant', 'external'],
                'sort_order' => 50,
            ],
            [
                'code' => 'public_marketplace_listing',
                'name' => 'Marketplace Público — Listagem',
                'channel' => AdZone::CHANNEL_PUBLIC,
                'audience' => null,
                'description' => 'Listagem geral do marketplace público.',
                'max_concurrent_campaigns' => 1000,
                'saas_reserved_percent' => 0,
                'allowed_sources' => ['saas', 'tenant', 'external'],
                'sort_order' => 60,
            ],
        ];

        foreach ($zones as $zone) {
            AdZone::query()->updateOrCreate(
                ['code' => $zone['code']],
                [
                    ...$zone,
                    'active' => true,
                ]
            );
        }
    }
}
