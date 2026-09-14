import { Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationApi } from '../api/endpoints';

interface AppNavProps {
  /** Where the brand links to. */
  brandTo?: string;
}

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/focus', label: 'Focus' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/settings', label: 'Settings' },
] as const;

/** Shared top navigation — reuse this on every authenticated page. */
export default function AppNav({ brandTo = '/dashboard' }: AppNavProps) {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    notificationApi
      .unreadCount()
      .then((res) => {
        if (alive) setUnread(res.data.unreadCount);
      })
      .catch(() => {
        /* badge is best-effort; center still works */
      });
    const id = window.setInterval(() => {
      notificationApi
        .unreadCount()
        .then((res) => {
          if (alive) setUnread(res.data.unreadCount);
        })
        .catch(() => {});
    }, 60000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [user]);

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 sm:py-4" aria-label="Main">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-5">
          <Link
            to={brandTo}
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            <span className="hidden sm:inline" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h12M4 18h8" />
              </svg>
            </span>
            <span className="truncate">FocusList</span>
          </Link>
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `relative text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`
              }
            >
              {l.label}
              {l.to === '/notifications' && unread > 0 && (
                <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-semibold leading-5 text-white" aria-label={`${unread} unread notifications`}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </NavLink>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="hidden text-sm text-slate-600 dark:text-slate-300 sm:inline">{user?.name}</span>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </nav>
    </header>
  );
}
