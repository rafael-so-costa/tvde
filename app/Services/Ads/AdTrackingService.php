<?php

namespace App\Services\Ads;

use App\Models\AdCampaign;
use App\Models\AdCreative;
use App\Models\AdDeliveryEvent;
use App\Models\AdSetting;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdTrackingService
{
    public function userViewerKey(
        string $userId
    ): string {
        return $this->hashViewer(
            "user:{$userId}"
        );
    }

    public function anonymousViewerKey(
        string $visitorId
    ): string {
        return $this->hashViewer(
            "visitor:{$visitorId}"
        );
    }

    public function filterEligible(
        Collection $campaigns,
        string $viewerKey
    ): Collection {
        if ($campaigns->isEmpty()) {
            return $campaigns;
        }

        $campaignIds = $campaigns
            ->pluck('id')
            ->values();

        $totals = DB::table(
            'ad_daily_stats'
        )
            ->whereIn(
                'campaign_id',
                $campaignIds
            )
            ->selectRaw('
                campaign_id,
                COALESCE(SUM(impressions), 0) AS impressions,
                COALESCE(SUM(clicks), 0) AS clicks
            ')
            ->groupBy(
                'campaign_id'
            )
            ->get()
            ->keyBy(
                'campaign_id'
            );

        $todayStart = now()
            ->startOfDay();

        $todayEnd = now()
            ->endOfDay();

        $servedToday =
            AdDeliveryEvent::query()
                ->whereIn(
                    'campaign_id',
                    $campaignIds
                )
                ->where(
                    'viewer_key',
                    $viewerKey
                )
                ->where(
                    'event_type',
                    AdDeliveryEvent::EVENT_SERVED
                )
                ->whereBetween(
                    'occurred_at',
                    [
                        $todayStart,
                        $todayEnd,
                    ]
                )
                ->selectRaw(
                    'campaign_id, COUNT(*) AS total'
                )
                ->groupBy(
                    'campaign_id'
                )
                ->pluck(
                    'total',
                    'campaign_id'
                );

        $defaultFrequencyCap =
            (int) (
                AdSetting::query()
                    ->where(
                        'scope',
                        'global'
                    )
                    ->value(
                        'default_frequency_cap_daily'
                    )
                ?? 3
            );

        return $campaigns
            ->filter(
                function (
                    AdCampaign $campaign
                ) use (
                    $totals,
                    $servedToday,
                    $defaultFrequencyCap
                ): bool {
                    $stats =
                        $totals->get(
                            $campaign->id
                        );

                    $impressions =
                        (int) (
                            $stats
                                ?->impressions
                            ?? 0
                        );

                    $clicks =
                        (int) (
                            $stats
                                ?->clicks
                            ?? 0
                        );

                    if (
                        $campaign->max_impressions !== null &&
                        $impressions >=
                        (int) $campaign->max_impressions
                    ) {
                        return false;
                    }

                    if (
                        $campaign->max_clicks !== null &&
                        $clicks >=
                        (int) $campaign->max_clicks
                    ) {
                        return false;
                    }

                    $frequencyCap =
                        $campaign->frequency_cap_daily !== null
                        ? (int) $campaign->frequency_cap_daily
                        : $defaultFrequencyCap;

                    $frequencyCap =
                        max(
                            1,
                            $frequencyCap
                        );

                    $viewerImpressions =
                        (int) (
                            $servedToday[$campaign->id]
                            ?? 0
                        );

                    return $viewerImpressions <
                        $frequencyCap;
                }
            )
            ->values();
    }

    public function recordServed(
        AdCampaign $campaign,
        AdCreative $creative,
        string $surface,
        string $viewerKey,
        ?string $userId = null,
        ?string $tenantId = null
    ): string {
        $token = Str::random(
            64
        );

        $occurredAt = now();

        DB::transaction(
            function () use (
                $campaign,
                $creative,
                $surface,
                $viewerKey,
                $userId,
                $tenantId,
                $token,
                $occurredAt
            ): void {
                $unique =
                    ! AdDeliveryEvent::query()
                        ->where(
                            'campaign_id',
                            $campaign->id
                        )
                        ->where(
                            'viewer_key',
                            $viewerKey
                        )
                        ->where(
                            'event_type',
                            AdDeliveryEvent::EVENT_SERVED
                        )
                        ->whereBetween(
                            'occurred_at',
                            [
                                $occurredAt
                                    ->copy()
                                    ->startOfDay(),

                                $occurredAt
                                    ->copy()
                                    ->endOfDay(),
                            ]
                        )
                        ->exists();

                AdDeliveryEvent::create([
                    'delivery_token' => $token,

                    'campaign_id' => $campaign->id,

                    'creative_id' => $creative->id,

                    'tenant_id' => $tenantId,

                    'user_id' => $userId,

                    'surface' => $surface,

                    'event_type' => AdDeliveryEvent::EVENT_SERVED,

                    'viewer_key' => $viewerKey,

                    'occurred_at' => $occurredAt,
                ]);

                $this->incrementDailyStat(
                    campaign: $campaign,
                    creative: $creative,
                    surface: $surface,
                    impressions: 1,
                    uniqueImpressions: $unique
                        ? 1
                        : 0
                );
            }
        );

        return $token;
    }

    public function recordViewable(
        string $deliveryToken
    ): bool {
        $served =
            $this->servedEvent(
                $deliveryToken
            );

        if (! $served) {
            return false;
        }

        return DB::transaction(
            function () use (
                $served
            ): bool {
                $event =
                    AdDeliveryEvent::query()
                        ->firstOrCreate(
                            [
                                'delivery_token' => $served->delivery_token,

                                'event_type' => AdDeliveryEvent::EVENT_VIEWABLE,
                            ],
                            [
                                'campaign_id' => $served->campaign_id,

                                'creative_id' => $served->creative_id,

                                'tenant_id' => $served->tenant_id,

                                'user_id' => $served->user_id,

                                'surface' => $served->surface,

                                'viewer_key' => $served->viewer_key,

                                'occurred_at' => now(),
                            ]
                        );

                if (
                    ! $event->wasRecentlyCreated
                ) {
                    return true;
                }

                $this->incrementDailyStat(
                    campaign: $served->campaign,

                    creative: $served->creative,

                    surface: $served->surface,

                    viewableImpressions: 1
                );

                return true;
            }
        );
    }

    public function recordClicked(
        string $deliveryToken
    ): ?string {
        $served =
            $this->servedEvent(
                $deliveryToken
            );

        if (! $served) {
            return null;
        }

        $destination =
            $this->safeDestination(
                $served->creative
            );

        if (! $destination) {
            return null;
        }

        DB::transaction(
            function () use (
                $served
            ): void {
                $existing =
                    AdDeliveryEvent::query()
                        ->where(
                            'delivery_token',
                            $served->delivery_token
                        )
                        ->where(
                            'event_type',
                            AdDeliveryEvent::EVENT_CLICKED
                        )
                        ->exists();

                if ($existing) {
                    return;
                }

                $now = now();

                $unique =
                    ! AdDeliveryEvent::query()
                        ->where(
                            'campaign_id',
                            $served->campaign_id
                        )
                        ->where(
                            'viewer_key',
                            $served->viewer_key
                        )
                        ->where(
                            'event_type',
                            AdDeliveryEvent::EVENT_CLICKED
                        )
                        ->whereBetween(
                            'occurred_at',
                            [
                                $now
                                    ->copy()
                                    ->startOfDay(),

                                $now
                                    ->copy()
                                    ->endOfDay(),
                            ]
                        )
                        ->exists();

                AdDeliveryEvent::create([
                    'delivery_token' => $served->delivery_token,

                    'campaign_id' => $served->campaign_id,

                    'creative_id' => $served->creative_id,

                    'tenant_id' => $served->tenant_id,

                    'user_id' => $served->user_id,

                    'surface' => $served->surface,

                    'event_type' => AdDeliveryEvent::EVENT_CLICKED,

                    'viewer_key' => $served->viewer_key,

                    'occurred_at' => $now,
                ]);

                $this->incrementDailyStat(
                    campaign: $served->campaign,

                    creative: $served->creative,

                    surface: $served->surface,

                    clicks: 1,

                    uniqueClicks: $unique
                        ? 1
                        : 0
                );
            }
        );

        return $destination;
    }

    private function servedEvent(
        string $deliveryToken
    ): ?AdDeliveryEvent {
        return AdDeliveryEvent::query()
            ->with([
                'campaign',
                'creative',
            ])
            ->where(
                'delivery_token',
                $deliveryToken
            )
            ->where(
                'event_type',
                AdDeliveryEvent::EVENT_SERVED
            )
            ->first();
    }

    private function incrementDailyStat(
        AdCampaign $campaign,
        AdCreative $creative,
        string $surface,
        int $impressions = 0,
        int $viewableImpressions = 0,
        int $uniqueImpressions = 0,
        int $clicks = 0,
        int $uniqueClicks = 0
    ): void {
        $date = now()
            ->toDateString();

        $timestamp = now();

        /*
     * Garante a existência da linha sem depender dos casts
     * Eloquent da coluna DATE.
     *
     * insertOrIgnore também evita colisões caso duas entregas
     * cheguem praticamente ao mesmo tempo.
     */
        DB::table(
            'ad_daily_stats'
        )->insertOrIgnore([
            'id' => (string) Str::uuid(),

            'campaign_id' => $campaign->id,

            'creative_id' => $creative->id,

            'zone_id' => null,

            'surface' => $surface,

            'date' => $date,

            'impressions' => 0,

            'viewable_impressions' => 0,

            'unique_impressions' => 0,

            'clicks' => 0,

            'unique_clicks' => 0,

            'created_at' => $timestamp,

            'updated_at' => $timestamp,
        ]);

        $updates = [];

        if ($impressions > 0) {
            $updates['impressions'] = DB::raw(
                "impressions + {$impressions}"
            );
        }

        if ($viewableImpressions > 0) {
            $updates['viewable_impressions'] = DB::raw(
                "viewable_impressions + {$viewableImpressions}"
            );
        }

        if ($uniqueImpressions > 0) {
            $updates['unique_impressions'] = DB::raw(
                "unique_impressions + {$uniqueImpressions}"
            );
        }

        if ($clicks > 0) {
            $updates['clicks'] = DB::raw(
                "clicks + {$clicks}"
            );
        }

        if ($uniqueClicks > 0) {
            $updates['unique_clicks'] = DB::raw(
                "unique_clicks + {$uniqueClicks}"
            );
        }

        if ($updates === []) {
            return;
        }

        $updates['updated_at'] = $timestamp;

        DB::table(
            'ad_daily_stats'
        )
            ->where(
                'campaign_id',
                $campaign->id
            )
            ->where(
                'creative_id',
                $creative->id
            )
            ->where(
                'surface',
                $surface
            )
            ->where(
                'date',
                $date
            )
            ->update(
                $updates
            );
    }

    private function safeDestination(
        AdCreative $creative
    ): ?string {
        $url = trim(
            (string) $creative->target_url
        );

        if (
            $creative->destination_type ===
            AdCreative::DESTINATION_NONE
        ) {
            return null;
        }

        if (
            $creative->destination_type ===
            AdCreative::DESTINATION_PHONE
        ) {
            return preg_match(
                '/^tel:\+\d{7,15}$/',
                $url
            )
                ? $url
                : null;
        }

        if (
            ! filter_var(
                $url,
                FILTER_VALIDATE_URL
            )
        ) {
            return null;
        }

        $scheme = strtolower(
            (string) parse_url(
                $url,
                PHP_URL_SCHEME
            )
        );

        if (
            ! in_array(
                $scheme,
                [
                    'http',
                    'https',
                ],
                true
            )
        ) {
            return null;
        }

        if (
            $creative->destination_type ===
            AdCreative::DESTINATION_WHATSAPP
        ) {
            $host = strtolower(
                (string) parse_url(
                    $url,
                    PHP_URL_HOST
                )
            );

            if (
                ! in_array(
                    $host,
                    [
                        'wa.me',
                        'www.wa.me',
                    ],
                    true
                )
            ) {
                return null;
            }
        }

        return $url;
    }

    private function hashViewer(
        string $value
    ): string {
        return hash_hmac(
            'sha256',
            $value,
            (string) config(
                'app.key'
            )
        );
    }
}
