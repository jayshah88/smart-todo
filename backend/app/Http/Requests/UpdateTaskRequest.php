<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'status' => ['sometimes', Rule::in(['pending', 'in_progress', 'completed'])],
            'due_date' => ['nullable', 'date'],
            'due_time' => ['nullable', 'date_format:H:i'],
            'start_date' => ['nullable', 'date'],
            'project_id' => [
                'nullable',
                Rule::exists('projects', 'id')->where('user_id', $this->user()->id),
            ],
            'tag_ids' => ['nullable', 'array', 'max:20'],
            'tag_ids.*' => [Rule::exists('tags', 'id')->where('user_id', $this->user()->id)],
            'recurrence' => ['nullable', 'array'],
            'recurrence.frequency' => [
                'required_with:recurrence',
                Rule::in(['daily', 'weekly', 'monthly', 'yearly']),
            ],
            'recurrence.interval' => ['nullable', 'integer', 'min:1', 'max:52'],
            'recurrence.weekdays' => ['nullable', 'array', 'max:7'],
            'recurrence.weekdays.*' => ['integer', 'between:1,7'],
            'recurrence.end_date' => ['nullable', 'date'],
            'reminder_minutes_before' => ['nullable', 'integer', 'min:0', 'max:43200'],
            'estimated_duration' => ['nullable', 'integer', 'min:1', 'max:960'],
            'favorite' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'completed_at' => ['nullable', 'date'],
        ];
    }

    protected function passedValidation(): void
    {
        $recurrence = $this->input('recurrence');

        if (is_array($recurrence)) {
            $this->merge([
                'recurrence_frequency' => $recurrence['frequency'],
                'recurrence_interval' => $recurrence['interval'] ?? 1,
                'recurrence_weekdays' => $recurrence['weekdays'] ?? null,
                'recurrence_end_date' => $recurrence['end_date'] ?? null,
            ]);
        } elseif ($recurrence === null && $this->has('recurrence')) {
            $this->merge([
                'recurrence_frequency' => null,
                'recurrence_interval' => null,
                'recurrence_weekdays' => null,
                'recurrence_end_date' => null,
            ]);
        }

        if ($this->input('status') === 'completed'
            && ! $this->has('completed_at')
            && $this->input('completed_at') === null) {
            $this->merge(['completed_at' => now()->toDateTimeString()]);
        }

        if ($this->has('status') && $this->input('status') !== 'completed') {
            $this->merge(['completed_at' => null]);
        }
    }

    public function taskData(): array
    {
        return collect($this->only([
            'title', 'description', 'priority', 'status', 'due_date', 'due_time',
            'start_date', 'project_id', 'recurrence_frequency', 'recurrence_interval',
            'recurrence_weekdays', 'recurrence_end_date', 'reminder_minutes_before',
            'favorite', 'sort_order', 'completed_at', 'tag_ids',
        ]))->filter(fn ($value, $key) => $this->has($key))->all();
    }
}
