# FocusList — Progress Trace

> **Living document.** Every work session MUST append trace points here (see AGENTS.md standing rules).
> Trace point format: `T-NNN` · date · phase · one-line change · files touched · status.

**Stack:** Laravel 12 API (`backend/`) + React 18 / Vite / Tailwind 3 SPA (`frontend/`)
**Feature status legend:** ✅ done · 🔶 backend done, UI missing · ❌ missing · 🐛 bug

---

## 1. Feature Matrix (audited T-001)

### Backend — API (all ✅ implemented)
| Area | Status | Notes |
|---|---|---|
| Auth (register/login/logout) | ✅ | Sanctum tokens, throttled |
| Forgot/reset password | ✅ | No user enumeration |
| Email verification | ✅ | verify + resend endpoints |
| Profile & settings | ✅ | name/email/timezone, theme, email reminders, daily/weekly summary |
| Account deletion | ✅ | password-confirmed |
| Task CRUD + policies | ✅ | per-user authorization |
| Complete / reopen | ✅ | recurring tasks spawn next occurrence |
| Duplicate / archive / restore | ✅ | |
| Filters: view/project/tag/priority/search/sort/order | ✅ | sort=priority was broken → fixed T-003 |
| Bulk ops (complete/delete/priority) | ✅ | |
| Reorder (drag order) | ✅ | |
| Recurrence engine | ✅ | daily/weekly/monthly/yearly + interval + weekdays + end date |
| Reminders | ✅ | reminder_minutes_before + scheduler every 5 min |
| Projects / Tags / Subtasks CRUD | ✅ | |
| Dashboard stats + insights + streaks | ✅ | |
| Weekly chart + activity feed endpoints | ✅ | |
| Daily/weekly email summaries | ✅ | scheduled, respects user settings |
| Tests (Auth/Dashboard/Task) | ✅ | `php artisan test` |

