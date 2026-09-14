import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Project } from '../types/task';
import { projectApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useToast } from './Toast';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

interface ProjectsPanelProps {
  projects: Project[];
  activeProjectId: number | null;
  onSelect: (id: number | null) => void;
  onReload: () => void;
  onError: (message: string | null) => void;
}

export default function ProjectsPanel({ projects, activeProjectId, onSelect, onReload, onError }: ProjectsPanelProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLORS[0]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    onError(null);
    try {
      await projectApi.create(trimmed, color);
      setName('');
      onReload();
      toast.show('success', 'Project created.');
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Unable to create the project.');
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(project: Project) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    onError(null);
    try {
      await projectApi.update(project.id, { name: trimmed, color: editColor });
      setEditingId(null);
      onReload();
      toast.show('success', 'Project updated.');
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Unable to update the project.');
    }
  }

  async function handleDelete(project: Project) {
    if (!window.confirm(`Delete “${project.name}”? Its tasks will move to Inbox.`)) return;
    onError(null);
    try {
      await projectApi.delete(project.id);
      if (activeProjectId === project.id) onSelect(null);
      onReload();
      toast.show('success', 'Project deleted.');
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Unable to delete the project.');
    }
  }
  const input =
    'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

  const rowClass = (active: boolean) =>
    `flex w-full items-center rounded-lg px-2.5 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
      active
        ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
    }`;

  return (
    <section aria-label="Projects" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Projects</h2>

      <ul className="mt-3 space-y-0.5">
        <li>
          <button onClick={() => onSelect(null)} className={rowClass(activeProjectId === null)}>
            Inbox
          </button>
        </li>
        {projects.map((p) =>
          editingId === p.id ? (
            <li key={p.id} className="px-2.5 py-1.5">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className={input} aria-label="Project name" />
              <div className="mt-1.5 flex items-center gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    aria-label={`Color ${c}`}
                    aria-pressed={editColor === c}
                    className={`h-4 w-4 rounded-full ${editColor === c ? 'ring-2 ring-slate-400 ring-offset-1' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="mt-2 flex gap-1.5">
                <button onClick={() => void handleSaveEdit(p)} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500">
                  Save
                </button>
                <button onClick={() => setEditingId(null)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300">
                  Cancel
                </button>
              </div>
            </li>
          ) : (
            <li key={p.id} className="group flex items-center">
              <button onClick={() => onSelect(p.id)} className={`${rowClass(activeProjectId === p.id)} min-w-0 flex-1 gap-2`}>
                <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: p.color }} />
                <span className="min-w-0 flex-1 truncate text-left">{p.name}</span>
                {typeof p.taskCount === 'number' && <span className="flex-none text-xs text-slate-400">{p.taskCount}</span>}
              </button>
              <div className="flex flex-none gap-0.5 opacity-0 transition group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:opacity-0 sm:flex-none sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:mt-0.5 sm:justify-end">
                <button
                  onClick={() => {
                    setEditingId(p.id);
                    setEditName(p.name);
                    setEditColor(p.color);
                  }}
                  aria-label={`Edit project ${p.name}`}
                  className="rounded p-1 text-xs text-slate-400 hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                >
                  ✎
                </button>
                <button
                  onClick={() => void handleDelete(p)}
                  aria-label={`Delete project ${p.name}`}
                  className="rounded p-1 text-xs text-slate-400 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
                >
                  ✕
                </button>
              </div>
            </li>
          ),
        )}
      </ul>

      <form onSubmit={handleCreate} className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project…"
          aria-label="New project name"
          maxLength={100}
          className={input}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
                className={`h-4 w-4 rounded-full transition ${color === c ? 'ring-2 ring-slate-400 ring-offset-1' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={!name.trim() || creating}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {creating ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </section>
  );
}
