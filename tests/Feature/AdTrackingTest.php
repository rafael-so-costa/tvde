<?php

use App\Models\AdAdvertiser;
use App\Models\AdCampaign;
use App\Models\AdCreative;
use App\Models\AdDeliveryEvent;
use App\Services\Ads\AdDeliveryService;
use App\Services\Ads\AdTrackingService;
use Database\Seeders\AdSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(
        AdSeeder::class
    );
});

function trackingCampaign(
    array $overrides = []
): AdCampaign {
    $advertiser =
        AdAdvertiser::create([
            'type' => 'saas',
            'name' => 'FrotaPro Tracking '.
                uniqid(),

            'status' => 'active',
        ]);

    $campaign =
        AdCampaign::create([
            'advertiser_id' => $advertiser->id,

            'tenant_id' => null,

            'source' => 'saas',

            'kind' => 'house',

            'name' => $overrides[
                    'name'
                ] ??
                'Campanha Tracking',

            'title' => 'Campanha Tracking',

            'status' => 'active',

            'pricing_model' => 'fixed_period',

            'quoted_price' => 0,

            'currency' => 'EUR',

            'payment_required' => false,

            'payment_status' => 'not_required',

            'priority' => 100,

            'weight' => 1,

            'max_impressions' => $overrides[
                    'max_impressions'
                ] ?? null,

            'max_clicks' => $overrides[
                    'max_clicks'
                ] ?? null,

            'frequency_cap_daily' => $overrides[
                    'frequency_cap_daily'
                ] ?? 3,

            'start_at' => now()
                ->subMinute(),

            'end_at' => now()
                ->addDays(
                    30
                ),
        ]);

    DB::table(
        'ad_campaign_channels'
    )->insert([
        'campaign_id' => $campaign->id,

        'channel' => 'public_marketplace',
    ]);

    AdCreative::create([
        'campaign_id' => $campaign->id,

        'type' => 'native_card',

        'media_type' => 'none',

        'name' => 'Criativo tracking',

        'headline' => 'Conheça o FrotaPro',

        'body' => 'Conteúdo do anúncio.',

        'cta_label' => 'Saber mais',

        'destination_type' => 'website',

        'target_url' => $overrides[
                'target_url'
            ] ??
            'https://example.com/oferta',

        'active' => true,

        'sort_order' => 10,
    ]);

    return $campaign;
}

test(
    'entrega cria evento served e incrementa impressão',
    function () {
        $campaign =
            trackingCampaign();

        $response =
            $this
                ->getJson(
                    '/api/ads/serve/public'
                )
                ->assertOk()
                ->assertJsonPath(
                    'data.campaign_id',
                    $campaign->id
                );

        $token =
            $response->json(
                'data.delivery_token'
            );

        expect(
            $token
        )
            ->toBeString()
            ->toHaveLength(
                64
            );

        $this->assertDatabaseHas(
            'ad_delivery_events',
            [
                'delivery_token' => $token,

                'campaign_id' => $campaign->id,

                'surface' => 'public',

                'event_type' => 'served',
            ]
        );

        $this->assertDatabaseHas(
            'ad_daily_stats',
            [
                'campaign_id' => $campaign->id,

                'surface' => 'public',

                'impressions' => 1,

                'unique_impressions' => 1,
            ]
        );
    }
);

