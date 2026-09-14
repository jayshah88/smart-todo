# Contributing to FocusList

Thanks for taking the time to contribute. This project is small on purpose and easy to reason about — please keep it that way.

## Getting started

1. Fork the repository and clone your fork.
2. Follow the [README quick start](README.md#live-demo) to get the app running locally.
3. Create a feature branch: `git checkout -b feat/my-thing`.

## Finding work

- Open issues for bugs, feature ideas, and docs gaps.
- Check `PROGRESS.md` — every change is traced there (`T-NNN`); it is the project's memory and must stay up to date.
- Don't create a large PR without an issue/discussion first. Small, focused PRs are strongly preferred.

## Code conventions

| Area | Rule |
|---|---|
| Backend | Laravel Pint style (`vendor/bin/pint`), FormRequest validation, Policies for authorization, Services for logic, camelCase API via Resources, snake_case DB columns |
| Frontend | Typed function components + hooks, named default exports, Tailwind utilities with `dark:` variants everywhere, `role="alert"` for errors, skeleton loaders while loading |
| Dates | A `YYYY-MM-DD` string is a **local** date, never `new Date('YYYY-MM-DD')` (UTC off-by-one bug class). Use `lib/dates.ts` helpers |
| Dependencies | No new dependencies unless essential — ask first |
| Colors | Indigo primary, slate neutrals; priority colors: urgent red, high amber, medium blue, low slate |

## Quality gates

**PRs must pass all three:**

```bash
cd backend && vendor/bin/pint --test && php artisan test   # tests: 42 / 140 assertions
cd frontend && npm run build                               # tsc strict + vite build
```

If you change UI, verify at 320 / 375 / 768 / 1280 / 1920 px — no horizontal overflow is a hard requirement.

## Commits

Write clear, conventional-style commit messages (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`). One logical change per commit.

## PR checklist

- [ ] Tests added/updated for backend changes
- [ ] `npm run build` passes
- [ ] New UI verified on mobile + dark mode
- [ ] `PROGRESS.md` updated with a new `T-NNN` trace point
- [ ] Docs touched where behaviour changed

## Questions

Open a discussion or ask in your PR. The maintainer is reachable through GitHub.