# AGENTS.md — FocusList (Smart To-Do)

> **Read this file FIRST in every session.** It exists so agents never need to re-ask the user for project context.

## Standing rules (non-negotiable)
1. **After every change session, append a trace point (`T-NNN`) to `PROGRESS.md`** — what changed, files touched, date. Update the feature matrix statuses there too.
2. Never re-ask the user for stack info, commands, or feature status — it is all documented here and in `PROGRESS.md`.
3. Follow existing code conventions: Laravel Pint style on backend, typed function components + hooks on frontend, no new dependencies unless essential.
4. After backend changes run `php artisan test`; after frontend changes run `npm run build`. Do not report done without these passing.
5. Use the installed skills: `frontend-design` when touching UI, `playwright-cli`/`agent-browser` for browser verification, `grill-me` when requirements feel vague.

## Stack & commands
| | |
|---|---|
| Backend | Laravel 12, PHP 8.2, Sanctum (bearer token), SQLite (`backend/database/database.sqlite`) |
| Frontend | React 18 + TypeScript + Vite 5 + Tailwind 3 (darkMode: 'class'), react-router 6 |
| Backend dev | `cd backend && php artisan serve` (port 8000) · tests: `php artisan test` |
| Frontend dev | `cd frontend && npm run dev` (Vite proxies `/api` → `:8000`) · build: `npm run build` |
| Scheduler | `php artisan schedule:work` — reminders every 5 min, daily 06:00, weekly Mon 07:00 |
| Seed demo | `php artisan migrate:fresh --seed` (demo user: demo@smarttodo.app / change-me-on-first-login) |

## App map
- **Routes (API `backend/routes/api.php`)**: auth (`/auth/*`, `/me`), profile (`/profile`, `/profile/settings`), dashboard (`/dashboard`, `/dashboard/weekly`, `/dashboard/activity`), tasks (CRUD + `complete|reopen|duplicate|archive|restore|bulk|reorder|suggest-priority`), subtasks under `/tasks/{task}/subtasks`, projects, tags.
- **Frontend pages**: `Landing`, `Login`, `Register`, `ForgotPassword`, `ResetPassword`, `Dashboard`, `Tasks`, `Focus`, `Notifications`, `Settings` — routed in `src/App.tsx`.
- **Key components**: `components/AppNav.tsx` (shared nav — reuse, don't duplicate), `components/TaskItem.tsx`, `components/TaskEditor.tsx`, `components/Toast.tsx`, `components/ProjectsPanel.tsx`, `components/TagsPanel.tsx`, `components/VerifyBanner.tsx`, `components/LoadingScreen.tsx`.
- **API client**: `src/api/client.ts` (bearer token in localStorage, `ApiError{status, message, errors}`), endpoints grouped in `src/api/endpoints.ts`.
- **Types**: `src/types/task.ts` mirrors API resources (camelCase).
- **Smart capture & platform**: `lib/parseInput.ts` (NL quick-add parser + `parsedToPayload`), `hooks/useVoiceInput.ts` (Web Speech API), `hooks/usePwaInstall.ts` (install prompt), `pwa/registerSW.ts` + `public/sw.js`/`public/manifest.json` (app-shell PWA — bump `CACHE` version on deploy), `lib/ui.ts` (`confirmAsync`), `lib/platform.ts`.

## Conventions
- Backend: FormRequests validate + `taskData()`, policies for authorization, Services for logic, ActivityLog on mutations, snake_case DB → camelCase via Resources.
- Frontend: named exports default per file, `useCallback` loaders, optimistic list updates via `setTasks(prev => …)`, Tailwind utility classes with `dark:` variants everywhere, `role="alert"` for errors, skeleton loaders while loading.
- Colors: indigo primary, slate neutrals; priority colors: urgent=red, high=amber, medium=blue, low=slate.
- Dates: always treat `YYYY-MM-DD` as LOCAL date (see `lib/dates.ts` helpers) — never `new Date('YYYY-MM-DD')` (UTC off-by-one bug class).
