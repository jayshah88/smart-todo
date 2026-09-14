/** Local-date helpers — never use `new Date('YYYY-MM-DD')` (parses as UTC → off-by-one bugs). */

export function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function isOverdue(dueDate: string | null, completed: boolean): boolean {
  if (!dueDate || completed) return false;
  return parseLocalDate(dueDate) < todayLocal();
}

export function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const t = todayLocal();
  const d = parseLocalDate(dueDate);
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

/** Friendly date label: Today / Tomorrow / Yesterday / Mon–Sun (this week) / Sep 12 */
export function friendlyDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const t = todayLocal();
  const diffDays = Math.round((d.getTime() - t.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 6) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Parse a YYYY-MM-DD local date string into a Date (local midnight, no UTC
 * off-by-one). Returns `new Date(NaN)` if the string is unparseable.
 */
export function parseDate(dateStr: string): Date {
  return parseLocalDate(dateStr);
}

/**
 * Format a Date back into a YYYY-MM-DD local string.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Add `count` calendar days to a YYYY-MM-DD string, returning a new YYYY-MM-DD.
 * Returns the original string if it is not a valid date.
 */
export function addDays(dateStr: string, count: number): string | null {
  const date = parseLocalDate(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  date.setDate(date.getDate() + count);
  return formatLocalDate(date);
}

/**
 * Return tomorrow's date (YYYY-MM-DD string). `today` defaults to todayLocal().
 */
export function tomorrow(today: string = formatLocalDate(todayLocal())): string {
  return addDays(today, 1) ?? today;
}

/**
 * Return yesterday's date (YYYY-MM-DD string). `today` defaults to todayLocal().
 */
export function yesterday(today: string = formatLocalDate(todayLocal())): string {
  return addDays(today, -1) ?? today;
}