### Frontend — UI (updated as phases land)
| # | Feature | Status | Trace |
|---|---|---|---|
| 1 | Landing / Login / Register | ✅ (+ dark variants) | T-004 |
| 2 | Dashboard stats, completion rate, streak, insights | ✅ | initial |
| 3 | Weekly chart + Activity feed on Dashboard | ✅ | T-005 |
| 4 | Tasks: quick add, view tabs, complete/reopen, edit, delete | ✅ | initial |
| 5 | Search bar + sort + priority filter | ✅ | T-005 |
| 6 | Pagination controls | ✅ | T-005 |
| 7 | Projects UI (create/manage/filter) | ✅ | T-006 |
| 8 | Tags UI (create/manage/assign) | ✅ | T-006 |
| 9 | Subtasks UI (add/toggle/delete in editor) | ✅ | T-007 |
| 10 | Recurrence UI ("Repeat …") | ✅ | T-007 |
| 11 | Reminders UI ("Remind me before") | ✅ | T-007 |
| 12 | Bulk select (complete/priority/delete) | ✅ | T-008 |
| 13 | Drag & drop reorder | ✅ | T-008 |
| 14 | Duplicate + Favorite (star) + Archive/restore actions | ✅ | T-008 |
| 15 | Archive view tab | ✅ | T-008 |
| 16 | Forgot/reset password pages + link | ✅ | T-009 |
| 17 | Email-verification banner + resend | ✅ | T-009 |
| 18 | Account deletion in Settings | ✅ | T-009 |
| 19 | Friendly dates ("Today", "Tomorrow", "Sat, Sep 12") | ✅ | T-005 |
| 20 | Toast system | ✅ | T-005 |
| 21 | Shared AppNav component | ✅ | T-004 |
| 22 | Landing redesign (distinctive, dark, demo) | ✅ | T-004 |
| 23 | Keyboard shortcuts (n = new, / = search, Esc = close) | ✅ | T-010 |
| 24 | In-progress status setter | ✅ | T-010 |
| 25 | PWA / offline (installable app shell; no offline data) | ✅ | T-016 |
| 26 | Natural-language quick add (dates/times/priority/#tag/@project + live preview) | ✅ | T-016 |
| 27 | Voice capture in quick add (Web Speech API) | ✅ | T-016 |
| 28 | Data export (JSON download, Settings) | ✅ | T-016 |
| 29 | PWA install prompt (Settings → App) | ✅ | T-016 |

### Bugs (found in audit T-001)
| # | Bug | Status | Trace |
|---|---|---|---|
| B1 | Theme not applied after login/register | ✅ fixed | T-002 |
| B2 | `sort=priority` silently fell back to created_at | ✅ fixed | T-003 |
| B3 | Overdue check parsed date as UTC → off-by-one | ✅ fixed | T-002 |
| B4 | Edit/Delete invisible on touch/keyboard (hover-only) | ✅ fixed | T-002 |
| B5 | Delete had no confirm/undo | ✅ fixed (inline confirm) | T-002 |
| B6 | `TaskService::bulkComplete` didn't set status | ✅ fixed | T-003 |
| B7 | Frontend ignored pagination meta (max 25 tasks ever) | ✅ fixed | T-005 |
| B8 | **grill-me #1:** zero runtime verification → now live smoke-tested via proxy
| B9 | **grill-me #3:** drag reorder could corrupt global order across pages → guarded to page 1 | ✅ fixed | T-011 |
| B10 | **Smoke test:** Vite proxy pointed at :8010 (backend :8000) → app dead in dev | ✅ fixed | T-011 |
| B11 | **Smoke test:** Landing advertised wrong demo credentials | ✅ fixed | T-011 |
| B12 | **grill-me #2:** bulk actions clear selection optimistically w/o rollback (accepted — reload on failure)
| B13 | **grill-me #4:** destructive pattern split (inline confirm vs window.confirm) — accepted, noted for future pass
| B14 | **grill-me #5:** VerifyBanner "I've verified" calls endpoint directly — works but trust-based shortcut (documented)
| B15 | **grill-me #6/#7:** no trace enforcement mechanism; decisions not all recorded — this register is the fix | ✅ in place | T-011 |
| B16 | Tasks/dashboard/settings/Landing horizontal overflow: nowrap (`truncate`) task descriptions forced grid `1fr` track to 1590px min-content; nav + toast overflowed at ≤375px | ✅ fixed | T-012 |
| B17 | Multi-user settings leak: `UserResource` called `->first()` on HasOne relation, loading User 1's settings for all users | ✅ fixed | T-017 |
| B18 | Recurrence fidelity: completing recurring tasks lost tags and pending reminders on next occurrence | ✅ fixed | T-017 |
| B19 | Laravel Pint style check failed on 11 files, breaking GitHub CI | ✅ fixed | T-017 |
| B20 | Root `.gitignore` had non-recursive `/node_modules`, missing `vendor/`, and un-globbed `*.log` | ✅ fixed | T-017 |


---

## 2. Trace Log

| Trace | Date | Phase | Change | Files |
|---|---|---|---|---|
| T-001 | 2026-09-12 | Audit | Full feature + UI/UX audit. Backend ~complete; frontend used ~50% of API. Found 7 bugs. | — |
| T-002 | 2026-09-12 | B | Fixed B1, B3, B4, B5: theme on login/register, local-date overdue check, always-accessible row actions, inline delete confirm. | AuthContext.tsx, TaskItem.tsx |
| T-003 | 2026-09-12 | B | Fixed B2, B6: real priority sort (CASE mapping) + bulkComplete sets status. | TaskController.php, TaskService.php |
| T-004 | 2026-09-12 | B | Dark variants for Landing/Login/Register; shared AppNav; Landing redesign with demo mockup + dark mode. | Landing.tsx, Login.tsx, Register.tsx, components/AppNav.tsx |
| T-005 | 2026-09-12 | C | Tasks page: search + sort + priority filter, pagination, friendly dates, toast system. | Tasks.tsx, components/Toast.tsx, lib/dates.ts, endpoints.ts |
| T-006 | 2026-09-12 | C | Projects & Tags UI: sidebar with create/manage/filter; tag assignment in editor; full CRUD in endpoints. | Tasks.tsx, components/ProjectsPanel.tsx, components/TagsPanel.tsx |
| T-007 | 2026-09-12 | C | Subtasks, recurrence and reminder controls in TaskEditor. | Tasks.tsx, TaskEditor.tsx |
| T-008 | 2026-09-12 | D | Bulk select, drag reorder, duplicate/favorite/archive actions, archive tab. | Tasks.tsx, TaskItem.tsx |
| T-009 | 2026-09-12 | D | Forgot/reset password pages, verification banner, account deletion. | pages/ForgotPassword.tsx, pages/ResetPassword.tsx, App.tsx, Settings.tsx, components/VerifyBanner.tsx |
| T-010 | 2026-09-12 | D | Keyboard shortcuts, in-progress status, final polish + verification pass. | Tasks.tsx |
| T-011 | 2026-09-12 | QA | **grill-me + live smoke test** (through Vite proxy + agent-browser). Fixed: ① Vite proxy port mismatch `8010`→`8000` (vite.config.ts) + `.env` `VITE_API_URL`; ② Landing demo credentials wrong → `demo@smarttodo.app / change-me-on-first-login`; ③ drag-reorder now guarded to page 1 (was corrupting global `sort_order` across pages). Verified end-to-end: login → /me → dashboard → create (project+reminder+recurrence) → complete (spawns next occurrence) → search → duplicate → archive + archive-view filter → bulk priority → reorder → subtask add → delete. | vite.config.ts, .env, Landing.tsx, AGENTS.md, Tasks.tsx, PROGRESS.md |
| T-012 | 2026-09-12 | QA | **Responsive/overflow fix (root cause, no `overflow-x:hidden`).** Measured via agent-browser CDP at 1440→320px. Root cause: `TaskItem` descriptions used `truncate` (`white-space:nowrap`) → 200-char seeded descriptions imposed ~1417px min-content → grid `1fr` track auto-min ballooned column to 1590px → doc scrolled 1894–2038px at all widths. Fixed: descriptions→`line-clamp-2` + `break-words`, titles `break-words`, actions `min-w-0 … sm:flex-none`; Tasks grid `lg:grid-cols-[16rem_minmax(0,1fr)]` + `min-w-0` on content column + quick-add input; AppNav flex-wrap/ml-auto (name hidden <sm); Toast `max-w-[calc(100vw-3rem)]`; Landing grid children `min-w-0`. Verified 0 overflow (`scrollWidth==viewport`) on /, /login, /register, /forgot-password, /reset-password, /tasks (+ sidebar open, + editor open), /dashboard, /settings at 375 & 320 (Tasks also 1440/1024/768). `npm run build` clean. | TaskItem.tsx, Tasks.tsx, AppNav.tsx, Toast.tsx, Landing.tsx, PROGRESS.md |
| T-013 | 2026-09-12 | Phase 3 | **Smart focus + planning.** Added `estimated_duration` to tasks + `daily_capacity_minutes` to user_settings (migrations). Created `FocusService` with explainable focus items (urgency-scored), today timeline (time-aware tasks), capacity vs planned minutes with overflow detection. Created `Focus` page with "What to do now" list (complete/edit actions, reason labels, estimated duration), capacity bar (planned vs budget, overflow warning), today timeline (time-sorted). Added estimated duration input to TaskEditor. Added daily capacity setting to Settings. Updated Task/UserSettings types, dashboard API, ProfileController, route + nav link. | backend/migrations/*_add_estimated_duration_to_tasks_table.php, backend/migrations/*_add_planning_fields_to_user_settings_table.php, backend/app/Models/Task.php, backend/app/Models/UserSetting.php, backend/app/Services/FocusService.php, backend/app/Http/Controllers/DashboardController.php, backend/app/Http/Controllers/ProfileController.php, backend/app/Http/Resources/TaskResource.php, backend/app/Http/Requests/StoreTaskRequest.php, backend/app/Http/Requests/UpdateTaskRequest.php, backend/routes/api.php, frontend/src/pages/Focus.tsx, frontend/src/App.tsx, frontend/src/components/AppNav.tsx, frontend/src/components/TaskEditor.tsx, frontend/src/pages/Settings.tsx, frontend/src/types/task.ts, frontend/src/api/endpoints.ts, PROGRESS.md |
| T-014 | 2026-09-12 | Phase 4 | **Recurrence polish + reminder correctness.** Added `skip` endpoint (POST /tasks/{id}/skip) that completes a recurring task without generating the next occurrence. Added `nextOccurrenceDate()` to Task model and `nextOccurrence` + `reminderAt` to TaskResource. Fixed reminder lifecycle: completing a task now deletes pending reminders; reopening re-creates the reminder. Added next-occurrence preview in TaskItem recurrence badge. Added reminder preview in TaskEditor showing when the reminder will fire. Added `skip()` to frontend API client, `onSkip` prop to TaskItem, `handleSkip` handler in Tasks.tsx. Updated Task type with `reminderAt` and `nextOccurrence`. | backend/app/Models/Task.php, backend/app/Http/Controllers/TaskController.php, backend/app/Http/Resources/TaskResource.php, backend/routes/api.php, frontend/src/components/TaskItem.tsx, frontend/src/components/TaskEditor.tsx, frontend/src/pages/Tasks.tsx, frontend/src/api/endpoints.ts, frontend/src/types/task.ts, PROGRESS.md |
| T-015 | 2026-09-12 | Phase 5 | **Notification backbone: in-app + email + push/WhatsApp hooks.** Migrations: `notifications` table (user/task/type/title/body/channel/read/sent/metadata) + notification settings on user_settings (push_enabled, whatsapp_enabled, whatsapp_phone, quiet_hours_start/end HH:MM, digest_mode). Notification model (forUser/unread scopes), resource, policy, controller (index newest-first + ?unread=1, unread-count, mark read with owner auth, mark-all-read). NotificationService: one-reminder dedupe, quiet-hours check (incl. overnight wrap), dispatchReminder (in-app always, email via existing TaskReminderNotification, push/whatsapp recorded when opted-in, quiet_hours_deferred otherwise), whatsappDeepLink fallback. SendTaskReminders command now dispatches via service. Profile settings accept/return new fields. Frontend: AppNotification type, notificationApi, Notifications page (/notifications route, read/unread, channel pills, skeleton/empty/error states), AppNav unread badge (60s poll, best-effort), Settings notification section (push, WhatsApp opt-in + phone + wa.me test link, quiet hours, digest, calm-rule note). Tests: NotificationTest 11/11 (quiet-hours overnight, one-reminder dedupe, dispatch deferral, deep-links, auth scoping, unread-count/read flow, settings accept/reject, unread filter, mark-all). Full suite 37 passed/119 assertions. Frontend build clean (60 modules). Routes: 4 notification endpoints. | backend/migrations/*_create_notifications_table.php, backend/migrations/*_add_notification_settings_to_user_settings_table.php, backend/app/Models/Notification.php, backend/app/Models/UserSetting.php, backend/app/Services/NotificationService.php, backend/app/Http/Controllers/NotificationController.php, backend/app/Http/Resources/NotificationResource.php, backend/app/Policies/NotificationPolicy.php, backend/app/Http/Controllers/ProfileController.php, backend/app/Http/Resources/UserResource.php, backend/app/Console/Commands/SendTaskReminders.php, backend/routes/api.php, backend/tests/Feature/NotificationTest.php, frontend/src/types/task.ts, frontend/src/api/endpoints.ts, frontend/src/pages/Notifications.tsx, frontend/src/App.tsx, frontend/src/components/AppNav.tsx, frontend/src/pages/Settings.tsx, PROGRESS.md |
| T-016 | 2026-09-13 | Phase 6 | **Platform & smart capture: PWA, natural-language quick add, voice capture, data export.** PWA: `manifest.json` + `sw.js` (versioned app-shell cache, icons 192/512), theme-color/apple meta, `registerSW` (prod-only) + http(s)-guarded inline registration; install prompt via new `usePwaInstall` hook (beforeinstallprompt) surfaced in a new Settings "App" section with standalone detection and graceful copy when unsupported. Natural-language quick add: `lib/parseInput.ts` parses dates (today/tomorrow/yesterday/weekday/ISO), times (H[:mm] am/pm), priority tokens, `#tag`/`@project` fuzzy-matched to the user's known tags/projects; `parsedToPayload` resolves names → ids (server re-validates ownership). Live parse preview chips under the quick-add input ("Adding: …", aria-live), syntax hint when empty, amber chips for uncertain parses. Voice capture: `hooks/useVoiceInput.ts` (Web Speech API, graceful degradation) + mic button that syncs the transcript into quick-add. Data export: `ExportController` (GET `/export` streamed JSON attachment + GET `/export/summary`), `ExportTest` 3/3, Settings "Your data" card with counts + download. Cleanup from previous session's WIP: removed duplicated Tasks header search box + second Filters button, fixed conflicting `px-4 px-6 px-10` classes, unified route-guard loading via `LoadingScreen`, bulk delete confirm now uses `confirmAsync` (ui.ts), removed dead `resetTo`/`isMobile`/`prefersDark`. Verified: backend 40 passed/130 assertions (incl. Export + Notification suites), frontend build clean (63 modules), live agent-browser smoke: login → NL create "Pay rent tomorrow 5pm #money high" → created with title "Pay rent", due 2026-09-14 17:00, priority high → export payload contains the task → 0 horizontal overflow at 375px on /tasks /settings /dashboard. DEPLOY.md: bump `sw.js` CACHE version per deploy. | frontend/src/pages/Tasks.tsx, frontend/src/pages/Settings.tsx, frontend/src/App.tsx, frontend/src/hooks/usePwaInstall.ts, frontend/src/hooks/useVoiceInput.ts, frontend/src/lib/parseInput.ts, frontend/src/lib/platform.ts, frontend/src/lib/ui.ts, frontend/src/components/LoadingScreen.tsx, frontend/src/pwa/registerSW.ts, frontend/index.html, frontend/public/manifest.json, frontend/public/sw.js, backend/app/Http/Controllers/ExportController.php, backend/routes/api.php, backend/tests/Feature/ExportTest.php, DEPLOY.md, PROGRESS.md |
| T-017 | 2026-09-13 | Release Audit | **Complete final audit, bug fixes & production readiness pass.** Fixed B17 (critical multi-user settings leak in `UserResource` where `->first()` invoked raw unconstrained query on `user_settings` table → fixed to `relationLoaded`). Fixed B18 (recurring task completion now replicates tags and schedules reminders for the spawned occurrence via `TaskController::generateNextOccurrence`). Removed dead `TaskService::toggleComplete`. Added regression tests in `AuthTest` (multi-user settings isolation) and `TaskTest` (recurrence tags & reminders). Formatted backend with Laravel Pint (`vendor/bin/pint`), achieving 100% compliance on style (`vendor/bin/pint --test` green). Hardened root `.gitignore` with recursive patterns (`node_modules/`, `vendor/`, `**/*.log`, storage cache, OS files). Created GitHub open-source community templates (`.github/ISSUE_TEMPLATE/bug_report.md`, `feature_request.md`, `pull_request_template.md`). Aligned frontend `package.json` name to `focuslist-frontend`. Enhanced `frontend/index.html` with SEO and OpenGraph metadata. Verified 0 horizontal overflow across 320, 375, 768, 1024, 1280, 1920px viewports across all pages via agent-browser. All 43 tests pass (145 assertions). `npm run build` clean. | backend/app/Http/Resources/UserResource.php, backend/app/Http/Controllers/TaskController.php, backend/app/Services/TaskService.php, backend/tests/Feature/AuthTest.php, backend/tests/Feature/TaskTest.php, frontend/package.json, frontend/index.html, .gitignore, .github/ISSUE_TEMPLATE/*, .github/pull_request_template.md, README.md, CHANGELOG.md, PROGRESS.md |
| T-018 | 2026-09-14 | Mobile Polish | **Mobile layout & navigation responsiveness overhaul.** Fixed mobile header wrapping into 3 rows by adding responsive hamburger menu button (☰ / ✕) and slide-down drawer panel in `AppNav.tsx` with active route highlights, unread badges, user identity, and logout. Fixed task item title vertical letter-by-letter crushing on mobile in `TaskItem.tsx` by separating action buttons into a dedicated row below task content on `<sm` screens, giving titles 100% available horizontal space. Refactored view tabs in `Tasks.tsx` into a smooth horizontal-scrollable segmented pill bar with custom `no-scrollbar` utility in `index.css`. Replaced jagged 4-row search/filter controls with a 2-row layout (`w-full` search input + 3-column `[minmax(0,1fr)_minmax(0,1fr)_auto]` grid for priority, sort, and compact direction toggle). Verified 0px overflow at 375px (`scrollWidth == 375`) and re-captured updated screenshots (`09-tasks-mobile.png`, `10-dashboard-mobile.png`, `10-dashboard-mobile-menu.png`). Tests (43/145) and Pint style clean. | frontend/src/components/AppNav.tsx, frontend/src/components/TaskItem.tsx, frontend/src/pages/Tasks.tsx, frontend/src/index.css, README.md, docs/screenshots/*, PROGRESS.md |

## 3. Next up
- Board (kanban) view
- Real provider wiring for push/WhatsApp channels (hooks + settings already in place — see DEPLOY.md §7)
- Upgrade deterministic suggest-priority to a model-backed suggestion

## 4. Verification checklist (rerun after every phase)
- [x] `cd backend && php artisan test` — all green (43 passed, 145 assertions, incl. isolation + recurrence tests) — rerun T-017
- [x] `cd backend && vendor/bin/pint --test` — 100% passed (0 style violations) — rerun T-017
- [x] `cd frontend && npm run build` — tsc + vite clean (63 modules) — rerun T-017
- [x] Responsive verification across 320, 375, 768, 1024, 1280, 1920 px: 0 overflow on all routes — rerun T-017
- [x] Security audit: no secrets tracked, .gitignore hardened, multi-user isolation tested — rerun T-017

**Session result (T-001 → T-010, all phases A–D complete):**
- Backend: 2 fixes (priority sort, bulk status), 0 regressions.
- Frontend: 8 files created (AppNav, Toast, VerifyBanner, ProjectsPanel, TagsPanel, TaskEditor, ForgotPassword, ResetPassword, lib/dates), 8 files rewritten (Tasks, Dashboard, TaskItem, Landing, Login, Register, Settings, App, endpoints, types), 2 fixes (AuthContext, client).
- 17 previously-hidden backend features now have UI: search, sort, priority filter, pagination, projects, tags, subtasks, recurrence, reminders, bulk select, drag reorder, duplicate, favorite, archive/restore, weekly chart, activity feed, account deletion — plus forgot/reset password and verification banner flows.
