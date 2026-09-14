<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\Reminder;
use App\Models\Task;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private function userWithSettings(array $overrides = []): User
    {
        $user = User::factory()->create();
        $user->settings()->create(array_merge([
            'theme' => 'system',
            'email_reminders' => false,
            'push_enabled' => false,
            'whatsapp_enabled' => false,
        ], $overrides));

        return $user;
    }

    public function test_in_quiet_hours_handles_overnight_window(): void
    {
        $user = $this->userWithSettings([
            'quiet_hours_start' => '22:00',
            'quiet_hours_end' => '07:00',
        ]);
        $svc = new NotificationService;

        $this->assertTrue($svc->inQuietHours($user->setting(), now()->setTime(23, 30)));
        $this->assertTrue($svc->inQuietHours($user->setting(), now()->setTime(3, 0)));
        $this->assertFalse($svc->inQuietHours($user->setting(), now()->setTime(12, 0)));
    }

    public function test_in_quiet_hours_false_when_not_configured(): void
    {
        $user = $this->userWithSettings();
        $svc = new NotificationService;

        $this->assertFalse($svc->inQuietHours($user->setting()));
    }

    public function test_one_reminder_default_does_not_stack(): void
    {
        $user = $this->userWithSettings();
        $task = Task::factory()->for($user)->create();
        $svc = new NotificationService;

        $first = $svc->createTaskReminderNotification($task, $user);
        $second = $svc->createTaskReminderNotification($task, $user);

        $this->assertNotNull($first);
        $this->assertNull($second);
        $this->assertEquals(1, Notification::forUser($user->id)->count());
    }

    public function test_dispatch_reminder_defers_push_in_quiet_hours(): void
    {
        $user = $this->userWithSettings([
            'quiet_hours_start' => '00:00',
            'quiet_hours_end' => '23:59',
            'push_enabled' => true,
            'whatsapp_enabled' => true,
        ]);
        $task = Task::factory()->for($user)->create();
        $reminder = Reminder::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'remind_at' => now()->subMinute(),
        ]);

        $channels = (new NotificationService)->dispatchReminder($reminder);

        $this->assertContains('in_app', $channels);
        $this->assertContains('quiet_hours_deferred', $channels);
        $this->assertNotContains('push', $channels);
        $this->assertNotContains('whatsapp', $channels);
    }

    public function test_whatsapp_deep_link_with_and_without_phone(): void
    {
        $user = $this->userWithSettings();
        $task = Task::factory()->for($user)->create(['title' => 'Buy milk']);
        $svc = new NotificationService;

        $this->assertStringStartsWith('https://wa.me/15551234567?text=', $svc->whatsappDeepLink($task, '+1 (555) 123-4567'));
        $this->assertStringStartsWith('https://wa.me/?text=', $svc->whatsappDeepLink($task));
    }

    public function test_notifications_require_auth_and_scope_to_owner(): void
    {
        $user = $this->userWithSettings();
        $other = $this->userWithSettings();
        $task = Task::factory()->for($other)->create();
        $note = Notification::create([
            'user_id' => $other->id,
            'task_id' => $task->id,
            'type' => 'reminder',
            'title' => 'Reminder: x',
            'channel' => 'in_app',
        ]);

        $this->getJson('/api/notifications')->assertUnauthorized();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/notifications/{$note->id}/read")
            ->assertForbidden();
    }

    public function test_unread_count_and_mark_read_flow(): void
    {
        $user = $this->userWithSettings();
        $task = Task::factory()->for($user)->create();
        $note = Notification::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'type' => 'reminder',
            'title' => 'Reminder: x',
            'channel' => 'in_app',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.unreadCount', 1);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/notifications/{$note->id}/read")
            ->assertOk();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.unreadCount', 0);
    }

    public function test_settings_update_accepts_notification_fields(): void
    {
        $user = $this->userWithSettings();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile/settings', [
                'push_enabled' => true,
                'whatsapp_enabled' => true,
                'whatsapp_phone' => '+15551234567',
                'quiet_hours_start' => '22:00',
                'quiet_hours_end' => '07:00',
                'digest_mode' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.pushEnabled', true)
            ->assertJsonPath('data.whatsappEnabled', true)
            ->assertJsonPath('data.quietHoursStart', '22:00')
            ->assertJsonPath('data.digestMode', true);

        $this->assertEquals('+15551234567', $user->setting()->fresh()->whatsapp_phone);
    }

    public function test_settings_reject_bad_quiet_hours_format(): void
    {
        $user = $this->userWithSettings();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile/settings', ['quiet_hours_start' => 'midnight'])
            ->assertStatus(422);
    }

    public function test_notification_list_supports_unread_filter(): void
    {
        $user = $this->userWithSettings();
        $task = Task::factory()->for($user)->create();

        Notification::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'type' => 'reminder',
            'title' => 'Read one',
            'channel' => 'in_app',
            'read_at' => now(),
        ]);
        Notification::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'type' => 'reminder',
            'title' => 'Unread one',
            'channel' => 'in_app',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications?unread=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Unread one');
    }

    public function test_mark_all_as_read(): void
    {
        $user = $this->userWithSettings();
        $task = Task::factory()->for($user)->create();

        Notification::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'type' => 'reminder',
            'title' => 'One',
            'channel' => 'in_app',
        ]);
        Notification::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'type' => 'reminder',
            'title' => 'Two',
            'channel' => 'in_app',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/notifications/read-all')
            ->assertOk();

        $this->assertEquals(0, Notification::forUser($user->id)->unread()->count());
    }
}
