<?php

namespace App\Services\Ads;

use App\Models\AdCampaign;
use App\Models\AdOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AdAdminSerializer
{
    public function campaignSummary(
        AdCampaign $campaign
    ): array {
        $campaign->loadMissing([
            'advertiser',
            'category',
            'tenant',
        ]);

        return [
            'id' => $campaign->id,

            'name' => $campaign->name,

            'title' => $campaign->title,

            'source' => $campaign->source,

            'kind' => $campaign->kind,

            'status' => $campaign->status,

            'quoted_price' => (float) $campaign->quoted_price,

            'currency' => $campaign->currency,

            'payment_required' => $campaign->payment_required,

            'payment_status' => $campaign->payment_status,

            'priority' => $campaign->priority,

            'start_at' => $campaign->start_at,

            'end_at' => $campaign->end_at,

            'advertiser' => $campaign->advertiser
                ? [
                    'id' => $campaign->advertiser->id,

                    'name' => $campaign->advertiser->name,

                    'type' => $campaign->advertiser->type,
                ]
                : null,

            'category' => $campaign->category
                ? [
                    'id' => $campaign->category->id,

                    'name' => $campaign->category->name,

                    'slug' => $campaign->category->slug,
                ]
                : null,

            'tenant' => $campaign->tenant
                ? [
                    'id' => $campaign->tenant->id,

                    'nome' => $campaign->tenant->nome,
                ]
                : null,

            'created_at' => $campaign->created_at,

            'updated_at' => $campaign->updated_at,
        ];
    }

    public function campaignDetail(
        AdCampaign $campaign
    ): array {
        $campaign->load([
            'advertiser',
            'category',
            'tenant',

            'zones',

            'creatives' => fn ($query) => $query
                ->orderBy('sort_order'),

            'reviews' => fn ($query) => $query
                ->with(
                    'reviewer:id,name,email'
                )
                ->latest(),

            'events' => fn ($query) => $query
                ->with(
                    'user:id,name,email'
                )
                ->latest()
                ->limit(100),

            'orders' => fn ($query) => $query
                ->with('payments')
                ->latest(),
        ]);

        $channels = DB::table(
            'ad_campaign_channels'
        )
            ->where(
                'campaign_id',
                $campaign->id
            )
            ->pluck('channel')
            ->values();

        $audiences = DB::table(
            'ad_campaign_audiences'
        )
            ->where(
                'campaign_id',
                $campaign->id
            )
            ->pluck('audience')
            ->values();

        $locations = DB::table(
            'ad_campaign_locations'
        )
            ->where(
                'campaign_id',
                $campaign->id
            )
            ->get([
                'id',
                'country_code',
                'district',
                'municipality',
            ]);

        /*
         * Métricas globais da campanha.
         */
        $metrics = DB::table(
            'ad_daily_stats'
        )
            ->where(
                'campaign_id',
                $campaign->id
            )
            ->selectRaw('
                COALESCE(SUM(impressions), 0) AS impressions,
                COALESCE(SUM(viewable_impressions), 0) AS viewable_impressions,
                COALESCE(SUM(unique_impressions), 0) AS unique_impressions,
                COALESCE(SUM(clicks), 0) AS clicks,
                COALESCE(SUM(unique_clicks), 0) AS unique_clicks
            ')
            ->first();

        $impressions =
            (int) (
                $metrics->impressions
                ?? 0
            );

        $viewableImpressions =
            (int) (
                $metrics->viewable_impressions
                ?? 0
            );

        $uniqueImpressions =
            (int) (
                $metrics->unique_impressions
                ?? 0
            );

        $clicks =
            (int) (
                $metrics->clicks
                ?? 0
            );

        $uniqueClicks =
            (int) (
                $metrics->unique_clicks
                ?? 0
            );

        /*
         * Métricas agrupadas por criativo.
         *
         * IMPORTANTE:
         * Esta variável precisa existir antes do map()
         * dos criativos.
         */
        $creativeMetrics = DB::table(
            'ad_daily_stats'
        )
            ->where(
                'campaign_id',
                $campaign->id
            )
            ->whereNotNull(
                'creative_id'
            )
            ->selectRaw('
                creative_id,
                COALESCE(SUM(impressions), 0) AS impressions,
                COALESCE(SUM(viewable_impressions), 0) AS viewable_impressions,
                COALESCE(SUM(unique_impressions), 0) AS unique_impressions,
                COALESCE(SUM(clicks), 0) AS clicks,
                COALESCE(SUM(unique_clicks), 0) AS unique_clicks
            ')
            ->groupBy(
                'creative_id'
            )
            ->get()
            ->keyBy(
                'creative_id'
            );

        return [
            ...$this->campaignSummary(
                $campaign
            ),

            'description' => $campaign->description,

            'pricing_model' => $campaign->pricing_model,

            'weight' => $campaign->weight,

            'max_impressions' => $campaign->max_impressions,

            'max_clicks' => $campaign->max_clicks,

            'frequency_cap_daily' => $campaign->frequency_cap_daily,

            'admin_notes' => $campaign->admin_notes,

            'metadata' => $campaign->metadata,

            'channels' => $channels,

            'audiences' => $audiences,

            'locations' => $locations,

            'metrics' => [
                'impressions' => $impressions,

                'viewable_impressions' => $viewableImpressions,

                'unique_impressions' => $uniqueImpressions,

                'clicks' => $clicks,

                'unique_clicks' => $uniqueClicks,

                'ctr' => $impressions > 0
                    ? round(
                        (
                            $clicks /
                            $impressions
                        ) * 100,
                        2
                    )
                    : 0,

                'viewability_rate' => $impressions > 0
                    ? round(
                        (
                            $viewableImpressions /
                            $impressions
                        ) * 100,
                        2
                    )
                    : 0,
            ],

            'zones' => $campaign
                ->zones
                ->map(
                    fn ($zone) => [
                        'id' => $zone->id,

                        'code' => $zone->code,

                        'name' => $zone->name,

                        'channel' => $zone->channel,

                        'audience' => $zone->audience,

                        'description' => $zone->description,

                        'max_concurrent_campaigns' => $zone->max_concurrent_campaigns,

                        'saas_reserved_percent' => $zone->saas_reserved_percent,

                        'allowed_sources' => $zone->allowed_sources,

                        'active' => $zone->active,
                    ]
                )
                ->values(),

            'creatives' => $campaign
                ->creatives
                ->map(
                    function (
                        $creative
                    ) use (
                        $creativeMetrics
                    ): array {
                        $stats =
                            $creativeMetrics->get(
                                $creative->id
                            );

                        $creativeImpressions =
                            (int) (
                                $stats
                                    ?->impressions
                                ?? 0
                            );

                        $creativeViewable =
                            (int) (
                                $stats
                                    ?->viewable_impressions
                                ?? 0
                            );

                        $creativeUniqueImpressions =
                            (int) (
                                $stats
                                    ?->unique_impressions
                                ?? 0
                            );

                        $creativeClicks =
                            (int) (
                                $stats
                                    ?->clicks
                                ?? 0
                            );

                        $creativeUniqueClicks =
                            (int) (
                                $stats
                                    ?->unique_clicks
                                ?? 0
                            );

                        return [
                            'id' => $creative->id,

                            'type' => $creative->type,

                            'media_type' => $creative->media_type,

                            'name' => $creative->name,

                            'headline' => $creative->headline,

                            'body' => $creative->body,

                            'cta_label' => $creative->cta_label,

                            'destination_type' => $creative->destination_type,

                            'target_url' => $creative->target_url,

                            'phone' => $creative->phone,

                            'whatsapp' => $creative->whatsapp,

                            'whatsapp_message' => $creative->whatsapp_message,

                            'image_url' => $creative->image_path
                                ? Storage::disk(
                                    'public'
                                )->url(
                                    $creative->image_path
                                )
                                : null,

                            'mobile_image_url' => $creative->mobile_image_path
                                    ? Storage::disk(
                                        'public'
                                    )->url(
                                        $creative
                                            ->mobile_image_path
                                    )
                                    : null,

                            'video_url' => $creative->video_path
                                ? Storage::disk(
                                    'public'
                                )->url(
                                    $creative->video_path
                                )
                                : $creative->video_url,

                            'alt_text' => $creative->alt_text,

                            'active' => $creative->active,

                            'sort_order' => $creative->sort_order,

                            'metrics' => [
                                'impressions' => $creativeImpressions,

                                'viewable_impressions' => $creativeViewable,

                                'unique_impressions' => $creativeUniqueImpressions,

                                'clicks' => $creativeClicks,

                                'unique_clicks' => $creativeUniqueClicks,

                                'ctr' => $creativeImpressions > 0
                                    ? round(
                                        (
                                            $creativeClicks /
                                            $creativeImpressions
                                        ) * 100,
                                        2
                                    )
                                    : 0,

                                'viewability_rate' => $creativeImpressions > 0
                                        ? round(
                                            (
                                                $creativeViewable /
                                                $creativeImpressions
                                            ) * 100,
                                            2
                                        )
                                        : 0,
                            ],
                        ];
                    }
                )
                ->values(),

            'reviews' => $campaign
                ->reviews
                ->map(
                    fn ($review) => [
                        'id' => $review->id,

                        'decision' => $review->decision,

                        'reason' => $review->reason,

                        'notes' => $review->notes,

                        'reviewer' => $review->reviewer
                            ? [
                                'id' => $review->reviewer->id,

                                'name' => $review->reviewer->name,
                            ]
                            : null,

                        'created_at' => $review->created_at,
                    ]
                )
                ->values(),

            'events' => $campaign
                ->events
                ->map(
                    fn ($event) => [
                        'id' => $event->id,

                        'event_type' => $event->event_type,

                        'from_status' => $event->from_status,

                        'to_status' => $event->to_status,

                        'data' => $event->data,

                        'user' => $event->user
                            ? [
                                'id' => $event->user->id,

                                'name' => $event->user->name,
                            ]
                            : null,

                        'created_at' => $event->created_at,
                    ]
                )
                ->values(),

            'orders' => $campaign
                ->orders
                ->map(
                    fn (AdOrder $order) => $this
                        ->order(
                            $order
                        )
                )
                ->values(),
        ];
    }

    public function order(
        AdOrder $order
    ): array {
        $order->loadMissing([
            'campaign:id,name,title,status',

            'advertiser:id,name,type',

            'tenant:id,nome',

            'payments',
            'billingCharges.payments',
        ]);

        $billingCharge =
            $order
                ->billingCharges
                ->sortByDesc('created_at')
                ->first();

        $billingPayment =
            $billingCharge
                ?->payments
                ->sortByDesc('created_at')
                ->first();

        return [
            'id' => $order->id,

            'number' => $order->number,

            'status' => $order->status,

            'subtotal' => (float) $order->subtotal,

            'discount' => (float) $order->discount,

            'total' => (float) $order->total,

            'currency' => $order->currency,

            'due_at' => $order->due_at,

            'paid_at' => $order->paid_at,

            'campaign' => $order->campaign,

            'advertiser' => $order->advertiser,

            'tenant' => $order->tenant,

            'billing_payment' =>
                $billingPayment
                    ? [
                        'id' => $billingPayment->id,
                        'provider' => $billingPayment->provider,
                        'method' => $billingPayment->method,
                        'status' => $billingPayment->status,
                        'amount' => (float) $billingPayment->amount,
                        'currency' => $billingPayment->currency,
                        'entity' => $billingPayment->entity,
                        'reference' => $billingPayment->reference,
                        'provider_reference' => $billingPayment->provider_reference,
                        'expires_at' => $billingPayment->expires_at,
                        'paid_at' => $billingPayment->paid_at,

                        'mock' => (bool) data_get(
                            $billingPayment->metadata,
                            'mock',
                            false
                        ),

                        'warning' => data_get(
                            $billingPayment->metadata,
                            'warning'
                        ),

                        'charge' => $billingCharge
                            ? [
                                'id' => $billingCharge->id,
                                'number' => $billingCharge->number,
                                'source_type' => $billingCharge->source_type,
                                'source_id' => $billingCharge->source_id,
                                'status' => $billingCharge->status,
                                'description' => $billingCharge->description,
                                'due_at' => $billingCharge->due_at,
                            ]
                            : null,
                    ]
                    : null,

            'payments' => $order
                ->payments
                ->map(
                    fn ($payment) => [
                        'id' => $payment->id,

                        'provider' => $payment->provider,

                        'provider_reference' => $payment->provider_reference,

                        'status' => $payment->status,

                        'amount' => (float) $payment->amount,

                        'currency' => $payment->currency,

                        'paid_at' => $payment->paid_at,
                    ]
                )
                ->values(),

            'created_at' => $order->created_at,
        ];
    }
}
