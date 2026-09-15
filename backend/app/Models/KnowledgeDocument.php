<?php

namespace App\Models;

use Database\Factories\KnowledgeDocumentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KnowledgeDocument extends Model
{
    /** @use HasFactory<KnowledgeDocumentFactory> */
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'category',
        'content',
        'source',
        'version',
        'status',
        'effective_date',
        'expires_at',
        'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'effective_date' => 'date',
            'expires_at' => 'date',
        ];
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(KnowledgeChunk::class);
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', now());
            });
    }
}
