import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, taskApi } from '../api/endpoints';
import type { Task } from '../types/task';
import { useToast } from '../components/Toast';
import AppNav from '../components/AppNav';

type FocusItem = { task: Task; reason: string; reasonType: string };
type Capacity = {
  plannedMinutes: number;
  capacityMinutes: number | null;
  overflow: boolean;
  remainingMinutes: number | null;
};

const REASON_COLORS: Record<string, string> = {
  urgent: 'text-red-600 dark:text-red-400',
  today: 'text-amber-600 dark:text-amber-400',
  important: 'text-purple-600 dark:text-purple-400',
  upcoming: 'text-blue-600 dark:text-blue-400',
  info: 'text-slate-500 dark:text-slate-400',
};

export default function Focus() {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState<FocusItem[]>([]);
  const [timeline, setTimeline] = useState<Task[]>([]);
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.focus();
      setItems(res.data.items);
      setTimeline(res.data.timeline);
      setCapacity(res.data.capacity);
    } catch {
      setError('Unable to load your focus view. Please refresh.');
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(task: Task) {
    setBusy(task.id);
    try {
      const res = await taskApi.complete(task.id);
      toast.show('success', 'Task completed!');
      setItems((prev) => prev.filter((i) => i.task.id !== task.id));
      setTimeline((prev) => prev.filter((t) => t.id !== task.id));
      if (res.data.estimatedDuration && capacity) {
        setCapacity((prev) =>
          prev
            ? {
                ...prev,
                plannedMinutes: Math.max(0, prev.plannedMinutes - (res.data.estimatedDuration ?? 0)),
                overflow:
                  prev.capacityMinutes !== null &&
                  Math.max(0, prev.plannedMinutes - (res.data.estimatedDuration ?? 0)) > prev.capacityMinutes,
              }
            : prev,
        );
      }
    } catch {
      toast.show('error', 'Could not complete the task.');
    } finally {
      setBusy(null);
    }
  }

  function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Focus</h1>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <>
            {capacity && capacity.capacityMinutes !== null && (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Today's capacity</h2>
                  <span className={`text-sm font-medium ${capacity.overflow ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {formatMinutes(capacity.plannedMinutes)} / {formatMinutes(capacity.capacityMinutes)}
                  </span>
                </div>
                <div className="mt-3 h-3 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-3 rounded-full transition-all ${capacity.overflow ? 'bg-red-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(100, (capacity.plannedMinutes / capacity.capacityMinutes) * 100)}%` }}
                  />
                </div>
                {capacity.overflow && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    Over capacity by {formatMinutes(capacity.plannedMinutes - capacity.capacityMinutes)}. Consider rescheduling.
                  </p>
                )}
                {!capacity.overflow && capacity.remainingMinutes !== null && (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {formatMinutes(capacity.remainingMinutes)} remaining.
                  </p>
                )}
              </div>
            )}

            <div className="mt-8">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">What to do now</h2>
              {items.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <p className="text-slate-500 dark:text-slate-400">Nothing urgent! Add tasks or enjoy your free time.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {items.map(({ task, reason, reasonType }) => (
                    <li key={task.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                      <button
                        onClick={() => handleComplete(task)}
                        disabled={busy === task.id}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                        aria-label={`Complete "${task.title}"`}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                        <p className={`text-sm ${REASON_COLORS[reasonType] ?? REASON_COLORS.info}`}>
                          {reason}{task.estimatedDuration ? ` ~${formatMinutes(task.estimatedDuration)}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/tasks?edit=${task.id}`)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        Edit
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {timeline.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Today's timeline</h2>
                <ul className="mt-4 space-y-2">
                  {timeline.map((task) => (
                    <li key={task.id} className="flex items-center gap-4 rounded-xl bg-white px-4 py-3 dark:bg-slate-900">
                      <span className="w-12 text-sm font-mono font-medium text-slate-500 dark:text-slate-400">
                        {task.dueTime?.slice(0, 5)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                      </div>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          task.priority === 'urgent' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-amber-500' :
                          task.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                        }`}
                        aria-hidden="true"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="mt-8">
          <button
            onClick={() => navigate('/tasks')}
            className="inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            View all tasks
          </button>
        </div>
      </main>
    </div>
  );
}
