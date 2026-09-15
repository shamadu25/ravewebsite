<?php

namespace App\Models;

use Database\Factories\AiPromptFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AiPrompt extends Model
{
    /** @use HasFactory<AiPromptFactory> */
    use HasFactory;

    protected $fillable = [
        'agent_key',
        'name',
        'description',
    ];

    public function versions(): HasMany
    {
        return $this->hasMany(AiPromptVersion::class);
    }

    public function productionVersion(): HasOne
    {
        return $this->hasOne(AiPromptVersion::class)->where('status', 'production')->latestOfMany('published_at');
    }
}
