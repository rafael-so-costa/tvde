<?php

namespace App\Http\Controllers;

use App\Models\ConteudoCategoria;
use App\Models\ConteudoPost;
use App\Services\Ads\AdDeliveryService;
use App\Services\Ads\AdTrackingService;
use App\Services\ConteudoBuscaService;
use App\Services\SeoService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class BlogController extends Controller
{
    private const ADS_VISITOR_COOKIE='fp_ads_visitor';

    public function index(
        Request $request,
        SeoService $seoService,
        ConteudoBuscaService $searchService
    ): Response {
        $category=
            trim(
                (string)$request->query(
                    'categoria',
                    ''
                )
            );

        $search=
            $searchService->clean(
                (string)$request->query(
                    'q',
                    ''
                )
            );

        $query=
            ConteudoPost::query()
                ->publicados()
                ->with([
                    'categoria:id,nome,slug',

                    'categorias:id,nome,slug',

                    'tags:id,nome,slug',

                    'autor:id,name',
                ]);

        if(
            $category!==''
        ){
            $query->whereHas(
                'categorias',
                fn($query)=>
                    $query->where(
                        'slug',
                        $category
                    )
            );
        }

        if(
            mb_strlen($search)>=2
        ){
            $like=
                '%'.$search.'%';

            $query->where(
                function(
                    Builder $query
                ) use(
                    $like
                ): void {
                    $query
                        ->where(
                            'titulo',
                            'like',
                            $like
                        )
                        ->orWhere(
                            'resumo',
                            'like',
                            $like
                        )
                        ->orWhere(
                            'conteudo',
                            'like',
                            $like
                        )
                        ->orWhereHas(
                            'categorias',
                            fn($query)=>
                                $query->where(
                                    'nome',
                                    'like',
                                    $like
                                )
                        )
                        ->orWhereHas(
                            'tags',
                            fn($query)=>
                                $query->where(
                                    'nome',
                                    'like',
                                    $like
                                )
                        );
                }
            );
        }

        $posts=
            $query
                ->latest(
                    'publicado_em'
                )
                ->paginate(
                    12
                )
                ->withQueryString();

        /*
         * Uma pesquisa conta uma vez no primeiro carregamento.
         * Paginação não aumenta artificialmente a estatística.
         */
        if(
            mb_strlen($search)>=2 &&
            (int)$request->query(
                'page',
                1
            )===1
        ){
            $searchService->register(
                $search,
                $posts->total()
            );
        }

        $categories=
            ConteudoCategoria::query()
                ->where(
                    'ativo',
                    true
                )
                ->whereHas(
                    'conteudos',
                    fn($query)=>
                        $query->publicados()
                )
                ->withCount([
                    'conteudos as posts_count'=>
                        fn($query)=>
                            $query->publicados(),
                ])
                ->orderBy(
                    'ordem'
                )
                ->orderBy(
                    'nome'
                )
                ->get();

        return response()->view(
            'site.blog.index',
            [
                'posts'=>$posts,

                'categories'=>$categories,

                'selectedCategory'=>$category,

                'search'=>$search,

                'seo'=>
                    $seoService->resolve(
                        'blog'
                    ),
            ]
        );
    }

    public function show(
        Request $request,
        string $slug,
        SeoService $seoService,
        AdDeliveryService $ads,
        AdTrackingService $tracking
    ): Response {
        $post=
            ConteudoPost::query()
                ->publicados()
                ->with([
                    'categoria:id,nome,slug',

                    'categorias:id,nome,slug',

                    'tags:id,nome,slug',

                    'autor:id,name',
                ])
                ->where(
                    'slug',
                    $slug
                )
                ->firstOrFail();

        $related=
            $this->relatedPosts(
                $post
            );

        $visitorId=
            trim(
                (string)$request->cookie(
                    self::ADS_VISITOR_COOKIE
                )
            );

        $newVisitor=
            !Str::isUuid(
                $visitorId
            );

        if(
            $newVisitor
        ){
            $visitorId=
                (string)Str::uuid();
        }

        $viewerKey=
            $tracking->anonymousViewerKey(
                $visitorId
            );

        /*
         * REGRA:
         * publicidade apenas nas laterais
         * e no rodapé do artigo.
         */
        $sidebarAd=
            $ads->serve(
                AdDeliveryService::SURFACE_BLOG_SIDEBAR,
                null,
                $viewerKey,
                null
            );

        $footerAd=
            $ads->serve(
                AdDeliveryService::SURFACE_BLOG_FOOTER,
                null,
                $viewerKey,
                null
            );

        $response=
            response()->view(
                'site.blog.show',
                [
                    'post'=>$post,

                    'related'=>$related,

                    'sidebarAd'=>$sidebarAd,

                    'footerAd'=>$footerAd,

                    'seo'=>
                        $seoService->resolve(
                            'blog_artigo',
                            [
                                'titulo'=>
                                    $post->seo_title
                                    ?: $post->titulo,

                                'descricao'=>
                                    $post->seo_description
                                    ?: $post->resumo,

                                'canonical_url'=>
                                    $post->canonical_url,

                                'og_image_path'=>
                                    $post->og_image_path
                                    ?: $post->imagem_destaque_path
                                    ?: $post->imagem_capa_path,

                                'robots'=>
                                    $post->robots,

                                'schema_type'=>
                                    'BlogPosting',
                            ]
                        ),
                ]
            );

        if(
            $newVisitor
        ){
            $response->withCookie(
                cookie(
                    self::ADS_VISITOR_COOKIE,
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

    private function relatedPosts(
        ConteudoPost $post
    ) {
        $categoryIds=
            $post
                ->categorias
                ->pluck(
                    'id'
                )
                ->all();

        $tagIds=
            $post
                ->tags
                ->pluck(
                    'id'
                )
                ->all();

        $query=
            ConteudoPost::query()
                ->publicados()
                ->where(
                    'id',
                    '!=',
                    $post->id
                )
                ->with([
                    'categorias:id,nome,slug',

                    'autor:id,name',
                ]);

        if(
            $categoryIds===[] &&
            $tagIds===[]
        ){
            return $query
                ->latest(
                    'publicado_em'
                )
                ->limit(
                    4
                )
                ->get();
        }

        $query->where(
            function(
                Builder $query
            ) use(
                $categoryIds,
                $tagIds
            ): void {
                if(
                    $categoryIds!==[]
                ){
                    $query->whereHas(
                        'categorias',
                        fn($query)=>
                            $query->whereIn(
                                'conteudo_categorias.id',
                                $categoryIds
                            )
                    );
                }

                if(
                    $tagIds!==[]
                ){
                    $method=
                        $categoryIds!==[]
                            ? 'orWhereHas'
                            : 'whereHas';

                    $query->{$method}(
                        'tags',
                        fn($query)=>
                            $query->whereIn(
                                'conteudo_tags.id',
                                $tagIds
                            )
                    );
                }
            }
        );

        if(
            $categoryIds!==[]
        ){
            $query->withCount([
                'categorias as categorias_relacionadas'=>
                    fn($query)=>
                        $query->whereIn(
                            'conteudo_categorias.id',
                            $categoryIds
                        ),
            ]);
        }

        if(
            $tagIds!==[]
        ){
            $query->withCount([
                'tags as tags_relacionadas'=>
                    fn($query)=>
                        $query->whereIn(
                            'conteudo_tags.id',
                            $tagIds
                        ),
            ]);
        }

        if(
            $categoryIds!==[]
        ){
            $query->orderByDesc(
                'categorias_relacionadas'
            );
        }

        if(
            $tagIds!==[]
        ){
            $query->orderByDesc(
                'tags_relacionadas'
            );
        }

        return $query
            ->latest(
                'publicado_em'
            )
            ->limit(
                4
            )
            ->get();
    }
}