<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_user_can_create_task(): void
    {
        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/tasks', [
                'title' => 'Write report',
                'priority' => 'high',
                'due_date' => '2030-01-15',
            ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Write report')
            ->assertJsonPath('data.priority', 'high');

        $this->assertDatabaseHas('tasks', [
            'user_id' => $this->user->id,
            'title' => 'Write report',
        ]);
    }

    public function test_create_validates_required_title(): void
    {
        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/tasks', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_create_rejects_invalid_priority(): void
    {
        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/tasks', ['title' => 'X', 'priority' => 'extreme'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['priority']);
    }

    public function test_create_rejects_project_owned_by_other_user(): void
    {
        $foreignProject = Project::factory()->create();

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/tasks', ['title' => 'X', 'project_id' => $foreignProject->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['project_id']);
    }

    public function test_user_cannot_access_other_users_task(): void
    {
        $other = User::factory()->create();
        $task = Task::factory()->forUser($other)->create();

        $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/tasks/{$task->id}")
            ->assertStatus(403);

        $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/tasks/{$task->id}", ['title' => 'Hacked'])
            ->assertStatus(403);

        $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/tasks/{$task->id}")
            ->assertStatus(403);
    }

    public function test_index_only_returns_own_tasks(): void
    {
        $other = User::factory()->create();
        Task::factory()->count(3)->forUser($this->user)->create();
        Task::factory()->count(2)->forUser($other)->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/tasks');

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }

    public function test_complete_marks_task_completed(): void
    {
        $task = Task::factory()->forUser($this->user)->create();

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        $this->assertNotNull($task->fresh()->completed_at);
    }

    public function test_complete_generates_next_recurrence(): void
    {
        $tag = $this->user->tags()->create(['name' => 'routine', 'color' => '#10b981']);
        $task = Task::factory()->forUser($this->user)->recurring()->dueToday()->create([
            'reminder_minutes_before' => 30,
            'due_time' => '10:00',
        ]);
        $task->tags()->attach($tag->id);
        $subtask = $task->subtasks()->create(['title' => 'Step', 'sort_order' => 0]);

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/complete")
            ->assertOk();

        $this->assertDatabaseHas('tasks', [
            'recurrence_parent_id' => $task->id,
            'status' => 'pending',
        ]);

        $next = Task::where('recurrence_parent_id', $task->id)->first();
        $this->assertSame($task->due_date->addDay()->toDateString(), $next->due_date->toDateString());
        $this->assertDatabaseHas('subtasks', [
            'task_id' => $next->id,
            'title' => $subtask->title,
            'completed' => false,
        ]);
        $this->assertTrue($next->tags->contains($tag->id));
        $this->assertDatabaseHas('reminders', [
            'task_id' => $next->id,
            'user_id' => $this->user->id,
            'sent_at' => null,
        ]);
    }

    public function test_duplicate_creates_copy(): void
    {
        $task = Task::factory()->forUser($this->user)->create(['title' => 'Original']);

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/duplicate")
            ->assertCreated()
            ->assertJsonPath('data.title', 'Original (copy)');

        $this->assertDatabaseCount('tasks', 2);
    }

    public function test_archive_and_restore(): void
    {
        $task = Task::factory()->forUser($this->user)->create();

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/archive")
            ->assertOk()
            ->assertJsonPath('data.archived', true);

        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonCount(0, 'data'); // hidden from default list

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/restore")
            ->assertOk()
            ->assertJsonPath('data.archived', false);
    }

    public function test_bulk_delete_only_affects_own_tasks(): void
    {
        $other = User::factory()->create();
        $own = Task::factory()->forUser($this->user)->create();
        $foreign = Task::factory()->forUser($other)->create();

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/tasks/bulk', [
                'action' => 'delete',
                'ids' => [$own->id, $foreign->id],
            ])
            ->assertOk()
            ->assertJsonPath('affected', 1);

        $this->assertSoftDeleted($own);
        $this->assertDatabaseHas('tasks', ['id' => $foreign->id]);
    }

    public function test_view_filters(): void
    {
        Task::factory()->forUser($this->user)->overdue()->create();
        Task::factory()->forUser($this->user)->dueToday()->create();
        Task::factory()->forUser($this->user)->upcoming()->create();
        Task::factory()->forUser($this->user)->completed()->create();

        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/tasks?view=overdue')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/tasks?view=today')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/tasks?view=upcoming')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/tasks?view=completed')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_search_filters_by_title(): void
    {
        Task::factory()->forUser($this->user)->create(['title' => 'Buy groceries']);
        Task::factory()->forUser($this->user)->create(['title' => 'Write essay']);

        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/tasks?search=groceries')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_reopen_recreates_pending_reminder(): void
    {
        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/tasks', [
                'title' => 'Reminder flow',
                'due_date' => now()->addDays(2)->toDateString(),
                'due_time' => '10:00',
                'reminder_minutes_before' => 30,
            ])
            ->assertCreated();
        $this->assertDatabaseCount('reminders', 1); // created with the task

        $task = Task::where('title', 'Reminder flow')->firstOrFail();

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/complete")
            ->assertOk();
        $this->assertDatabaseCount('reminders', 0); // completing removes pending reminders

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/reopen")
            ->assertOk();
        $this->assertDatabaseCount('reminders', 1); // reopening re-creates the reminder
    }

    public function test_duplicate_copies_subtasks_as_uncompleted(): void
    {
        $task = Task::factory()->forUser($this->user)->create(['title' => 'Original']);
        $task->subtasks()->create(['title' => 'Step one', 'completed' => true, 'sort_order' => 0]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/duplicate")
            ->assertCreated()
            ->assertJsonPath('data.title', 'Original (copy)');

        $copyId = $response->json('data.id');

        $this->assertDatabaseHas('subtasks', [
            'task_id' => $copyId,
            'title' => 'Step one',
            'completed' => false,
        ]);
        $this->assertDatabaseHas('subtasks', [
            'task_id' => $task->id,
            'title' => 'Step one',
            'completed' => true,
        ]);
    }
}
