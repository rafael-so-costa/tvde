<?php

namespace App\Http\Controllers\Backoffice;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsEvento;
use App\Models\AnalyticsSessao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class BackofficeAnalyticsController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $validated=$request->validate([
            'data_inicio'=>['nullable','date'],
            'data_fim'=>[
                'nullable',
                'date',
                'after_or_equal:data_inicio',
            ],
        ]);

        $from=isset($validated['data_inicio'])
            ?Carbon::parse($validated['data_inicio'])->startOfDay()
            :now()->subDays(29)->startOfDay();

        $to=isset($validated['data_fim'])
            ?Carbon::parse($validated['data_fim'])->endOfDay()
            :now()->endOfDay();

        $sessions=AnalyticsSessao::query()
            ->whereBetween('started_at',[$from,$to]);

        $events=AnalyticsEvento::query()
            ->whereBetween('ocorrido_em',[$from,$to]);

        $sources=AnalyticsSessao::query()
            ->selectRaw(
                "COALESCE(NULLIF(utm_source,''),'direto') as origem,COUNT(*) total"
            )
            ->whereBetween('started_at',[$from,$to])
            ->groupBy('origem')
            ->orderByDesc('total')
            ->limit(20)
            ->get();

        $pages=AnalyticsEvento::query()
            ->select(
                'page_url',
                DB::raw('COUNT(*) total')
            )
            ->where('evento','page_view')
            ->whereBetween('ocorrido_em',[$from,$to])
            ->whereNotNull('page_url')
            ->groupBy('page_url')
            ->orderByDesc('total')
            ->limit(20)
            ->get();

        $content=AnalyticsEvento::query()
            ->select(
                'content_post_id',
                DB::raw('COUNT(*) total')
            )
            ->with('post:id,titulo,slug,tipo')
            ->where('evento','article_view')
            ->whereBetween('ocorrido_em',[$from,$to])
            ->whereNotNull('content_post_id')
            ->groupBy('content_post_id')
            ->orderByDesc('total')
            ->limit(20)
            ->get();

        return response()->json([
            'periodo'=>[
                'inicio'=>$from,
                'fim'=>$to,
            ],

            'resumo'=>[
                'sessoes'=>(clone $sessions)->count(),

                'visitantes'=>
                    (clone $sessions)
                        ->distinct()
                        ->count('visitor_id'),

                'pageviews'=>
                    (clone $events)
                        ->where('evento','page_view')
                        ->count(),

                'leituras'=>
                    (clone $events)
                        ->where('evento','article_read')
                        ->count(),

                'tempo_ativo_medio'=>
                    (int)(
                        (clone $sessions)
                            ->avg('active_seconds')??
                        0
                    ),
            ],

            'origens'=>$sources,
            'paginas'=>$pages,
            'conteudos'=>$content,
        ]);
    }
}
