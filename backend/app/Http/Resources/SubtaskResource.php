<?php

namespace App\Http\Resources;

use App\Models\Subtask;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Subtask
 */
class SubtaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'taskId' => $this->task_id,
            'title' => $this->title,
            'completed' => $this->completed,
            'sortOrder' => $this->sort_order,
        ];
    }
}
