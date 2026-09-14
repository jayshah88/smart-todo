import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { exportApi, profileApi } from '../api/endpoints';
import type { UserSettings } from '../types/task';
import { useAuth } from '../context/AuthContext';
import { applyTheme } from '../theme';
import AppNav from '../components/AppNav';
import { useToast } from '../components/Toast';
import usePwaInstall from '../hooks/usePwaInstall';
import { api, ApiError } from '../api/client';
import { confirmAsync } from '../lib/ui';

const THEMES: [UserSettings['theme'], string][] = [
  ['light', 'Light'],
  ['dark', 'Dark'],
  ['system', 'System'],
];

export default function Settings() {
  const { user, logout, updateUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const settings = user?.settings ?? {
    theme: 'system',
    emailReminders: true,
    dailySummary: true,
    weeklySummary: false,
    dailyCapacityMinutes: null,
  };

  const field = <K extends keyof UserSettings>(key: K) => settings[key];

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const trimName = name.trim();
      if (trimName && user && trimName !== user.name) {
        updateUser((await profileApi.update({ name: trimName })).data);
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleSetting(key: keyof UserSettings, value: boolean | string) {
    setError(null);
    setSaved(false);
    try {
      const res = await profileApi.updateSettings({
        theme: key === 'theme' ? String(value) : undefined,
        email_reminders: key === 'emailReminders' ? Boolean(value) : undefined,
        daily_summary: key === 'dailySummary' ? Boolean(value) : undefined,
        weekly_summary: key === 'weeklySummary' ? Boolean(value) : undefined,
        daily_capacity_minutes: key === 'dailyCapacityMinutes' ? (String(value) === '' ? null : Number(value)) : undefined,
        push_enabled: key === 'pushEnabled' ? Boolean(value) : undefined,
        whatsapp_enabled: key === 'whatsappEnabled' ? Boolean(value) : undefined,
        whatsapp_phone: key === 'whatsappPhone' ? (String(value) === '' ? null : String(value)) : undefined,
        quiet_hours_start: key === 'quietHoursStart' ? (String(value) === '' ? null : String(value)) : undefined,
        quiet_hours_end: key === 'quietHoursEnd' ? (String(value) === '' ? null : String(value)) : undefined,
        digest_mode: key === 'digestMode' ? Boolean(value) : undefined,
      });
      if (user) updateUser({ ...user, settings: res.data });
      if (key === 'theme') applyTheme(String(value) as UserSettings['theme']);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update preferences.');
    }
  }

  const [dailyCapacity, setDailyCapacity] = useState<string>(
    settings.dailyCapacityMinutes == null ? '' : String(settings.dailyCapacityMinutes),
  );

  const [whatsappPhone, setWhatsappPhone] = useState<string>(settings.whatsappPhone ?? '');
  const [quietStart, setQuietStart] = useState<string>(settings.quietHoursStart ?? '');
  const [quietEnd, setQuietEnd] = useState<string>(settings.quietHoursEnd ?? '');

  const [exportSummary, setExportSummary] = useState<{ tasks: number; projects: number; tags: number; notifications: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const pwa = usePwaInstall();

  useEffect(() => {
    let cancelled = false;
    exportApi.summary().then(
      (res) => { if (!cancelled) setExportSummary(res.data); },
      () => { if (!cancelled) setExportSummary(null); },
    );
    return () => { cancelled = true; };
  }, []);

  function handleExport() {
    setExporting(true);
    setExportError(null);
    fetch(exportApi.downloadUrl(), { headers: exportApi.authHeaders() })
      .then(async (res) => {
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `focuslist-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(() => setExportError('Unable to export your data. Please try again.'))
      .finally(() => setExporting(false));
  }

  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    setError(null);
    await confirmAsync(
      'Permanently delete your account and all tasks? This cannot be undone.',
      async () => {
        setDeleting(true);
        try {
          await api.delete('/profile', { password: deletePassword });
          toast.show('success', 'Account deleted. Goodbye!');
          logout();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Unable to delete your account. Check your password.');
        } finally {
          setDeleting(false);
        }
      },
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNav />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>

        {error && (
          <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        {saved && (
          <div role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            Changes saved.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Profile</h2>
            <div className="mt-4">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="mt-4">
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Appearance</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {THEMES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => void toggleSetting('theme', value)}
                  aria-pressed={field('theme') === value}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    field('theme') === value
                      ? 'bg-slate-900 text-white dark:bg-slate-700'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Notifications &amp; reminders</h2>
            <label className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">Reminders by email</span>
              <input
                type="checkbox"
                checked={field('emailReminders')}
                onChange={(e) => void toggleSetting('emailReminders', e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
            </label>
            <label className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">Daily productivity summary</span>
              <input
                type="checkbox"
                checked={field('dailySummary')}
                onChange={(e) => void toggleSetting('dailySummary', e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
            </label>
            <label className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">Weekly productivity summary</span>
              <input
                type="checkbox"
                checked={field('weeklySummary')}
                onChange={(e) => void toggleSetting('weeklySummary', e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
            </label>
            <label className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">Web push reminders (this device)</span>
              <input
                type="checkbox"
                checked={field('pushEnabled') ?? false}
                onChange={(e) => void toggleSetting('pushEnabled', e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Push asks the browser for permission. If blocked, reminders still arrive in-app and by email.
            </p>
            <label className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">WhatsApp reminders (opt-in)</span>
              <input
                type="checkbox"
                checked={field('whatsappEnabled') ?? false}
                onChange={(e) => void toggleSetting('whatsappEnabled', e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
            </label>
            <label className="mt-2 block text-xs font-medium text-slate-500 dark:text-slate-400">
              WhatsApp number (with country code)
              <input
                type="tel"
                autoComplete="tel"
                placeholder="e.g. 15551234567"
                value={whatsappPhone}
                onChange={(e) => {
                  setWhatsappPhone(e.target.value);
                  void toggleSetting('whatsappPhone', e.target.value);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Provider messaging is pluggable; until configured, the app uses an in-app record plus a wa.me fallback link.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Quiet hours start
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => {
                    setQuietStart(e.target.value);
                    void toggleSetting('quietHoursStart', e.target.value);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Quiet hours end
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => {
                    setQuietEnd(e.target.value);
                    void toggleSetting('quietHoursEnd', e.target.value);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              During quiet hours, push/WhatsApp nudges are deferred — in-app and email are kept.
            </p>
            <label className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">Digest mode (batch low-urgency nudges)</span>
              <input
                type="checkbox"
                checked={field('digestMode') ?? false}
                onChange={(e) => void toggleSetting('digestMode', e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              One reminder per task by default — unread reminders are never stacked.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Daily planning</h2>
            <label className="mt-4 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Daily capacity (minutes)
              <input
                type="number"
                autoComplete="off"
                min="0"
                max="1440"
                step="15"
                placeholder="e.g. 240 (4 hours)"
                value={dailyCapacity}
                onChange={(e) => {
                  setDailyCapacity(e.target.value);
                  void toggleSetting('dailyCapacityMinutes', e.target.value);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Set a daily time budget. The Focus view will warn you if today&apos;s tasks exceed it.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Your data</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {exportSummary
                ? `${exportSummary.tasks} tasks · ${exportSummary.projects} projects · ${exportSummary.tags} tags · ${exportSummary.notifications} notifications`
                : 'Download everything FocusList stores about you as JSON.'}
            </p>
            {exportError && (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{exportError}</p>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {exporting ? 'Preparing…' : 'Download my data (JSON)'}
            </button>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Includes tasks, projects, tags, subtasks, reminders, notifications, and your activity log.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">App</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {pwa.installed
                ? 'FocusList is installed and opens in its own window.'
                : pwa.canInstall
                  ? 'Install FocusList on this device for a full-screen, app-like experience.'
                  : 'FocusList works offline for the app shell. Your browser can install it from its menu when supported.'}
            </p>
            {pwa.canInstall && !pwa.installed && (
              <button
                type="button"
                onClick={() => void pwa.install()}
                className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
              >
                Install app
              </button>
            )}
          </section>

          <section className="rounded-2xl border border-red-200 bg-red-50/50 p-6 dark:border-red-800 dark:bg-red-950/30">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">Danger zone</h2>
            <p className="mt-2 text-sm text-red-600/80 dark:text-red-300/80">
              Deleting your account permanently removes all tasks, projects and tags. This cannot be undone.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Confirm with your password
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:border-red-700 dark:bg-slate-800 dark:text-slate-100 sm:w-64"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={!deletePassword || deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}