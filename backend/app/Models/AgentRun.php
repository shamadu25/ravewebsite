<?php

namespace App\Models;

use Database\Factories\AgentRunFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AgentRun extends Model
{
    /** @use HasFactory<AgentRunFactory> */
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'message_id',
        'agent_key',
        'prompt_version_id',
        'model',
        'input_tokens',
        'output_tokens',
        'latency_ms',
        'status',
        'error',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    public function promptVersion(): BelongsTo
    {
        return $this->belongsTo(AiPromptVersion::class, 'prompt_version_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(AgentAction::class);
    }

    public function toolCalls(): HasMany
    {
        return $this->hasMany(ToolCall::class);
    }
}
