<?php

namespace App\Services;

use App\Models\Task;
use Carbon\Carbon;
use Carbon\CarbonInterface;

/**
 * Deterministic recurrence engine: computes the next occurrence date
 * for a recurring task after completion.
 */
class RecurrenceService
{
    public function nextDueDate(Task $task): ?Carbon
    {
        $frequency = $task->recurrence_frequency;
        $interval = max(1, (int) $task->recurrence_interval);
        $base = $task->due_date ? Carbon::parse($task->due_date) : Carbon::today();

        $next = match ($frequency) {
            'daily' => $this->nextDaily($base, $interval, $task),
            'weekly' => $this->nextWeekly($base, $interval, $task),
            'monthly' => $base->copy()->addMonthsNoOverflow($interval),
            'yearly' => $base->copy()->addYearsNoOverflow($interval),
            default => null,
        };

        if ($next === null) {
            return null;
        }

        if ($task->recurrence_end_date && $next->gt(Carbon::parse($task->recurrence_end_date))) {
            return null;
        }

        return $next;
    }

    private function nextDaily(Carbon $base, int $interval, Task $task): Carbon
    {
        // "Every weekday" pattern (Mon-Fri)
        if ($task->recurrence_weekdays === [1, 2, 3, 4, 5]) {
            $next = $base->copy()->addDay();

            while (in_array($next->dayOfWeekIso, [6, 7], true)) {
                $next->addDay();
            }

            return $next;
        }

        return $base->copy()->addDays($interval);
    }

    private function nextWeekly(Carbon $base, int $interval, Task $task): Carbon
    {
        $weekdays = $task->recurrence_weekdays;

        if (empty($weekdays)) {
            return $base->copy()->addWeeks($interval);
        }

        sort($weekdays);
        $next = $base->copy()->addDay();

        // Find the next allowed weekday, allowing up to $interval extra weeks
        for ($i = 0; $i < 7 * ($interval + 1); $i++) {
            if (in_array($next->dayOfWeekIso, $weekdays, true)
                && $this->weeksBetween($base, $next) % $interval === 0) {
                return $next;
            }

            $next->addDay();
        }

        return $base->copy()->addWeeks($interval);
    }

    private function weeksBetween(CarbonInterface $from, CarbonInterface $to): int
    {
        return intdiv($from->copy()->startOfWeek()->diffInDays($to->copy()->startOfWeek()), 7);
    }
}
