<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreChatConversationRequest;
use App\Http\Requests\StoreChatMessageRequest;
use App\Services\ChatService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __construct(
        private ChatService $service,
        private TenantContext $tenantContext
    ){}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->tenantConversations(
                $request->user(),
                $this->tenantContext->requireId()
            )
        );
    }

    public function summary(Request $request): JsonResponse
    {
        return response()->json([
            'unread'=>$this->service->unread(
                $request->user(),
                $this->tenantContext->requireId()
            ),
        ]);
    }

    public function recipients(Request $request): JsonResponse
    {
        return response()->json([
            'data'=>$this->service->tenantRecipients(
                $request->user(),
                $this->tenantContext->requireId(),
                $request->string('search')->toString()
            ),
        ]);
    }

    public function show(Request $request,string $id): JsonResponse
    {
        $conversation=$this->service->conversation(
            $request->user(),
            $id,
            $this->tenantContext->requireId()
        );

        $this->service->markRead(
            $conversation,
            $request->user()
        );

        return response()->json([
            'data'=>$this->service->serializeConversation(
                $conversation,
                $request->user(),
                true
            ),
        ]);
    }

    public function store(StoreChatConversationRequest $request): JsonResponse
    {
        $conversation=$this->service->createTenant(
            $request->user(),
            $this->tenantContext->requireId(),
            $request->validated(),
            $request->file('attachments',[])
        );

        return response()->json([
            'message'=>'Mensagem enviada com sucesso.',
            'data'=>$this->service->serializeConversation(
                $conversation,
                $request->user(),
                true
            ),
        ],201);
    }

    public function message(
        StoreChatMessageRequest $request,
        string $id
    ): JsonResponse {
        $conversation=$this->service->conversation(
            $request->user(),
            $id,
            $this->tenantContext->requireId()
        );

        $message=$this->service->send(
            $request->user(),
            $conversation,
            $request->validated('body'),
            $request->file('attachments',[])
        );

        return response()->json([
            'message'=>'Mensagem enviada.',
            'data'=>$this->service->serializeMessage($message),
        ],201);
    }

    public function read(Request $request,string $id): JsonResponse
    {
        $conversation=$this->service->conversation(
            $request->user(),
            $id,
            $this->tenantContext->requireId()
        );

        $this->service->markRead(
            $conversation,
            $request->user()
        );

        return response()->json([
            'message'=>'Conversa marcada como lida.',
        ]);
    }
}
