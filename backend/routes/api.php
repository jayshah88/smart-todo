<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SubtaskController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TaskController;
use Illuminate\Support\Facades\Route;

// Rate limited auth routes (brute-force protection)
Route::middleware('throttle:auth')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
});

Route::middleware('auth:sanctum')->group(function () {
    // Auth / user
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('/auth/resend-verification', [AuthController::class, 'resendVerification']);

    // Profile & settings
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/settings', [ProfileController::class, 'updateSettings']);
    Route::delete('/profile', [ProfileController::class, 'destroy']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'stats']);
    Route::get('/dashboard/weekly', [DashboardController::class, 'weekly']);
    Route::get('/dashboard/activity', [DashboardController::class, 'activity']);
    Route::get('/dashboard/focus', [DashboardController::class, 'focus']);

    // Notifications (in-app center)
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

    // Exports (user data portability)
    Route::get('/export', [ExportController::class, 'export']);
    Route::get('/export/summary', [ExportController::class, 'summary']);

    // Mutating endpoints: stricter per-user rate limit (abuse protection)
    Route::middleware('throttle:api-write')->group(function (): void {
        // Tasks
        Route::post('/tasks', [TaskController::class, 'store']);
        Route::post('/tasks/bulk', [TaskController::class, 'bulk']);
        Route::post('/tasks/reorder', [TaskController::class, 'reorder']);
        Route::post('/tasks/suggest-priority', [TaskController::class, 'suggestPriority']);
        Route::put('/tasks/{task}', [TaskController::class, 'update']);
        Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);
        Route::post('/tasks/{task}/complete', [TaskController::class, 'complete']);
        Route::post('/tasks/{task}/reopen', [TaskController::class, 'reopen']);
        Route::post('/tasks/{task}/duplicate', [TaskController::class, 'duplicate']);
        Route::post('/tasks/{task}/archive', [TaskController::class, 'archive']);
        Route::post('/tasks/{task}/restore', [TaskController::class, 'restore']);
        Route::post('/tasks/{task}/skip', [TaskController::class, 'skip']);

        // Subtasks
        Route::post('/tasks/{task}/subtasks', [SubtaskController::class, 'store']);
        Route::put('/tasks/{task}/subtasks/{subtask}', [SubtaskController::class, 'update']);
        Route::delete('/tasks/{task}/subtasks/{subtask}', [SubtaskController::class, 'destroy']);

        // Projects
        Route::post('/projects', [ProjectController::class, 'store']);
        Route::put('/projects/{project}', [ProjectController::class, 'update']);
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

        // Tags
        Route::post('/tags', [TagController::class, 'store']);
        Route::put('/tags/{tag}', [TagController::class, 'update']);
        Route::delete('/tags/{tag}', [TagController::class, 'destroy']);
    });

    // Task reads
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::get('/tasks/{task}', [TaskController::class, 'show']);

    // Project & tag reads
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::get('/tags', [TagController::class, 'index']);
});
