<?php

namespace App\Http\Controllers;

use App\Http\Requests\TrackAnalyticsEventRequest;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;

class PublicAnalyticsController extends Controller
{
    public function store(
        TrackAnalyticsEventRequest $request,
        AnalyticsService $service
    ): JsonResponse {
        $result=$service->track(
            $request,
            $request->validated()
        );

        $response=response()->json([
            'ok'=>true,
            'session_id'=>$result['session']->id,
        ],202);

        if($result['new_visitor']){
            $response->withCookie(cookie(
                AnalyticsService::VISITOR_COOKIE,
                $result['visitor_id'],
                525600,
                '/',
                null,
                $request->isSecure(),
                true,
                false,
                'lax'
            ));
        }

        $response->withCookie(cookie(
            AnalyticsService::SESSION_COOKIE,
            $result['session']->id,
            30,
            '/',
            null,
            $request->isSecure(),
            true,
            false,
            'lax'
        ));

        return $response;
    }
}
