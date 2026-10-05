<?php

namespace App\Http\Controllers;

use App\Models\AdCategory;
use App\Models\AdCreative;
use App\Services\Ads\AdDeliveryService;
use App\Services\Ads\AdTrackingService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PublicAdsController extends Controller
{
    private const VISITOR_COOKIE = 'fp_ads_visitor';

    public function __construct(
        private readonly AdDeliveryService $delivery,
        private readonly AdTrackingService $tracking
    ) {}

    public function index(
        Request $request
    ): Response {
        $category =
            trim(
                (string) $request->query(
                    'categoria',
                    ''
                )
            );

        $query =
            $this
                ->delivery
                ->publicCatalogQuery()
                ->with([
                    'category:id,slug,name',

                    'advertiser:id,name,type',

                    'creatives' => fn ($query) => $query
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
                ->whereHas(
                    'category',
                    fn ($query) => $query
                        ->where(
                            'active',
                            true
                        )
                        ->where(
                            'allowed_on_public',
                            true
                        )
                );

        if (
            $category !== ''
        ) {
            $query->whereHas(
                'category',
                fn ($query) => $query
                    ->where(
                        'slug',
                        $category
                    )
            );
        }

        $campaigns =
            $query
                ->orderByDesc(
                    'priority'
                )
                ->orderByDesc(
                    'activated_at'
                )
                ->orderByDesc(
                    'created_at'
                )
                ->paginate(
                    12
                )
                ->withQueryString();

        $visitorId =
            trim(
                (string) $request->cookie(
                    self::VISITOR_COOKIE
                )
            );

        $newVisitor =
            ! Str::isUuid(
                $visitorId
            );

        if (
            $newVisitor
        ) {
            $visitorId =
                (string) Str::uuid();
        }

        $viewerKey =
            $this
                ->tracking
                ->anonymousViewerKey(
                    $visitorId
                );

        $campaigns->setCollection(
            $campaigns
                ->getCollection()
                ->map(
                    function (
                        $campaign
                    ) use (
                        $viewerKey
                    ): ?array {
                        /** @var AdCreative|null $creative */
                        $creative =
                            $campaign
                                ->creatives
                                ->first();

                        if (
                            ! $creative
                        ) {
                            return null;
                        }

                        $deliveryToken =
                            $this
                                ->tracking
                                ->recordServed(
                                    campaign:
                                        $campaign,

                                    creative:
                                        $creative,

                                    surface:
                                        AdDeliveryService::SURFACE_PUBLIC,

                                    viewerKey:
                                        $viewerKey,

                                    userId:
                                        null,

                                    tenantId:
                                        null
                                );

                        return [
                            'campaign_id' =>
                                $campaign->id,

                            'creative_id' =>
                                $creative->id,

                            'delivery_token' =>
                                $deliveryToken,

                            'title' =>
                                $creative->headline
                                ?: $campaign->title,

                            'description' =>
                                $creative->body
                                ?: $campaign->description,

                            'advertiser' =>
                                $campaign
                                    ->advertiser
                                    ->name,

                            'source' =>
                                $campaign->source,

                            'category' => [
                                'slug' =>
                                    $campaign
                                        ->category
                                        ->slug,

                                'name' =>
                                    $campaign
                                        ->category
                                        ->name,
                            ],

                            'type' =>
                                $creative->type,

                            'media_type' =>
                                $creative->media_type,

                            'image_url' =>
                                $creative->image_path
                                ? Storage::disk(
                                    'public'
                                )->url(
                                    $creative->image_path
                                )
                                : null,

                            'mobile_image_url' =>
                                $creative->mobile_image_path
                                ? Storage::disk(
                                    'public'
                                )->url(
                                    $creative->mobile_image_path
                                )
                                : null,

                            'video_url' =>
                                $creative->video_path
                                ? Storage::disk(
                                    'public'
                                )->url(
                                    $creative->video_path
                                )
                                : $creative->video_url,

                            'alt_text' =>
                                $creative->alt_text,

                            'cta_label' =>
                                $creative->cta_label,

                            'destination_type' =>
                                $creative
                                    ->destination_type,

                            'click_url' =>
                                $creative
                                    ->destination_type !==
                                AdCreative::DESTINATION_NONE
                                ? route(
                                    'ads.click',
                                    [
                                        'token' =>
                                            $deliveryToken,
                                    ]
                                )
                                : null,
                        ];
                    }
                )
                ->filter()
                ->values()
        );

        $categories =
            AdCategory::query()
                ->where(
                    'active',
                    true
                )
                ->where(
                    'allowed_on_public',
                    true
                )
                ->orderBy(
                    'sort_order'
                )
                ->orderBy(
                    'name'
                )
                ->get([
                    'slug',
                    'name',
                ]);

        $response =
            response()->view(
                'site.ads.index',
                [
                    'campaigns' =>
                        $campaigns,

                    'categories' =>
                        $categories,

                    'selectedCategory' =>
                        $category,
                ]
            );

        if (
            $newVisitor
        ) {
            $response->withCookie(
                cookie(
                    self::VISITOR_COOKIE,
                    $visitorId,
                    525600,
                    '/',
                    null,
                    $request->isSecure(),
                    true,
                    false,
                    'lax'
                )
            );
        }

        return $response;
    }
}
