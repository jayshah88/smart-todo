<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly Task $task) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if ($notifiable->setting()->email_reminders) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $due = $this->task->due_date?->format('M j, Y');
        $time = $this->task->due_time ? ' at '.$this->task->due_time : '';

        return (new MailMessage)
            ->subject("Reminder: {$this->task->title}")
            ->greeting("Hi {$notifiable->name},")
            ->line("This is a reminder for your task: **{$this->task->title}**")
            ->line($due !== null ? "It is due {$due}{$time}." : 'Take a look when you get a chance.')
            ->action('Open Task', config('app.frontend_url').'/tasks/'.$this->task->id)
            ->line('Stay productive!');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'task_id' => $this->task->id,
            'title' => $this->task->title,
            'due_date' => $this->task->due_date?->format('Y-m-d'),
            'due_time' => $this->task->due_time,
            'type' => 'reminder',
        ];
    }
}
