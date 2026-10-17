<?php

namespace App\Services\Ads;

use App\Models\AdAdvertiser;
use App\Models\AdCampaign;
use App\Models\AdCreative;
use App\Models\AdSetting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class AdDeliveryService
{
    public const SURFACE_MANAGER = 'manager_panel';

    public const SURFACE_DRIVER = 'driver_portal';

    public const SURFACE_OWNER = 'owner_portal';

    public const SURFACE_PUBLIC = 'public';

    public const SURFACE_BLOG_SIDEBAR = 'blog_sidebar';

    public const SURFACE_BLOG_FOOTER = 'blog_footer';

    public function __construct(
        private readonly AdTrackingService $tracking
    ) {}

    public function serve(
        string $surface,
        ?string $tenantId,
        string $viewerKey,
        ?string $userId = null
    ): ?array {
        if (
            in_array(
                $surface,
                [
                    self::SURFACE_PUBLIC,
                    self::SURFACE_BLOG_SIDEBAR,
                    self::SURFACE_BLOG_FOOTER,
                ],
                true
            ) &&
            ! $this->publicMarketplaceEnabled()
        ) {
            return null;
        }

        $query = $this->baseQuery(
            $surface
        );

        match ($surface) {
            self::SURFACE_MANAGER => $this->managerEligibility(
                $query
            ),

            self::SURFACE_DRIVER => $this->driverEligibility(
                $query,
                $tenantId
            ),

            self::SURFACE_OWNER => $this->ownerEligibility(
                $query,
                $tenantId
            ),

            self::SURFACE_PUBLIC,
            self::SURFACE_BLOG_SIDEBAR,
            self::SURFACE_BLOG_FOOTER => $this->publicEligibility(
                $query
            ),

            default => $query->whereRaw(
                '1 = 0'
            ),
        };

        $campaigns =
            $this
            ->tracking
            ->filterEligible(
                $query->get(),
                $viewerKey
            );

        $campaign =
            $this->selectCampaign(
                $campaigns
            );

        if (! $campaign) {
            return null;
        }

        $creative =
            $campaign
            ->creatives
            ->first();

        if (! $creative) {
            return null;
        }

        $deliveryToken =
            $this
            ->tracking
            ->recordServed(
                campaign: $campaign,

                creative: $creative,

                surface: $surface,

                viewerKey: $viewerKey,

                userId: $userId,

                tenantId: $tenantId
            );

        return $this->serialize(
            $campaign,
            $creative,
            $surface,
            $deliveryToken
        );
    }
    public function publicCatalogQuery(): Builder
    {
        if (
            ! $this->publicMarketplaceEnabled()
        ) {
            return AdCampaign::query()
                ->whereRaw('1 = 0');
        }

        $query = $this->baseQuery(
            self::SURFACE_PUBLIC
        );

        $this->publicEligibility(
            $query
        );

        return $query;
    }
    private function baseQuery(
        string $surface
    ): Builder {
        $channel =
            $this->channelForSurface(
                $surface
            );

        return AdCampaign::query()
            ->with([
                'advertiser:id,name,type,status',

                'creatives' => fn($query) => $query
                    ->where(
                        'active',
                        true
                    )
                    ->orderBy(
                        'sort_order'
                    )
                    ->orderBy(
                        'created_at'
                    ),
            ])
            ->where(
                'status',
                AdCampaign::STATUS_ACTIVE
            )
            ->whereHas(
                'advertiser',
                fn($query) => $query->where(
                    'status',
                    AdAdvertiser::STATUS_ACTIVE
                )
            )
            ->whereHas(
                'creatives',
                fn($query) => $query->where(
                    'active',
                    true
                )
            )
            ->where(
                function (
                    $query
                ) {
                    $query
                        ->whereNull(
                            'start_at'
                        )
                        ->orWhere(
                            'start_at',
                            '<=',
                            now()
                        );
                }
            )
            ->where(
                function (
                    $query
                ) {
                    $query
                        ->whereNull(
                            'end_at'
                        )
                        ->orWhere(
                            'end_at',
                            '>',
                            now()
                        );
                }
            )
            ->where(
                function (
                    $query
                ) {
                    $query
                        ->where(
                            'payment_required',
                            false
                        )
                        ->orWhere(
                            'payment_status',
                            AdCampaign::PAYMENT_PAID
                        );
                }
            )
            ->whereExists(
                fn($query) => $query
                    ->selectRaw(
                        '1'
                    )
                    ->from(
                        'ad_campaign_channels'
                    )
                    ->whereColumn(
                        'ad_campaign_channels.campaign_id',
                        'ad_campaigns.id'
                    )
                    ->where(
                        'ad_campaign_channels.channel',
                        $channel
                    )
            );
    }

    private function managerEligibility(
        Builder $query
    ): void {
        /*
         * Regra rígida:
         * o gestor nunca recebe publicidade
         * de tenants ou parceiros externos.
         */
        $query
            ->where(
                'source',
                AdCampaign::SOURCE_SAAS
            )
            ->whereExists(
                $this->audienceExists(
                    AdCampaign::AUDIENCE_MANAGER
                )
            );
    }

    private function driverEligibility(
        Builder $query,
        ?string $tenantId
    ): void {
        if (! $tenantId) {
            $query->whereRaw(
                '1 = 0'
            );

            return;
        }

        $internalEnabled =
            $this->tenantInternalEnabled();

        $query
            ->whereExists(
                $this->audienceExists(
                    AdCampaign::AUDIENCE_DRIVER
                )
            )
            ->where(
                function (
                    Builder $query
                ) use (
                    $tenantId,
                    $internalEnabled
                ) {
                    $query->where(
                        'source',
                        AdCampaign::SOURCE_SAAS
                    );

                    if (
                        $internalEnabled
                    ) {
                        $query->orWhere(
                            function (
                                Builder $query
                            ) use (
                                $tenantId
                            ) {
                                $query
                                    ->where(
                                        'source',
                                        AdCampaign::SOURCE_TENANT
                                    )
                                    ->where(
                                        'kind',
                                        AdCampaign::KIND_TENANT_INTERNAL
                                    )
                                    ->where(
                                        'tenant_id',
                                        $tenantId
                                    )
                                    ->where(
                                        'payment_required',
                                        false
                                    );
                            }
                        );
                    }
                }
            );
    }

    private function ownerEligibility(
        Builder $query,
        ?string $tenantId
    ): void {
        if (! $tenantId) {
            $query->whereRaw(
                '1 = 0'
            );

            return;
        }

        $internalEnabled =
            $this->tenantInternalEnabled();

        $query
            ->whereExists(
                $this->audienceExists(
                    AdCampaign::AUDIENCE_OWNER
                )
            )
            ->where(
                function (
                    Builder $query
                ) use (
                    $tenantId,
                    $internalEnabled
                ) {
                    $query->where(
                        'source',
                        AdCampaign::SOURCE_SAAS
                    );

                    if (
                        $internalEnabled
                    ) {
                        $query->orWhere(
                            function (
                                Builder $query
                            ) use (
                                $tenantId
                            ) {
                                $query
                                    ->where(
                                        'source',
                                        AdCampaign::SOURCE_TENANT
                                    )
                                    ->where(
                                        'kind',
                                        AdCampaign::KIND_TENANT_INTERNAL
                                    )
                                    ->where(
                                        'tenant_id',
                                        $tenantId
                                    )
                                    ->where(
                                        'payment_required',
                                        false
                                    );
                            }
                        );
                    }
                }
            );
    }

    private function publicEligibility(
        Builder $query
    ): void {
        $query->where(
            function (
                Builder $query
            ) {
                $query->where(
                    'source',
                    AdCampaign::SOURCE_SAAS
                );

                $query->orWhere(
                    function (
                        Builder $query
                    ) {
                        $query
                            ->whereIn(
                                'source',
                                [
                                    AdCampaign::SOURCE_TENANT,
                                    AdCampaign::SOURCE_EXTERNAL,
                                ]
                            )
                            ->where(
                                'kind',
                                AdCampaign::KIND_COMMERCIAL
                            )
                            ->where(
                                'payment_required',
                                true
                            )
                            ->where(
                                'payment_status',
                                AdCampaign::PAYMENT_PAID
                            );
                    }
                );
            }
        );
    }

    private function audienceExists(
        string $audience
    ): callable {
        return fn($query) => $query
            ->selectRaw(
                '1'
            )
            ->from(
                'ad_campaign_audiences'
            )
            ->whereColumn(
                'ad_campaign_audiences.campaign_id',
                'ad_campaigns.id'
            )
            ->where(
                'ad_campaign_audiences.audience',
                $audience
            );
    }

    private function selectCampaign(
        Collection $campaigns
    ): ?AdCampaign {
        if (
            $campaigns->isEmpty()
        ) {
            return null;
        }

        $weighted =
            $campaigns->map(
                function (
                    AdCampaign $campaign
                ): array {
                    return [
                        'campaign' => $campaign,

                        'weight' => max(
                            1,
                            (int) $campaign->priority
                        ) *
                            max(
                                1,
                                (int) $campaign->weight
                            ),
                    ];
                }
            );

        $total =
            (int) $weighted
                ->sum(
                    'weight'
                );

        if ($total <= 1) {
            return $weighted
                ->first()['campaign'];
        }

        $draw =
            random_int(
                1,
                $total
            );

        $cursor = 0;

        foreach (
            $weighted as $item
        ) {
            $cursor +=
                $item['weight'];

            if (
                $draw <=
                $cursor
            ) {
                return $item['campaign'];
            }
        }

        return $weighted
            ->last()['campaign'];
    }

    private function serialize(
        AdCampaign $campaign,
        AdCreative $creative,
        string $surface,
        string $deliveryToken
    ): array {
        return [
            'delivery_token' => $deliveryToken,

            'campaign_id' => $campaign->id,

            'creative_id' => $creative->id,

            'surface' => $surface,

            'source' => $campaign->source,

            'kind' => $campaign->kind,

            'advertiser' => [
                'name' => $campaign
                    ->advertiser
                    ->name,

                'type' => $campaign
                    ->advertiser
                    ->type,
            ],

            'creative' => [
                'type' => $creative->type,

                'media_type' => $creative->media_type,

                'headline' => $creative->headline,

                'body' => $creative->body,

                'cta_label' => $creative->cta_label,

                'destination_type' => $creative->destination_type,

                /*
                 * O destino real não é enviado
                 * diretamente ao frontend.
                 * O clique passa pelo tracker.
                 */
                'click_url' => $creative->destination_type !==
                    AdCreative::DESTINATION_NONE
                    ? route(
                        'ads.click',
                        [
                            'token'=>$deliveryToken,
                        ]
                    )
                    : null,

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
                        $creative->mobile_image_path
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
            ],
        ];
    }

    private function channelForSurface(
        string $surface
    ): string {
        return match ($surface) {
            self::SURFACE_MANAGER => 'manager_panel',

            self::SURFACE_DRIVER => 'driver_portal',

            self::SURFACE_OWNER => 'owner_portal',

            self::SURFACE_PUBLIC,
            self::SURFACE_BLOG_SIDEBAR,
            self::SURFACE_BLOG_FOOTER => 'public_marketplace',

            default => '__invalid__',
        };
    }

    private function tenantInternalEnabled(): bool
    {
        return (bool) (
            AdSetting::query()
            ->where(
                'scope',
                'global'
            )
            ->value(
                'tenant_internal_free_enabled'
            )
            ?? true
        );
    }

    private function publicMarketplaceEnabled(): bool
    {
        return (bool) (
            AdSetting::query()
            ->where(
                'scope',
                'global'
            )
            ->value(
                'public_marketplace_enabled'
            )
            ?? true
        );
    }
}
