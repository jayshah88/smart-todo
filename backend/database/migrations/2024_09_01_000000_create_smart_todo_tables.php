<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // User profile additions
        Schema::table('users', function (Blueprint $table) {
            $table->string('timezone', 64)->default('UTC')->after('password');
            $table->boolean('is_demo')->default(false)->after('timezone');
        });

        Schema::create('user_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('theme', 16)->default('system'); // light | dark | system
            $table->boolean('email_reminders')->default(true);
            $table->boolean('daily_summary')->default(true);
            $table->boolean('weekly_summary')->default(true);
            $table->timestamps();
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 9)->default('#6366f1');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['user_id', 'sort_order']);
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 9)->default('#64748b');
            $table->timestamps();
            $table->unique(['user_id', 'name']);
            $table->index('user_id');
        });
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained()->cascadeOnDelete(); // null = Inbox
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->date('due_date')->nullable();
            $table->time('due_time')->nullable();
            $table->date('start_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            // Recurrence: relational columns, not blob JSON
            $table->string('recurrence_frequency', 16)->nullable(); // daily|weekly|monthly|yearly
            $table->unsignedTinyInteger('recurrence_interval')->nullable(); // every N periods
            $table->json('recurrence_weekdays')->nullable(); // [1..7] for weekly
            $table->date('recurrence_end_date')->nullable();
            $table->foreignId('recurrence_parent_id')->nullable()->constrained('tasks')->nullOnDelete();
            // Reminder config: minutes before due (null = no reminder)
            $table->unsignedInteger('reminder_minutes_before')->nullable();
            $table->boolean('favorite')->default(false)->index();
            $table->timestamp('archived_at')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status', 'archived_at']);
            $table->index(['user_id', 'due_date']);
            $table->index(['user_id', 'priority']);
            $table->index(['user_id', 'project_id']);
            $table->index('completed_at');
        });

        Schema::create('subtasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->boolean('completed')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['task_id', 'sort_order']);
        });

        Schema::create('task_tag', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->unique(['task_id', 'tag_id']);
            $table->index('tag_id');
        });

        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('remind_at')->index();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
            $table->index(['sent_at', 'remind_at']);
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 32); // created|completed|reopened|deleted|updated|restored|archived
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('reminders');
        Schema::dropIfExists('task_tag');
        Schema::dropIfExists('subtasks');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('user_settings');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['timezone', 'is_demo']);
        });
    }
};
