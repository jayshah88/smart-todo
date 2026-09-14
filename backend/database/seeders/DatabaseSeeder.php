<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;
use App\Models\UserSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Starter account for local development
        $user = User::firstOrCreate(
            ['email' => 'demo@smarttodo.app'],
            [
                'name' => 'Demo User',
                'password' => Hash::make(env('DEMO_USER_PASSWORD', 'change-me-on-first-login')),
                'timezone' => 'UTC',
                'email_verified_at' => now(),
            ]
        );

        $user->settings()->firstOrCreate([], UserSetting::getDefaultAttributes());

        $projects = collect([
            ['name' => 'Work', 'color' => '#6366f1'],
            ['name' => 'Personal', 'color' => '#10b981'],
            ['name' => 'Learning', 'color' => '#f59e0b'],
        ])->map(fn (array $p) => $user->projects()->firstOrCreate(
            ['name' => $p['name']],
            ['color' => $p['color']]
        ));

        $tags = collect([
            ['name' => 'deep-work', 'color' => '#8b5cf6'],
            ['name' => 'quick', 'color' => '#14b8a6'],
            ['name' => 'errand', 'color' => '#f43f5e'],
        ])->map(fn (array $t) => $user->tags()->firstOrCreate(
            ['name' => $t['name']],
            ['color' => $t['color']]
        ));

        if ($user->tasks()->exists()) {
            return; // already seeded
        }

        $this->seedTask($user, $projects[0], $tags, [
            'title' => 'Prepare quarterly roadmap presentation',
            'description' => 'Gather metrics from the last quarter and outline goals for the next one.',
            'priority' => 'urgent',
            'due_date' => now()->toDateString(),
            'due_time' => '16:00',
            'reminder_minutes_before' => 60,
        ], ['Draft key metrics', 'Write outline', 'Build slides']);

        $this->seedTask($user, $projects[1], $tags, [
            'title' => 'Book dentist appointment',
            'priority' => 'medium',
            'due_date' => now()->subDays(2)->toDateString(),
        ]);

        $this->seedTask($user, $projects[2], $tags, [
            'title' => 'Finish Laravel testing chapter',
            'priority' => 'high',
            'due_date' => now()->addDays(2)->toDateString(),
            'reminder_minutes_before' => 30,
        ], ['Read chapter', 'Do exercises']);

        $this->seedTask($user, $projects[0], $tags, [
            'title' => 'Weekly team sync agenda',
            'priority' => 'medium',
            'due_date' => now()->addDays(4)->toDateString(),
        ]);

        $this->seedTask($user, $projects[1], $tags, [
            'title' => 'Morning stretch routine',
            'priority' => 'low',
            'recurrence_frequency' => 'daily',
            'recurrence_interval' => 1,
            'due_date' => now()->toDateString(),
        ]);

        Task::factory()
            ->count(12)
            ->forUser($user)
            ->sequence(fn ($sequence) => [
                'project_id' => $projects->random()->id,
            ])
            ->create();

        // A handful of completed tasks for stats
        Task::factory()->completed()->count(15)->forUser($user)->create();
    }

    private function seedTask(
        User $user,
        Project $project,
        $tags,
        array $attributes,
        array $subtasks = [],
    ): Task {
        $task = $user->tasks()->create(array_merge([
            'project_id' => $project->id,
            'status' => 'pending',
        ], $attributes));

        $task->tags()->sync($tags->random(min(2, $tags->count()))->pluck('id'));

        foreach ($subtasks as $i => $title) {
            Subtask::create([
                'task_id' => $task->id,
                'title' => $title,
                'completed' => false,
                'sort_order' => $i,
            ]);
        }

        return $task;
    }
}
