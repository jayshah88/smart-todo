<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_download_contains_user_data(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create(['name' => 'Work']);
        $tag = Tag::factory()->for($user)->create(['name' => 'urgent']);
        $task = Task::factory()->for($user)->create(['title' => 'Export me', 'project_id' => $project->id]);
        $task->tags()->attach($task->id, ['tag_id' => $tag->id]);

        $response = $this->actingAs($user)->getJson('/api/export');

        $response->assertOk();
        $response->assertHeader('content-type', 'application/json');
        $response->assertHeader('content-disposition');
        $json = $response->json();
        $this->assertSame('Export me', $json['tasks'][0]['title']);
        $this->assertSame('Work', $json['tasks'][0]['project']);
        $this->assertContains('urgent', $json['tasks'][0]['tags']);
    }

    public function test_export_summary_counts_are_user_scoped(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        Task::factory()->for($user)->count(2)->create();
        Task::factory()->for($other)->count(5)->create();

        $response = $this->actingAs($user)->getJson('/api/export/summary');

        $response->assertOk()->assertJsonPath('data.tasks', 2);
    }

    public function test_export_requires_auth(): void
    {
        $this->getJson('/api/export')->assertUnauthorized();
        $this->getJson('/api/export/summary')->assertUnauthorized();
    }
}
