<?php

namespace App\Http\Controllers;

use App\Models\AdCategory;
use App\Models\AdCreative;
use App\Services\Ads\AdDeliveryService;
use App\Services\Ads\AdTrackingService;
use App\Services\SeoService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PublicAdsController extends Controller
{
    private const VISITOR_COOKIE = 'fp_ads_visitor';

    public function __construct(
        private readonly AdDeliveryService $delivery,
        private readonly AdTrackingService $tracking,
        private readonly SeoService $seo
    ) {}

    public function index(
        Request $request
    ): Response {
        $category=trim(
            (string)$request->query(
                'categoria',
                ''
            )
        );

        $search=trim(
            (string)$request->query(
                'q',
                ''
            )
        );

        $baseQuery=
            $this
                ->delivery
                ->publicCatalogQuery()
                ->with([
                    'category:id,slug,name',
                    'advertiser:id,name,type',

                    'creatives'=>fn($query)=>$query
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
                    fn($query)=>$query
                        ->where(
                            'active',
                            true
                        )
                        ->where(
                            'allowed_on_public',
                            true
                        )
                );

        /*
         * Categorias são calculadas exclusivamente a partir
         * de campanhas atualmente elegíveis no marketplace.
         */
        $categoryCounts=
            (clone $baseQuery)
                ->selectRaw(
                    'category_id, COUNT(*) as total'
                )
                ->groupBy(
                    'category_id'
                )
                ->pluck(
                    'total',
                    'category_id'
                );

        $categories=
            AdCategory::query()
                ->where(
                    'active',
                    true
                )
                ->where(
                    'allowed_on_public',
                    true
                )
                ->whereIn(
                    'id',
                    $categoryCounts
                        ->keys()
                        ->all()
                )
                ->orderBy(
                    'sort_order'
                )
                ->orderBy(
                    'name'
                )
                ->get([
                    'id',
                    'slug',
                    'name',
                    'description',
                ]);

        $categories->each(
            function($category) use($categoryCounts): void {
                $category->setAttribute(
                    'campaigns_count',
                    (int)(
                        $categoryCounts[
                            $category->id
                        ]??0
                    )
                );
            }
        );

        /*
         * Índice leve usado para autocomplete.
         */
        $suggestionCampaigns=
            (clone $baseQuery)
                ->orderByDesc(
                    'priority'
                )
                ->limit(
                    150
                )
                ->get();

        $suggestions=collect();

        foreach($categories as $item){
            $suggestions->push([
                'type'=>'category',
                'label'=>$item->name,
                'meta'=>'Categoria',
                'url'=>route(
                    'site.ads.index',
                    [
                        'categoria'=>$item->slug,
                    ]
                ),
            ]);
        }

        foreach($suggestionCampaigns as $campaign){
            if(filled($campaign->title)){
                $suggestions->push([
                    'type'=>'ad',
                    'label'=>$campaign->title,
                    'meta'=>$campaign->advertiser?->name
                        ?: 'Anúncio',
                    'url'=>route(
                        'site.ads.index',
                        [
                            'q'=>$campaign->title,
                        ]
                    ),
                ]);
            }

            if(filled($campaign->advertiser?->name)){
                $suggestions->push([
                    'type'=>'advertiser',
                    'label'=>$campaign->advertiser->name,
                    'meta'=>'Anunciante',
                    'url'=>route(
                        'site.ads.index',
                        [
                            'q'=>$campaign->advertiser->name,
                        ]
                    ),
                ]);
            }

            $creative=
                $campaign
                    ->creatives
                    ->first();

            if(
                $creative &&
                filled($creative->headline) &&
                $creative->headline!==$campaign->title
            ){
                $suggestions->push([
                    'type'=>'ad',
                    'label'=>$creative->headline,
                    'meta'=>$campaign->advertiser?->name
                        ?: 'Anúncio',
                    'url'=>route(
                        'site.ads.index',
                        [
                            'q'=>$creative->headline,
                        ]
                    ),
                ]);
            }
        }

        $suggestions=
            $suggestions
                ->unique(
                    fn(array $item)=>
                        mb_strtolower(
                            $item['type'].'|'.$item['label']
                        )
                )
                ->values()
                ->take(
                    150
                );

        $query=
            clone $baseQuery;

        if($category!==''){
            $query->whereHas(
                'category',
                fn($query)=>$query
                    ->where(
                        'slug',
                        $category
                    )
            );
        }

        if($search!==''){
            $like='%'.$search.'%';

            $query->where(
                function(Builder $query) use($like): void {
                    $query
                        ->where(
                            'title',
                            'like',
                            $like
                        )
                        ->orWhere(
                            'name',
                            'like',
                            $like
                        )
                        ->orWhere(
                            'description',
                            'like',
                            $like
                        )
                        ->orWhereHas(
                            'advertiser',
                            fn($query)=>$query
                                ->where(
                                    'name',
                                    'like',
                                    $like
                                )
                        )
                        ->orWhereHas(
                            'category',
                            fn($query)=>$query
                                ->where(
                                    'name',
                                    'like',
                                    $like
                                )
                        )
                        ->orWhereHas(
                            'creatives',
                            fn($query)=>$query
                                ->where(
                                    'active',
                                    true
                                )
                                ->where(
                                    function($query) use($like): void {
                                        $query
                                            ->where(
                                                'headline',
                                                'like',
                                                $like
                                            )
                                            ->orWhere(
                                                'body',
                                                'like',
                                                $like
                                            );
                                    }
                                )
                        );
                }
            );
        }

        $campaigns=
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

        $visitorId=trim(
            (string)$request->cookie(
                self::VISITOR_COOKIE
            )
        );

        $newVisitor=
            !Str::isUuid(
                $visitorId
            );

        if($newVisitor){
            $visitorId=
                (string)Str::uuid();
        }

        $viewerKey=
            $this
                ->tracking
                ->anonymousViewerKey(
                    $visitorId
                );

        $campaigns->setCollection(
            $campaigns
                ->getCollection()
                ->map(
                    function($campaign) use($viewerKey): ?array {
                        /** @var AdCreative|null $creative */
                        $creative=
                            $campaign
                                ->creatives
                                ->first();

                        if(!$creative){
                            return null;
                        }

                        $deliveryToken=
                            $this
                                ->tracking
                                ->recordServed(
                                    campaign:$campaign,
                                    creative:$creative,
                                    surface:AdDeliveryService::SURFACE_PUBLIC,
                                    viewerKey:$viewerKey,
                                    userId:null,
                                    tenantId:null
                                );

                        return [
                            'campaign_id'=>$campaign->id,
                            'creative_id'=>$creative->id,
                            'delivery_token'=>$deliveryToken,

                            'title'=>$creative->headline
                                ?: $campaign->title,

                            'description'=>$creative->body
                                ?: $campaign->description,

                            'advertiser'=>$campaign
                                ->advertiser
                                ->name,

                            'source'=>$campaign->source,

                            'category'=>[
                                'slug'=>$campaign
                                    ->category
                                    ->slug,

                                'name'=>$campaign
                                    ->category
                                    ->name,
                            ],

                            'type'=>$creative->type,

                            'media_type'=>$creative->media_type,

                            'image_url'=>$creative->image_path
                                ? Storage::disk(
                                    'public'
                                )->url(
                                    $creative->image_path
                                )
                                : null,

                            'mobile_image_url'=>$creative->mobile_image_path
                                ? Storage::disk(
                                    'public'
                                )->url(
                                    $creative->mobile_image_path
                                )
                                : null,

                            'video_url'=>$creative->video_path
                                ? Storage::disk(
                                    'public'
                                )->url(
                                    $creative->video_path
                                )
                                : $creative->video_url,

                            'alt_text'=>$creative->alt_text,

                            'cta_label'=>$creative->cta_label,

                            'destination_type'=>$creative
                                ->destination_type,

                            'click_url'=>$creative
                                ->destination_type!==
                                    AdCreative::DESTINATION_NONE
                                ? route(
                                    'ads.click',
                                    [
                                        'token'=>$deliveryToken,
                                    ]
                                )
                                : null,
                        ];
                    }
                )
                ->filter()
                ->values()
        );

        $response=
            response()->view(
                'site.ads.index',
                [
                    'campaigns'=>$campaigns,
                    'categories'=>$categories,
                    'selectedCategory'=>$category,
                    'search'=>$search,
                    'suggestions'=>$suggestions,
                    'seo'=>$this->seo->resolve(
                        'anuncios'
                    ),
                ]
            );

        if($newVisitor){
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