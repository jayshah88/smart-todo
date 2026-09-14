# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems.

Report privately by email to the repository owner (GitHub profile for contact), or use GitHub's **Report a vulnerability** feature on the repo's *Security* tab when available.

You can expect:

- An acknowledgment within 48 hours.
- A fix and a release coordinated with you.

## Scope

The API surface (`backend/routes/api.php`), authentication (Sanctum tokens), authorization (Policies), and any code handling user data.

## Security posture (already in place)

- **Auth**: Sanctum bearer tokens; passwords hashed (`$password => 'hashed'`); email verification; password reset with no user enumeration (`forgotPassword` always returns the same message).
- **Rate limiting**: auth endpoints 10/min/IP, general API 120/min, mutating endpoints 60/min (see `app/Providers/AppServiceProvider.php`).
- **Authorization**: `Policies` on tasks, projects, tags, notifications; cross-user `project_id`/`tag_id` reference validation in FormRequests; subtask/task ownership checks.
- **Errors**: global JSON exception handlers return clean 401/403/404 without stack traces (`APP_DEBUG=false` in production).
- **CORS**: allowed origins are env-driven (`CORS_ALLOWED_ORIGINS`) — keep them to your real frontend domains.
- **Data**: exports only return the authenticated user's own data; account deletion is password-confirmed.

## Reporting a bug vs. a vulnerability

Any behaviour that lets one user read or modify another user's data is a vulnerability. Everything else is a regular issue.