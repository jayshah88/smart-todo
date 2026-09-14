<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ProductivitySummaryNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array{period: string, completed: int, pending: int, overdue: int, streak: int}  $summary
     */
    public function __construct(private readonly array $summary) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $period = $this->summary['period'] === 'daily' ? 'Daily' : 'Weekly';

        $mail = (new MailMessage)
            ->subject("Your {$period} Productivity Summary")
            ->greeting("Hi {$notifiable->name},")
            ->line("Here's your {$period} summary:");

        $mail->line("✅ Completed: {$this->summary['completed']}");
        $mail->line('📌 Still pending: '.$this->summary['pending']);
        $mail->line("⏰ Overdue: {$this->summary['overdue']}");
        $mail->line("🔥 Current streak: {$this->summary['streak']} day(s)");

        return $mail
            ->action('View Dashboard', config('app.frontend_url').'/dashboard')
            ->line('Keep up the great work!');
    }
}
