<?php

namespace App\Http\Controllers\Ads;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ads\ServeAdRequest;
use App\Services\Ads\AdDeliveryService;
use App\Services\Ads\AdTrackingService;
use App\Services\PortalIdentityService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdDeliveryController extends Controller
{
    private const VISITOR_COOKIE =
        'fp_ads_visitor';

    public function __construct(
        private readonly AdDeliveryService $delivery,
        private readonly AdTrackingService $tracking,
        private readonly TenantContext $tenantContext,
        private readonly PortalIdentityService $identityService
    ) {}

    public function servePublic(
        Request $request
    ): JsonResponse {
        $visitorId = trim(
            (string) $request->cookie(
                self::VISITOR_COOKIE
            )
        );

        $newVisitor =
            ! Str::isUuid(
                $visitorId
            );

        if ($newVisitor) {
            $visitorId =
                (string) Str::uuid();
        }

        $data =
            $this
                ->delivery
                ->serve(
                    surface: AdDeliveryService::SURFACE_PUBLIC,

                    tenantId: null,

                    viewerKey: $this
                        ->tracking
                        ->anonymousViewerKey(
                            $visitorId
                        ),

                    userId: null
                );

        $response =
            response()->json([
                'data' => $data,
            ]);

        if ($newVisitor) {
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

    public function serveAuthenticated(
        ServeAdRequest $request
    ): JsonResponse {
        $validated =
            $request->validated();

        $surface =
            $validated[
                'surface'
            ];

        $tenantId =
            $this
                ->tenantContext
                ->id();

        if (! $tenantId) {
            return response()->json([
                'message' => 'Selecione uma organização antes de solicitar publicidade desta área.',
            ], 409);
        }

        $user =
            $request->user();

        $identity =
            $this
                ->identityService
                ->resolve(
                    $user,
                    $tenantId
                );

        if (
            ! $this->surfaceAllowed(
                $surface,
                $identity
            )
        ) {
            return response()->json([
                'message' => 'Não tem acesso a esta área de publicidade.',
            ], 403);
        }

        return response()->json([
            'data' => $this
                ->delivery
                ->serve(
                    surface: $surface,

                    tenantId: $tenantId,

                    viewerKey: $this
                        ->tracking
                        ->userViewerKey(
                            $user->id
                        ),

                    userId: $user->id
                ),
        ]);
    }

    private function surfaceAllowed(
        string $surface,
        array $identity
    ): bool {
        return match ($surface) {
            AdDeliveryService::SURFACE_MANAGER => collect(
                $identity[
                    'areas'
                ] ?? []
            )->contains(
                fn (array $area) => (
                    $area[
                        'code'
                    ] ?? null
                ) ===
                    'gestao'
            ),

            AdDeliveryService::SURFACE_DRIVER => (
                (
                    $identity[
                        'links'
                    ][
                        'motorista'
                    ][
                        'has_role'
                    ]
                    ?? false
                ) === true
            ) &&
                (
                    (
                        $identity[
                            'links'
                        ][
                            'motorista'
                        ][
                            'linked'
                        ]
                        ?? false
                    ) === true
                ) &&
                (
                    (
                        $identity[
                            'links'
                        ][
                            'motorista'
                        ][
                            'ativo'
                        ]
                        ?? false
                    ) === true
                ),

            AdDeliveryService::SURFACE_OWNER => (
                (
                    $identity[
                        'links'
                    ][
                        'proprietario'
                    ][
                        'has_role'
                    ]
                    ?? false
                ) === true
            ) &&
                (
                    (
                        $identity[
                            'links'
                        ][
                            'proprietario'
                        ][
                            'linked'
                        ]
                        ?? false
                    ) === true
                ) &&
                (
                    (
                        $identity[
                            'links'
                        ][
                            'proprietario'
                        ][
                            'ativo'
                        ]
                        ?? false
                    ) === true
                ),

            default => false,
        };
    }
}
