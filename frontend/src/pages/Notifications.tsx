import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notificationApi } from '../api/endpoints';
import type { AppNotification } from '../types/task';
import AppNav from '../components/AppNav';

const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-app',
  email: 'Email',
  push: 'Push',
  whatsapp: 'WhatsApp',
};

const CHANNEL_STYLES: Record<string, string> = {
  in_app: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  email: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  push: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  whatsapp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export default function Notifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationApi.list(unreadOnly);
      setItems(res.data);
    } catch {
      setError('Unable to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleMarkRead(n: AppNotification) {
    if (n.readAt) return;
    try {
      const res = await notificationApi.markAsRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? res.data : x)));
    } catch {
      setError('Unable to mark notification as read.');
    }
  }

  async function handleMarkAll() {
    setActing(true);
    try {
      await notificationApi.markAllAsRead();
      setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    } catch {
      setError('Unable to mark all as read.');
    } finally {
      setActing(false);
    }
  }

  const unread = items.filter((i) => !i.readAt).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {unread > 0 ? `${unread} unread` : 'You are all caught up'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              Unread only
            </label>
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              disabled={acting || unread === 0}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {acting ? 'Marking…' : 'Mark all read'}
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-4 space-y-3" aria-label="Loading notifications">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-900">
            <p className="text-4xl" aria-hidden="true">🔔</p>
            <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">No notifications</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Reminders and updates will appear here.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((n) => (
              <li
                key={n.id}
                className={`rounded-xl border bg-white p-4 dark:bg-slate-900 ${
                  n.readAt
                    ? 'border-slate-200 dark:border-slate-700'
                    : 'border-indigo-300 ring-1 ring-indigo-100 dark:border-indigo-700 dark:ring-indigo-900/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm ${n.readAt ? 'text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-slate-100'}`}>
                      {!n.readAt && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-indigo-600 align-middle" aria-hidden="true" />}
                      {n.title}
                    </p>
                    {n.body && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{n.body}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CHANNEL_STYLES[n.channel] ?? CHANNEL_STYLES.in_app}`}>
                        {CHANNEL_LABELS[n.channel] ?? n.channel}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                      {n.taskId != null && (
                        <Link to={`/tasks?focus=${n.taskId}`} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                          View task
                        </Link>
                      )}
                    </div>
                  </div>
                  {!n.readAt && (
                    <button
                      type="button"
                      onClick={() => void handleMarkRead(n)}
                      className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
