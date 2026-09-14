<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    /**
     * Export the authenticated user's data (tasks, projects, tags,
     * subtasks, reminders, notifications, activity) as a JSON download.
     */
    public function export(Request $request): StreamedResponse
    {
        $user = $request->user()->load([
            'tasks.project',
            'tasks.tags',
            'tasks.subtasks',
            'tasks.reminders',
            'projects',
            'tags',
            'notifications',
            'activityLogs',
        ]);

        $payload = [
            'exported_at' => now()->toIso8601String(),
            'app' => config('app.name'),
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'timezone' => $user->timezone,
            ],
            'tasks' => $user->tasks->map(fn ($t) => [
                'title' => $t->title,
                'description' => $t->description,
                'status' => $t->status,
                'priority' => $t->priority,
                'due_date' => $t->due_date?->format('Y-m-d'),
                'due_time' => $t->due_time,
                'start_date' => $t->start_date?->format('Y-m-d'),
                'completed_at' => $t->completed_at?->toIso8601String(),
                'favorite' => $t->favorite,
                'archived' => $t->archived_at !== null,
                'estimated_duration' => $t->estimated_duration,
                'recurrence_frequency' => $t->recurrence_frequency,
                'recurrence_interval' => $t->recurrence_interval,
                'recurrence_weekdays' => $t->recurrence_weekdays,
                'recurrence_end_date' => $t->recurrence_end_date?->format('Y-m-d'),
                'project' => $t->project?->name,
                'tags' => $t->tags->pluck('name')->values()->all(),
                'subtasks' => $t->subtasks->map(fn ($s) => [
                    'title' => $s->title,
                    'completed' => (bool) $s->completed,
                ])->values()->all(),
                'reminders' => $t->reminders->map(fn ($r) => [
                    'remind_at' => $r->remind_at?->toIso8601String(),
                    'sent_at' => $r->sent_at?->toIso8601String(),
                ])->values()->all(),
            ])->values()->all(),
            'projects' => $user->projects->map(fn ($p) => [
                'name' => $p->name,
                'color' => $p->color,
            ])->values()->all(),
            'tags' => $user->tags->map(fn ($t) => [
                'name' => $t->name,
                'color' => $t->color,
            ])->values()->all(),
            'notifications' => $user->notifications->map(fn ($n) => [
                'type' => $n->type,
                'title' => $n->title,
                'body' => $n->body,
                'channel' => $n->channel,
                'read_at' => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at?->toIso8601String(),
            ])->values()->all(),
            'activity' => $user->activityLogs->map(fn ($a) => [
                'action' => $a->action,
                'meta' => $a->meta,
                'created_at' => $a->created_at?->toIso8601String(),
            ])->values()->all(),
        ];

        $filename = 'focuslist-export-'.now()->format('Y-m-d').'.json';

        return response()->streamDownload(function () use ($payload) {
            echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        }, $filename, ['Content-Type' => 'application/json']);
    }

    /**
     * Lightweight "my data" summary used by the Settings export card.
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(['data' => [
            'tasks' => $user->tasks()->count(),
            'projects' => $user->projects()->count(),
            'tags' => $user->tags()->count(),
            'notifications' => $user->notifications()->count(),
        ]]);
    }
}
