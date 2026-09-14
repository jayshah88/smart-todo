<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Dashboard statistics and deterministic productivity insights.
 */
class DashboardService
{
    public function stats(User $user): array
    {
        $today = Carbon::today();

        $counts = $user->tasks()
            ->selectRaw('COUNT(*) as total,
                SUM(CASE WHEN completed_at IS NULL AND due_date IS NOT NULL AND due_date < ? THEN 1 ELSE 0 END) as overdue,
                SUM(CASE WHEN completed_at IS NULL AND due_date IS NOT NULL AND due_date = ? THEN 1 ELSE 0 END) as due_today,
                SUM(CASE WHEN completed_at IS NULL AND (due_date IS NULL OR due_date > ?) THEN 1 ELSE 0 END) as upcoming,
                SUM(CASE WHEN completed_at IS NOT NULL AND DATE(completed_at) = ? THEN 1 ELSE 0 END) as completed_today,
                SUM(CASE WHEN completed_at IS NOT NULL AND DATE(completed_at) >= ? THEN 1 ELSE 0 END) as completed_week', [
                $today->toDateString(), $today->toDateString(), $today->toDateString(),
                $today->toDateString(), $today->copy()->subDays(6)->toDateString(),
            ])
            ->first();

        $priorityBreakdown = $user->tasks()->whereNull('completed_at')
            ->select('priority', DB::raw('COUNT(*) as count'))
            ->groupBy('priority')
            ->pluck('count', 'priority');

        $total = (int) $counts->total;
        $completed = (int) $user->tasks()->whereNotNull('completed_at')->count();
        $completionRate = $total > 0 ? round($completed / $total * 100) : 0;

        return [
            'today' => [
                'overdue' => (int) $counts->overdue,
                'dueToday' => (int) $counts->due_today,
                'upcoming' => (int) $counts->upcoming,
                'completedToday' => (int) $counts->completed_today,
                'completedWeek' => (int) $counts->completed_week,
            ],
            'priorityBreakdown' => [
                'urgent' => (int) ($priorityBreakdown['urgent'] ?? 0),
                'high' => (int) ($priorityBreakdown['high'] ?? 0),
                'medium' => (int) ($priorityBreakdown['medium'] ?? 0),
                'low' => (int) ($priorityBreakdown['low'] ?? 0),
            ],
            'completionRate' => (int) $completionRate,
            'streak' => $this->streak($user),
            'insights' => $this->insights($user, (int) $counts->overdue, (int) $counts->due_today),
        ];
    }

    public function streak(User $user): array
    {
        $completionDates = $user->tasks()
            ->whereNotNull('completed_at')
            ->selectRaw('DATE(completed_at) as date')
            ->distinct()
            ->orderByRaw('DATE(completed_at) DESC')
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->all();

        if (empty($completionDates)) {
            return ['current' => 0, 'longest' => 0];
        }

        $current = 0;
        $cursor = Carbon::today();

        if ($cursor->toDateString() !== $completionDates[0]
            && $cursor->copy()->subDay()->toDateString() !== $completionDates[0]) {
            $cursor = Carbon::parse($completionDates[0]);
        }

        $dateSet = array_flip($completionDates);
        while (isset($dateSet[$cursor->toDateString()])) {
            $current++;
            $cursor->subDay();
        }

        return ['current' => $current, 'longest' => $this->longestStreak($completionDates)];
    }

    private function longestStreak(array $dates): int
    {
        $longest = 0;
        $run = 0;
        $previous = null;

        foreach ($dates as $date) {
            $carbon = Carbon::parse($date);

            if ($previous !== null && $previous->copy()->subDay()->toDateString() === $date) {
                $run++;
            } else {
                $run = 1;
            }

            $longest = max($longest, $run);
            $previous = $carbon;
        }

        return $longest;
    }

    public function weekly(User $user): array
    {
        $start = Carbon::today()->subDays(6);

        $daily = $user->tasks()
            ->whereNotNull('completed_at')
            ->whereDate('completed_at', '>=', $start)
            ->selectRaw('DATE(completed_at) as date, COUNT(*) as completed')
            ->groupByRaw('DATE(completed_at)')
            ->pluck('completed', 'date');

        $result = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $result[] = [
                'date' => $date->toDateString(),
                'day' => $date->format('D'),
                'completed' => (int) ($daily[$date->toDateString()] ?? 0),
            ];
        }

        return $result;
    }

    public function recentActivity(User $user, int $limit = 10): array
    {
        return ActivityLog::query()
            ->where('user_id', $user->id)
            ->with('task:id,title')
            ->latest('id')
            ->limit($limit)
            ->get()
            ->all();
    }

    /**
     * Deterministic smart insights based on the user's data.
     */
    private function insights(User $user, int $overdue, int $dueToday): array
    {
        $insights = [];

        if ($overdue > 0) {
            $insights[] = [
                'type' => 'warning',
                'message' => $overdue === 1
                    ? 'You have 1 overdue task. Reschedule or complete it now.'
                    : "You have {$overdue} overdue tasks. Reschedule or complete them now.",
            ];
        }

        if ($dueToday > 0) {
            $insights[] = [
                'type' => 'info',
                'message' => $dueToday === 1
                    ? '1 task is due today — start with the most urgent.'
                    : "{$dueToday} tasks are due today — start with the most urgent.",
            ];
        }

        $streak = $this->streak($user);
        if ($streak['current'] >= 3) {
            $insights[] = [
                'type' => 'success',
                'message' => "You're on a {$streak['current']}-day completion streak. Keep it going!",
            ];
        }

        $inbox = $user->tasks()->whereNull('project_id')->notCompleted()->notArchived()->count();
        if ($inbox > 5) {
            $insights[] = [
                'type' => 'info',
                'message' => "Your Inbox has {$inbox} unprocessed tasks. Consider organizing them into projects.",
            ];
        }

        if (empty($insights)) {
            $insights[] = [
                'type' => 'success',
                'message' => 'All clear! Add your next task or enjoy the free time.',
            ];
        }

        return $insights;
    }
}
