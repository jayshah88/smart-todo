import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Project, Subtask, Tag, Task } from '../types/task';
import { taskApi, subtaskApi } from '../api/endpoints';
import { ApiError } from '../api/client';

interface TaskEditorProps {
  task: Task;
  projects: Project[];
  tags: Tag[];
  onSaved: (task: Task) => void;
  onCancel: () => void;
  onError: (message: string | null) => void;
}

const WEEKDAYS: [number, string][] = [
  [1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun'],
];

const REMINDER_OPTIONS: [number | null, string][] = [
  [null, 'No reminder'],
  [0, 'At due time'],
  [5, '5 min before'],
  [15, '15 min before'],
  [30, '30 min before'],
  [60, '1 hour before'],
  [120, '2 hours before'],
  [1440, '1 day before'],
];

export default function TaskEditor({ task, projects, tags, onSaved, onCancel, onError }: TaskEditorProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [dueTime, setDueTime] = useState(task.dueTime ?? '');
  const [priority, setPriority] = useState<Task['priority']>(task.priority);
  const [projectId, setProjectId] = useState<string>(task.projectId ? String(task.projectId) : '');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>((task.tags ?? []).map((t) => t.id));
  const [reminder, setReminder] = useState<string>(
    task.reminderMinutesBefore == null ? '' : String(task.reminderMinutesBefore),
  );
  const [estimatedDuration, setEstimatedDuration] = useState<string>(
    task.estimatedDuration == null ? '' : String(task.estimatedDuration),
  );
  const [frequency, setFrequency] = useState<string>(task.recurrence?.frequency ?? '');
  const [interval, setInterval] = useState<string>(String(task.recurrence?.interval ?? 1));
  const [weekdays, setWeekdays] = useState<number[]>(task.recurrence?.weekdays ?? []);
  const [recEndDate, setRecEndDate] = useState(task.recurrence?.endDate ?? '');
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState('');
  const [saving, setSaving] = useState(false);

  // The list endpoint doesn't include subtasks — load them for the editor.
  useEffect(() => {
    if (task.subtasks) return;
    let cancelled = false;
    taskApi
      .get(task.id)
      .then((res) => {
        if (!cancelled) setSubtasks(res.data.subtasks ?? []);
      })
      .catch(() => {
        /* editor still usable without subtasks */
      });
    return () => {
      cancelled = true;
    };
  }, [task.id, task.subtasks]);

  async function addSubtask(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      const res = await subtaskApi.create(task.id, trimmed);
      setSubtasks((prev) => [...prev, res.data]);
      setNewSubtask('');
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Unable to add the subtask.');
    }
  }

  async function handleToggleSubtask(sub: Subtask) {
    try {
      const res = await subtaskApi.update(task.id, sub.id, { completed: !sub.completed });
      setSubtasks((prev) => prev.map((s) => (s.id === res.data.id ? res.data : s)));
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Unable to update the subtask.');
    }
  }

  async function handleDeleteSubtask(sub: Subtask) {
    try {
      await subtaskApi.delete(task.id, sub.id);
      setSubtasks((prev) => prev.filter((s) => s.id !== sub.id));
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Unable to delete the subtask.');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    onError(null);
    try {
      const recurrence =
        frequency === ''
          ? null
          : {
              frequency: frequency as 'daily' | 'weekly' | 'monthly' | 'yearly',
              interval: Math.max(1, Number(interval) || 1),
              ...(frequency === 'weekly' && weekdays.length > 0 ? { weekdays } : {}),
              ...(recEndDate !== '' ? { end_date: recEndDate } : {}),
            };

      const res = await taskApi.update(task.id, {
        title: trimmed,
        description: description.trim() === '' ? null : description,
        due_date: dueDate === '' ? null : dueDate,
        due_time: dueTime === '' ? null : dueTime,
        priority,
        project_id: projectId === '' ? null : Number(projectId),
        tag_ids: selectedTagIds,
        reminder_minutes_before: reminder === '' ? null : Number(reminder),
        estimated_duration: estimatedDuration === '' ? null : Number(estimatedDuration),
        recurrence,
      });
      onSaved(res.data);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Unable to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }
  const inputClasses =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

  return (
    <li className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Task title"
          required
          maxLength={255}
          className={inputClasses}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Task description"
          rows={2}
          placeholder="Description (optional)"
          className={`${inputClasses} resize-y`}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Due date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClasses} />
          </label>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Due time
            <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className={inputClasses} />
          </label>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Task['priority'])}
              className={inputClasses}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Project
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClasses}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Remind me
            <select value={reminder} onChange={(e) => setReminder(e.target.value)} className={inputClasses}>
              {REMINDER_OPTIONS.map(([value, label]) => (
                <option key={String(value)} value={value === null ? '' : String(value)}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {reminder !== '' && task.dueDate && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reminder will fire {reminder === '0' ? 'at due time' : `${reminder} min before`} on {task.dueDate}
              {task.dueTime ? ` at ${task.dueTime}` : ' at 09:00'}
            </p>
          )}
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Est. duration (min)
            <input
              type="number"
              min="1"
              max="960"
              placeholder="e.g. 30"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
              className={inputClasses}
            />
          </label>
        </div>

        <fieldset>
          <legend className="text-xs font-medium text-slate-500 dark:text-slate-400">Tags</legend>
          {tags.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const active = selectedTagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setSelectedTagIds((prev) => (active ? prev.filter((id) => id !== t.id) : [...prev, t.id]))
                    }
                    className={`rounded-full px-2.5 py-1 text-xs font-medium text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                      active ? 'ring-2 ring-offset-1 ring-slate-400' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: t.color }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-400">Create tags in the sidebar to organize tasks.</p>
          )}
        </fieldset>
        <fieldset>
          <legend className="text-xs font-medium text-slate-500 dark:text-slate-400">Repeat</legend>
          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              aria-label="Repeat frequency"
              className={inputClasses}
            >
              <option value="">Don’t repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            {frequency !== '' && (
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Every
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  aria-label="Repeat interval"
                  className={inputClasses}
                />
              </label>
            )}
            {frequency !== '' && (
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Until (optional)
                <input
                  type="date"
                  value={recEndDate}
                  onChange={(e) => setRecEndDate(e.target.value)}
                  aria-label="Repeat end date"
                  className={inputClasses}
                />
              </label>
            )}
          </div>
          {frequency === 'weekly' && (
            <div className="mt-2 flex flex-wrap gap-1">
              {WEEKDAYS.map(([iso, label]) => {
                const active = weekdays.includes(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setWeekdays((prev) => (active ? prev.filter((d) => d !== iso) : [...prev, iso]))}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Subtasks {subtasks.length > 0 && `(${subtasks.filter((s) => s.completed).length}/${subtasks.length} done)`}
          </legend>
          <ul className="mt-1 space-y-1">
            {subtasks.map((sub) => (
              <li key={sub.id} className="group flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sub.completed}
                  onChange={() => void handleToggleSubtask(sub)}
                  aria-label={`Complete subtask ${sub.title}`}
                  className="h-4 w-4 accent-emerald-600"
                />
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    sub.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {sub.title}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDeleteSubtask(sub)}
                  aria-label={`Delete subtask ${sub.title}`}
                  className="hidden rounded p-1 text-xs text-slate-400 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 group-focus-within:block group-hover:block"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void addSubtask(newSubtask);
            }}
            className="mt-2 flex gap-2"
          >
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add a subtask…"
              aria-label="New subtask title"
              maxLength={255}
              className={inputClasses}
            />
            <button
              type="button"
              onClick={() => void addSubtask(newSubtask)}
              disabled={!newSubtask.trim()}
              className="flex-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Add
            </button>
          </form>
        </fieldset>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </li>
  );
}
