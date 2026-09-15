<?php

namespace App\Models;

use Database\Factories\LeadScoreFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeadScore extends Model
{
    /** @use HasFactory<LeadScoreFactory> */
    use HasFactory;

    protected $fillable = [
        'lead_id',
        'total_score',
        'level',
        'computed_at',
    ];

    protected function casts(): array
    {
        return [
            'computed_at' => 'datetime',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function components(): HasMany
    {
        return $this->hasMany(LeadScoreComponent::class);
    }
}
