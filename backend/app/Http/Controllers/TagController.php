<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTagRequest;
use App\Http\Resources\TagResource;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class TagController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $tags = $request->user()->tags()->orderBy('name')->get();

        return TagResource::collection($tags);
    }

    public function store(StoreTagRequest $request): TagResource
    {
        $tag = $request->user()->tags()->create($request->validated());

        return new TagResource($tag);
    }

    public function update(Request $request, Tag $tag): TagResource
    {
        $this->authorize('update', $tag);

        $data = $request->validate([
            'name' => [
                'sometimes', 'string', 'max:50',
                Rule::unique('tags', 'name')
                    ->where('user_id', $request->user()->id)
                    ->ignore($tag->id),
            ],
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6,8}$/'],
        ]);

        $tag->update($data);

        return new TagResource($tag);
    }

    public function destroy(Tag $tag): JsonResponse
    {
        $this->authorize('delete', $tag);

        $tag->delete();

        return response()->json(['message' => 'Tag deleted.']);
    }
}
