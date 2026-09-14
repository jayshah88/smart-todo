<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_returns_stats_for_authenticated_user(): void
    {
        $user = User::factory()->create();
        Task::factory()->count(3)->forUser($user)->overdue()->create();
        Task::factory()->count(2)->forUser($user)->dueToday()->create();
        Task::factory()->count(4)->forUser($user)->completed()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/dashboard')
            ->assertOk();

        $this->assertSame(3, $response->json('data.today.overdue'));
        $this->assertSame(2, $response->json('data.today.dueToday'));
        $this->assertSame(4, $response->json('data.today.completedWeek'));
        $this->assertArrayHasKey('streak', $response->json('data'));
        $this->assertArrayHasKey('insights', $response->json('data'));
    }

    public function test_dashboard_is_user_scoped(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        Task::factory()->count(2)->forUser($other)->overdue()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/dashboard');

        $this->assertSame(0, $response->json('data.today.overdue'));
    }

    public function test_dashboard_requires_authentication(): void
    {
        $this->getJson('/api/dashboard')->assertStatus(401);
    }
}
