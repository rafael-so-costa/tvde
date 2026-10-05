<?php

namespace App\Http\Controllers\Ads;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ads\TrackAdViewRequest;
use App\Services\Ads\AdTrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

class AdTrackingController extends Controller
{
    public function __construct(
        private readonly AdTrackingService $tracking
    ) {}

    public function view(
        TrackAdViewRequest $request
    ): JsonResponse {
        $tracked = $this
            ->tracking
            ->recordViewable(
                $request->validated(
                    'delivery_token'
                )
            );

        if (! $tracked) {
            return response()->json([
                'message' => 'A entrega publicitária não foi encontrada.',
            ], 404);
        }

        return response()->json([
            'data' => [
                'tracked' => true,
            ],
        ]);
    }

    public function click(
        string $token
    ): RedirectResponse {
        $destination = $this
            ->tracking
            ->recordClicked(
                $token
            );

        abort_if(
            ! $destination,
            404
        );

        return redirect()
            ->away(
                $destination
            );
    }
}
