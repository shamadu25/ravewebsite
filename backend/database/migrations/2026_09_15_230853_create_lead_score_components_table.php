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
        Schema::create('lead_score_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_score_id')->constrained()->cascadeOnDelete();
            $table->string('key');
            $table->integer('points');
            $table->string('reason')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_score_components');
    }
};
