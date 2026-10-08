<?php

namespace App\Services;

use App\Models\AnalyticsEvento;
use App\Models\AnalyticsSessao;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AnalyticsService
{
    public const VISITOR_COOKIE='fp_analytics_visitor';
    public const SESSION_COOKIE='fp_analytics_session';

    public function track(
        Request $request,
        array $data
    ): array {
        return DB::transaction(function() use($request,$data){
            $visitorId=(string)$request->cookie(self::VISITOR_COOKIE);
            $newVisitor=!Str::isUuid($visitorId);

            if($newVisitor){
                $visitorId=(string)Str::uuid();
            }

            $sessionId=(string)$request->cookie(self::SESSION_COOKIE);

            $session=Str::isUuid($sessionId)
                ?AnalyticsSessao::query()->find($sessionId)
                :null;

            $newSession=
                !$session ||
                $session->visitor_id!==$visitorId ||
                $session->last_seen_at?->lt(now()->subMinutes(30));

            if($newSession){
                $session=$this->createSession(
                    $request,
                    $visitorId,
                    $data
                );
            }

            $evento=new AnalyticsEvento([
                'evento'=>$data['evento'],
                'page_url'=>$data['page_url']??$request->headers->get('referer'),
                'route_name'=>$data['route_name']??null,
                'content_post_id'=>$data['content_post_id']??null,
                'entity_type'=>$data['entity_type']??null,
                'entity_id'=>$data['entity_id']??null,
                'active_seconds'=>$data['active_seconds']??null,
                'scroll_percent'=>$data['scroll_percent']??null,
                'metadados'=>$data['metadados']??null,
                'ocorrido_em'=>now(),
            ]);

            $evento->session_id=$session->id;
            $evento->save();

            $session->last_seen_at=now();

            if($data['evento']==='page_view'){
                $session->pageviews++;
            }

            if(isset($data['active_seconds'])){
                $session->active_seconds=max(
                    $session->active_seconds,
                    (int)$data['active_seconds']
                );
            }

            if(isset($data['screen_width'])){
                $session->screen_width=(int)$data['screen_width'];
            }

            if(isset($data['screen_height'])){
                $session->screen_height=(int)$data['screen_height'];
            }

            if(isset($data['language'])){
                $session->language=$data['language'];
            }

            $session->save();

            return [
                'session'=>$session,
                'visitor_id'=>$visitorId,
                'new_visitor'=>$newVisitor,
                'new_session'=>$newSession,
            ];
        });
    }

    private function createSession(
        Request $request,
        string $visitorId,
        array $data
    ): AnalyticsSessao {
        [$browser,$os,$device]=$this->userAgent(
            (string)$request->userAgent()
        );

        $session=new AnalyticsSessao([
            'visitor_id'=>$visitorId,
            'user_id'=>$request->user()?->id,
            'ip_hash'=>$request->ip()
                ?hash_hmac('sha256',$request->ip(),(string)config('app.key'))
                :null,
            'landing_url'=>$data['page_url']??$request->headers->get('referer'),
            'referrer'=>$request->headers->get('referer'),
            'utm_source'=>$request->query('utm_source'),
            'utm_medium'=>$request->query('utm_medium'),
            'utm_campaign'=>$request->query('utm_campaign'),
            'utm_content'=>$request->query('utm_content'),
            'utm_term'=>$request->query('utm_term'),
            'browser'=>$browser,
            'os'=>$os,
            'device_type'=>$device,
            'language'=>$data['language']??null,
            'screen_width'=>$data['screen_width']??null,
            'screen_height'=>$data['screen_height']??null,
            'started_at'=>now(),
            'last_seen_at'=>now(),
        ]);

        $session->save();

        return $session;
    }

    private function userAgent(string $ua): array
    {
        $browser=match(true){
            str_contains($ua,'Edg/')=>'Edge',
            str_contains($ua,'Chrome/')=>'Chrome',
            str_contains($ua,'Firefox/')=>'Firefox',
            str_contains($ua,'Safari/')=>'Safari',
            default=>'Outro',
        };

        $os=match(true){
            str_contains($ua,'Windows')=>'Windows',
            str_contains($ua,'Android')=>'Android',
            str_contains($ua,'iPhone'),
            str_contains($ua,'iPad')=>'iOS',
            str_contains($ua,'Mac OS')=>'macOS',
            str_contains($ua,'Linux')=>'Linux',
            default=>'Outro',
        };

        $device=match(true){
            str_contains($ua,'iPad')=>'tablet',
            str_contains($ua,'Mobile'),
            str_contains($ua,'Android')=>'mobile',
            default=>'desktop',
        };

        return [$browser,$os,$device];
    }
}
