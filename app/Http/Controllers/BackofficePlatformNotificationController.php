<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePlatformNotificationRequest;
use App\Http\Requests\UpdatePlatformNotificationRequest;
use App\Services\NotificationCenterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BackofficePlatformNotificationController extends Controller
{
    public function __construct(
        private NotificationCenterService $service
    ){}

    public function index(
        Request $request
    ): JsonResponse {
        $validated=
            $request->validate([
                'search'=>[
                    'nullable',
                    'string',
                    'max:150',
                ],

                'type'=>[
                    'nullable',
                    Rule::in([
                        'news',
                        'platform_status',
                        'maintenance',
                        'system',
                        'account',
                    ]),
                ],

                'target_scope'=>[
                    'nullable',
                    Rule::in([
                        'all',
                        'selected',
                    ]),
                ],

                'status'=>[
                    'nullable',
                    Rule::in([
                        'draft',
                        'scheduled',
                        'published',
                        'resolved',
                        'expired',
                    ]),
                ],

                'page'=>[
                    'nullable',
                    'integer',
                    'min:1',
                ],

                'per_page'=>[
                    'nullable',
                    'integer',
                    Rule::in([
                        10,
                        25,
                        50,
                        100,
                    ]),
                ],
            ]);

        return response()->json(
            $this->service->index(
                $validated
            )
        );
    }

    public function meta(): JsonResponse
    {
        return response()->json([
            'data'=>
                $this->service->meta(),
        ]);
    }

    public function summary(): JsonResponse
    {
        return response()->json([
            'data'=>
                $this->service->summary(),
        ]);
    }

    public function store(
        StorePlatformNotificationRequest $request
    ): JsonResponse {
        return response()->json([
            'message'=>
                'Comunicação criada.',
            'data'=>
                $this->service->store(
                    $request->user(),
                    $request->validated()
                ),
        ],201);
    }

    public function show(
        string $id
    ): JsonResponse {
        return response()->json([
            'data'=>
                $this->service->show(
                    $id
                ),
        ]);
    }

    public function update(
        UpdatePlatformNotificationRequest $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'message'=>
                'Comunicação atualizada.',
            'data'=>
                $this->service->update(
                    $request->user(),
                    $id,
                    $request->validated()
                ),
        ]);
    }

    public function resolve(
        Request $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'message'=>
                'Comunicação resolvida.',
            'data'=>
                $this->service->resolve(
                    $request->user(),
                    $id
                ),
        ]);
    }

    public function destroy(
        string $id
    ): JsonResponse {
        $this->service->destroy(
            $id
        );

        return response()->json([
            'message'=>
                'Comunicação eliminada.',
        ]);
    }
}
