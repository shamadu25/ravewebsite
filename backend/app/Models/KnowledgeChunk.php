<?php

namespace App\Models;

use Database\Factories\KnowledgeChunkFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KnowledgeChunk extends Model
{
    /** @use HasFactory<KnowledgeChunkFactory> */
    use HasFactory;

    protected $fillable = [
        'knowledge_document_id',
        'chunk_index',
        'content',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(KnowledgeDocument::class, 'knowledge_document_id');
    }
}
