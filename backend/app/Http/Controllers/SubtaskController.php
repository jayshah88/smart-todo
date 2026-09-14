<?php

namespace App\Http\Controllers;

use App\Http\Resources\SubtaskResource;
use App\Models\Subtask;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubtaskController extends Controller
{
    public function store(Request $request, Task $task): SubtaskResource
    {
        $this->authorize('update', $task);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $subtask = $task->subtasks()->create([
            'title' => $data['title'],
            'sort_order' => $task->subtasks()->count(),
        ]);

        return new SubtaskResource($subtask);
    }

    public function update(Request $request, Task $task, Subtask $subtask): SubtaskResource
    {
        $this->authorize('update', $task);
        abort_unless($subtask->task_id === $task->id, 404);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'completed' => ['sometimes', 'boolean'],
        ]);

        $subtask->update($data);

        return new SubtaskResource($subtask);
    }

    public function destroy(Request $request, Task $task, Subtask $subtask): JsonResponse
    {
        $this->authorize('update', $task);
        abort_unless($subtask->task_id === $task->id, 404);

        $subtask->delete();

        return response()->json(['message' => 'Subtask deleted.']);
    }
}
