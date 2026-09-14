# FocusList API Reference

Base URL: `https://<api-host>/api` (dev: `http://127.0.0.1:8000/api`). All responses are JSON. Authenticated routes require `Authorization: Bearer <token>`. Error shape: `{ "message": string, "errors"?: { [field]: string[] } }`. Success wrappers: `{ "data": ... }` or `{ "message": ... }`.

## Environments

| Env var | Where | Purpose |
|---|---|---|
| `VITE_API_URL` | frontend | API base (defaults to same-origin `/api`) |
| `FRONTEND_URL` | backend | base URL used in email links |
| `CORS_ALLOWED_ORIGINS` | backend | comma-separated allowed frontend origins |
| `DEMO_USER_PASSWORD` | backend | password for the seeded demo account |

## Rate limits

Auth endpoints **10/min**, mutating endpoints **60/min**, reads **120/min** (per user or IP).

## Auth

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/auth/register` | `name, email, password, password_confirmation` | Create account → `{ user, token }` (201) |
| POST | `/auth/login` | `email, password` | → `{ user, token }` |
| POST | `/auth/logout` | — | Revoke current token |
| GET | `/me` | — | Current user + settings |
| POST | `/auth/forgot-password` | `email` | Always: "If an account exists…" (no enumeration) |
| POST | `/auth/reset-password` | `email, token, password, password_confirmation` | Reset password |
| POST | `/auth/verify-email` | — | Mark verified (auth'd) |
| POST | `/auth/resend-verification` | — | Resend verification email |

## Profile & settings

| Method | Path | Body | Description |
|---|---|---|---|
| PUT | `/profile` | `name?/email?/timezone?` | Update profile → `UserResource` |
| PUT | `/profile/settings` | `theme? email_reminders? daily_summary? weekly_summary? daily_capacity_minutes? push_enabled? whatsapp_enabled? whatsapp_phone? quiet_hours_start? quiet_hours_end? digest_mode?` | Update settings → settings object |
| DELETE | `/profile` | `password` | Permanently delete account (password-confirmed) |

## Tasks

| Method | Path | Body / Query | Description |
|---|---|---|---|
| GET | `/tasks` | `view=all/today/upcoming/overdue/completed`, `archived=1`, `project_id`, `tag_id`, `priority`, `search`, `sort=created_at/due_date/priority`, `order=asc/desc`, `page`, `per_page` (≤100) | Paginated list `{ data, meta }` |
| POST | `/tasks` | `title`, `description?`, `priority?`, `status?`, `due_date?`, `due_time? (H:i)`, `start_date?`, `project_id?`, `tag_ids?[]`, `recurrence?{frequency,interval,weekdays,end_date}`, `reminder_minutes_before?`, `estimated_duration?` | Create |
| GET | `/tasks/{id}` | — | Single task (with subtasks) |
| PUT | `/tasks/{id}` | partial fields (above) + `favorite?`, `archived?` via dedicated endpoints, `sort_order?`, `completed_at?` | Update |
| DELETE | `/tasks/{id}` | — | Soft delete |
| POST | `/tasks/{id}/complete` | — | Complete; spawns next recurrence + deletes reminders |
| POST | `/tasks/{id}/reopen` | — | Reopen; re-creates reminder |
| POST | `/tasks/{id}/duplicate` | — | Copy (subtasks copied uncompleted) |
| POST | `/tasks/{id}/archive` / `/restore` | — | Archive / restore |
| POST | `/tasks/{id}/skip` | — | Complete one recurring instance without next occurrence |
| POST | `/tasks/bulk` | `action=complete/delete/priority`, `ids[]`, `priority?` | Bulk ops (own tasks only) |
| POST | `/tasks/reorder` | `task_ids[]` | Persist drag order (page-scoped, ≤500) |
| POST | `/tasks/suggest-priority` | `due_date?`, `priority?` | Deterministic suggestion |

## Subtasks · Projects · Tags

| Method | Path | Description |
|---|---|---|
| POST | `/tasks/{task}/subtasks` | Add subtask (`title`) |
| PUT / DELETE | `/tasks/{task}/subtasks/{subtask}` | Toggle/rename, or delete |
| GET / POST | `/projects`, `/projects/{id}` | List (with counts) / create |
| PUT / DELETE | `/projects/{id}` | Rename/recolor / delete (tasks → Inbox) |
| GET / POST | `/tags`, `/tags` | List / create |
| PUT / DELETE | `/tags/{id}` | Rename/recolor / delete |

## Dashboard · Focus · Notifications · Export

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard` | Today's counts, completion rate, streak, priority breakdown, insights |
| GET | `/dashboard/weekly` | 7-day completion series |
| GET | `/dashboard/activity` | Recent activity feed (12) |
| GET | `/dashboard/focus` | Scored focus items + today's timeline + capacity |
| GET | `/notifications` | List (50, newest first; `?unread=1`) |
| GET | `/notifications/unread-count` | `{ data: { unreadCount } }` |
| POST | `/notifications/read-all`, `/notifications/{id}/read` | Mark read |
| GET | `/export` | Streamed JSON download of all user data |
| GET | `/export/summary` | Counts for the export card |

## Enums

- `priority`: `low | medium | high | urgent` · `status`: `pending | in_progress | completed`
- `recurrence.frequency`: `daily | weekly | monthly | yearly` · `weekdays`: `1..7` (ISO, Mon=1)
- `theme`: `light | dark | system` · reminder `reminder_minutes_before`: `0..43200`
- `channel` (notifications): `in_app | email | push | whatsapp`