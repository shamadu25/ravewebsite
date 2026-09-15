<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ai_prompt_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_prompt_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->longText('content');
            $table->string('status')->default('draft');
            $table->string('created_by')->nullable();
            $table->string('approved_by')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->json('performance_metrics')->nullable();
            $table->timestamps();

            $table->unique(['ai_prompt_id', 'version']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_prompt_versions');
    }
};
