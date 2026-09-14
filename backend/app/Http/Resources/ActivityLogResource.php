<?php

namespace App\Http\Resources;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ActivityLog
 */
class ActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'taskId' => $this->task_id,
            'taskTitle' => $this->whenLoaded('task', fn () => $this->task?->title),
            'meta' => $this->meta,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
