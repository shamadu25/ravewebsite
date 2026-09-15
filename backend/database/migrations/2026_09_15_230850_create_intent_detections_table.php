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
        Schema::create('intent_detections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('message_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('primary_intent_id')->constrained('intents')->cascadeOnDelete();
            $table->foreignId('secondary_intent_id')->nullable()->constrained('intents')->nullOnDelete();
            $table->decimal('confidence', 4, 3)->default(0);
            $table->string('detected_service')->nullable();
            $table->string('detected_industry')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('intent_detections');
    }
};
