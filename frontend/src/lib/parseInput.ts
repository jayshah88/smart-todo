import { parseDate, addDays, tomorrow as tomorrowFn, yesterday as yesterdayFn } from './dates';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type ParsedTaskInput = {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority | null;
  projectName: string | null;
  tagName: string | null;
  unclear: string[];
};

export type DateTimeParseResult = {
  raw: string;
  kind: 'date' | 'time' | 'datetime';
  date: string | null;
  time: string | null;
  label: string;
  confident: boolean;
};

function detectPriority(text: string): Priority | null {
  // Word-boundary match so "Follow up" / "Highlight" don't read as priorities.
  const match = text.toLowerCase().match(/(?:^|\s)(urgent|high|medium|low)(?=\s|$)/);
  if (!match) return null;
  return match[1] as Priority;
}

function isTimeToken(token: string): boolean {
  return /^\d{1,2}\s*(:?\d{2})?\s*(am|pm)?$/i.test(token);
}

function normalizeTime(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  let match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!match) {
    match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (!match) return null;
  }
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridian = match[3];
  if (hour < 1 || hour > 12) return null;
  if (minute < 0 || minute > 59) return null;
  if (meridian === 'pm' && hour < 12) hour += 12;
  if (meridian === 'am' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function tryParseISO(token: string): string | null {
  const m = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  const m2 = token.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (m2) {
    const y = parseInt(m2[1], 10);
    const mo = parseInt(m2[2], 10);
    const d = parseInt(m2[3], 10);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return null;
}

function weekdayToNumber(name: string): number | null {
  const map: Record<string, number> = {
    sunday: 7,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    thurs: 4,
    friday: 5,
    saturday: 6,
  };
  return map[name] ?? null;
}

function nextWeekday(today: string, targetDow: number): string {
  const current = parseDate(today);
  if (!current) return today;
  const currentDow = (current.getDay() === 0 ? 7 : current.getDay());
  let diff = targetDow - currentDow;
  if (diff <= 0) diff += 7;
  const result = addDays(today, diff);
  return result ?? today;
}

function fuzzyPick(input: string, known: readonly { id: number; name: string }[]): string | null {
  if (!input || !known.length) return null;
  const lower = input.toLowerCase();
  const exact = known.find((p) => p.name.toLowerCase() === lower);
  if (exact) return exact.name;
  const starts = known.find((p) => p.name.toLowerCase().startsWith(lower));
  if (starts) return starts.name;
  const includes = known.find((p) => p.name.toLowerCase().includes(lower));
  if (includes) return includes.name;
  return null;
}

function removeChunk(text: string, chunk: string): string {
  if (!chunk) return text;
  return text.replace(chunk, '');
}

function dateResultUncertain(date: string, today: string): boolean {
  return date < today;
}

function detectDate(tokens: string[], time: string | null, today: string): DateTimeParseResult | null {
  for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i].toLowerCase();
    if (t === 'today') {
      return { raw: t, kind: 'date', date: today, time, label: 'Today', confident: true };
    }
    if (t === 'tomorrow') {
      return { raw: t, kind: 'date', date: tomorrowFn(today), time, label: 'Tomorrow', confident: true };
    }
    if (t === 'yesterday') {
      return { raw: t, kind: 'date', date: yesterdayFn(today), time, label: 'Yesterday', confident: false };
    }
    if (t.startsWith('next ') && t.length > 5) {
      const weekday = t.slice(5).trim();
      const dow = weekdayToNumber(weekday);
      if (dow != null) {
        const date = nextWeekday(today, dow);
        return { raw: t, kind: 'date', date, time, label: t, confident: !dateResultUncertain(date, today) };
      }
    }
    if (
      t === 'monday' ||
      t === 'tuesday' ||
      t === 'wednesday' ||
      t === 'thursday' ||
      t === 'thurs' ||
      t === 'friday' ||
      t === 'saturday' ||
      t === 'sunday'
    ) {
      const dow = weekdayToNumber(t);
      if (dow != null) {
        const date = nextWeekday(today, dow);
        const label = t.charAt(0).toUpperCase() + t.slice(1);
        return { raw: t, kind: 'date', date, time, label, confident: !dateResultUncertain(date, today) };
      }
    }
    const iso = tryParseISO(t);
    if (iso) {
      return { raw: t, kind: 'date', date: iso, time, label: t, confident: true };
    }
  }
  return null;
}

