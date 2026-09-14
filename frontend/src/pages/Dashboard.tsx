import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/endpoints';
import type { ActivityEntry, DashboardStats, WeeklyPoint } from '../types/task';
import AppNav from '../components/AppNav';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    Promise.all([dashboardApi.stats(), dashboardApi.weekly(), dashboardApi.activity()])
      .then(([s, w, a]) => {
        setStats(s.data);
        setWeekly(w.data);
        setActivity(a.data);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNav />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>

        {error && (
          <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            <span>Unable to load your dashboard. Check your connection and try again.</span>
            <button
              type="button"
              onClick={load}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
            >
              Try again
            </button>
          </div>
        )}

        {!stats && !error && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        )}

        {stats && (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Overdue" value={stats.today.overdue} accent="text-red-600 dark:text-red-400" />
              <StatCard label="Due today" value={stats.today.dueToday} accent="text-amber-600 dark:text-amber-400" />
              <StatCard label="Upcoming" value={stats.today.upcoming} accent="text-indigo-600 dark:text-indigo-400" />
              <StatCard label="Completed today" value={stats.today.completedToday} accent="text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Completion rate</h2>
                <p className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">{stats.completionRate}%</p>
                <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${Math.min(100, stats.completionRate)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Current streak</h2>
                <p className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.streak.current} <span className="text-lg font-medium text-slate-400">days</span>
                </p>
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Longest streak: {stats.streak.longest} days</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Priority breakdown</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {Object.entries(stats.priorityBreakdown).map(([priority, count]) => (
                    <li key={priority} className="flex items-center justify-between">
                      <span className="capitalize text-slate-600 dark:text-slate-300">{priority}</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Completed this week</h2>
              <div className="mt-4 flex h-36 items-end gap-3" role="img" aria-label="Bar chart of completed tasks per day">
                {weekly.map((d) => {
                  const max = Math.max(1, ...weekly.map((x) => x.completed));
                  const h = Math.round((d.completed / max) * 100);
                  return (
                    <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{d.completed || ''}</span>
                      <div
                        className={`w-full rounded-t-md transition-all ${d.completed > 0 ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                        style={{ height: `${Math.max(4, h)}%` }}
                      />
                      <span className="text-xs text-slate-400">{d.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Smart insights</h2>
                <ul className="mt-3 space-y-2">
                  {stats.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <span
                        className={
                          insight.type === 'warning'
                            ? 'text-amber-500'
                            : insight.type === 'success'
                              ? 'text-emerald-500'
                              : 'text-indigo-500'
                        }
                      >
                        ●
                      </span>
                      {insight.message}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Recent activity</h2>
                {activity.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">No activity yet — complete a task to see it here.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {activity.map((entry) => (
                      <li key={entry.id} className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                          <span className="font-medium capitalize">{entry.action}</span>
                          {entry.taskTitle ? ` · ${entry.taskTitle}` : ''}
                        </span>
                        <time
                          dateTime={entry.createdAt}
                          className="flex-none text-xs text-slate-400"
                        >
                          {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-8">
              <Link
                to="/tasks"
                className="inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
              >
                View all tasks
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</h2>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
