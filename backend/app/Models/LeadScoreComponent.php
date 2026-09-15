<?php

namespace App\Models;

use Database\Factories\LeadScoreComponentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadScoreComponent extends Model
{
    /** @use HasFactory<LeadScoreComponentFactory> */
    use HasFactory;

    protected $fillable = [
        'lead_score_id',
        'key',
        'points',
        'reason',
    ];

    public function leadScore(): BelongsTo
    {
        return $this->belongsTo(LeadScore::class);
    }
}
