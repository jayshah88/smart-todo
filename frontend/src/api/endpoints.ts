import { api, apiBaseUrl, getToken, setToken } from './client';
import type { ActivityEntry, AppNotification, DashboardStats, Paginated, Project, Subtask, Tag, Task, User, UserSettings, WeeklyPoint } from '../types/task';

interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    setToken(res.token);
    return res;
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', {
      name,
      email,
      password,
      password_confirmation: password,
    });
    setToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
    setToken(null);
  },

  me(): Promise<{ data: User }> {
    return api.get('/me');
  },
};

export interface TaskUpdatePayload {
  title?: string;
  description?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed';
  due_date?: string | null;
  due_time?: string | null;
  start_date?: string | null;
  project_id?: number | null;
  tag_ids?: number[];
  favorite?: boolean;
  archived?: boolean;
  reminder_minutes_before?: number | null;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    weekdays?: number[];
    end_date?: string | null;
  } | null;
  [key: string]: unknown;
}

export interface TaskListParams {
  view?: string;
  project_id?: number;
  tag_id?: number;
  priority?: string;
  search?: string;
  sort?: 'created_at' | 'due_date' | 'priority';
  order?: 'asc' | 'desc';
  archived?: '1';
  page?: number;
  per_page?: number;
}

export const taskApi = {
  get(id: number): Promise<{ data: Task }> {
    return api.get(`/tasks/${id}`);
  },

  list(params: TaskListParams = {}): Promise<Paginated<Task>> {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') clean[k] = String(v);
    }
    const query = new URLSearchParams(clean).toString();
    return api.get(`/tasks${query ? `?${query}` : ''}`);
  },

  create(data: Partial<Task> & { tag_ids?: number[]; recurrence?: TaskUpdatePayload['recurrence'] }): Promise<{ data: Task }> {
    return api.post('/tasks', data);
  },

  complete(id: number): Promise<{ data: Task }> {
    return api.post(`/tasks/${id}/complete`);
  },

  reopen(id: number): Promise<{ data: Task }> {
    return api.post(`/tasks/${id}/reopen`);
  },

  duplicate(id: number): Promise<{ data: Task }> {
    return api.post(`/tasks/${id}/duplicate`);
  },

  archive(id: number): Promise<{ data: Task }> {
    return api.post(`/tasks/${id}/archive`);
  },

  restore(id: number): Promise<{ data: Task }> {
    return api.post(`/tasks/${id}/restore`);
  },

  skip(id: number): Promise<{ data: Task }> {
    return api.post(`/tasks/${id}/skip`);
  },

  update(id: number, data: TaskUpdatePayload): Promise<{ data: Task }> {
    return api.put(`/tasks/${id}`, data);
  },

  delete(id: number): Promise<void> {
    return api.delete(`/tasks/${id}`);
  },

  bulk(action: 'complete' | 'delete' | 'priority', ids: number[], priority?: string): Promise<{ message: string; affected: number }> {
    return api.post('/tasks/bulk', { action, ids, priority });
  },

  reorder(taskIds: number[]): Promise<{ message: string }> {
    return api.post('/tasks/reorder', { task_ids: taskIds });
  },
};

export const projectApi = {
  list(): Promise<{ data: Project[] }> {
    return api.get('/projects');
  },

  create(name: string, color: string): Promise<{ data: Project }> {
    return api.post('/projects', { name, color });
  },

  update(id: number, data: Partial<{ name: string; color: string }>): Promise<{ data: Project }> {
    return api.put(`/projects/${id}`, data);
  },

  delete(id: number): Promise<{ message: string }> {
    return api.delete(`/projects/${id}`);
  },
};

export const tagApi = {
  list(): Promise<{ data: Tag[] }> {
    return api.get('/tags');
  },

  create(name: string, color: string): Promise<{ data: Tag }> {
    return api.post('/tags', { name, color });
  },

  update(id: number, data: Partial<{ name: string; color: string }>): Promise<{ data: Tag }> {
    return api.put(`/tags/${id}`, data);
  },

  delete(id: number): Promise<{ message: string }> {
    return api.delete(`/tags/${id}`);
  },
};

export const subtaskApi = {
  create(taskId: number, title: string): Promise<{ data: Subtask }> {
    return api.post(`/tasks/${taskId}/subtasks`, { title });
  },

  update(taskId: number, subtaskId: number, data: Partial<{ title: string; completed: boolean }>): Promise<{ data: Subtask }> {
    return api.put(`/tasks/${taskId}/subtasks/${subtaskId}`, data);
  },

  delete(taskId: number, subtaskId: number): Promise<{ message: string }> {
    return api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
  },
};

export const dashboardApi = {
  stats(): Promise<{ data: DashboardStats }> {
    return api.get('/dashboard');
  },

  weekly(): Promise<{ data: WeeklyPoint[] }> {
    return api.get('/dashboard/weekly');
  },

  activity(): Promise<{ data: ActivityEntry[] }> {
    return api.get('/dashboard/activity');
  },

  focus(): Promise<{
    data: {
      items: { task: Task; reason: string; reasonType: string }[];
      timeline: Task[];
      capacity: {
        plannedMinutes: number;
        capacityMinutes: number | null;
        overflow: boolean;
        remainingMinutes: number | null;
      };
    };
  }> {
    return api.get('/dashboard/focus');
  },
};

export const profileApi = {
  update(data: Partial<{ name: string; email: string; timezone: string }>): Promise<{ data: User }> {
    return api.put('/profile', data);
  },

  updateSettings(
    data: Partial<{
      theme: string;
      email_reminders: boolean;
      daily_summary: boolean;
      weekly_summary: boolean;
      daily_capacity_minutes: number | null;
      push_enabled: boolean;
      whatsapp_enabled: boolean;
      whatsapp_phone: string | null;
      quiet_hours_start: string | null;
      quiet_hours_end: string | null;
      digest_mode: boolean;
    }>,
  ): Promise<{ data: UserSettings }> {
    return api.put('/profile/settings', data);
  },
};

export const notificationApi = {
  list(unreadOnly = false): Promise<{ data: AppNotification[] }> {
    return api.get(`/notifications${unreadOnly ? '?unread=1' : ''}`);
  },

  unreadCount(): Promise<{ data: { unreadCount: number } }> {
    return api.get('/notifications/unread-count');
  },

  markAsRead(id: number): Promise<{ data: AppNotification }> {
    return api.post(`/notifications/${id}/read`);
  },

  markAllAsRead(): Promise<{ message: string }> {
    return api.post('/notifications/read-all');
  },
};

export const exportApi = {
  summary(): Promise<{ data: { tasks: number; projects: number; tags: number; notifications: number } }> {
    return api.get('/export/summary');
  },

  downloadUrl(): string {
    return `${apiBaseUrl()}/export`;
  },

  authHeaders(): Record<string, string> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
};
