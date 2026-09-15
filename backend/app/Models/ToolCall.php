<?php

namespace App\Models;

use Database\Factories\ToolCallFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ToolCall extends Model
{
    /** @use HasFactory<ToolCallFactory> */
    use HasFactory;

    protected $fillable = [
        'agent_run_id',
        'tool_name',
        'input',
        'output',
        'status',
        'error',
        'latency_ms',
    ];

    protected function casts(): array
    {
        return [
            'input' => 'array',
            'output' => 'array',
        ];
    }

    public function agentRun(): BelongsTo
    {
        return $this->belongsTo(AgentRun::class);
    }
}
