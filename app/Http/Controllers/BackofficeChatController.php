<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreChatConversationRequest;
use App\Http\Requests\StoreChatMessageRequest;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BackofficeChatController extends Controller
{
    public function __construct(
        private ChatService $service
    ){}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->globalConversations(
                $request->user()
            )
        );
    }

    public function summary(Request $request): JsonResponse
    {
        return response()->json([
            'unread'=>$this->service->unread(
                $request->user(),
                null,
                true
            ),
        ]);
    }

    public function recipients(Request $request): JsonResponse
    {
        return response()->json([
            'data'=>$this->service->globalRecipients(
                $request->user(),
                $request->string('search')->toString(),
                $request->string('role')->toString()
            ),
        ]);
    }

    public function show(Request $request,string $id): JsonResponse
    {
        $conversation=$this->service->conversation(
            $request->user(),
            $id
        );

        if($conversation->source!=='saas'){
            abort(404);
        }

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
        $conversation=$this->service->createGlobal(
            $request->user(),
            $request->validated(),
            $request->file('attachments',[])
        );

        return response()->json([
            'message'=>'Comunicação enviada.',
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
            $id
        );

        if($conversation->source!=='saas'){
            abort(404);
        }

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
}