test(
    'visualização válida é idempotente',
    function () {
        trackingCampaign();

        $serve =
            $this
                ->getJson(
                    '/api/ads/serve/public'
                )
                ->assertOk();

        $token =
            $serve->json(
                'data.delivery_token'
            );

        $this
            ->postJson(
                '/api/ads/view',
                [
                    'delivery_token' => $token,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.tracked',
                true
            );

        $this
            ->postJson(
                '/api/ads/view',
                [
                    'delivery_token' => $token,
                ]
            )
            ->assertOk();

        expect(
            AdDeliveryEvent::query()
                ->where(
                    'delivery_token',
                    $token
                )
                ->where(
                    'event_type',
                    'viewable'
                )
                ->count()
        )->toBe(
            1
        );

        $this->assertDatabaseHas(
            'ad_daily_stats',
            [
                'surface' => 'public',

                'viewable_impressions' => 1,
            ]
        );
    }
);

test(
    'clique é contabilizado uma vez por entrega e redireciona',
    function () {
        trackingCampaign([
            'target_url' => 'https://example.com/oferta',
        ]);

        $serve =
            $this
                ->getJson(
                    '/api/ads/serve/public'
                )
                ->assertOk();

        $token =
            $serve->json(
                'data.delivery_token'
            );

        $this
            ->get(
                "/api/ads/c/{$token}"
            )
            ->assertRedirect(
                'https://example.com/oferta'
            );

        $this
            ->get(
                "/api/ads/c/{$token}"
            )
            ->assertRedirect(
                'https://example.com/oferta'
            );

        expect(
            AdDeliveryEvent::query()
                ->where(
                    'delivery_token',
                    $token
                )
                ->where(
                    'event_type',
                    'clicked'
                )
                ->count()
        )->toBe(
            1
        );

        $this->assertDatabaseHas(
            'ad_daily_stats',
            [
                'surface' => 'public',

                'clicks' => 1,

                'unique_clicks' => 1,
            ]
        );
    }
);

test(
    'frequency cap bloqueia novas entregas para o mesmo visitante',
    function () {
        $campaign =
            trackingCampaign([
                'frequency_cap_daily' => 2,
            ]);

        $tracking =
            app(
                AdTrackingService::class
            );

        $delivery =
            app(
                AdDeliveryService::class
            );

        $viewerKey =
            $tracking
                ->anonymousViewerKey(
                    'visitante-fixo'
                );

        $first =
            $delivery->serve(
                surface: AdDeliveryService::SURFACE_PUBLIC,

                tenantId: null,

                viewerKey: $viewerKey
            );

        $second =
            $delivery->serve(
                surface: AdDeliveryService::SURFACE_PUBLIC,

                tenantId: null,

                viewerKey: $viewerKey
            );

        $third =
            $delivery->serve(
                surface: AdDeliveryService::SURFACE_PUBLIC,

                tenantId: null,

                viewerKey: $viewerKey
            );

        expect(
            $first[
                'campaign_id'
            ]
        )->toBe(
            $campaign->id
        );

        expect(
            $second[
                'campaign_id'
            ]
        )->toBe(
            $campaign->id
        );

        expect(
            $third
        )->toBeNull();

        $stat =
            DB::table(
                'ad_daily_stats'
            )
                ->where(
                    'campaign_id',
                    $campaign->id
                )
                ->where(
                    'surface',
                    'public'
                )
                ->first();

        expect(
            (int) $stat->impressions
        )->toBe(
            2
        );

        expect(
            (int) $stat->unique_impressions
        )->toBe(
            1
        );
    }
);

test(
    'limite máximo de impressões impede nova entrega',
    function () {
        $campaign =
            trackingCampaign([
                'max_impressions' => 1,

                'frequency_cap_daily' => 10,
            ]);

        $tracking =
            app(
                AdTrackingService::class
            );

        $delivery =
            app(
                AdDeliveryService::class
            );

        $first =
            $delivery->serve(
                surface: AdDeliveryService::SURFACE_PUBLIC,

                tenantId: null,

                viewerKey: $tracking
                    ->anonymousViewerKey(
                        'visitante-a'
                    )
            );

        $second =
            $delivery->serve(
                surface: AdDeliveryService::SURFACE_PUBLIC,

                tenantId: null,

                viewerKey: $tracking
                    ->anonymousViewerKey(
                        'visitante-b'
                    )
            );

        expect(
            $first[
                'campaign_id'
            ]
        )->toBe(
            $campaign->id
        );

        expect(
            $second
        )->toBeNull();
    }
);

test(
    'limite máximo de cliques impede novas entregas',
    function () {
        $campaign =
            trackingCampaign([
                'max_clicks' => 1,

                'frequency_cap_daily' => 10,
            ]);

        $tracking =
            app(
                AdTrackingService::class
            );

        $delivery =
            app(
                AdDeliveryService::class
            );

        $first =
            $delivery->serve(
                surface: AdDeliveryService::SURFACE_PUBLIC,

                tenantId: null,

                viewerKey: $tracking
                    ->anonymousViewerKey(
                        'visitante-clique-a'
                    )
            );

        expect(
            $first[
                'campaign_id'
            ]
        )->toBe(
            $campaign->id
        );

        expect(
            $tracking
                ->recordClicked(
                    $first[
                        'delivery_token'
                    ]
                )
        )->toBe(
            'https://example.com/oferta'
        );

        $second =
            $delivery->serve(
                surface: AdDeliveryService::SURFACE_PUBLIC,

                tenantId: null,

                viewerKey: $tracking
                    ->anonymousViewerKey(
                        'visitante-clique-b'
                    )
            );

        expect(
            $second
        )->toBeNull();
    }
);

test(
    'endpoint público cria identificador anónimo em cookie',
    function () {
        trackingCampaign();

        $this
            ->getJson(
                '/api/ads/serve/public'
            )
            ->assertOk()
            ->assertCookie(
                'fp_ads_visitor'
            );
    }
);
