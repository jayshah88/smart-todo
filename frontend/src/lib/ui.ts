/**
 * Small UI helpers used across pages/components for consistent mobile-friendly
 * behavior in V2. Nothing domain-specific here.
 */

/** Show a confirm dialog and return whether the user approved. */
export function unsafeConfirm(message: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.confirm(message);
}

/**
 * Wrap an async action in a confirm dialog.
 * Returns `false` when the user cancels, otherwise awaits `fn`.
 */
export async function confirmAsync(
  message: string,
  fn: () => Promise<unknown>
): Promise<boolean> {
  if (!unsafeConfirm(message)) return false;
  await fn();
  return true;
}
