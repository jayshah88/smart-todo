<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\ActivityLog;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $projects = $request->user()
            ->projects()
            ->withCount(['tasks as tasks_count' => fn ($q) => $q->notCompleted()->notArchived()])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return ProjectResource::collection($projects);
    }

    public function store(StoreProjectRequest $request): ProjectResource
    {
        $project = $request->user()->projects()->create($request->validated());

        return new ProjectResource($project);
    }

    public function show(Request $request, Project $project): ProjectResource
    {
        $this->authorize('view', $project);

        return new ProjectResource($project);
    }

    public function update(Request $request, Project $project): ProjectResource
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6,8}$/'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $project->update($data);

        return new ProjectResource($project);
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'task_id' => null,
            'action' => 'deleted',
            'meta' => ['title' => $project->name, 'type' => 'project'],
        ]);

        $project->delete();

        return response()->json(['message' => 'Project deleted. Its tasks were moved to Inbox.']);
    }
}
