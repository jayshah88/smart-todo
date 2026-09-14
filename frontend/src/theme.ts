import type { UserSettings } from './types/task';

/**
 * Toggle the `dark` class on <html> based on the user's theme preference.
 * `system` follows the OS-level `prefers-color-scheme` media query.
 */
export function applyTheme(theme: UserSettings['theme']): void {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);

  document.documentElement.classList.toggle('dark', dark);
}