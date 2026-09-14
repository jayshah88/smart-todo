<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        $dueDate = $this->faker->optional(0.8)->dateTimeBetween('-7 days', '+14 days');

        return [
            'user_id' => User::factory(),
            'project_id' => null,
            'title' => $this->faker->sentence(4),
            'description' => $this->faker->optional()->paragraph(),
            'status' => 'pending',
            'priority' => $this->faker->randomElement(['low', 'medium', 'high', 'urgent']),
            'due_date' => $dueDate !== null ? $dueDate->format('Y-m-d') : null,
            'due_time' => $this->faker->optional()->time('H:i'),
            'start_date' => null,
            'completed_at' => null,
            'favorite' => $this->faker->boolean(20),
            'archived_at' => null,
            'sort_order' => 0,
        ];
    }

    public function forUser(User $user): static
    {
        return $this->state(fn () => ['user_id' => $user->id]);
    }

    public function inProject(Project $project): static
    {
        return $this->state(fn () => ['user_id' => $project->user_id, 'project_id' => $project->id]);
    }

    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    public function overdue(): static
    {
        return $this->state(fn () => [
            'due_date' => $this->faker->dateTimeBetween('-14 days', '-1 day')->format('Y-m-d'),
        ]);
    }

    public function dueToday(): static
    {
        return $this->state(fn () => ['due_date' => now()->toDateString()]);
    }

    public function upcoming(): static
    {
        return $this->state(fn () => ['due_date' => now()->addDays(3)->toDateString()]);
    }

    public function archived(): static
    {
        return $this->state(fn () => ['archived_at' => now()]);
    }

    public function recurring(): static
    {
        return $this->state(fn () => [
            'recurrence_frequency' => 'daily',
            'recurrence_interval' => 1,
        ]);
    }

    public function urgent(): static
    {
        return $this->state(fn () => ['priority' => 'urgent']);
    }
}
