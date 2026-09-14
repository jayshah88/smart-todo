<?php

namespace App\Console\Commands;

use App\Models\Reminder;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendTaskReminders extends Command
{
    protected $signature = 'reminders:send {--dry-run : Show what would be sent without sending}';

    protected $description = 'Send due task reminders (via queue)';

    public function handle(NotificationService $notifications): int
    {
        $due = Reminder::query()
            ->whereNull('sent_at')
            ->where('remind_at', '<=', now())
            ->with(['task', 'user'])
            ->get();

        if ($due->isEmpty()) {
            $this->info('No reminders due.');

            return self::SUCCESS;
        }

        foreach ($due as $reminder) {
            if ($reminder->task === null || $reminder->task->completed_at !== null) {
                $reminder->update(['sent_at' => now()]);

                continue;
            }

            if ($this->option('dry-run')) {
                $this->line("Would send reminder for: {$reminder->task->title}");

                continue;
            }

            $channels = $notifications->dispatchReminder($reminder);
            $reminder->update(['sent_at' => now()]);
            $this->line("Sent reminder for: {$reminder->task->title} [".implode(',', $channels).']');
        }

        $this->info('Reminders dispatched: '.$due->count());

        return self::SUCCESS;
    }
}
