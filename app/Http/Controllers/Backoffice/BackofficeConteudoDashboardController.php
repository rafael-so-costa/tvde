<?php

namespace App\Http\Controllers\Backoffice;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsEvento;
use App\Models\ConteudoPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BackofficeConteudoDashboardController extends Controller
{
    public function __invoke(
        Request $request
    ): JsonResponse {
        $days=max(
            7,
            min(
                365,
                (int)$request->query(
                    'dias',
                    30
                )
            )
        );

        $from=now()
            ->subDays($days-1)
            ->startOfDay();

        $viewsTotal=
            AnalyticsEvento::query()
                ->where(
                    'evento',
                    'article_view'
                )
                ->count();

        $readsTotal=
            AnalyticsEvento::query()
                ->where(
                    'evento',
                    'article_read'
                )
                ->count();

        $viewsPeriod=
            AnalyticsEvento::query()
                ->where(
                    'evento',
                    'article_view'
                )
                ->where(
                    'ocorrido_em',
                    '>=',
                    $from
                )
                ->count();

        $readsPeriod=
            AnalyticsEvento::query()
                ->where(
                    'evento',
                    'article_read'
                )
                ->where(
                    'ocorrido_em',
                    '>=',
                    $from
                )
                ->count();

        $readRate=
            $viewsPeriod>0
                ? round(
                    min(
                        100,
                        ($readsPeriod/$viewsPeriod)*100
                    ),
                    1
                )
                : 0;

        $articlesWithViews=
            AnalyticsEvento::query()
                ->where(
                    'evento',
                    'article_view'
                )
                ->where(
                    'ocorrido_em',
                    '>=',
                    $from
                )
                ->whereNotNull(
                    'content_post_id'
                )
                ->distinct()
                ->count(
                    'content_post_id'
                );

        /*
         * Ranking dos conteúdos no período.
         */
        $ranking=
            AnalyticsEvento::query()
                ->select(
                    'content_post_id'
                )
                ->selectRaw("
                    SUM(
                        CASE
                            WHEN evento='article_view'
                            THEN 1
                            ELSE 0
                        END
                    ) AS views_count
                ")
                ->selectRaw("
                    SUM(
                        CASE
                            WHEN evento='article_read'
                            THEN 1
                            ELSE 0
                        END
                    ) AS reads_count
                ")
                ->selectRaw("
                    MAX(
                        CASE
                            WHEN evento='article_view'
                            THEN ocorrido_em
                            ELSE NULL
                        END
                    ) AS last_view_at
                ")
                ->whereIn(
                    'evento',
                    [
                        'article_view',
                        'article_read',
                    ]
                )
                ->whereNotNull(
                    'content_post_id'
                )
                ->where(
                    'ocorrido_em',
                    '>=',
                    $from
                )
                ->groupBy(
                    'content_post_id'
                )
                ->orderByDesc(
                    'views_count'
                )
                ->limit(
                    10
                )
                ->get();

        $postIds=
            $ranking
                ->pluck(
                    'content_post_id'
                )
                ->filter()
                ->values();

        $posts=
            ConteudoPost::query()
                ->whereIn(
                    'id',
                    $postIds
                )
                ->with([
                    'categorias:id,nome,slug',
                    'categoria:id,nome,slug',
                ])
                ->get()
                ->keyBy(
                    'id'
                );

        $topPosts=
            $ranking
                ->map(
                    function(
                        $row
                    ) use(
                        $posts
                    ){
                        $post=
                            $posts->get(
                                $row->content_post_id
                            );

                        if(!$post){
                            return null;
                        }

                        $views=
                            (int)$row->views_count;

                        $reads=
                            (int)$row->reads_count;

                        return [
                            'id'=>$post->id,

                            'titulo'=>
                                $post->titulo,

                            'slug'=>
                                $post->slug,

                            'status'=>
                                $post->status,

                            'views'=>
                                $views,

                            'reads'=>
                                $reads,

                            'read_rate'=>
                                $views>0
                                    ? round(
                                        min(
                                            100,
                                            ($reads/$views)*100
                                        ),
                                        1
                                    )
                                    : 0,

                            'last_view_at'=>
                                $row->last_view_at,

                            'categorias'=>
                                $post
                                    ->categorias
                                    ->map(
                                        fn($category)=>[
                                            'id'=>$category->id,
                                            'nome'=>$category->nome,
                                            'slug'=>$category->slug,
                                        ]
                                    )
                                    ->values(),
                        ];
                    }
                )
                ->filter()
                ->values();

        return response()->json([
            'data'=>[
                'periodo_dias'=>$days,

                'periodo_inicio'=>
                    $from->toISOString(),

                'metrics'=>[
                    'total'=>
                        ConteudoPost::query()
                            ->count(),

                    'publicados'=>
                        ConteudoPost::query()
                            ->where(
                                'status',
                                'publicado'
                            )
                            ->count(),

                    'rascunhos'=>
                        ConteudoPost::query()
                            ->where(
                                'status',
                                'rascunho'
                            )
                            ->count(),

                    'agendados'=>
                        ConteudoPost::query()
                            ->where(
                                'status',
                                'agendado'
                            )
                            ->count(),

                    'arquivados'=>
                        ConteudoPost::query()
                            ->where(
                                'status',
                                'arquivado'
                            )
                            ->count(),

                    'views_total'=>
                        $viewsTotal,

                    'reads_total'=>
                        $readsTotal,

                    'views_period'=>
                        $viewsPeriod,

                    'reads_period'=>
                        $readsPeriod,

                    'read_rate_period'=>
                        $readRate,

                    'articles_with_views_period'=>
                        $articlesWithViews,
                ],

                'top_posts'=>$topPosts,
            ],
        ]);
    }
}