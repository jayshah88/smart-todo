<?php

namespace App\Services;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Core task business logic: queries, filters, completion,
 * duplicate and bulk operations. Used by TaskController.
 */
class TaskService
{
    public const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    public function filteredQuery(User $user, array $filters, string $archived = '0'): Builder
    {
        // Start from the Task model query (not the HasMany relation object)
        // so filtering always returns an Eloquent Builder.
        $query = Task::query()->where('tasks.user_id', $user->id);

        if ($archived === '1') {
            $query->archived();
        } else {
            $query->notArchived();
        }

        match ($filters['view'] ?? 'all') {
            'today' => $query->notCompleted()->whereDate('due_date', Carbon::today()),
            'upcoming' => $query->notCompleted()->whereDate('due_date', '>', Carbon::today()),
            'overdue' => $query->notCompleted()->whereDate('due_date', '<', Carbon::today()),
            'completed' => $query->completed(),
            default => null,
        };

        if (! empty($filters['project_id'])) {
            $query->where('project_id', (int) $filters['project_id']);
        }

        if (! empty($filters['tag_id'])) {
            $query->whereHas('tags', fn (Builder $q) => $q->where('tags.id', (int) $filters['tag_id']));
        }

        if (! empty($filters['priority'])) {
            $query->whereIn('priority', (array) $filters['priority']);
        }

        if (! empty($filters['search'])) {
            $term = str_replace(['%', '_'], ['\%', '\_'], $filters['search']);
            $query->where(function (Builder $q) use ($term) {
                $q->where('title', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%");
            });
        }

        return $query;
    }

    public function create(User $user, array $data): Task
    {
        $task = $user->tasks()->create($data);
        $task->refresh();

        if (! empty($data['tag_ids'])) {
            $tagIds = $user->tags()->whereIn('id', $data['tag_ids'])->pluck('id')->all();
            $task->tags()->sync($tagIds);
        }

        $this->syncReminder($task);

        return $task->load(['project', 'tags']);
    }

    public function update(Task $task, array $data): Task
    {
        $task->update($data);

        if (array_key_exists('tag_ids', $data)) {
            $tagIds = empty($data['tag_ids'])
                ? []
                : $task->user->tags()->whereIn('id', $data['tag_ids'])->pluck('id')->all();
            $task->tags()->sync($tagIds);
        }

        $this->syncReminder($task->refresh());

        return $task->load(['project', 'tags']);
    }

    /**
     * Create/update the pending reminder for a task based on
     * due date/time and reminder_minutes_before.
     * Called from TaskService and TaskController (on reopen).
     */
    public function syncReminder(Task $task): void
    {
        $task->reminders()->whereNull('sent_at')->delete();

        if ($task->reminder_minutes_before === null || $task->due_date === null || $task->completed_at !== null) {
            return;
        }

        $dueAt = $task->due_date->copy();
        $dueAt = $task->due_time
            ? $dueAt->setTimeFromTimeString($task->due_time)
            : $dueAt->setTime(9, 0); // sensible default: 09:00 on due date

        $remindAt = $dueAt->copy()->subMinutes($task->reminder_minutes_before);

        if ($remindAt->isPast()) {
            return; // never schedule reminders in the past
        }

        $task->reminders()->create([
            'user_id' => $task->user_id,
            'remind_at' => $remindAt,
        ]);
    }

    public function duplicate(Task $task): Task
    {
        $copy = $task->replicate(['completed_at']);
        $copy->title = $task->title.' (copy)';
        $copy->save();
        $copy->tags()->sync($task->tags->pluck('id')->all());

        // Copies subtasks as uncompleted so the copy starts fresh.
        foreach ($task->subtasks as $subtask) {
            $copy->subtasks()->create([
                'title' => $subtask->title,
                'completed' => false,
                'sort_order' => $subtask->sort_order,
            ]);
        }

        return $copy->load(['project', 'tags']);
    }
}
