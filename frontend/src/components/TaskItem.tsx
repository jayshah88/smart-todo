import { useState } from 'react';
import type { Task } from '../types/task';
import { friendlyDate, isOverdue } from '../lib/dates';

export const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

interface TaskItemProps {
  task: Task;
  onComplete: (task: Task) => void;
  onReopen: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDuplicate?: (task: Task) => void;
  onToggleFavorite?: (task: Task) => void;
  onArchive?: (task: Task) => void;
  onRestore?: (task: Task) => void;
  onSkip?: (task: Task) => void;
  busy?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (task: Task) => void;
  draggable?: boolean;
  onDragStart?: (task: Task) => void;
  onDragOver?: (task: Task) => void;
  onDrop?: (task: Task) => void;
}

const ACTION_BTN_DENSE =
  'inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800';
const ICON_BTN =
  'inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-500 dark:hover:text-slate-300';

export default function TaskItem({
  task,
  onComplete,
  onReopen,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onArchive,
  onRestore,
  onSkip,
  busy,
  selectable,
  selected,
  onToggleSelect,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: TaskItemProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isCompleted = task.status === 'completed';
  const overdue = isOverdue(task.dueDate, isCompleted);
  const progress = task.subtaskProgress;

  if (confirmingDelete) {
    return (
      <li
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950/50"
        aria-label={`Confirm deleting ${task.title}`}
      >
        <p className="text-sm font-medium text-red-800 dark:text-red-200">
          Delete “{task.title}”? This can’t be undone.
        </p>
        <div className="flex flex-none gap-2">
          <button
            onClick={() => setConfirmingDelete(false)}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setConfirmingDelete(false);
              onDelete(task);
            }}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
          >
            Delete
          </button>
        </div>
      </li>
    );
  }
  return (
    <li
      draggable={draggable}
      onDragStart={() => onDragStart?.(task)}
      onDragOver={(e) => {
        if (draggable) {
          e.preventDefault();
          onDragOver?.(task);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.(task);
      }}
      className={`group flex items-start gap-3 rounded-xl border p-4 transition ${
        overdue
          ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/40'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
      } ${busy ? 'opacity-50' : ''} ${selected ? 'ring-2 ring-indigo-500' : ''}`}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={selected ?? false}
          onChange={() => onToggleSelect?.(task)}
          aria-label={`Select ${task.title}`}
          className="mt-1 h-4 w-4 flex-none accent-indigo-600"
        />
      )}

      <button
        onClick={() => (isCompleted ? onReopen(task) : onComplete(task))}
        aria-label={isCompleted ? `Reopen ${task.title}` : `Complete ${task.title}`}
        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 ${
          isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-500'
        }`}
      >
        {isCompleted && (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6l3 3 5-6" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`break-words text-sm font-medium ${
            isCompleted ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 line-clamp-2 break-words text-sm text-slate-500 dark:text-slate-400">
            {task.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[task.priority]}`}>
            {task.priority}
          </span>
          {task.dueDate && (
            <span
              className={`text-xs ${
                overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {overdue ? 'Overdue · ' : ''}
              {friendlyDate(task.dueDate)}
              {task.dueTime ? ` · ${task.dueTime}` : ''}
            </span>
          )}
          {task.recurrence && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              ↻ {task.recurrence.frequency}
              {task.recurrence.nextOccurrence ? ` · next ${task.recurrence.nextOccurrence}` : ''}
            </span>
          )}
          {task.reminderMinutesBefore != null && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              🔔 {task.reminderMinutesBefore >= 60 ? `${Math.round(task.reminderMinutesBefore / 60)}h before` : `${task.reminderMinutesBefore}m before`}
            </span>
          )}
          {task.project && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: task.project.color }}
            >
              {task.project.name}
            </span>
          )}
          {(task.tags ?? []).map((tag) => (
            <span
              key={tag.id}
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>

        {progress && !isCompleted && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.round((progress.completed / progress.total) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {progress.completed}/{progress.total} subtasks
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 flex w-full flex-wrap items-center gap-0.5 sm:mt-0 sm:w-auto sm:flex-none sm:justify-end">
        {onToggleFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite(task)}
            aria-label={task.favorite ? `Unstar ${task.title}` : `Star ${task.title}`}
            aria-pressed={task.favorite}
            className={`${ICON_BTN} ${task.favorite ? 'text-amber-500' : ''}`}
          >
            <span className="text-base leading-none" aria-hidden="true">{task.favorite ? '★' : '☆'}</span>
          </button>
        )}
        {onDuplicate && (
          <button type="button" onClick={() => onDuplicate(task)} aria-label={`Duplicate ${task.title}`} className={ACTION_BTN_DENSE}>
            Duplicate
          </button>
        )}
        {onArchive && !task.archived && (
          <button type="button" onClick={() => onArchive(task)} aria-label={`Archive ${task.title}`} className={ACTION_BTN_DENSE}>
            Archive
          </button>
        )}
        {onSkip && task.recurrence && (
          <button type="button" onClick={() => onSkip(task)} aria-label={`Skip next occurrence of ${task.title}`} className={ACTION_BTN_DENSE}>
            Skip
          </button>
        )}
        {onRestore && task.archived && (
          <button type="button" onClick={() => onRestore(task)} aria-label={`Restore ${task.title}`} className={ACTION_BTN_DENSE}>
            Restore
          </button>
        )}
        <button type="button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} className={ACTION_BTN_DENSE}>
          Edit
        </button>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          aria-label={`Delete ${task.title}`}
          className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 dark:text-slate-500 dark:hover:bg-red-950 dark:hover:text-red-400"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </li>
  );
}


