<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\SendMessageRequest;
use App\Http\Requests\Api\StartConversationRequest;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Services\Conversations\ConversationService;
use Illuminate\Http\JsonResponse;

class AiChatController extends Controller
{
    public function __construct(private readonly ConversationService $conversations) {}

    public function store(StartConversationRequest $request): ConversationResource
    {
        $conversation = $this->conversations->start($request->validated());

        return new ConversationResource($conversation->load('messages'));
    }

    public function show(string $conversation): ConversationResource
    {
        $model = Conversation::query()->where('external_id', $conversation)->firstOrFail();

        return new ConversationResource($model->load('messages'));
    }

    public function sendMessage(SendMessageRequest $request, string $conversation): JsonResponse
    {
        $model = Conversation::query()->where('external_id', $conversation)->firstOrFail();

        $result = $this->conversations->sendMessage(
            $model,
            $request->validated('message'),
            array_filter(['current_page' => $request->validated('current_page')]),
        );

        return response()->json([
            'message' => $result['message'],
            'needs_human' => $result['needs_human'],
            'ai_unavailable' => $result['ai_unavailable'],
        ]);
    }
}
