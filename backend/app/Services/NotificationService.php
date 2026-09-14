<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Reminder;
use App\Models\Task;
use App\Models\User;
use App\Models\UserSetting;
use App\Notifications\TaskReminderNotification;
use Illuminate\Support\Carbon;

/**
 * Phase 5 notification backbone: creates in-app notification records,
 * enforces calm-notification rules (one-reminder default, quiet hours),
 * and dispatches across channels (in-app, email, push hook, WhatsApp hook).
 *
 * External providers (push / WhatsApp) are pluggable: if not configured,
 * records are stored in-app and email channel is used when enabled.
 */
class NotificationService
{
    /**
     * Whether the current time falls inside the user's quiet-hours window.
     * HH:MM strings, overnight ranges (e.g. 22:00-07:00) supported.
     */
    public function inQuietHours(UserSetting $settings, ?Carbon $at = null): bool
    {
        if (empty($settings->quiet_hours_start) || empty($settings->quiet_hours_end)) {
            return false;
        }

        $at ??= now();
        $start = Carbon::createFromFormat('H:i', $settings->quiet_hours_start);
        $end = Carbon::createFromFormat('H:i', $settings->quiet_hours_end);

        if ($start === false || $end === false) {
            return false;
        }

        $minutes = $at->hour * 60 + $at->minute;
        $s = $start->hour * 60 + $start->minute;
        $e = $end->hour * 60 + $end->minute;

        if ($s === $e) {
            return false;
        }

        // Overnight window wraps past midnight.
        if ($s > $e) {
            return $minutes >= $s || $minutes < $e;
        }

        return $minutes >= $s && $minutes < $e;
    }

    /**
     * Create an in-app notification record for a task reminder.
     * One-reminder default: skips if an unread reminder already exists for the task.
     */
    public function createTaskReminderNotification(Task $task, User $user, string $channel = 'in_app'): ?Notification
    {
        $existing = Notification::forUser($user->id)
            ->where('task_id', $task->id)
            ->where('type', 'reminder')
            ->unread()
            ->exists();

        if ($existing) {
            return null; // one-reminder default: don't stack duplicates
        }

        $due = $task->due_date?->format('M j, Y');
        $time = $task->due_time ? " at {$task->due_time}" : '';

        return Notification::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'type' => 'reminder',
            'title' => "Reminder: {$task->title}",
            'body' => $due !== null ? "Due {$due}{$time}." : 'Take a look when you get a chance.',
            'channel' => $channel,
            'sent_at' => now(),
            'metadata' => [
                'priority' => $task->priority,
                'due_date' => $task->due_date?->format('Y-m-d'),
                'due_time' => $task->due_time,
            ],
        ]);
    }

    /**
     * Dispatch a due reminder across channels.
     * Returns the list of channels actually used.
     */
    public function dispatchReminder(Reminder $reminder): array
    {
        $task = $reminder->task;
        $user = $reminder->user;

        if ($task === null || $user === null || $task->completed_at !== null) {
            return [];
        }

        $settings = $user->setting();
        $used = ['in_app'];

        // Always create the in-app record (calm rules enforced inside).
        $this->createTaskReminderNotification($task, $user);

        // Email via existing Laravel notification (respects email_reminders setting).
        if ($settings->email_reminders) {
            $user->notify(new TaskReminderNotification($task));
            $used[] = 'email';
        }

        // Quiet hours: suppress push/whatsapp nudges, keep in-app + email.
        $quiet = $this->inQuietHours($settings);
        if ($quiet) {
            $used[] = 'quiet_hours_deferred';

            return $used;
        }

        // Push + WhatsApp are opt-in hooks. Without a configured provider we
        // record intent in metadata so the frontend can surface deep links.
        if ($settings->push_enabled) {
            $this->createTaskReminderNotification($task, $user, 'push');
            $used[] = 'push';
        }

        if ($settings->whatsapp_enabled) {
            $this->createTaskReminderNotification($task, $user, 'whatsapp');
            $used[] = 'whatsapp';
        }

        return $used;
    }

    /**
     * WhatsApp deep-link fallback: wa.me URL with prefilled reminder text.
     * Used when no provider is configured or on mobile.
     */
    public function whatsappDeepLink(Task $task, ?string $phone = null): string
    {
        $text = rawurlencode("Reminder: {$task->title}".($task->due_date ? ' (due '.$task->due_date->format('M j, Y').')' : ''));
        $phone = preg_replace('/\D+/', '', (string) $phone);

        return $phone !== ''
            ? "https://wa.me/{$phone}?text={$text}"
            : "https://wa.me/?text={$text}";
    }
}
