import { Link } from 'react-router-dom';

export default function Landing() {
  const PREVIEW = [
    { t: 'Ship onboarding email', p: 'Urgent', pc: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', d: 'Today', done: false },
    { t: 'Review design feedback', p: 'High', pc: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', d: 'Tomorrow', done: false },
    { t: 'Plan sprint retro', p: 'Medium', pc: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', d: 'Fri', done: true },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">FocusList</span>
        <div className="flex items-center gap-3">
          <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Log in</Link>
          <Link to="/register" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">Get started</Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 pb-32">
        <section className="grid items-center gap-12 pt-12 lg:grid-cols-2 lg:pt-20">
          <div className="min-w-0">
            <h1 className="max-w-xl text-5xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
              The to-do list that tells you what to do next.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-7 text-slate-600 dark:text-slate-400">
              FocusList scores every task by deadline and priority, tracks your streaks, and keeps
              projects, tags and subtasks in one calm place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/register" className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">Create your account</Link>
              <Link to="/login" className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Log in</Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">Demo account: <span className="font-mono text-slate-500 dark:text-slate-300">demo@smarttodo.app / change-me-on-first-login</span></p>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-hidden="true">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Today</span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">3 tasks</span>
              </div>
            </div>
            {PREVIEW.map((item) => (
              <div key={item.t} className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${item.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-500'}`}>
                  {item.done && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-6" /></svg>
                  )}
                </span>
                <span className={`min-w-0 flex-1 truncate text-sm font-medium ${item.done ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>{item.t}</span>
                <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-medium ${item.pc}`}>{item.p}</span>
                <span className="flex-none text-xs text-slate-400">{item.d}</span>
              </div>
            ))}
            <p className="mt-4 text-center text-xs text-slate-400">🔥 6-day completion streak · 92% on time this week</p>
          </div>
        </section>

        <section className="mt-24 grid max-w-4xl gap-6 text-left sm:grid-cols-3">
          {[
            ['Smart priority', 'Every task gets an urgency score from its deadline and importance, so the next right thing is always at the top.'],
            ['Built for momentum', 'Streaks, completion rates and a weekly rhythm view turn finishing work into a habit.'],
            ['Organized your way', 'Projects, colored tags, subtasks and reminders — plus search, bulk actions and drag-to-reorder.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
        FocusList — smart task management.
      </footer>
    </div>
  );
}
