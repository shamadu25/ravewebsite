<?php

namespace App\Models;

use Database\Factories\AgentActionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentAction extends Model
{
    /** @use HasFactory<AgentActionFactory> */
    use HasFactory;

    protected $fillable = [
        'agent_run_id',
        'action_type',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    public function agentRun(): BelongsTo
    {
        return $this->belongsTo(AgentRun::class);
    }
}
