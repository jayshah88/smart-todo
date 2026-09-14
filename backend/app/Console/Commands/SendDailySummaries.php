<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\ProductivitySummaryNotification;
use App\Services\DashboardService;
use Illuminate\Console\Command;

class SendDailySummaries extends Command
{
    protected $signature = 'summaries:daily {--dry-run : Preview recipients without sending}';

    protected $description = 'Send daily productivity summaries to opted-in users';

    public function handle(): int
    {
        $users = User::query()
            ->whereHas('settings', fn ($q) => $q->where('daily_summary', true))
            ->whereNotNull('email_verified_at')
            ->with('settings')
            ->get();

        if ($users->isEmpty()) {
            $this->info('No users subscribed to daily summaries.');

            return self::SUCCESS;
        }

        foreach ($users as $user) {
            $summary = $this->buildSummary($user, 'daily');

            if ($this->option('dry-run')) {
                $this->line("Would send daily summary to {$user->email} — completed: {$summary['completed']}");

                continue;
            }

            $user->notify(new ProductivitySummaryNotification($summary));
        }

        $this->info('Daily summaries dispatched to '.$users->count().' user(s).');

        return self::SUCCESS;
    }

    public static function buildSummary(User $user, string $period): array
    {
        $since = $period === 'daily' ? now()->subDay() : now()->subWeek();

        return [
            'period' => $period,
            'completed' => $user->tasks()->whereNotNull('completed_at')->where('completed_at', '>=', $since)->count(),
            'pending' => $user->tasks()->whereNull('completed_at')->whereNull('archived_at')->count(),
            'overdue' => $user->tasks()->overdue()->notArchived()->count(),
            'streak' => app(DashboardService::class)->streak($user)['current'],
        ];
    }
}
