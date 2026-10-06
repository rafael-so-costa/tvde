<?php

namespace App\Http\Controllers;

use App\Http\Requests\HelpdeskIndexRequest;
use App\Http\Requests\RateHelpdeskTicketRequest;
use App\Http\Requests\StoreHelpdeskMessageRequest;
use App\Http\Requests\StoreHelpdeskTicketRequest;
use App\Services\HelpdeskService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HelpdeskController extends Controller
{
    public function __construct(
        private HelpdeskService $service,
        private TenantContext $tenantContext
    ){}

    public function index(
        HelpdeskIndexRequest $request
    ): JsonResponse {
        return response()->json(
            $this->service->tenantIndex(
                $request->user(),
                $this->tenantId(),
                $request->validated()
            )
        );
    }

    public function summary(
        Request $request
    ): JsonResponse {
        return response()->json([
            'data'=>
                $this->service->tenantSummary(
                    $request->user(),
                    $this->tenantId()
                ),
        ]);
    }

    public function meta(
        Request $request
    ): JsonResponse {
        return response()->json([
            'data'=>
                $this->service->meta(
                    $request->user(),
                    false,
                    $this->tenantId()
                ),
        ]);
    }

    public function store(
        StoreHelpdeskTicketRequest $request
    ): JsonResponse {
        $ticket=
            $this->service->createTenant(
                $request->user(),
                $this->tenantId(),
                $request->validated(),
                $request->file(
                    'attachments',
                    []
                )
            );

        return response()->json([
            'message'=>
                'Chamado aberto com sucesso.',
            'data'=>$ticket,
        ],201);
    }

    public function show(
        Request $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'data'=>
                $this->service->tenantDetail(
                    $request->user(),
                    $this->tenantId(),
                    $id
                ),
        ]);
    }

    public function message(
        StoreHelpdeskMessageRequest $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'message'=>
                'Resposta enviada.',
            'data'=>
                $this->service->tenantReply(
                    $request->user(),
                    $this->tenantId(),
                    $id,
                    $request->validated(
                        'body'
                    ),
                    $request->file(
                        'attachments',
                        []
                    )
                ),
        ],201);
    }

    public function close(
        Request $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'message'=>
                'Chamado fechado.',
            'data'=>
                $this->service->closeTenant(
                    $request->user(),
                    $this->tenantId(),
                    $id
                ),
        ]);
    }

    public function reopen(
        Request $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'message'=>
                'Chamado reaberto.',
            'data'=>
                $this->service->reopenTenant(
                    $request->user(),
                    $this->tenantId(),
                    $id
                ),
        ]);
    }

    public function rate(
        RateHelpdeskTicketRequest $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'message'=>
                'Obrigado pela avaliação.',
            'data'=>
                $this->service->rateTenant(
                    $request->user(),
                    $this->tenantId(),
                    $id,
                    $request->validated()
                ),
        ],201);
    }

    private function tenantId(): string
    {
        return $this
            ->tenantContext
            ->requireId();
    }
}
