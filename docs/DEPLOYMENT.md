# Production Deployment Guide

FocusList = Laravel 12 API (`backend/`) + React 18 static SPA (`frontend/`). The guide assumes a single Linux server that serves the SPA (nginx/CDN) and runs the API on a subdomain.

## 1. Backend configuration

```bash
cd backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

Set in `.env`:

| Key | Value |
|---|---|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_URL` | `https://api.yourdomain.com` |
| `FRONTEND_URL` | `https://yourdomain.com` (used in reminder/summary emails) |
| `MAIL_MAILER` | `smtp` + real SMTP credentials |
| `CORS_ALLOWED_ORIGINS` | `https://yourdomain.com` only |
| `DEMO_USER_PASSWORD` | rotate it if you seed the demo account anywhere public |
| `DB_CONNECTION` | `sqlite` for single-server installs, or MySQL (`DB_HOST`, `DB_DATABASE`, …) |

Then:

```bash
php artisan migrate --force
php artisan config:cache && php artisan route:cache
```

## 2. Background processes (required for reminders & summaries)

- **Queue worker** (email notifications): `php artisan queue:work --tries=3` under a supervisor (systemd/Supervisor).
- **Scheduler**: one cron entry drives everything:

```
* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
```

Reminders dispatch every 5 minutes; daily summary at 06:00; weekly every Monday 07:00 — all schedule entries live in `backend/routes/console.php`.

## 3. Frontend build & hosting

```bash
cd frontend
npm ci
# optional: export VITE_API_URL=https://api.yourdomain.com/api   (same-origin /api also works)
npm run build
```

- Serve `frontend/dist/` statically with an SPA fallback to `index.html` (e.g. nginx `try_files $uri /index.html;`).
- If the API is on another origin, set `VITE_API_URL` at build time; otherwise the app calls `/api` on its own origin.
- **PWA**: `public/sw.js` caches the app shell. **Bump the `CACHE` string** (e.g. `focuslist-shell-v2`) on every deploy so installed clients fetch the new shell.
- `registerSW.ts` only registers the service worker in production builds (`import.meta.env.DEV` guard).

## 4. Security posture (already shipped)

- Sanctum bearer auth; email verification; password reset (no user enumeration).
- Rate limits: auth 10/min, reads 120/min, writes 60/min (`AppServiceProvider`).
- Policies on tasks/projects/tags/notifications; ownership-safe FormRequests.
- Global JSON exception handlers → clean 401/403/404 (`bootstrap/app.php`).
- Env-driven CORS; secrets live in `.env` only (`.env*` is gitignored).

## 5. Backups & monitoring

- Back up `backend/database/database.sqlite` (or nightly MySQL dumps) and restore-test on a schedule.
- Ship `storage/logs/laravel.log` to a log aggregator.
- Health check: `GET /up` (Laravel health route).

## 6. Rollback

- Deploy to timestamped releases and symlink `current` (capistrano-style).
- Keep the previous release; rollback = repoint the symlink + `php artisan migrate:rollback` only if a migration was applied after it.

## 7. Optional integrations

- Push / WhatsApp delivery are pluggable (`App\Services\NotificationService`). Without a provider the app still works — in-app + email channels stay active, and opt-in channels record intent for the deep-link UI.