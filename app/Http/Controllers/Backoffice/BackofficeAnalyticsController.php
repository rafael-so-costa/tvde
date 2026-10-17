<?php

namespace App\Http\Controllers\Backoffice;

use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BackofficeAnalyticsController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $validated=$request->validate([
            'days'=>['nullable','integer','min:1','max:365'],
            'from'=>['nullable','date_format:Y-m-d'],
            'to'=>['nullable','date_format:Y-m-d'],
            'device'=>['nullable','string','max:30'],
            'source'=>['nullable','string','max:255'],
            'medium'=>['nullable','string','max:255'],
        ]);

        [$from,$to]=$this->period($validated);

        if($from->greaterThan($to)){
            throw ValidationException::withMessages([
                'from'=>'A data inicial não pode ser posterior à data final.',
            ]);
        }

        $filters=[
            'device'=>$validated['device'] ?? null,
            'source'=>$validated['source'] ?? null,
            'medium'=>$validated['medium'] ?? null,
        ];

        $currentSessions=$this->sessionQuery(
            $from,
            $to,
            $filters
        );

        $metrics=$this->metrics(
            clone $currentSessions
        );

        $durationSeconds=
            max(
                1,
                $from->diffInSeconds($to)
            );

        $previousTo=
            $from->subSecond();

        $previousFrom=
            $previousTo->subSeconds(
                $durationSeconds
            );

        $previousMetrics=
            $this->metrics(
                $this->sessionQuery(
                    $previousFrom,
                    $previousTo,
                    $filters
                )
            );

        return response()->json([
            'data'=>[
                'period'=>[
                    'from'=>$from->toDateString(),
                    'to'=>$to->toDateString(),
                    'days'=>$from
                        ->startOfDay()
                        ->diffInDays(
                            $to->startOfDay()
                        )+1,
                ],

                'metrics'=>$metrics,

                'comparison'=>[
                    'previous'=>$previousMetrics,
                    'changes'=>[
                        'sessions'=>$this->percentageChange(
                            $metrics['sessions'],
                            $previousMetrics['sessions']
                        ),
                        'visitors'=>$this->percentageChange(
                            $metrics['visitors'],
                            $previousMetrics['visitors']
                        ),
                        'pageviews'=>$this->percentageChange(
                            $metrics['pageviews'],
                            $previousMetrics['pageviews']
                        ),
                        'pages_per_session'=>$this->percentageChange(
                            $metrics['pages_per_session'],
                            $previousMetrics['pages_per_session']
                        ),
                        'avg_active_seconds'=>$this->percentageChange(
                            $metrics['avg_active_seconds'],
                            $previousMetrics['avg_active_seconds']
                        ),
                        'engagement_rate'=>$this->percentageChange(
                            $metrics['engagement_rate'],
                            $previousMetrics['engagement_rate']
                        ),
                    ],
                ],

                'evolution'=>$this->evolution(
                    clone $currentSessions,
                    $from,
                    $to
                ),

                'acquisition'=>[
                    'sources'=>$this->sourceBreakdown(
                        clone $currentSessions
                    ),
                    'mediums'=>$this->mediumBreakdown(
                        clone $currentSessions
                    ),
                    'campaigns'=>$this->campaignBreakdown(
                        clone $currentSessions
                    ),
                    'referrers'=>$this->referrerBreakdown(
                        clone $currentSessions
                    ),
                ],

                'audience'=>[
                    'devices'=>$this->deviceBreakdown(
                        clone $currentSessions
                    ),
                    'browsers'=>$this->simpleBreakdown(
                        clone $currentSessions,
                        'browser'
                    ),
                    'operating_systems'=>$this->simpleBreakdown(
                        clone $currentSessions,
                        'os'
                    ),
                ],

                'pages'=>$this->topPages(
                    $from,
                    $to,
                    $filters
                ),

                'content'=>$this->topContent(
                    $from,
                    $to,
                    $filters
                ),

                'events'=>$this->events(
                    $from,
                    $to,
                    $filters
                ),

                'filters'=>$this->filterOptions(),

                'generated_at'=>now()->toIso8601String(),
            ],
        ]);
    }

    private function period(array $validated): array
    {
        $timezone=
            config(
                'app.timezone',
                'Europe/Lisbon'
            );

        if(
            !empty($validated['from']) ||
            !empty($validated['to'])
        ){
            $to=
                !empty($validated['to'])
                    ? CarbonImmutable::parse(
                        $validated['to'],
                        $timezone
                    )->endOfDay()
                    : CarbonImmutable::now(
                        $timezone
                    )->endOfDay();

            $from=
                !empty($validated['from'])
                    ? CarbonImmutable::parse(
                        $validated['from'],
                        $timezone
                    )->startOfDay()
                    : $to
                        ->startOfDay()
                        ->subDays(
                            ((int)($validated['days'] ?? 30))-1
                        );

            return [$from,$to];
        }

        $days=
            (int)($validated['days'] ?? 30);

        $to=
            CarbonImmutable::now(
                $timezone
            )->endOfDay();

        $from=
            $to
                ->startOfDay()
                ->subDays(
                    $days-1
                );

        return [$from,$to];
    }

    private function sessionQuery(
        CarbonImmutable $from,
        CarbonImmutable $to,
        array $filters
    ): Builder {
        $query=
            DB::table(
                'analytics_sessoes'
            )
                ->whereBetween(
                    'started_at',
                    [
                        $from,
                        $to,
                    ]
                );

        $this->applySessionFilters(
            $query,
            $filters
        );

        return $query;
    }

    private function applySessionFilters(
        Builder $query,
        array $filters,
        ?string $alias=null
    ): void {
        $prefix=
            $alias
                ? $alias.'.'
                : '';

        if(!empty($filters['device'])){
            $query->where(
                $prefix.'device_type',
                $filters['device']
            );
        }

        if(!empty($filters['source'])){
            $column=
                $prefix.'utm_source';

            if($filters['source']==='__direct__'){
                $query->where(
                    function(Builder $query) use($column){
                        $query
                            ->whereNull($column)
                            ->orWhere(
                                $column,
                                ''
                            );
                    }
                );
            }
            else{
                $query->where(
                    $column,
                    $filters['source']
                );
            }
        }

        if(!empty($filters['medium'])){
            $column=
                $prefix.'utm_medium';

            if($filters['medium']==='__none__'){
                $query->where(
                    function(Builder $query) use($column){
                        $query
                            ->whereNull($column)
                            ->orWhere(
                                $column,
                                ''
                            );
                    }
                );
            }
            else{
                $query->where(
                    $column,
                    $filters['medium']
                );
            }
        }
    }

    private function metrics(
        Builder $query
    ): array {
        $sessions=
            (int)(
                (clone $query)
                    ->count()
            );

        $visitors=
            (int)(
                (clone $query)
                    ->whereNotNull(
                        'visitor_id'
                    )
                    ->distinct()
                    ->count(
                        'visitor_id'
                    )
            );

        $pageviews=
            (int)(
                (clone $query)
                    ->sum(
                        'pageviews'
                    )
            );

        $avgActiveSeconds=
            round(
                (float)(
                    (clone $query)
                        ->avg(
                            'active_seconds'
                        ) ?? 0
                ),
                1
            );

        $engagedSessions=
            (int)(
                (clone $query)
                    ->where(
                        function(Builder $query){
                            $query
                                ->where(
                                    'pageviews',
                                    '>=',
                                    2
                                )
                                ->orWhere(
                                    'active_seconds',
                                    '>=',
                                    30
                                );
                        }
                    )
                    ->count()
            );

        return [
            'sessions'=>$sessions,
            'visitors'=>$visitors,
            'pageviews'=>$pageviews,
            'pages_per_session'=>
                $sessions>0
                    ? round(
                        $pageviews/$sessions,
                        2
                    )
                    : 0,
            'avg_active_seconds'=>$avgActiveSeconds,
            'engaged_sessions'=>$engagedSessions,
            'engagement_rate'=>
                $sessions>0
                    ? round(
                        ($engagedSessions/$sessions)*100,
                        1
                    )
                    : 0,
        ];
    }

    private function percentageChange(
        float|int $current,
        float|int $previous
    ): ?float {
        if((float)$previous===0.0){
            return (float)$current===0.0
                ? 0
                : null;
        }

        return round(
            (
                (
                    (float)$current-
                    (float)$previous
                )/
                abs(
                    (float)$previous
                )
            )*100,
            1
        );
    }

    private function evolution(
        Builder $query,
        CarbonImmutable $from,
        CarbonImmutable $to
    ): array {
        $rows=
            $query
                ->selectRaw(
                    '
                    DATE(started_at) as date,
                    COUNT(*) as sessions,
                    COUNT(DISTINCT visitor_id) as visitors,
                    COALESCE(SUM(pageviews),0) as pageviews,
                    COALESCE(AVG(active_seconds),0) as avg_active_seconds
                    '
                )
                ->groupByRaw(
                    'DATE(started_at)'
                )
                ->orderBy(
                    'date'
                )
                ->get()
                ->keyBy(
                    'date'
                );

        $result=[];

        $day=
            $from->startOfDay();

        $end=
            $to->startOfDay();

        while($day->lessThanOrEqualTo($end)){
            $key=
                $day->toDateString();

            $row=
                $rows->get(
                    $key
                );

            $result[]=[
                'date'=>$key,
                'sessions'=>
                    (int)($row->sessions ?? 0),
                'visitors'=>
                    (int)($row->visitors ?? 0),
                'pageviews'=>
                    (int)($row->pageviews ?? 0),
                'avg_active_seconds'=>
                    round(
                        (float)(
                            $row->avg_active_seconds ?? 0
                        ),
                        1
                    ),
            ];

            $day=
                $day->addDay();
        }

        return $result;
    }

    private function sourceBreakdown(
        Builder $query
    ): array {
        return $query
            ->selectRaw(
                "
                COALESCE(
                    NULLIF(utm_source,''),
                    '__direct__'
                ) as value,
                COUNT(*) as sessions,
                COUNT(DISTINCT visitor_id) as visitors,
                COALESCE(SUM(pageviews),0) as pageviews
                "
            )
            ->groupBy('utm_source')
            ->orderByDesc(
                'sessions'
            )
            ->limit(15)
            ->get()
            ->map(
                fn($row)=>[
                    'value'=>(string)$row->value,
                    'label'=>
                        $row->value==='__direct__'
                            ? 'Direto / sem UTM'
                            : (string)$row->value,
                    'sessions'=>(int)$row->sessions,
                    'visitors'=>(int)$row->visitors,
                    'pageviews'=>(int)$row->pageviews,
                ]
            )
            ->values()
            ->all();
    }

    private function mediumBreakdown(
        Builder $query
    ): array {
        return $query
            ->selectRaw(
                "
                COALESCE(
                    NULLIF(utm_medium,''),
                    '__none__'
                ) as value,
                COUNT(*) as sessions,
                COUNT(DISTINCT visitor_id) as visitors,
                COALESCE(SUM(pageviews),0) as pageviews
                "
            )
            ->groupBy('utm_medium')
            ->orderByDesc(
                'sessions'
            )
            ->limit(15)
            ->get()
            ->map(
                fn($row)=>[
                    'value'=>(string)$row->value,
                    'label'=>
                        $row->value==='__none__'
                            ? 'Sem medium'
                            : (string)$row->value,
                    'sessions'=>(int)$row->sessions,
                    'visitors'=>(int)$row->visitors,
                    'pageviews'=>(int)$row->pageviews,
                ]
            )
            ->values()
            ->all();
    }

    private function campaignBreakdown(
        Builder $query
    ): array {
        return $query
            ->whereNotNull(
                'utm_campaign'
            )
            ->where(
                'utm_campaign',
                '<>',
                ''
            )
            ->selectRaw(
                '
                utm_campaign as value,
                COUNT(*) as sessions,
                COUNT(DISTINCT visitor_id) as visitors,
                COALESCE(SUM(pageviews),0) as pageviews
                '
            )
            ->groupBy(
                'utm_campaign'
            )
            ->orderByDesc(
                'sessions'
            )
            ->limit(15)
            ->get()
            ->map(
                fn($row)=>[
                    'value'=>(string)$row->value,
                    'label'=>(string)$row->value,
                    'sessions'=>(int)$row->sessions,
                    'visitors'=>(int)$row->visitors,
                    'pageviews'=>(int)$row->pageviews,
                ]
            )
            ->values()
            ->all();
    }

    private function referrerBreakdown(
        Builder $query
    ): array {
        return $query
            ->whereNotNull(
                'referrer'
            )
            ->where(
                'referrer',
                '<>',
                ''
            )
            ->selectRaw(
                '
                referrer as value,
                COUNT(*) as sessions,
                COUNT(DISTINCT visitor_id) as visitors
                '
            )
            ->groupBy(
                'referrer'
            )
            ->orderByDesc(
                'sessions'
            )
            ->limit(10)
            ->get()
            ->map(
                fn($row)=>[
                    'value'=>(string)$row->value,
                    'label'=>$this->host(
                        (string)$row->value
                    ),
                    'sessions'=>(int)$row->sessions,
                    'visitors'=>(int)$row->visitors,
                ]
            )
            ->values()
            ->all();
    }

    private function deviceBreakdown(
        Builder $query
    ): array {
        return $query
            ->selectRaw(
                "
                COALESCE(
                    NULLIF(device_type,''),
                    'unknown'
                ) as value,
                COUNT(*) as sessions,
                COUNT(DISTINCT visitor_id) as visitors,
                COALESCE(SUM(pageviews),0) as pageviews
                "
            )
            ->groupBy('device_type')
            ->orderByDesc(
                'sessions'
            )
            ->get()
            ->map(
                fn($row)=>[
                    'value'=>(string)$row->value,
                    'label'=>$this->deviceLabel(
                        (string)$row->value
                    ),
                    'sessions'=>(int)$row->sessions,
                    'visitors'=>(int)$row->visitors,
                    'pageviews'=>(int)$row->pageviews,
                ]
            )
            ->values()
            ->all();
    }

    private function simpleBreakdown(
        Builder $query,
        string $column
    ): array {
        $allowed=[
            'browser',
            'os',
        ];

        if(!in_array(
            $column,
            $allowed,
            true
        )){
            return [];
        }

        return $query
            ->selectRaw(
                "
                COALESCE(
                    NULLIF({$column},''),
                    'Desconhecido'
                ) as value,
                COUNT(*) as sessions
                "
            )
            ->groupBy($column)
            ->orderByDesc(
                'sessions'
            )
            ->limit(10)
            ->get()
            ->map(
                fn($row)=>[
                    'value'=>(string)$row->value,
                    'label'=>(string)$row->value,
                    'sessions'=>(int)$row->sessions,
                ]
            )
            ->values()
            ->all();
    }

    private function eventQuery(
        CarbonImmutable $from,
        CarbonImmutable $to,
        array $filters
    ): Builder {
        $query=
            DB::table(
                'analytics_eventos as e'
            )
                ->join(
                    'analytics_sessoes as s',
                    's.id',
                    '=',
                    'e.session_id'
                )
                ->whereBetween(
                    'e.ocorrido_em',
                    [
                        $from,
                        $to,
                    ]
                );

        $this->applySessionFilters(
            $query,
            $filters,
            's'
        );

        return $query;
    }

    private function topPages(
        CarbonImmutable $from,
        CarbonImmutable $to,
        array $filters
    ): array {
        return $this
            ->eventQuery(
                $from,
                $to,
                $filters
            )
            ->whereNotNull(
                'e.page_url'
            )
            ->where(
                'e.page_url',
                '<>',
                ''
            )
            ->whereIn(
                'e.evento',
                [
                    'page_view',
                    'page_exit',
                ]
            )
            ->selectRaw(
                "
                e.page_url,
                SUM(
                    CASE
                        WHEN e.evento='page_view'
                        THEN 1
                        ELSE 0
                    END
                ) as views,
                COUNT(
                    DISTINCT CASE
                        WHEN e.evento='page_view'
                        THEN e.session_id
                    END
                ) as sessions,
                COALESCE(
                    AVG(
                        CASE
                            WHEN e.evento='page_exit'
                            THEN e.active_seconds
                        END
                    ),
                    0
                ) as avg_active_seconds,
                COALESCE(
                    AVG(
                        CASE
                            WHEN e.evento='page_exit'
                            THEN e.scroll_percent
                        END
                    ),
                    0
                ) as avg_scroll_percent
                "
            )
            ->groupBy(
                'e.page_url'
            )
            ->havingRaw(
                'views > 0'
            )
            ->orderByDesc(
                'views'
            )
            ->limit(20)
            ->get()
            ->map(
                fn($row)=>[
                    'url'=>(string)$row->page_url,
                    'path'=>$this->path(
                        (string)$row->page_url
                    ),
                    'views'=>(int)$row->views,
                    'sessions'=>(int)$row->sessions,
                    'avg_active_seconds'=>round(
                        (float)$row->avg_active_seconds,
                        1
                    ),
                    'avg_scroll_percent'=>round(
                        (float)$row->avg_scroll_percent,
                        1
                    ),
                ]
            )
            ->values()
            ->all();
    }

    private function topContent(
        CarbonImmutable $from,
        CarbonImmutable $to,
        array $filters
    ): array {
        return $this
            ->eventQuery(
                $from,
                $to,
                $filters
            )
            ->join(
                'conteudo_posts as p',
                'p.id',
                '=',
                'e.content_post_id'
            )
            ->whereNotNull(
                'e.content_post_id'
            )
            ->whereIn(
                'e.evento',
                [
                    'page_view',
                    'article_view',
                    'article_read',
                    'page_exit',
                ]
            )
            ->selectRaw(
                "
                p.id,
                p.titulo,
                p.slug,
                SUM(
                    CASE
                        WHEN e.evento IN(
                            'page_view',
                            'article_view'
                        )
                        THEN 1
                        ELSE 0
                    END
                ) as views,
                SUM(
                    CASE
                        WHEN e.evento='article_read'
                        THEN 1
                        ELSE 0
                    END
                ) as article_reads,
                COALESCE(
                    AVG(
                        CASE
                            WHEN e.evento='page_exit'
                            THEN e.active_seconds
                        END
                    ),
                    0
                ) as avg_active_seconds
                "
            )
            ->groupBy(
                'p.id',
                'p.titulo',
                'p.slug'
            )
            ->orderByDesc(
                'views'
            )
            ->limit(15)
            ->get()
            ->map(
                function($row){
                    $views=
                        (int)$row->views;

                    $reads=(int)$row->article_reads;

                    return [
                        'id'=>(string)$row->id,
                        'title'=>(string)$row->titulo,
                        'slug'=>(string)$row->slug,
                        'views'=>$views,
                        'reads'=>$reads,
                        'read_rate'=>
                            $views>0
                                ? round(
                                    ($reads/$views)*100,
                                    1
                                )
                                : 0,
                        'avg_active_seconds'=>round(
                            (float)$row->avg_active_seconds,
                            1
                        ),
                    ];
                }
            )
            ->values()
            ->all();
    }

    private function events(
        CarbonImmutable $from,
        CarbonImmutable $to,
        array $filters
    ): array {
        return $this
            ->eventQuery(
                $from,
                $to,
                $filters
            )
            ->selectRaw(
                '
                e.evento,
                COUNT(*) as total,
                COUNT(DISTINCT e.session_id) as sessions,
                COALESCE(AVG(e.active_seconds),0) as avg_active_seconds,
                COALESCE(AVG(e.scroll_percent),0) as avg_scroll_percent
                '
            )
            ->groupBy(
                'e.evento'
            )
            ->orderByDesc(
                'total'
            )
            ->get()
            ->map(
                fn($row)=>[
                    'event'=>(string)$row->evento,
                    'total'=>(int)$row->total,
                    'sessions'=>(int)$row->sessions,
                    'avg_active_seconds'=>round(
                        (float)$row->avg_active_seconds,
                        1
                    ),
                    'avg_scroll_percent'=>round(
                        (float)$row->avg_scroll_percent,
                        1
                    ),
                ]
            )
            ->values()
            ->all();
    }

    private function filterOptions(): array
    {
        $devices=
            DB::table(
                'analytics_sessoes'
            )
                ->whereNotNull(
                    'device_type'
                )
                ->where(
                    'device_type',
                    '<>',
                    ''
                )
                ->distinct()
                ->orderBy(
                    'device_type'
                )
                ->pluck(
                    'device_type'
                )
                ->map(
                    fn($value)=>[
                        'value'=>(string)$value,
                        'label'=>$this->deviceLabel(
                            (string)$value
                        ),
                    ]
                )
                ->values()
                ->all();

        $sourceRows=
            DB::table(
                'analytics_sessoes'
            )
                ->selectRaw(
                    "
                    COALESCE(
                        NULLIF(utm_source,''),
                        '__direct__'
                    ) as value
                    "
                )
                ->distinct()
                ->orderBy(
                    'value'
                )
                ->pluck(
                    'value'
                );

        $sources=
            $sourceRows
                ->map(
                    fn($value)=>[
                        'value'=>(string)$value,
                        'label'=>
                            $value==='__direct__'
                                ? 'Direto / sem UTM'
                                : (string)$value,
                    ]
                )
                ->values()
                ->all();

        $mediumRows=
            DB::table(
                'analytics_sessoes'
            )
                ->selectRaw(
                    "
                    COALESCE(
                        NULLIF(utm_medium,''),
                        '__none__'
                    ) as value
                    "
                )
                ->distinct()
                ->orderBy(
                    'value'
                )
                ->pluck(
                    'value'
                );

        $mediums=
            $mediumRows
                ->map(
                    fn($value)=>[
                        'value'=>(string)$value,
                        'label'=>
                            $value==='__none__'
                                ? 'Sem medium'
                                : (string)$value,
                    ]
                )
                ->values()
                ->all();

        return [
            'devices'=>$devices,
            'sources'=>$sources,
            'mediums'=>$mediums,
        ];
    }

    private function deviceLabel(
        string $value
    ): string {
        return match($value){
            'desktop'=>'Desktop',
            'mobile'=>'Telemóvel',
            'tablet'=>'Tablet',
            'unknown'=>'Desconhecido',
            default=>ucfirst($value),
        };
    }

    private function host(
        string $url
    ): string {
        return parse_url(
            $url,
            PHP_URL_HOST
        ) ?: $url;
    }

    private function path(
        string $url
    ): string {
        $path=
            parse_url(
                $url,
                PHP_URL_PATH
            );

        return is_string($path) &&
            $path!==''
                ? $path
                : '/';
    }
}