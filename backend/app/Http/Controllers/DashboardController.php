<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityLogResource;
use App\Http\Resources\TaskResource;
use App\Services\DashboardService;
use App\Services\FocusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService,
        private readonly FocusService $focusService,
    ) {}

    public function stats(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->dashboardService->stats($request->user()),
        ]);
    }

    public function weekly(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->dashboardService->weekly($request->user()),
        ]);
    }

    public function activity(Request $request): AnonymousResourceCollection
    {
        $activity = $this->dashboardService->recentActivity($request->user(), 12);

        return ActivityLogResource::collection(collect($activity));
    }

    public function focus(Request $request): JsonResponse
    {
        $user = $request->user();
        $items = $this->focusService->focusItems($user);
        $timeline = $this->focusService->todayTimeline($user);
        $capacity = $this->focusService->capacitySummary($user);

        return response()->json([
            'data' => [
                'items' => array_map(fn ($i) => [
                    'task' => new TaskResource($i['task']),
                    'reason' => $i['reason'],
                    'reasonType' => $i['reasonType'],
                ], $items),
                'timeline' => TaskResource::collection($timeline),
                'capacity' => $capacity,
            ],
        ]);
    }
}
