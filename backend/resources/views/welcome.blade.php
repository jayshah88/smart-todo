<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'FocusList') }} — API</title>
    <style>
        body { font-family: ui-sans-serif, system-ui, sans-serif; background: #f8fafc; color: #0f172a;
               display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { max-width: 32rem; padding: 2rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; }
        h1 { margin: 0 0 .5rem; font-size: 1.25rem; }
        p { margin: .25rem 0; color: #475569; font-size: .875rem; line-height: 1.5; }
        code { background: #f1f5f9; padding: .1rem .35rem; border-radius: .25rem; font-size: .8em; }
    </style>
</head>
<body>
    <main class="card">
        <h1>{{ config('app.name', 'FocusList') }} API</h1>
        <p>This service is the JSON API for the FocusList app. The web app lives in the <code>frontend/</code> workspace of this repository.</p>
        <p>API base: <code>{{ url('/api') }}</code> — see <code>docs/API.md</code> in the repository for endpoints.</p>
        <p>Health check: <a href="/up">/up</a></p>
    </main>
</body>
</html>
