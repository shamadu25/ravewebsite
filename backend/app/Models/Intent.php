<?php

namespace App\Models;

use Database\Factories\IntentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Intent extends Model
{
    /** @use HasFactory<IntentFactory> */
    use HasFactory;

    protected $fillable = [
        'key',
        'label',
        'category',
    ];

    public function detections(): HasMany
    {
        return $this->hasMany(IntentDetection::class, 'primary_intent_id');
    }
}
