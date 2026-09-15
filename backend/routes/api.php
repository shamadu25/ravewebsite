<?php

use App\Http\Controllers\Api\AiChatController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('ai')->middleware('throttle:ai-chat')->group(function (): void {
    Route::post('/conversations', [AiChatController::class, 'store']);
    Route::get('/conversations/{conversation}', [AiChatController::class, 'show']);
    Route::post('/conversations/{conversation}/messages', [AiChatController::class, 'sendMessage']);
});
