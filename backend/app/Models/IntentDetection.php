<?php

namespace App\Models;

use Database\Factories\IntentDetectionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntentDetection extends Model
{
    /** @use HasFactory<IntentDetectionFactory> */
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'message_id',
        'primary_intent_id',
        'secondary_intent_id',
        'confidence',
        'detected_service',
        'detected_industry',
    ];

    protected function casts(): array
    {
        return [
            'confidence' => 'float',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    public function primaryIntent(): BelongsTo
    {
        return $this->belongsTo(Intent::class, 'primary_intent_id');
    }

    public function secondaryIntent(): BelongsTo
    {
        return $this->belongsTo(Intent::class, 'secondary_intent_id');
    }
}
