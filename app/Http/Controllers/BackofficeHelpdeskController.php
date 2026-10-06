<?php

namespace App\Http\Controllers;

use App\Http\Requests\HelpdeskIndexRequest;
use App\Http\Requests\StoreHelpdeskMessageRequest;
use App\Http\Requests\UpdateHelpdeskTicketRequest;
use App\Services\HelpdeskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BackofficeHelpdeskController extends Controller
{
    public function __construct(
        private HelpdeskService $service
    ){}

    public function index(
        HelpdeskIndexRequest $request
    ): JsonResponse {
        return response()->json(
            $this->service->backofficeIndex(
                $request->user(),
                $request->validated()
            )
        );
    }

    public function summary(
        Request $request
    ): JsonResponse {
        return response()->json([
            'data'=>
                $this->service->backofficeSummary(
                    $request->user()
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
                    true
                ),
        ]);
    }

    public function show(
        Request $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'data'=>
                $this->service->backofficeDetail(
                    $request->user(),
                    $id
                ),
        ]);
    }

    public function message(
        StoreHelpdeskMessageRequest $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'message'=>'Resposta enviada.',
            'data'=>
                $this->service->backofficeReply(
                    $request->user(),
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

    public function update(
        UpdateHelpdeskTicketRequest $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'message'=>
                'Chamado atualizado.',
            'data'=>
                $this->service->updateBackoffice(
                    $request->user(),
                    $id,
                    $request->validated()
                ),
        ]);
    }
}
