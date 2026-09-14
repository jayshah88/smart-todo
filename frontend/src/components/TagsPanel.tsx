import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Tag } from '../types/task';
import { tagApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useToast } from './Toast';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

interface TagsPanelProps {
  tags: Tag[];
  activeTagId: number | null;
  onSelect: (id: number | null) => void;
  onReload: () => void;
  onError: (message: string | null) => void;
}

export default function TagsPanel({ tags, activeTagId, onSelect, onReload, onError }: TagsPanelProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[3]);
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    onError(null);
    try {
      await tagApi.create(trimmed, color);
      setName('');
      onReload();
      toast.show('success', 'Tag created.');
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Unable to create the tag.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(tag: Tag) {
    if (!window.confirm(`Delete tag “${tag.name}”?`)) return;
    onError(null);
    try {
      await tagApi.delete(tag.id);
      if (activeTagId === tag.id) onSelect(null);
      onReload();
      toast.show('success', 'Tag deleted.');
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Unable to delete the tag.');
    }
  }
  const input =
    'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

  return (
    <section aria-label="Tags" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tags</h2>

      {tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <li key={t.id} className="group flex items-center">
              <button
                onClick={() => onSelect(activeTagId === t.id ? null : t.id)}
                aria-pressed={activeTagId === t.id}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                  activeTagId === t.id ? 'text-white ring-2 ring-offset-1 ring-slate-400' : 'text-white opacity-85 hover:opacity-100'
                }`}
                style={{ backgroundColor: t.color }}
              >
                {t.name}
              </button>
              <button
                onClick={() => void handleDelete(t)}
                aria-label={`Delete tag ${t.name}`}
                className="ml-0.5 text-xs text-slate-400 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 sm:hidden"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-400">No tags yet.</p>
      )}

      <form onSubmit={handleCreate} className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New tag…"
          aria-label="New tag name"
          maxLength={50}
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