function detectDateTime(text: string, today: string): DateTimeParseResult | null {
  const tokens = text.split(/\s+/);
  let timeIndex = -1;
  let time: string | null = null;
  let timeRaw = '';
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (isTimeToken(token)) {
      const normalized = normalizeTime(token);
      if (normalized) {
        timeIndex = i;
        time = normalized;
        timeRaw = token;
        break;
      }
    }
  }
  let dateTokens: string[];
  if (timeIndex >= 0) {
    dateTokens = [...tokens.slice(0, timeIndex), ...tokens.slice(timeIndex + 1)];
  } else {
    dateTokens = tokens;
  }
  const dateResult = detectDate(dateTokens, time, today);
  if (!dateResult) {
    if (time) {
      return { raw: timeRaw, kind: 'time', date: null, time, label: time, confident: true };
    }
    return null;
  }
  const date = dateResult.date;
  const kind: 'date' | 'datetime' = dateResult.time ? 'datetime' : 'date';
  const raw = [dateResult.raw, time ? timeRaw : ''].filter(Boolean).join(' ');
  return {
    raw,
    kind,
    date,
    time: dateResult.time ?? time,
    label: dateResult.label,
    confident: dateResult.confident,
  };
}

export function parseNaturalTaskInput(
  raw: string,
  knownProjects: readonly { id: number; name: string }[],
  knownTags: readonly { id: number; name: string }[],
  today: string,
): ParsedTaskInput {
  const text = raw.trim();
  if (!text) {
    return { title: '', dueDate: null, dueTime: null, priority: null, projectName: null, tagName: null, unclear: [] };
  }

  const priority = detectPriority(text);
  let remaining = text;
  const dateTime = detectDateTime(remaining, today);
  if (dateTime) {
    remaining = removeChunk(remaining, dateTime.raw.trim()).trim();
  }

  let projectName: string | null = null;
  let tagName: string | null = null;
  const projectMatch = remaining.match(/@([\w][\w -]*)/);
  if (projectMatch) {
    projectName = projectMatch[1].trim().replace(/\s+$/, '');
    remaining = removeChunk(remaining, projectMatch[0]);
  }
  const tagMatch = remaining.match(/#([\w][\w -]*)/);
  if (tagMatch) {
    tagName = tagMatch[1].trim().replace(/\s+$/, '');
    remaining = removeChunk(remaining, tagMatch[0]);
  }

  const title = remaining
    .replace(/\b(urgent|high|medium|low)\b/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const unclear: string[] = [];
  if (dateTime && !dateTime.confident) {
    unclear.push(dateTime.label);
  }

  return {
    title: title || text,
    dueDate: dateTime?.date ?? null,
    dueTime: dateTime?.time ?? null,
    priority,
    projectName: fuzzyPick(projectName ?? '', knownProjects),
    tagName: fuzzyPick(tagName ?? '', knownTags),
    unclear,
  };
}

export function parsedToPayload(
  parsed: ParsedTaskInput,
  knownProjects: readonly { id: number; name: string }[],
  knownTags: readonly { id: number; name: string }[],
): {
  title: string;
  due_date?: string;
  due_time?: string;
  priority?: Priority;
  project_id?: number | null;
  tag_ids?: number[];
  unclear: string[];
} {
  let projectId: number | null = null;
  if (parsed.projectName) {
    const project = knownProjects.find((p) => p.name.toLowerCase() === parsed.projectName!.toLowerCase());
    projectId = project ? project.id : null;
  }

  let tagId: number | null = null;
  if (parsed.tagName) {
    const tag = knownTags.find((t) => t.name.toLowerCase() === parsed.tagName!.toLowerCase());
    tagId = tag ? tag.id : null;
  }

  return {
    title: parsed.title,
    due_date: parsed.dueDate ?? undefined,
    due_time: parsed.dueTime ?? undefined,
    priority: parsed.priority ?? undefined,
    project_id: projectId,
    tag_ids: tagId ? [tagId] : [],
    unclear: parsed.unclear,
  };
}
