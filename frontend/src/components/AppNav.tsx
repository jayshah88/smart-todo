import { Link, NavLink, useLocation } from 'react-router-dom';
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6" aria-label="Main">
        {/* Brand & Desktop Links */}
        <div className="flex items-center gap-6">
          <Link
            to={brandTo}
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h6" />
              </svg>
            </span>
            <span>FocusList</span>
          </Link>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `relative rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                    isActive
                      ? 'bg-slate-100 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                  }`
                }
              >
                {l.label}
                {l.to === '/notifications' && unread > 0 && (
                  <span
                    className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-semibold leading-5 text-white"
                    aria-label={`${unread} unread notifications`}
                  >
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Desktop User & Logout */}
        <div className="hidden md:flex md:items-center md:gap-3">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{user?.name}</span>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            Log out
          </button>
        </div>

        {/* Mobile Header Controls: Quick Notifications + Hamburger Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          {unread > 0 && (
            <Link
              to="/notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
              aria-label={`${unread} unread notifications`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Panel */}
      {mobileOpen && (
        <div
          id="mobile-nav-menu"
          className="border-t border-slate-200 bg-slate-50/95 px-4 pt-2 pb-4 shadow-lg backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95"
        >
          <div className="space-y-1">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-lg px-3 py-2.5 text-base font-medium transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900'
                  }`
                }
              >
                <span>{l.label}</span>
                {l.to === '/notifications' && unread > 0 && (
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold leading-5 text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
            <div className="mb-3 px-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                void logout();
              }}
              className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
