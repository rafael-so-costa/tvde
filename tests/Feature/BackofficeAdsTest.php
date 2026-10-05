<?php

use App\Models\AdAdvertiser;
use App\Models\AdCampaign;
use App\Models\AdCategory;
use App\Models\AdCreative;
use App\Models\AdDailyStat;
use App\Models\AdSetting;
use App\Models\AdZone;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\AdSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([
        RoleSeeder::class,
        AdSeeder::class,
    ]);
});

function adsHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function adsAdmin(): User
{
    $user = User::factory()->create([
        'email' => 'ads.admin@frotapro.test',
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

    return $user;
}

function adsLogin($test, User $user): void
{
    $test
        ->postJson('/login', [
            'email' => $user->email,
            'password' => 'SenhaTeste123!',
        ])
        ->assertOk();
}

test('frotapro ads exige autenticação', function () {
    $this
        ->withHeaders(adsHeaders())
        ->getJson('/api/backoffice/ads/dashboard')
        ->assertUnauthorized();
});

test('super admin consulta dashboard e inventário ads', function () {
    $admin = adsAdmin();
    adsLogin($this, $admin);

    $this
        ->withHeaders(adsHeaders())
        ->getJson('/api/backoffice/ads/dashboard')
        ->assertOk()
        ->assertJsonPath('data.metrics.campaigns_total', 0);

    $this
        ->withHeaders(adsHeaders())
        ->getJson('/api/backoffice/ads/categories')
        ->assertOk()
        ->assertJsonCount(19, 'data');

    $this
        ->withHeaders(adsHeaders())
        ->getJson('/api/backoffice/ads/zones')
        ->assertOk()
        ->assertJsonCount(6, 'data');
});

test('super admin cria anunciante e campanha gratuita do saas', function () {
    $admin = adsAdmin();
    adsLogin($this, $admin);

    $advertiserResponse = $this
        ->withHeaders(adsHeaders())
        ->postJson('/api/backoffice/ads/advertisers', [
            'tenant_id' => null,
            'type' => 'saas',
            'name' => 'FrotaPro',
            'legal_name' => null,
            'nif' => null,
            'email' => null,
            'phone' => null,
            'website' => null,
            'status' => 'active',
            'metadata' => null,
        ])
        ->assertCreated();

    $advertiserId = $advertiserResponse->json('data.id');

    $categoryId = AdCategory::query()
        ->where('slug', 'servicos-tvde')
        ->value('id');

    $zoneId = AdZone::query()
        ->where('code', 'driver_dashboard_primary')
        ->value('id');

    $campaignResponse = $this
        ->withHeaders(adsHeaders())
        ->postJson('/api/backoffice/ads/campaigns', [
            'advertiser_id' => $advertiserId,
            'tenant_id' => null,
            'category_id' => $categoryId,
            'source' => 'saas',
            'kind' => 'house',
            'name' => 'Campanha FrotaPro',
            'title' => 'Conheça o FrotaPro',
            'description' => 'Campanha institucional.',
            'pricing_model' => 'fixed_period',
            'quoted_price' => 0,
            'currency' => 'EUR',
            'payment_required' => false,
            'priority' => 100,
            'weight' => 1,
            'max_impressions' => null,
            'max_clicks' => null,
            'frequency_cap_daily' => 3,
            'start_at' => now()->subMinute()->toISOString(),
            'end_at' => now()->addDays(30)->toISOString(),
            'admin_notes' => null,
            'metadata' => null,
            'channels' => ['driver_portal'],
            'audiences' => ['driver'],
            'zone_ids' => [$zoneId],
            'locations' => [],
        ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'draft');

    $campaignId = $campaignResponse->json('data.id');

    $this
        ->withHeaders(adsHeaders())
        ->postJson("/api/backoffice/ads/campaigns/{$campaignId}/action", [
            'action' => 'submit',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'submitted');

    $this
        ->withHeaders(adsHeaders())
        ->postJson("/api/backoffice/ads/campaigns/{$campaignId}/action", [
            'action' => 'approve',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    expect(
        AdCampaign::query()->findOrFail($campaignId)->status
    )->toBe(AdCampaign::STATUS_ACTIVE);
});

test('campanha paga só ativa após pagamento', function () {
    $admin = adsAdmin();
    adsLogin($this, $admin);

    $advertiser = AdAdvertiser::create([
        'type' => 'external',
        'name' => 'Oficina XPTO',
        'status' => 'active',
    ]);

    $categoryId = AdCategory::query()
        ->where('slug', 'oficinas')
        ->value('id');

    $zoneId = AdZone::query()
        ->where('code', 'public_marketplace_featured')
        ->value('id');

    $response = $this
        ->withHeaders(adsHeaders())
        ->postJson('/api/backoffice/ads/campaigns', [
            'advertiser_id' => $advertiser->id,
            'tenant_id' => null,
            'category_id' => $categoryId,
            'source' => 'external',
            'kind' => 'commercial',
            'name' => 'Oficina Outubro',
            'title' => '10% de desconto',
            'description' => null,
            'pricing_model' => 'fixed_period',
            'quoted_price' => 99.90,
            'currency' => 'EUR',
            'payment_required' => true,
            'priority' => 50,
            'weight' => 1,
            'max_impressions' => null,
            'max_clicks' => null,
            'frequency_cap_daily' => 3,
            'start_at' => now()->subMinute()->toISOString(),
            'end_at' => now()->addDays(30)->toISOString(),
            'admin_notes' => null,
            'metadata' => null,
            'channels' => ['public_marketplace'],
            'audiences' => ['driver'],
            'zone_ids' => [$zoneId],
            'locations' => [],
        ])
        ->assertCreated();

    $id = $response->json('data.id');

    $this
        ->withHeaders(adsHeaders())
        ->postJson("/api/backoffice/ads/campaigns/{$id}/action", [
            'action' => 'submit',
        ])
        ->assertOk();

    $this
        ->withHeaders(adsHeaders())
        ->postJson("/api/backoffice/ads/campaigns/{$id}/action", [
            'action' => 'approve',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'awaiting_payment');

    $this
        ->withHeaders(adsHeaders())
        ->postJson("/api/backoffice/ads/campaigns/{$id}/action", [
            'action' => 'mark_paid',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.payment_status', 'paid');

    $this->assertDatabaseHas('ad_orders', [
        'campaign_id' => $id,
        'status' => 'paid',
    ]);

    $this->assertDatabaseHas('ad_payments', [
        'status' => 'paid',
        'provider' => 'manual_admin',
    ]);
});

test('comunicação interna gratuita não aceita cobrança', function () {
    $admin = adsAdmin();
    adsLogin($this, $admin);

    $advertiser = AdAdvertiser::create([
        'type' => 'tenant',
        'name' => 'Gestora TVDE',
        'status' => 'active',
    ]);

    $tenant = Tenant::create([
        'nome' => 'Gestora TVDE',
        'slug' => 'gestora-tvde',
        'ativo' => true,
    ]);

    $this
        ->withHeaders(adsHeaders())
        ->postJson('/api/backoffice/ads/campaigns', [
            'advertiser_id' => $advertiser->id,
            'tenant_id' => $tenant->id,
            'category_id' => null,
            'source' => 'tenant',
            'kind' => 'tenant_internal',
            'name' => 'Nova oficina',
            'title' => 'Nova oficina parceira',
            'description' => null,
            'pricing_model' => 'fixed_period',
            'quoted_price' => 20,
            'currency' => 'EUR',
            'payment_required' => true,
            'priority' => 50,
            'weight' => 1,
            'max_impressions' => null,
            'max_clicks' => null,
            'frequency_cap_daily' => 3,
            'start_at' => null,
            'end_at' => null,
            'admin_notes' => null,
            'metadata' => null,
            'channels' => ['driver_portal'],
            'audiences' => ['driver'],
            'zone_ids' => [],
            'locations' => [],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'payment_required',
            'quoted_price',
        ]);
});

test('super admin altera regras globais ads', function () {
    $admin = adsAdmin();
    adsLogin($this, $admin);

    $this
        ->withHeaders(adsHeaders())
        ->patchJson('/api/backoffice/ads/settings', [
            'tenant_internal_free_enabled' => true,
            'tenant_internal_requires_approval' => true,
            'tenant_internal_max_active' => 5,
            'tenant_internal_max_days' => 45,
            'tenant_internal_allow_partners' => true,
            'public_marketplace_enabled' => true,
            'manager_panel_external_ads_enabled' => false,
            'saas_inventory_reserved_percent' => 40,
            'default_frequency_cap_daily' => 2,
            'currency' => 'EUR',
        ])
        ->assertOk()
        ->assertJsonPath(
            'data.tenant_internal_max_active',
            5
        );

    expect(
        AdSetting::query()
            ->where('scope', 'global')
            ->value('tenant_internal_max_active')
    )->toBe(5);
});

test(
    'super admin cria criativo com imagem e destino website',
    function () {
        Storage::fake(
            'public'
        );

        $admin = adsAdmin();

        adsLogin(
            $this,
            $admin
        );

        $advertiser = AdAdvertiser::create([
            'type' => 'saas',
            'name' => 'FrotaPro',
            'status' => 'active',
        ]);

        $campaign = AdCampaign::create([
            'advertiser_id' => $advertiser->id,
            'created_by_user_id' => $admin->id,
            'source' => 'saas',
            'kind' => 'house',
            'name' => 'Campanha com imagem',
            'title' => 'Campanha FrotaPro',
            'status' => 'draft',
            'pricing_model' => 'fixed_period',
            'quoted_price' => 0,
            'currency' => 'EUR',
            'payment_required' => false,
            'payment_status' => 'not_required',
            'priority' => 100,
            'weight' => 1,
        ]);

        $response = $this
            ->withHeaders(
                adsHeaders()
            )
            ->post(
                "/api/backoffice/ads/campaigns/{$campaign->id}/creatives",
                [
                    'type' => 'native_card',
                    'media_type' => 'image',

                    'name' => 'Criativo principal',

                    'headline' => 'Conheça o FrotaPro',

                    'body' => 'Gestão completa para operações TVDE.',

                    'cta_label' => 'Saber mais',

                    'destination_type' => 'website',

                    'target_url' => 'https://frotapro.pt',

                    'image' => UploadedFile::fake()
                        ->image(
                            'frotapro.jpg',
                            1200,
                            630
                        ),

                    'alt_text' => 'FrotaPro para gestão TVDE',

                    'active' => true,

                    'sort_order' => 10,
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.destination_type',
                'website'
            )
            ->assertJsonPath(
                'data.target_url',
                'https://frotapro.pt'
            );

        $creative = AdCreative::query()
            ->where(
                'campaign_id',
                $campaign->id
            )
            ->firstOrFail();

        expect(
            $creative->image_path
        )->not->toBeNull();

        Storage::disk(
            'public'
        )->assertExists(
            $creative->image_path
        );
    }
);

test(
    'destino whatsapp é normalizado e url é construída pelo backend',
    function () {
        $admin = adsAdmin();

        adsLogin(
            $this,
            $admin
        );

        $advertiser = AdAdvertiser::create([
            'type' => 'external',
            'name' => 'Oficina WhatsApp',
            'status' => 'active',
        ]);

        $campaign = AdCampaign::create([
            'advertiser_id' => $advertiser->id,
            'created_by_user_id' => $admin->id,
            'source' => 'external',
            'kind' => 'commercial',
            'name' => 'Campanha WhatsApp',
            'title' => 'Fale connosco',
            'status' => 'draft',
            'pricing_model' => 'fixed_period',
            'quoted_price' => 50,
            'currency' => 'EUR',
            'payment_required' => true,
            'payment_status' => 'pending',
            'priority' => 50,
            'weight' => 1,
        ]);

        $message =
            'Olá, vi o anúncio no FrotaPro e gostaria de saber mais.';

        $expectedUrl =
            'https://wa.me/351912345678?text='.
            rawurlencode(
                $message
            );

        $this
            ->withHeaders(
                adsHeaders()
            )
            ->post(
                "/api/backoffice/ads/campaigns/{$campaign->id}/creatives",
                [
                    'type' => 'native_card',
                    'media_type' => 'none',

                    'name' => 'WhatsApp principal',

                    'headline' => 'Peça orçamento',

                    'body' => 'Entre em contacto diretamente pelo WhatsApp.',

                    'cta_label' => 'Enviar WhatsApp',

                    'destination_type' => 'whatsapp',

                    'whatsapp' => '00 351 912 345 678',

                    'whatsapp_message' => $message,

                    'active' => true,

                    'sort_order' => 10,
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.whatsapp',
                '351912345678'
            )
            ->assertJsonPath(
                'data.target_url',
                $expectedUrl
            );

        $this->assertDatabaseHas(
            'ad_creatives',
            [
                'campaign_id' => $campaign->id,
                'destination_type' => 'whatsapp',
                'whatsapp' => '351912345678',
                'target_url' => $expectedUrl,
            ]
        );
    }
);

test(
    'destino telefone é convertido para url tel',
    function () {
        $admin = adsAdmin();

        adsLogin(
            $this,
            $admin
        );

        $advertiser = AdAdvertiser::create([
            'type' => 'external',
            'name' => 'Advocacia TVDE',
            'status' => 'active',
        ]);

        $campaign = AdCampaign::create([
            'advertiser_id' => $advertiser->id,
            'created_by_user_id' => $admin->id,
            'source' => 'external',
            'kind' => 'commercial',
            'name' => 'Campanha telefone',
            'title' => 'Apoio jurídico',
            'status' => 'draft',
            'pricing_model' => 'fixed_period',
            'quoted_price' => 80,
            'currency' => 'EUR',
            'payment_required' => true,
            'payment_status' => 'pending',
            'priority' => 50,
            'weight' => 1,
        ]);

        $this
            ->withHeaders(
                adsHeaders()
            )
            ->post(
                "/api/backoffice/ads/campaigns/{$campaign->id}/creatives",
                [
                    'type' => 'native_card',
                    'media_type' => 'none',

                    'name' => 'Contacto telefónico',

                    'headline' => 'Fale com um advogado',

                    'body' => null,

                    'cta_label' => 'Ligar agora',

                    'destination_type' => 'phone',

                    'phone' => '+351 211 234 567',

                    'active' => true,

                    'sort_order' => 10,
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.phone',
                '351211234567'
            )
            ->assertJsonPath(
                'data.target_url',
                'tel:+351211234567'
            );

        $this->assertDatabaseHas(
            'ad_creatives',
            [
                'campaign_id' => $campaign->id,
                'destination_type' => 'phone',
                'phone' => '351211234567',
                'target_url' => 'tel:+351211234567',
            ]
        );
    }
);

test(
    'super admin envia video para criativo',
    function () {
        Storage::fake(
            'public'
        );

        $admin = adsAdmin();

        adsLogin(
            $this,
            $admin
        );

        $advertiser = AdAdvertiser::create([
            'type' => 'saas',
            'name' => 'FrotaPro',
            'status' => 'active',
        ]);

        $campaign = AdCampaign::create([
            'advertiser_id' => $advertiser->id,
            'created_by_user_id' => $admin->id,
            'source' => 'saas',
            'kind' => 'house',
            'name' => 'Campanha vídeo',
            'title' => 'Conheça o novo módulo',
            'status' => 'draft',
            'pricing_model' => 'fixed_period',
            'quoted_price' => 0,
            'currency' => 'EUR',
            'payment_required' => false,
            'payment_status' => 'not_required',
            'priority' => 100,
            'weight' => 1,
        ]);

        $this
            ->withHeaders(
                adsHeaders()
            )
            ->post(
                "/api/backoffice/ads/campaigns/{$campaign->id}/creatives",
                [
                    'type' => 'native_card',
                    'media_type' => 'video',

                    'name' => 'Vídeo FrotaPro',

                    'headline' => 'Veja como funciona',

                    'body' => null,

                    'cta_label' => 'Conhecer',

                    'destination_type' => 'website',

                    'target_url' => 'https://frotapro.pt',

                    'video' => UploadedFile::fake()
                        ->create(
                            'frotapro.mp4',
                            1024,
                            'video/mp4'
                        ),

                    'active' => true,

                    'sort_order' => 10,
                ]
            )
            ->assertCreated();

        $creative = AdCreative::query()
            ->where(
                'campaign_id',
                $campaign->id
            )
            ->firstOrFail();

        expect(
            $creative->video_path
        )->not->toBeNull();

        Storage::disk(
            'public'
        )->assertExists(
            $creative->video_path
        );
    }
);

test(
    'detalhe da campanha retorna métricas globais e por criativo',
    function () {
        $admin = adsAdmin();

        adsLogin(
            $this,
            $admin
        );

        $advertiser = AdAdvertiser::create([
            'type' => 'saas',
            'name' => 'FrotaPro',
            'status' => 'active',
        ]);

        $campaign = AdCampaign::create([
            'advertiser_id' => $advertiser->id,
            'created_by_user_id' => $admin->id,
            'source' => 'saas',
            'kind' => 'house',
            'name' => 'Campanha métricas',
            'title' => 'Campanha com estatísticas',
            'status' => 'active',
            'pricing_model' => 'fixed_period',
            'quoted_price' => 0,
            'currency' => 'EUR',
            'payment_required' => false,
            'payment_status' => 'not_required',
            'priority' => 100,
            'weight' => 1,
        ]);

        $creative = AdCreative::create([
            'campaign_id' => $campaign->id,
            'type' => 'native_card',
            'media_type' => 'none',
            'name' => 'Criativo métricas',
            'headline' => 'Publicidade FrotaPro',
            'destination_type' => 'none',
            'active' => true,
            'sort_order' => 10,
        ]);

        AdDailyStat::create([
            'campaign_id' => $campaign->id,
            'creative_id' => $creative->id,
            'zone_id' => null,
            'date' => now()->toDateString(),

            'impressions' => 1000,

            'viewable_impressions' => 800,

            'unique_impressions' => 400,

            'clicks' => 50,

            'unique_clicks' => 40,
        ]);

        $this
            ->withHeaders(
                adsHeaders()
            )
            ->getJson(
                "/api/backoffice/ads/campaigns/{$campaign->id}"
            )
            ->assertOk()

            ->assertJsonPath(
                'data.metrics.impressions',
                1000
            )

            ->assertJsonPath(
                'data.metrics.viewable_impressions',
                800
            )

            ->assertJsonPath(
                'data.metrics.unique_impressions',
                400
            )

            ->assertJsonPath(
                'data.metrics.clicks',
                50
            )

            ->assertJsonPath(
                'data.metrics.unique_clicks',
                40
            )

            ->assertJsonPath(
                'data.metrics.ctr',
                5
            )

            ->assertJsonPath(
                'data.metrics.viewability_rate',
                80
            )

            ->assertJsonPath(
                'data.creatives.0.metrics.impressions',
                1000
            )

            ->assertJsonPath(
                'data.creatives.0.metrics.clicks',
                50
            )

            ->assertJsonPath(
                'data.creatives.0.metrics.ctr',
                5
            );
    }
);
