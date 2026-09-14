<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\ActivityLog;
use App\Models\Task;
use App\Services\RecurrenceService;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

class TaskController extends Controller
{
    public function __construct(
        private readonly TaskService $taskService,
        private readonly RecurrenceService $recurrenceService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'view' => ['nullable', 'in:all,today,upcoming,overdue,completed'],
            'project_id' => ['nullable', 'integer'],
            'tag_id' => ['nullable', 'integer'],
            'priority' => ['nullable', 'in:low,medium,high,urgent'],
            'search' => ['nullable', 'string', 'max:255'],
            'sort' => ['nullable', 'in:created_at,due_date,priority'],
            'order' => ['nullable', 'in:asc,desc'],
            'archived' => ['nullable', 'in:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $user = $request->user();
        $query = $this->taskService->filteredQuery($user, $filters, (string) ($filters['archived'] ?? '0'));

        $order = $filters['order'] ?? 'desc';
        $sort = $filters['sort'] ?? 'created_at';

        $query->orderByRaw('CASE WHEN completed_at IS NULL THEN 0 ELSE 1 END');

        if ($sort === 'due_date') {
            $query->orderBy('due_date', $order);
        } elseif ($sort === 'priority') {
            // Real priority ordering: urgent → low (desc) / low → urgent (asc)
            $order === 'asc'
                ? $query->orderByRaw("CASE priority WHEN 'low' THEN 0 WHEN 'medium' THEN 1 WHEN 'high' THEN 2 ELSE 3 END")
                : $query->orderByRaw("CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END");
        } else {
            $query->orderBy('created_at', $order);
        }

        $tasks = $query->paginate(min(100, $filters['per_page'] ?? 25));

        return TaskResource::collection($tasks);
    }

    public function store(StoreTaskRequest $request): TaskResource
    {
        $task = $this->taskService->create($request->user(), $request->taskData());

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'task_id' => $task->id,
            'action' => 'created',
        ]);

