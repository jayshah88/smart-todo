# FocusList Architecture

This document explains how FocusList is put together and why. It is the map to read before changing the app.

## System overview

```
┌──────────────────────┐         HTTPS JSON          ┌───────────────────────┐
│  React 18 SPA         │ ◀────────────────────────▶  │  Laravel 12 API       │
│  (frontend/, Vite)    │        /api/* + Bearer      │  (backend/)           │
│  PWA app shell        │                             │  Sanctum + Policies   │
└──────────────────────┘                             └───────────┬───────────┘
                                                                 │ Eloquent
                                                          ┌──────▼───────┐
                                                          │  SQLite /    │
                                                          │  MySQL       │
                                                          └──────────────┘
```

- The SPA calls `/api` on its own origin in production (or `VITE_API_URL` when set), authenticated with a `Bearer` token kept in `localStorage`.
- The Vite dev server proxies `/api` to the backend on `:8000`, so local development needs no CORS setup. In production CORS is env-driven (`CORS_ALLOWED_ORIGINS`).
- The PWA caches only the app shell (`public/sw.js`, registered **only** in production builds); API data is never cached by the service worker.

## Backend (Laravel 12)

### Request lifecycle

1. Routes (`routes/api.php`) are grouped: auth endpoints throttled at 10/min, reads at 120/min, mutations at 60/min (`AppServiceProvider`).
2. FormRequests validate and normalise (e.g. `StoreTaskRequest::passedValidation()` flattens the `recurrence` object into relational columns).
3. Controllers stay thin; business logic lives in **Services** (`TaskService`, `RecurrenceService`, `DashboardService`, `FocusService`, `NotificationService`).
4. **Policies** gate every cross-user danger zone (tasks, projects, tags, notifications) — exercised by tests.
5. Resources map **snake_case columns → camelCase JSON** for the SPA (`TaskResource`, `UserResource`, …).
### Data model (core)

- `users` 1:1 `user_settings`, 1:N `tasks` / `projects` / `tags` / `notifications` / `activity_logs`
- `tasks` N:1 `projects`, N:M `tags` (`task_tag`), 1:N `subtasks`, 1:N `reminders`, self-ref `recurrence_parent_id`
- Recurrence is stored relationally (`recurrence_frequency`, `recurrence_interval`, `recurrence_weekdays` JSON, `recurrence_end_date`) — deterministic, no cron-style blobs.

### Recurrence engine

`RecurrenceService::nextDueDate()` is pure and deterministic:

- daily / weekly (optional weekday set, e.g. Mon–Fri) / monthly (no-overflow) / yearly
- weekly intervals anchored to calendar weeks (`weeksBetween` helper)
- completing a recurring task clones it (`TaskController::generateNextOccurrence`), copies subtasks uncompleted, and links via `recurrence_parent_id`
- `skip` completes one instance without spawning the next occurrence

### Reminders & notifications

- `TaskService::syncReminder()` (re)creates one pending `Reminder` per configured task — `complete` deletes it, `reopen` recreates it.
- `SendTaskReminders` (every 5 minutes) dispatches due reminders via `NotificationService`:
  - in-app record (one-reminder default prevents stacking),
  - email through Laravel Notifications when enabled,
  - push and WhatsApp are **pluggable opt-in hooks** — without a provider they still write channel records (used for deep links) and the app keeps working.
- Quiet hours are HH:MM ranges that support wrapping past midnight.
- Daily (06:00) and weekly (Mon 07:00) `ProductivitySummaryNotification` emails come from `summaries:daily` / `summaries:weekly`.

### Security model

See [SECURITY.md](../SECURITY.md): bearer auth, per-user policies, FormRequest ownership rules (`Rule::exists(...)->where('user_id', ...)`), throttles, JSON error mapping in `bootstrap/app.php`, env-gated CORS.
## Frontend (React 18 + TypeScript)

### Structure

```
src/
├── api/          client.ts (fetch wrapper, ApiError, token) + endpoints.ts (typed endpoint groups)
├── components/   AppNav, TaskItem, TaskEditor, Toast, VerifyBanner, ProjectsPanel, TagsPanel, LoadingScreen
├── context/      AuthContext (session, login/register/logout, theme application)
├── hooks/        useVoiceInput (Web Speech API, graceful degradation), usePwaInstall
├── lib/          parseInput (natural-language quick add), dates (local-date safety), ui (confirmAsync), platform
├── pages/        Landing, Login, Register, Forgot/ResetPassword, Dashboard, Tasks, Focus, Notifications, Settings
├── pwa/          registerSW (production-only registration)
└── types/        task.ts mirrors API resources (camelCase)
```

### State management

No external state library — deliberate. Session state lives in `AuthContext`; page data is loaded per page with `useCallback` loaders; list mutations are **optimistic** (`setTasks(prev => …)`), with toasts on success and `role="alert"` error boxes on failure. Bulk operations confirm via `confirmAsync` (ui.ts) instead of raw `window.confirm`.

### Date safety

A `YYYY-MM-DD` string is a **local** date everywhere. `lib/dates.ts` provides `parseLocalDate`/`formatLocalDate`; never use `new Date('YYYY-MM-DD')` — it parses as UTC and produces off-by-one bugs (historical bug B3 in `PROGRESS.md`).

### Smart quick add

`lib/parseInput.ts` tokenizes natural language: dates (`tomorrow`, `Fri`, ISO dates), times (`5pm`, `14:00`), priorities, `#money`→tag, `@Work`→project, then `parsedToPayload` resolves names to IDs (the server re-validates ownership). Priority words use word-boundary matching so "Follow up" is never read as "low".
## Cross-cutting concerns

- **Accessibility**: semantic landmarks (`banner`, `main`, `tablist`), `aria-label` on icon buttons, `aria-live` toasts, visible `focus-visible` rings, keyboard shortcuts (`n`, `/`, `Esc`), skeleton loaders, empty states with guidance, `role="status"`/`role="alert"`.
- **Responsive requirements**: no horizontal overflow 320–1920+ px; touch-friendly targets; mobile-first layout (e.g. task actions wrap below the card text).
- **Dark mode**: Tailwind `darkMode: 'class'`; `theme.ts applyTheme()` resolves `system` against `prefers-color-scheme`; applied at login, register, session restore, and settings changes.
- **PWA**: `manifest.json` icons 192/512 (any + maskable), standalone display; install surfaced in Settings via `beforeinstallprompt`.

## Roadmap (post-1.0)

1. Real provider delivery for push (Web Push API) and WhatsApp — the service layer already has the plug points.
2. Calendar view + iCal / CSV export.
3. i18n (locale-aware strings and dates).
4. Offline-first data (local cache + sync) with versioned mutations.
5. Device-aware push subscriptions.

## Traceability

Every session appends a `T-NNN` entry to `PROGRESS.md` — feature status matrix, bug register, and trace log. Check it before and after changes.
6. Mutations append to `activity_logs` (dashboard activity feed + data export).