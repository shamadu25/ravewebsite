<?php

namespace App\Models;

use Database\Factories\AiPromptVersionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiPromptVersion extends Model
{
    /** @use HasFactory<AiPromptVersionFactory> */
    use HasFactory;

    protected $fillable = [
        'ai_prompt_id',
        'version',
        'content',
        'status',
        'created_by',
        'approved_by',
        'published_at',
        'performance_metrics',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'performance_metrics' => 'array',
        ];
    }

    public function prompt(): BelongsTo
    {
        return $this->belongsTo(AiPrompt::class, 'ai_prompt_id');
    }
}
