<?php

namespace App\Http\Resources;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Project
 */
class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'color' => $this->color,
            'sortOrder' => $this->sort_order,
            'taskCount' => $this->whenCounted('tasks'),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
