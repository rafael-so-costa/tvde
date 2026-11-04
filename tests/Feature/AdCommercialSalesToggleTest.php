<?php

declare(strict_types=1);

use App\Models\AdAdvertiser;
use App\Models\AdCampaign;
use App\Models\AdOrder;
use App\Models\AdSetting;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use App\Services\Ads\AdCampaignService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed(RoleSeeder::class);

    $this->withHeaders([
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ]);
});

function adsCommercialAdmin($test): User
{
    $user = User::factory()->create([
        'email' => 'commercial-' .
            Str::random(8) .
            '@frotapro.test',
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);

    $role = Role::query()
        ->where('codigo', 'super_admin')
        ->firstOrFail();

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => null,
    ]);

    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();

    return $user;
}

function adsCommercialSettings(bool $enabled): AdSetting
{
    return AdSetting::create([
        'scope' => 'global',
        'commercial_ads_enabled' => $enabled,
    ]);
}

function adsCommercialAdvertiser(): AdAdvertiser
{
    return AdAdvertiser::create([
        'type' => AdAdvertiser::TYPE_EXTERNAL,
        'name' => 'Anunciante Comercial',
        'status' => AdAdvertiser::STATUS_ACTIVE,
    ]);
}

function adsCommercialData(string $advertiserId): array
{
    return [
        'advertiser_id' => $advertiserId,
        'source' => AdCampaign::SOURCE_EXTERNAL,
        'kind' => AdCampaign::KIND_COMMERCIAL,
        'name' => 'Campanha Comercial',
        'title' => 'Publicidade Comercial',
        'status' => AdCampaign::STATUS_DRAFT,
        'quoted_price' => '25.00',
        'currency' => 'EUR',
        'payment_required' => true,
        'channels' => [],
        'audiences' => [],
        'zone_ids' => [],
        'locations' => [],
    ];
}

test(
    'comercializacao inicia ativa para compatibilidade',
    function (): void {
        $this->getJson('/api/ads/commercial-status')
            ->assertOk()
            ->assertJsonPath(
                'data.commercial_ads_enabled',
                true
            )
            ->assertJsonPath(
                'data.public_ads_available',
                true
            );
    }
);

test(
    'apenas super admin altera configuracoes',
    function (): void {
        $this->patchJson(
            '/api/backoffice/ads/settings',
            ['commercial_ads_enabled' => false]
        )->assertUnauthorized();
    }
);

test(
    'desligar comercializacao preserva anuncios publicos',
    function (): void {
        adsCommercialSettings(false);

        $this->getJson('/api/ads/commercial-status')
            ->assertOk()
            ->assertJsonPath(
                'data.commercial_ads_enabled',
                false
            )
            ->assertJsonPath(
                'data.public_ads_available',
                true
            )
            ->assertJsonPath(
                'data.new_paid_campaigns_available',
                false
            );

        $this->get('/anuncios')->assertOk();
    }
);

test(
    'super admin pode alterar o interruptor comercial',
    function (): void {
        adsCommercialAdmin($this);

        $settings = adsCommercialSettings(true);

        $payload = [
            'tenant_internal_free_enabled' => true,
            'tenant_internal_requires_approval' => true,
            'tenant_internal_max_active' => 3,
            'tenant_internal_max_days' => 30,
            'tenant_internal_allow_partners' => true,
            'public_marketplace_enabled' => true,
            'commercial_ads_enabled' => false,
            'manager_panel_external_ads_enabled' => false,
            'saas_inventory_reserved_percent' => 30,
            'default_frequency_cap_daily' => 3,
            'currency' => 'EUR',
        ];

        $this->patchJson(
            '/api/backoffice/ads/settings',
            $payload
        )
            ->assertOk()
            ->assertJsonPath(
                'data.commercial_ads_enabled',
                false
            );

        expect(
            $settings->fresh()->commercial_ads_enabled
        )->toBeFalse();

        $this->getJson('/api/ads/commercial-status')
            ->assertJsonPath(
                'data.commercial_ads_enabled',
                false
            );

        $payload['commercial_ads_enabled'] = true;

        $this->patchJson(
            '/api/backoffice/ads/settings',
            $payload
        )
            ->assertOk()
            ->assertJsonPath(
                'data.commercial_ads_enabled',
                true
            );
    }
);

