import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { taskApi, projectApi, tagApi } from '../api/endpoints';
import type { TaskListParams } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { Project, Tag, Task } from '../types/task';
import { useToast } from '../components/Toast';
import AppNav from '../components/AppNav';
import VerifyBanner from '../components/VerifyBanner';
import ProjectsPanel from '../components/ProjectsPanel';
import TagsPanel from '../components/TagsPanel';
import TaskItem from '../components/TaskItem';
import TaskEditor from '../components/TaskEditor';
import { parseNaturalTaskInput, parsedToPayload } from '../lib/parseInput';
import useVoiceInput from '../hooks/useVoiceInput';
import { confirmAsync } from '../lib/ui';
import { formatLocalDate, todayLocal, friendlyDate } from '../lib/dates';

const VIEWS = [
  ['all', 'All'],
  ['today', 'Today'],
  ['upcoming', 'Upcoming'],
  ['overdue', 'Overdue'],
  ['completed', 'Completed'],
  ['archive', 'Archive'],
] as const;

const PRIORITY_CHIP: Record<NonNullable<import('../lib/parseInput').Priority>, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export default function Tasks() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') ?? 'all';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, lastPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'created_at' | 'due_date' | 'priority'>('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [tagId, setTagId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  // Sidebar data
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Bulk select + drag reorder
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [dragId, setDragId] = useState<number | null>(null);

  const quickAddRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceInput();
  const [quickAddValue, setQuickAddValue] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);

  // Debounce the search box
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // Any filter change resets to page 1
  useEffect(() => {
    setPage(1);
  }, [view, search, sort, order, priorityFilter, projectId, tagId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p: TaskListParams = {};
      if (view === 'archive') p.archived = '1';
      else if (view !== 'all') p.view = view;
      if (projectId) p.project_id = projectId;
      if (tagId) p.tag_id = tagId;
      if (priorityFilter) p.priority = priorityFilter;
      if (search) p.search = search;
      if (sort !== 'created_at' || order !== 'desc') {
        p.sort = sort;
        p.order = order;
      }
      p.page = page;

      const res = await taskApi.list(p);
      setTasks(res.data);
      setPageInfo({ page: res.meta.current_page, lastPage: res.meta.last_page, total: res.meta.total });
    } catch {
      setError('Unable to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [view, projectId, tagId, priorityFilter, search, sort, order, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const reloadOrg = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([projectApi.list(), tagApi.list()]);
      setProjects(p.data);
      setTags(t.data);
    } catch {
      /* non-fatal: sidebar stays empty */
    }
  }, []);

  useEffect(() => {
    void reloadOrg();
  }, [reloadOrg]);

  // Deep links: /tasks?edit=ID (Focus page) and /tasks?focus=ID (notification
  // center) open the task's editor even when it is not on the current page.
  const [deepLinkTask, setDeepLinkTask] = useState<Task | null>(null);
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (loading || deepLinkHandled.current) return;
    const editParam = searchParams.get('edit');
    const focusParam = searchParams.get('focus');
    if (!editParam && !focusParam) return;
    deepLinkHandled.current = true;
    const id = Number(editParam ?? focusParam);
    const clearParams = () => {
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      next.delete('focus');
      setSearchParams(next, { replace: true });
    };
    if (Number.isInteger(id) && tasks.some((t) => t.id === id)) {
      setEditingId(id);
      clearParams();
      return;
    }
    taskApi
      .get(id)
      .then((res) => {
        setDeepLinkTask(res.data);
        clearParams();
      })
      .catch(() => {
        toast.show('error', 'That task could not be found.');
        clearParams();
      });
  }, [loading, tasks, searchParams, setSearchParams, toast]);

  function updateTaskInList(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function removeTaskFromList(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function runAction(taskId: number, action: (t: Task) => Promise<void>) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setActionBusy(taskId);
    setError(null);
    try {
      await action(task);
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) {
        setError('Action failed. Please check your connection and try again.');
      }
    } finally {
      setActionBusy(null);
    }
  }

  const handleComplete = (t: Task) =>
    runAction(t.id, async (task) => {
      const res = await taskApi.complete(task.id);
      updateTaskInList(res.data);
      toast.show('success', `Completed “${task.title}”.`);
    });

  const handleReopen = (t: Task) =>
    runAction(t.id, async (task) => {
      const res = await taskApi.reopen(task.id);
      updateTaskInList(res.data);
      toast.show('info', `Reopened “${task.title}”.`);
    });

  const handleDelete = (t: Task) =>
    runAction(t.id, async (task) => {
      await taskApi.delete(task.id);
      removeTaskFromList(task.id);
      toast.show('success', `Deleted “${task.title}”.`);
    });

  const handleDuplicate = (t: Task) =>
    runAction(t.id, async (task) => {
      const res = await taskApi.duplicate(task.id);
      setTasks((prev) => [res.data, ...prev]);
      toast.show('success', 'Task duplicated.');
    });

  const handleToggleFavorite = (t: Task) =>
    runAction(t.id, async (task) => {
      const res = await taskApi.update(task.id, { favorite: !task.favorite });
      updateTaskInList(res.data);
    });

  const handleArchive = (t: Task) =>
    runAction(t.id, async (task) => {
      await taskApi.archive(task.id);
      removeTaskFromList(task.id);
      toast.show('success', `Archived “${task.title}”.`);
    });

  const handleRestore = (t: Task) =>
    runAction(t.id, async (task) => {
      await taskApi.restore(task.id);
      removeTaskFromList(task.id);
      toast.show('success', `Restored “${task.title}”.`);
    });

  const handleSkip = (t: Task) =>
    runAction(t.id, async (task) => {
      await taskApi.skip(task.id);
      removeTaskFromList(task.id);
      toast.show('success', `Skipped “${task.title}”.`);
    });

  function toggleSelect(task: Task) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(task.id)) next.delete(task.id);
      else next.add(task.id);
      return next;
    });
  }

  async function runBulk(action: 'complete' | 'delete' | 'priority', priority?: string) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setError(null);
    try {
      const res = await taskApi.bulk(action, ids, priority);
      toast.show('success', res.message);
      setSelectedIds(new Set());
      await Promise.all([load(), reloadOrg()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Bulk action failed. Please try again.');
    }
  }

  // Drag reorder — only on page 1 of the unfiltered default view, so the IDs we
  // send represent the top of the list and reindexing can't corrupt other pages.
  const dragEnabled =
    view === 'all' &&
    pageInfo.page === 1 &&
    !search &&
    !priorityFilter &&
    tagId === null &&
    projectId === null &&
    sort === 'created_at' &&
    order === 'desc';

  function handleDragOver(target: Task) {
    if (dragId === null || dragId === target.id) return;
    setTasks((prev) => {
      const from = prev.findIndex((t) => t.id === dragId);
      const to = prev.findIndex((t) => t.id === target.id);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function handleDrop() {
    if (dragId === null) return;
    setDragId(null);
    try {
      await taskApi.reorder(tasks.map((t) => t.id));
      toast.show('success', 'Order saved.');
    } catch {
      toast.show('error', 'Could not save the new order.');
      void load();
    }
  }

  // Keyboard shortcuts: n = new task, / = search, Esc = close editor
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
      if (e.key === 'Escape') {
        setEditingId(null);
        return;
      }
      if (typing) return;
      if (e.key === 'n') {
        e.preventDefault();
        quickAddRef.current?.focus();
      } else if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Sync voice transcript into the quick-add input
  useEffect(() => {
    if (voice.transcript && quickAddRef.current) {
      quickAddRef.current.value = voice.transcript.trim();
      setQuickAddValue(voice.transcript.trim());
    }
  }, [voice.transcript]);

  async function handleQuickAdd(e: FormEvent) {
    e.preventDefault();
    const raw = quickAddRef.current?.value.trim() ?? '';
    if (!raw) return;
    setError(null);
    try {
      const today = formatLocalDate(todayLocal());
      const parsed = parseNaturalTaskInput(raw, projects, tags, today);
      const payload = parsedToPayload(parsed, projects, tags);

      // If parsing flagged ambiguity, surface it but still create what we parsed
      if (parsed.unclear.length > 0) {
        setError(`We created your task, but we couldn't be sure about: ${parsed.unclear.join(', ')}. Check the details after adding.`);
      }

      const res = await taskApi.create(payload);
      setTasks((prev) => [res.data, ...prev]);
      setPageInfo((p) => ({ ...p, total: p.total + 1 }));
      if (quickAddRef.current) quickAddRef.current.value = '';
      setQuickAddValue('');
      toast.show('success', 'Task added.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create the task.');
    }
  }

  const inputClasses =
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

  const parsedPreview = quickAddValue.trim()
    ? parseNaturalTaskInput(quickAddValue, projects, tags, formatLocalDate(todayLocal()))
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNav brandTo="/tasks" />
      <VerifyBanner />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tasks</h1>
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-expanded={sidebarOpen}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          >
            {sidebarOpen ? 'Hide filters' : 'Filters'}
          </button>
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className={sidebarOpen ? 'space-y-4' : 'hidden space-y-4 lg:block'} aria-label="Organize">
            <ProjectsPanel
              projects={projects}
              activeProjectId={projectId}
              onSelect={setProjectId}
              onReload={reloadOrg}
              onError={setError}
            />
            <TagsPanel
              tags={tags}
              activeTagId={tagId}
              onSelect={setTagId}
              onReload={reloadOrg}
              onError={setError}
            />
          </aside>

          <div className="min-w-0">
            <form onSubmit={handleQuickAdd} className="flex gap-2">
              <input
                ref={quickAddRef}
                placeholder='Add a task…  (try "Pay rent tomorrow 5pm #money high")'
                aria-label="New task title"
                maxLength={255}
                onChange={(e) => setQuickAddValue(e.target.value)}
                className={`${inputClasses} min-w-0 flex-1 py-2.5`}
              />
              {voice.isSupported && (
                <button
                  type="button"
                  onClick={voice.isListening ? voice.stop : voice.start}
                  aria-label={voice.isListening ? "Stop voice input" : "Start voice input"}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                    voice.isListening
                      ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                >
                  {voice.isListening ? (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
                      Listening…
                    </span>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 1 3 3v8a3 3 0 1 1-6 0V4a3 3 0 0 1 3-3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 0 1-14 0v-1" />
                    </svg>
                  )}
                </button>
              )}
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
              >
                Add
              </button>
            </form>

            {quickAddValue.trim() && parsedPreview ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs" aria-live="polite">
                <span className="text-slate-400 dark:text-slate-500">Adding:</span>
                {parsedPreview.dueDate && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {friendlyDate(parsedPreview.dueDate)}
                    {parsedPreview.dueTime ? ` · ${parsedPreview.dueTime}` : ''}
                  </span>
                )}
                {parsedPreview.priority && (
                  <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_CHIP[parsedPreview.priority]}`}>
                    {parsedPreview.priority}
                  </span>
                )}
                {parsedPreview.projectName && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    @{parsedPreview.projectName}
                  </span>
                )}
                {parsedPreview.tagName && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    #{parsedPreview.tagName}
                  </span>
                )}
                {!parsedPreview.dueDate && !parsedPreview.priority && !parsedPreview.projectName && !parsedPreview.tagName && (
                  <span className="text-slate-400 dark:text-slate-500">
                    just the title — add a date, time, priority, #tag or @project
                  </span>
                )}
                {parsedPreview.unclear.map((note) => (
                  <span
                    key={note}
                    className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    ? {note}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 hidden text-xs text-slate-400 sm:block dark:text-slate-500">
                Smart add: dates (tomorrow, Fri, 2026-10-01), times (5pm), priority (high), #tag, @project.
              </p>
            )}

            {!voice.isSupported && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Voice input not supported in this browser. Use keyboard or try a modern browser.
              </p>
            )}

            <ViewTabs view={view} onSetView={(v) => setSearchParams(v === 'all' ? {} : { view: v })} />

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                ref={searchRef}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search…  (press /)"
                aria-label="Search tasks"
                className={`${inputClasses} w-full sm:w-56`}
              />
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  aria-label="Filter by priority"
                  className={`${inputClasses} min-w-0 w-full sm:w-auto`}
                >
                  <option value="">All priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  aria-label="Sort tasks"
                  className={`${inputClasses} min-w-0 w-full sm:w-auto`}
                >
                  <option value="created_at">Recently added</option>
                  <option value="due_date">Due date</option>
                  <option value="priority">Priority</option>
                </select>
                <button
                  type="button"
                  onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
                  aria-label={`Sort ${order === 'desc' ? 'ascending' : 'descending'}`}
                  title={order === 'desc' ? 'Sort descending' : 'Sort ascending'}
                  className="flex flex-none items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <span>{order === 'desc' ? '↓' : '↑'}</span>
                  <span className="hidden sm:inline sm:ml-1">{order === 'desc' ? 'Desc' : 'Asc'}</span>
                </button>
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-950/40">
                <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">{selectedIds.size} selected</span>
                <button
                  onClick={() => void runBulk('complete')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Complete
                </button>
                <select
                  aria-label="Bulk set priority"
                  onChange={(e) => {
                    if (e.target.value) {
                      void runBulk('priority', e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="rounded-lg border border-indigo-300 bg-white px-2 py-1.5 text-xs dark:border-indigo-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">Set priority…</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <button
                  onClick={() =>
                    void confirmAsync(`Delete ${selectedIds.size} selected task(s)? This can’t be undone.`, () =>
                      runBulk('delete'),
                    )
                  }
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-auto text-xs font-medium text-indigo-700 hover:underline dark:text-indigo-300"
                >
                  Clear
                </button>
              </div>
            )}

            {error && (
              <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            )}
            {voice.error && (
              <div role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                {voice.error}
              </div>
            )}

            {deepLinkTask && editingId !== deepLinkTask.id && (
              <TaskEditor
                task={deepLinkTask}
                projects={projects}
                tags={tags}
                onCancel={() => setDeepLinkTask(null)}
                onSaved={(updated: Task) => {
                  if (tasks.some((t) => t.id === updated.id)) {
                    updateTaskInList(updated);
                  } else {
                    void load();
                  }
                  setDeepLinkTask(null);
                  toast.show('success', 'Task updated.');
                }}
                onError={setError}
              />
            )}

            {loading ? (
              <ul className="mt-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <li key={i} className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                ))}
              </ul>
            ) : tasks.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-600">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {view === 'completed'
                    ? 'No completed tasks yet.'
                    : view === 'archive'
                      ? 'Nothing archived.'
                      : 'No tasks here yet.'}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {view === 'all'
                    ? 'Add your first task above to get started.'
                    : 'Try another filter or add a new task.'}
                </p>
              </div>
            ) : (
              <>
                {dragEnabled && !loading && (
                  <p className="mt-4 text-xs text-slate-400">Tip: drag tasks to reorder them.</p>
                )}
                <ul className="mt-2 space-y-3">
                  {tasks.map((task) =>
                    editingId === task.id ? (
                      <TaskEditor
                        key={task.id}
                        task={task}
                        projects={projects}
                        tags={tags}
                        onCancel={() => setEditingId(null)}
                        onSaved={(updated: Task) => {
                          updateTaskInList(updated);
                          setEditingId(null);
                          toast.show('success', 'Task updated.');
                        }}
                        onError={setError}
                      />
                    ) : (
                      <TaskItem
                        key={task.id}
                        task={task}
                        busy={actionBusy === task.id}
                        onComplete={handleComplete}
                        onReopen={handleReopen}
                        onEdit={(t) => setEditingId(t.id)}
                        onDelete={handleDelete}
                        onDuplicate={handleDuplicate}
                        onToggleFavorite={handleToggleFavorite}
                        onArchive={handleArchive}
                        onRestore={handleRestore}
                        onSkip={handleSkip}
                        selectable
                        selected={selectedIds.has(task.id)}
                        onToggleSelect={toggleSelect}
                        draggable={dragEnabled}
                        onDragStart={(t) => setDragId(t.id)}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      />
                    ),
                  )}
                </ul>
              </>
            )}

            {pageInfo.lastPage > 1 && (
              <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageInfo.page <= 1}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Page {pageInfo.page} of {pageInfo.lastPage} · {pageInfo.total} tasks
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageInfo.lastPage, p + 1))}
                  disabled={pageInfo.page >= pageInfo.lastPage}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300"
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ViewTabs({ view, onSetView }: { view: string; onSetView: (v: string) => void }) {
  return (
    <div
      className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar sm:flex-wrap sm:overflow-visible"
      role="tablist"
      aria-label="Task views"
    >
      {VIEWS.map(([value, label]) => (
        <button
          key={value}
          role="tab"
          aria-selected={view === value}
          onClick={() => onSetView(value)}
          className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-medium transition sm:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
            view === value
              ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
