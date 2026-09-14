<?php

namespace App\Models;

use App\Services\RecurrenceService;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory, SoftDeletes;

    protected $attributes = [
        'status' => 'pending',
        'priority' => 'medium',
        'favorite' => false,
        'sort_order' => 0,
    ];

    protected $fillable = [
        'user_id',
        'project_id',
        'title',
        'description',
        'status',
        'priority',
        'due_date',
        'due_time',
        'start_date',
        'completed_at',
        'recurrence_frequency',
        'recurrence_interval',
        'recurrence_weekdays',
        'recurrence_end_date',
        'recurrence_parent_id',
        'reminder_minutes_before',
        'estimated_duration',
        'favorite',
        'archived_at',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date:Y-m-d',
            'start_date' => 'date:Y-m-d',
            'recurrence_end_date' => 'date:Y-m-d',
            'recurrence_weekdays' => 'array',
            'completed_at' => 'datetime',
            'archived_at' => 'datetime',
            'favorite' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function subtasks(): HasMany
    {
        return $this->hasMany(Subtask::class)->orderBy('sort_order');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'task_tag');
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(Reminder::class);
    }

    public function recurrenceParent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'recurrence_parent_id');
    }

    // ---- Scopes ----

    public function scopeCompleted($query)
    {
        return $query->whereNotNull('completed_at');
    }

    public function scopeNotCompleted($query)
    {
        return $query->whereNull('completed_at');
    }

    public function scopeOverdue($query)
    {
        return $query->whereNull('completed_at')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now()->toDateString());
    }

    public function scopeDueToday($query)
    {
        return $query->whereNull('completed_at')
            ->whereDate('due_date', now()->toDateString());
    }

    public function scopeUpcoming($query)
    {
        return $query->whereNull('completed_at')
            ->whereNotNull('due_date')
            ->where('due_date', '>', now()->toDateString());
    }

    public function scopeActive($query)
    {
        return $query->whereNull('completed_at')->whereNull('archived_at');
    }

    public function scopeNotArchived($query)
    {
        return $query->whereNull('archived_at');
    }

    public function scopeArchived($query)
    {
        return $query->whereNotNull('archived_at');
    }

    public function scopeSmartSorted($query)
    {
        return $query->orderByRaw("CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END")
            ->orderByRaw('due_date IS NULL, due_date ASC')
            ->orderBy('sort_order');
    }

    // ---- Smart features ----

    /**
     * Deterministic urgency score (0-100) based on due date proximity and priority.
     */
    public function urgencyScore(): int
    {
        $priorityWeight = match ($this->priority ?? 'medium') {
            'urgent' => 40,
            'high' => 30,
            'medium' => 20,
            'low' => 10,
            default => 20,
        };

        if ($this->status === 'completed') {
            return 0;
        }

        if (! $this->due_date) {
            return $priorityWeight;
        }

        $days = now()->startOfDay()->diffInDays($this->due_date->copy()->startOfDay(), false);

        $deadlineWeight = match (true) {
            $days < 0 => 60,   // overdue
            $days == 0 => 55,  // today
            $days == 1 => 45,
            $days <= 3 => 35,
            $days <= 7 => 25,
            $days <= 14 => 15,
            default => 5,
        };

        return min(100, $priorityWeight + $deadlineWeight);
    }

    /**
     * Suggested priority based on due date proximity (deterministic).
     */
    public function suggestedPriority(): string
    {
        $priority = $this->priority ?? 'medium';

        if ($this->status === 'completed' || ! $this->due_date) {
            return $priority;
        }

        $days = now()->startOfDay()->diffInDays($this->due_date->copy()->startOfDay(), false);

        return match (true) {
            $days < 0 || $days <= 1 => $priority === 'low' ? 'medium' : ($priority === 'medium' ? 'high' : $priority),
            default => $priority,
        };
    }

    public function isRecurring(): bool
    {
        return $this->recurrence_frequency !== null;
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Compute the next occurrence date for a recurring task (without spawning it).
     * Returns null if the task is not recurring or the next date is past the end date.
     */
    public function nextOccurrenceDate(): ?string
    {
        if (! $this->isRecurring() || $this->recurrence_frequency === null) {
            return null;
        }

        $next = app(RecurrenceService::class)->nextDueDate($this);

        return $next?->toDateString();
    }

    /**
     * Compute when the reminder will fire (ISO datetime string).
     * Returns null if no reminder is configured or due date is missing.
     */
    public function reminderAt(): ?string
    {
        if ($this->reminder_minutes_before === null || $this->due_date === null) {
            return null;
        }

        $dueAt = $this->due_date->copy();
        $dueAt = $this->due_time
            ? $dueAt->setTimeFromTimeString($this->due_time)
            : $dueAt->setTime(9, 0);

        return $dueAt->copy()->subMinutes($this->reminder_minutes_before)->toIso8601String();
    }
}
