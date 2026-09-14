<?php

namespace App\Services;

use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class FocusService
{
    public function focusItems(User $user, int $limit = 5): array
    {
        $today = Carbon::today()->toDateString();

        $overdue = $user->tasks()
            ->notCompleted()
            ->notArchived()
            ->whereNotNull('due_date')
            ->where('due_date', '<', $today)
            ->with(['project', 'tags'])
            ->get();

        $dueToday = $user->tasks()
            ->notCompleted()
            ->notArchived()
            ->whereDate('due_date', $today)
            ->with(['project', 'tags'])
            ->get();

        $upcoming = $user->tasks()
            ->notCompleted()
            ->notArchived()
            ->where('due_date', '>', $today)
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END")
            ->orderBy('due_date')
            ->limit($limit)
            ->with(['project', 'tags'])
            ->get();

        $importantNoDate = $user->tasks()
            ->notCompleted()
            ->notArchived()
            ->whereNull('due_date')
            ->whereIn('priority', ['urgent', 'high'])
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 0 ELSE 1 END")
            ->limit(2)
            ->with(['project', 'tags'])
            ->get();

        $candidates = $overdue
            ->merge($dueToday)
            ->merge($upcoming)
            ->merge($importantNoDate)
            ->unique('id')
            ->values();

        $scored = $candidates->map(function (Task $task) {
            return ['task' => $task, 'score' => $task->urgencyScore()];
        })->sortByDesc('score');

        $result = [];
        $count = 0;
        foreach ($scored as $item) {
            if ($count >= $limit) {
                break;
            }
            $task = $item['task'];
            $reason = $this->buildReason($task, $today);
            $result[] = [
                'task' => $task,
                'reason' => $reason['message'],
                'reasonType' => $reason['type'],
            ];
            $count++;
        }

        return $result;
    }

    public function todayTimeline(User $user): Collection
    {
        return $user->tasks()
            ->notCompleted()
            ->notArchived()
            ->whereDate('due_date', Carbon::today()->toDateString())
            ->whereNotNull('due_time')
            ->orderBy('due_time')
            ->with(['project', 'tags'])
            ->get();
    }

    public function capacitySummary(User $user): array
    {
        $today = Carbon::today()->toDateString();

        $plannedMinutes = (int) $user->tasks()
            ->notCompleted()
            ->notArchived()
            ->whereDate('due_date', $today)
            ->sum('estimated_duration');

        $overdueMinutes = (int) $user->tasks()
            ->notCompleted()
            ->notArchived()
            ->where('due_date', '<', $today)
            ->sum('estimated_duration');

        $totalPlanned = $plannedMinutes + $overdueMinutes;
        $capacity = $user->settings?->daily_capacity_minutes;

        return [
            'plannedMinutes' => $totalPlanned,
            'capacityMinutes' => $capacity,
            'overflow' => $capacity !== null && $totalPlanned > $capacity,
            'remainingMinutes' => $capacity !== null ? max(0, $capacity - $totalPlanned) : null,
        ];
    }

    private function buildReason(Task $task, string $today): array
    {
        $priority = $task->priority ?? 'medium';
        $dueDate = $task->due_date?->toDateString();
        $projectName = $task->project?->name;

        if ($dueDate && $dueDate < $today) {
            $msg = 'Overdue';
            if ($priority === 'urgent' || $priority === 'high') {
                $msg .= ' and '.$priority.' priority';
            }
            if ($projectName) {
                $msg .= ' · '.$projectName;
            }

            return ['message' => $msg, 'type' => 'urgent'];
        }

        if ($dueDate === $today) {
            $msg = 'Due today';
            if ($task->due_time) {
                $msg .= ' at '.substr($task->due_time, 0, 5);
            }
            if ($priority === 'urgent') {
                $msg .= ' · urgent';
            }
            if ($projectName) {
                $msg .= ' · '.$projectName;
            }

            return ['message' => $msg, 'type' => 'today'];
        }

        if (! $dueDate && ($priority === 'urgent' || $priority === 'high')) {
            $msg = ucfirst($priority).' priority';
            if ($projectName) {
                $msg .= ' · '.$projectName;
            }
            $msg .= ' — no due date set';

            return ['message' => $msg, 'type' => 'important'];
        }

        if ($dueDate && $dueDate > $today) {
            $days = Carbon::today()->diffInDays(Carbon::parse($dueDate), false);
            $msg = 'Due in '.$days.' day'.($days === 1 ? '' : 's');
            if ($priority === 'urgent' || $priority === 'high') {
                $msg .= ' · '.$priority;
            }
            if ($projectName) {
                $msg .= ' · '.$projectName;
            }

            return ['message' => $msg, 'type' => 'upcoming'];
        }

        return ['message' => 'Scheduled', 'type' => 'info'];
    }
}
