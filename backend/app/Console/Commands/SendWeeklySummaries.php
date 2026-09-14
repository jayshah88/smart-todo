<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\ProductivitySummaryNotification;
use Illuminate\Console\Command;

class SendWeeklySummaries extends Command
{
    protected $signature = 'summaries:weekly {--dry-run : Preview recipients without sending}';

    protected $description = 'Send weekly productivity summaries to opted-in users';

    public function handle(SendDailySummaries $daily): int
    {
        $users = User::query()
            ->whereHas('settings', fn ($q) => $q->where('weekly_summary', true))
            ->whereNotNull('email_verified_at')
            ->get();

        if ($users->isEmpty()) {
            $this->info('No users subscribed to weekly summaries.');

            return self::SUCCESS;
        }

        foreach ($users as $user) {
            $summary = SendDailySummaries::buildSummary($user, 'weekly');

            if ($this->option('dry-run')) {
                $this->line("Would send weekly summary to {$user->email} — completed: {$summary['completed']}");

                continue;
            }

            $user->notify(new ProductivitySummaryNotification($summary));
        }

        $this->info('Weekly summaries dispatched to '.$users->count().' user(s).');

        return self::SUCCESS;
    }
}
