# Changelog

All notable changes to FocusList are documented here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses dates as versions while pre-1.0.

## [Unreleased]

### Added

- Open-source release prep: root `README.md`, `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `docs/` (architecture, API reference, deployment guide), GitHub Actions CI, root `.gitignore`, git history.

### Fixed

- **Multi-user settings isolation**: `UserResource` now evaluates the loaded `settings` relation directly instead of invoking unconstrained `first()`, ensuring each user strictly receives their own settings and eliminating an extra SQL query.
- **Recurrence fidelity**: completing a recurring task now replicates tag associations and automatically schedules pending reminders for the next occurrence.
- **Reopen crash**: `TaskController::reopen` called a private `TaskService::syncReminder` (fatal error); made public + covered by a regression test.
- **Broken deep links**: `/tasks?edit=ID` (Focus page) and `/tasks?focus=ID` (notifications) now open the task editor even when the task is off the current page.
- **Priority parser**: "Follow up…" no longer detects `low` priority and "Highlight…" no longer detects `high` (word-boundary matching).
- **320 px horizontal overflow** on the Tasks list (task action row could not shrink).
- **Duplicate Settings controls**: two "Notifications & reminders" sections merged into one.
- **Dev service worker**: inline registration in `index.html` removed so the SW only runs in production builds (`registerSW.ts`); app-shell fetch is now network-first (fresh deploys win, offline fallback kept).
- **Account deletion** now uses `confirmAsync` (consistent with bulk delete).
- **Login flow**: "Password updated" notice shown after a successful reset.
- **Autocomplete warnings**: `name`, `tel`, and numeric inputs annotated.
- **Dead code removed**: `TaskService::paginatedFor/toggleComplete/bulk*`, unused `subtaskApi.list`, `authApi` duplication (AuthContext now reuses it), unused `prefersDarkScheme`, stale Laravel-scaffold npm stack in `backend/`, phantom `Inter` font reference, duplicate `$fillable` entries.

### Changed

- Backend `composer.json` renamed to `focuslist/backend`; scaffold `setup`/`dev` scripts dropped (SPA has its own workflow); `welcome` page replaced with a minimal branded API page.
- Frontend API base URL is now robust (`VITE_API_URL` trimmed/trailing-slash safe, falls back to `/api` on its own origin).
- `frontend/.env` is gitignored and shipped as `frontend/.env.example`.
- `DELETE /profile` flow and `Dashboard` error state gained a "Try again" action.

## 2026-09-13 (pre-release build)

Prior work lives in `PROGRESS.md` trace log: smart priorities, recurrence, reminders, notifications, smart add, voice input, PWA, export, and 16 documented sessions ending at `T-016`.