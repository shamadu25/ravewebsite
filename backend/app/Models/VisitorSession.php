<?php

namespace App\Models;

use Database\Factories\VisitorSessionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitorSession extends Model
{
    /** @use HasFactory<VisitorSessionFactory> */
    use HasFactory;

    protected $fillable = [
        'visitor_id',
        'landing_page',
        'current_page',
        'referrer',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'device',
        'browser',
        'language',
        'started_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
        ];
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }
}