test(
    'novas campanhas comerciais sao bloqueadas',
    function (): void {
        adsCommercialSettings(false);

        $advertiser = adsCommercialAdvertiser();
        $user = User::factory()->create();

        expect(fn () =>
            app(AdCampaignService::class)->create(
                adsCommercialData($advertiser->id),
                $user
            )
        )->toThrow(ValidationException::class);

        expect(AdCampaign::count())->toBe(0);
    }
);

test(
    'anuncios gratuitos do proprio frotapro continuam permitidos',
    function (): void {
        adsCommercialSettings(false);

        $advertiser = adsCommercialAdvertiser();
        $user = User::factory()->create();

        $data = adsCommercialData($advertiser->id);

        $data['source'] = AdCampaign::SOURCE_SAAS;
        $data['kind'] = AdCampaign::KIND_HOUSE;
        $data['payment_required'] = false;
        $data['quoted_price'] = '0.00';

        $campaign = app(AdCampaignService::class)
            ->create($data, $user);

        expect($campaign->exists)->toBeTrue();
        expect($campaign->payment_required)->toBeFalse();
    }
);

test(
    'nao permite converter campanha gratuita em comercial',
    function (): void {
        adsCommercialSettings(false);

        $advertiser = adsCommercialAdvertiser();
        $user = User::factory()->create();

        $data = adsCommercialData($advertiser->id);
        $data['source'] = AdCampaign::SOURCE_SAAS;
        $data['kind'] = AdCampaign::KIND_HOUSE;
        $data['payment_required'] = false;
        $data['quoted_price'] = '0.00';

        $campaign = app(AdCampaignService::class)
            ->create($data, $user);

        $data['kind'] = AdCampaign::KIND_COMMERCIAL;
        $data['payment_required'] = true;
        $data['quoted_price'] = '25.00';

        expect(fn () =>
            app(AdCampaignService::class)->update(
                $campaign,
                $data,
                $user
            )
        )->toThrow(ValidationException::class);

        expect(
            $campaign->fresh()->kind
        )->toBe(AdCampaign::KIND_HOUSE);
    }
);

test(
    'pedidos comerciais anteriores continuam acessiveis',
    function (): void {
        adsCommercialAdmin($this);

        $settings = adsCommercialSettings(true);
        $advertiser = adsCommercialAdvertiser();

        $campaign = AdCampaign::create(
            adsCommercialData($advertiser->id)
        );

        $order = AdOrder::create([
            'campaign_id' => $campaign->id,
            'advertiser_id' => $advertiser->id,
            'number' => 'ADS-OLD-' .
                Str::upper(Str::random(8)),
            'status' => AdOrder::STATUS_PENDING,
            'subtotal' => '25.00',
            'discount' => '0.00',
            'total' => '25.00',
            'currency' => 'EUR',
        ]);

        $settings->update([
            'commercial_ads_enabled' => false,
        ]);

        $this->getJson('/api/backoffice/ads/orders')
            ->assertOk()
            ->assertJsonFragment([
                'number' => $order->number,
            ]);

        expect(
            AdOrder::find($order->id)
        )->not->toBeNull();
    }
);

test(
    'reativar comercializacao permite novas campanhas',
    function (): void {
        adsCommercialSettings(true);

        $advertiser = adsCommercialAdvertiser();
        $user = User::factory()->create();

        $campaign = app(AdCampaignService::class)
            ->create(
                adsCommercialData($advertiser->id),
                $user
            );

        expect($campaign->exists)->toBeTrue();
        expect($campaign->payment_required)->toBeTrue();
    }
);

test(
    'campanha comercial anterior pode gerar pedido depois da suspensao',
    function (): void {
        $settings = adsCommercialSettings(true);

        $advertiser = adsCommercialAdvertiser();

        $user = User::factory()->create();

        $service = app(AdCampaignService::class);

        $campaign = $service->create(
            adsCommercialData($advertiser->id),
            $user
        );

        expect($campaign->status)
            ->toBe(AdCampaign::STATUS_DRAFT);

        $settings->update([
            'commercial_ads_enabled' => false,
        ]);

        $service->action(
            $campaign,
            'submit',
            $user
        );

        $service->action(
            $campaign,
            'approve',
            $user
        );

        $campaign->refresh();

        expect($campaign->status)
            ->toBe(
                AdCampaign::STATUS_AWAITING_PAYMENT
            );

        $order = AdOrder::query()
            ->where('campaign_id', $campaign->id)
            ->first();

        expect($order)->not->toBeNull();

        expect($order->status)
            ->toBe(AdOrder::STATUS_PENDING);

        expect($order->total)
            ->toBeNumeric();
    }
);