        return new TaskResource($task);
    }

    public function show(Request $request, Task $task): TaskResource
    {
        $this->authorize('view', $task);

        return new TaskResource($task->load(['project', 'tags', 'subtasks']));
    }

    public function update(UpdateTaskRequest $request, Task $task): TaskResource
    {
        $this->authorize('update', $task);

        $wasCompleted = $task->completed_at !== null;
        $task = $this->taskService->update($task, $request->taskData());

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'task_id' => $task->id,
            'action' => $wasCompleted && $task->completed_at === null ? 'reopened' : 'updated',
        ]);

        return new TaskResource($task);
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->authorize('delete', $task);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'task_id' => null,
            'action' => 'deleted',
            'meta' => ['title' => $task->title],
        ]);

        $task->delete();

        return response()->json(['message' => 'Task deleted.']);
    }

    public function complete(Request $request, Task $task): TaskResource
    {
        $this->authorize('update', $task);

        if ($task->completed_at !== null) {
            return new TaskResource($task->load(['project', 'tags']));
        }

        $task->completed_at = now();
        $task->status = 'completed';
        $task->save();

        // Delete any pending reminders for this completed task
        $task->reminders()->whereNull('sent_at')->delete();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'task_id' => $task->id,
            'action' => 'completed',
        ]);

        // Recurring: generate the next occurrence
        if ($task->isRecurring()) {
            $this->generateNextOccurrence($task);
        }

        return new TaskResource($task->fresh(['project', 'tags']));
    }

    public function reopen(Request $request, Task $task): TaskResource
    {
        $this->authorize('update', $task);

        $task->completed_at = null;
        $task->status = 'pending';
        $task->save();

        // Re-create the reminder if the task has one configured
        $this->taskService->syncReminder($task->refresh());

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'task_id' => $task->id,
            'action' => 'reopened',
        ]);

        return new TaskResource($task->fresh(['project', 'tags']));
    }

    public function duplicate(Request $request, Task $task): TaskResource
    {
        $this->authorize('view', $task);

        $copy = $this->taskService->duplicate($task);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'task_id' => $copy->id,
            'action' => 'created',
            'meta' => ['duplicated_from' => $task->id],
        ]);

        return new TaskResource($copy);
    }

    public function archive(Request $request, Task $task): TaskResource
    {
        $this->authorize('update', $task);

        $task->archived_at = now();
        $task->save();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'task_id' => $task->id,
            'action' => 'archived',
        ]);

        return new TaskResource($task->fresh(['project', 'tags']));
    }

    public function restore(Request $request, Task $task): TaskResource
    {
        $this->authorize('update', $task);

        $task->archived_at = null;
        $task->save();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'task_id' => $task->id,
            'action' => 'restored',
        ]);

        return new TaskResource($task->fresh(['project', 'tags']));
    }

    public function skip(Request $request, Task $task): TaskResource
    {
        $this->authorize('update', $task);

        if (! $task->isRecurring()) {
            return new TaskResource($task->fresh(['project', 'tags']));
        }

        // Temporarily disable recurrence to skip one instance
        $frequency = $task->recurrence_frequency;
        $task->recurrence_frequency = null;
        $task->completed_at = now();
        $task->status = 'completed';
        $task->save();

        // Delete any pending reminders
        $task->reminders()->whereNull('sent_at')->delete();

        // Re-enable recurrence so future completions still generate next occurrences
        $task->recurrence_frequency = $frequency;
        $task->save();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'task_id' => $task->id,
            'action' => 'skipped',
        ]);

        return new TaskResource($task->fresh(['project', 'tags']));
    }

    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'in:complete,delete,priority'],
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['integer'],
            'priority' => ['required_if:action,priority', 'in:low,medium,high,urgent'],
        ]);

        $user = $request->user();

        // Ensure all IDs belong to the user (authorization scoping)
        $query = $user->tasks()->whereIn('id', $data['ids']);

        $affected = match ($data['action']) {
            'complete' => $query->whereNull('completed_at')->update(['completed_at' => now(), 'status' => 'completed']),
            'delete' => $query->delete(),
            'priority' => $query->update(['priority' => $data['priority']]),
        };

        return response()->json([
            'message' => "{$affected} task(s) updated.",
            'affected' => $affected,
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'task_ids' => ['required', 'array', 'max:500'],
            'task_ids.*' => ['integer'],
        ]);

        foreach (array_values($data['task_ids']) as $index => $taskId) {
            $request->user()->tasks()
                ->where('id', $taskId)
                ->update(['sort_order' => $index]);
        }

        return response()->json(['message' => 'Order saved.']);
    }

    /**
     * Smart priority suggestion based on due date proximity (deterministic).
     */
    public function suggestPriority(Request $request): JsonResponse
    {
        $data = $request->validate([
            'due_date' => ['nullable', 'date'],
            'priority' => ['nullable', 'in:low,medium,high,urgent'],
        ]);

        $dueDate = $data['due_date'] ?? null;
        $priority = $data['priority'] ?? 'medium';

        if ($dueDate === null) {
            return response()->json(['suggestedPriority' => $priority]);
        }

        $days = Carbon::today()->diffInDays(Carbon::parse($dueDate), false);

        $suggested = match (true) {
            $days < 0 => 'urgent',
            $days <= 3 => $priority === 'low' ? 'medium' : $priority,
            default => $priority,
        };

        return response()->json(['suggestedPriority' => $suggested]);
    }

    private function generateNextOccurrence(Task $task): ?Task
    {
        $nextDate = $this->recurrenceService->nextDueDate($task);

        if ($nextDate === null) {
            return null;
        }

        $clone = $task->replicate(['completed_at']);
        $clone->due_date = $nextDate->toDateString();
        $clone->status = 'pending';
        $clone->recurrence_parent_id = $task->id;
        $clone->save();

        // Copy subtasks (reset completion)
        foreach ($task->subtasks as $subtask) {
            $clone->subtasks()->create([
                'title' => $subtask->title,
                'completed' => false,
                'sort_order' => $subtask->sort_order,
            ]);
        }

        // Copy tags
        $clone->tags()->sync($task->tags->pluck('id')->all());

        // Sync pending reminder for the new occurrence
        $this->taskService->syncReminder($clone);

        return $clone;
    }
}
