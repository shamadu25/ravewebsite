<?php

namespace App\Models;

use Database\Factories\ConversationSummaryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConversationSummary extends Model
{
    /** @use HasFactory<ConversationSummaryFactory> */
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'summary',
        'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'generated_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
