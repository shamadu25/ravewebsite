<?php

namespace App\Http\Resources;

use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Conversation */
class ConversationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->external_id,
            'stage' => $this->stage,
            'status' => $this->status,
            'messages' => MessageResource::collection($this->whenLoaded('messages')),
            'quick_actions' => config('ai.quick_actions'),
            'assistant_name' => config('ai.assistant_name'),
        ];
    }
}
