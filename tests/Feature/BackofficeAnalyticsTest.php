<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class BackofficeAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_returns_metrics_filters_and_breakdowns(): void
    {
        $this->withoutMiddleware();

        $now=Carbon::now();

        $sessionOne=(string)Str::uuid();
        $sessionTwo=(string)Str::uuid();

        DB::table('analytics_sessoes')->insert([
            [
                'id'=>$sessionOne,
                'visitor_id'=>'visitor-one',
                'utm_source'=>'google',
                'utm_medium'=>'organic',
                'device_type'=>'desktop',
                'browser'=>'Chrome',
                'os'=>'Windows',
                'pageviews'=>3,
                'active_seconds'=>120,
                'started_at'=>$now->copy()->subDay(),
                'last_seen_at'=>$now->copy()->subDay()->addMinutes(3),
                'created_at'=>$now,
                'updated_at'=>$now,
            ],
            [
                'id'=>$sessionTwo,
                'visitor_id'=>'visitor-two',
                'utm_source'=>null,
                'utm_medium'=>null,
                'device_type'=>'mobile',
                'browser'=>'Safari',
                'os'=>'iOS',
                'pageviews'=>1,
                'active_seconds'=>10,
                'started_at'=>$now->copy()->subHours(2),
                'last_seen_at'=>$now->copy()->subHours(2)->addMinute(),
                'created_at'=>$now,
                'updated_at'=>$now,
            ],
        ]);

        DB::table('analytics_eventos')->insert([
            [
                'id'=>(string)Str::uuid(),
                'session_id'=>$sessionOne,
                'evento'=>'page_view',
                'page_url'=>'https://example.test/blog',
                'active_seconds'=>null,
                'scroll_percent'=>null,
                'ocorrido_em'=>$now->copy()->subDay(),
                'created_at'=>$now,
                'updated_at'=>$now,
            ],
            [
                'id'=>(string)Str::uuid(),
                'session_id'=>$sessionOne,
                'evento'=>'page_exit',
                'page_url'=>'https://example.test/blog',
                'active_seconds'=>120,
                'scroll_percent'=>90,
                'ocorrido_em'=>$now->copy()->subDay()->addMinutes(2),
                'created_at'=>$now,
                'updated_at'=>$now,
            ],
            [
                'id'=>(string)Str::uuid(),
                'session_id'=>$sessionTwo,
                'evento'=>'page_view',
                'page_url'=>'https://example.test/',
                'active_seconds'=>null,
                'scroll_percent'=>null,
                'ocorrido_em'=>$now->copy()->subHours(2),
                'created_at'=>$now,
                'updated_at'=>$now,
            ],
        ]);

        $response=
            $this->getJson(
                '/api/backoffice/analytics?days=30'
            );

        $response
            ->assertOk()
            ->assertJsonPath(
                'data.metrics.sessions',
                2
            )
            ->assertJsonPath(
                'data.metrics.visitors',
                2
            )
            ->assertJsonPath(
                'data.metrics.pageviews',
                4
            )
            ->assertJsonPath(
                'data.metrics.engaged_sessions',
                1
            )
            ->assertJsonCount(
                2,
                'data.pages'
            )
            ->assertJsonFragment([
                'value'=>'google',
                'label'=>'google',
            ])
            ->assertJsonFragment([
                'value'=>'desktop',
                'label'=>'Desktop',
            ])
            ->assertJsonFragment([
                'event'=>'page_view',
                'total'=>2,
            ]);
    }

    public function test_dashboard_can_filter_by_device_and_source(): void
    {
        $this->withoutMiddleware();

        $now=Carbon::now();
        $session=(string)Str::uuid();

        DB::table('analytics_sessoes')->insert([
            'id'=>$session,
            'visitor_id'=>'visitor-filter',
            'utm_source'=>'newsletter',
            'utm_medium'=>'email',
            'device_type'=>'mobile',
            'pageviews'=>5,
            'active_seconds'=>180,
            'started_at'=>$now,
            'last_seen_at'=>$now,
            'created_at'=>$now,
            'updated_at'=>$now,
        ]);

        $response=
            $this->getJson(
                '/api/backoffice/analytics?'.
                http_build_query([
                    'days'=>30,
                    'device'=>'mobile',
                    'source'=>'newsletter',
                    'medium'=>'email',
                ])
            );

        $response
            ->assertOk()
            ->assertJsonPath(
                'data.metrics.sessions',
                1
            )
            ->assertJsonPath(
                'data.metrics.pageviews',
                5
            );
    }
}