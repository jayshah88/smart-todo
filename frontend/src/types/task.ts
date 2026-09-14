export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  dueTime: string | null;
  startDate?: string | null;
  completedAt: string | null;
  favorite: boolean;
  archived: boolean;
  projectId: number | null;
  project?: Project | null;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    weekdays: number[] | null;
    endDate: string | null;
    nextOccurrence: string | null;
  } | null;
  reminderMinutesBefore?: number | null;
  reminderAt?: string | null;
  suggestedPriority: string;
  estimatedDuration: number | null;
  urgencyScore: number;
  tags?: Tag[];
  subtasks?: Subtask[];
  subtaskProgress?: { total: number; completed: number } | null;
  sortOrder?: number;
  createdAt: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Subtask {
  id: number;
  taskId: number;
  title: string;
  completed: boolean;
  sortOrder: number;
}

export interface Project {
  id: number;
  name: string;
  color: string;
  sortOrder?: number;
  taskCount?: number;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  emailReminders: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
  dailyCapacityMinutes: number | null;
  pushEnabled?: boolean;
  whatsappEnabled?: boolean;
  whatsappPhone?: string | null;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  digestMode?: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  emailVerified: boolean;
  timezone?: string | null;
  settings?: UserSettings | null;
}

export interface ActivityEntry {
  id: number;
  action: string;
  taskId: number | null;
  taskTitle?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
}

export interface DashboardStats {
  today: {
    overdue: number;
    dueToday: number;
    upcoming: number;
    completedToday: number;
    completedWeek: number;
  };
  priorityBreakdown: Record<string, number>;
  completionRate: number;
  streak: { current: number; longest: number };
  insights: { type: string; message: string }[];
}

export interface WeeklyPoint {
  date: string;
  day: string;
  completed: number;
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  channel: string;
  taskId: number | null;
  readAt: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

