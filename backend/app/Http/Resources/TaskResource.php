<?php

namespace App\Http\Resources;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Task
 */
class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'userId' => $this->user_id,
            'projectId' => $this->project_id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->completed_at !== null ? 'completed' : $this->status,
            'priority' => $this->priority,
            'dueDate' => $this->due_date?->format('Y-m-d'),
            'dueTime' => $this->due_time ? substr($this->due_time, 0, 5) : null,
            'startDate' => $this->start_date?->format('Y-m-d'),
            'completedAt' => $this->completed_at?->toIso8601String(),
            'favorite' => $this->favorite,
            'archived' => $this->archived_at !== null,
            'sortOrder' => $this->sort_order,
            'recurrence' => $this->isRecurring() ? [
                'frequency' => $this->recurrence_frequency,
                'interval' => $this->recurrence_interval,
                'weekdays' => $this->recurrence_weekdays,
                'endDate' => $this->recurrence_end_date?->format('Y-m-d'),
                'nextOccurrence' => $this->nextOccurrenceDate(),
            ] : null,
            'reminderMinutesBefore' => $this->reminder_minutes_before,
            'reminderAt' => $this->reminderAt(),
            'urgencyScore' => $this->urgencyScore(),
            'suggestedPriority' => $this->suggestedPriority(),
            'estimatedDuration' => $this->estimated_duration,
            'subtasks' => SubtaskResource::collection($this->whenLoaded('subtasks')),
            'subtaskProgress' => $this->whenLoaded('subtasks', function () {
                $total = $this->subtasks->count();

                return $total > 0 ? [
                    'total' => $total,
                    'completed' => $this->subtasks->where('completed', true)->count(),
                ] : null;
            }),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'project' => new ProjectResource($this->whenLoaded('project')),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
