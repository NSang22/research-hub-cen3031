import type {
  User,
  UserRole,
  StudentProfile,
  PIProfile,
  Position,
  Application,
  LabRosterMember,
  Conversation,
  Message,
  QuestionAnswersMap,
  NotificationPreferences,
  ConversationSummary,
  ChatMessage,
  AdminMetrics,
  LabAdminOption,
  LabPIMember,
} from '../types';

const API_BASE = '/api';

/** Build a query string, omitting keys whose value is undefined, null, or empty string. */
function toQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

let token: string | null = null;

export function setAuthToken(t: string | null) {
  token = t;
}

export function getAuthToken(): string | null {
  return token;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.error || res.statusText);
  }
  return data as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// URLSearchParams stringifies undefined → "undefined". Strip empty values first
// so the server doesn't receive bogus filters like `major=undefined`.
function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  auth: {
    register: (body: { email: string; password: string; role: string; firstName: string; lastName: string }) =>
      request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request<User>('/auth/me'),
    demo: (role: 'student' | 'pi') =>
      request<{ token: string; user: User }>('/auth/demo', { method: 'POST', body: JSON.stringify({ role }) }),
    google: (body: { credential: string; role?: UserRole }) =>
      request<{ token: string; user: User }>('/auth/google', { method: 'POST', body: JSON.stringify(body) }),
  },
  students: {
    getProfile: () => request<StudentProfile>('/students/profile'),
    updateProfile: (body: Partial<StudentProfile>) =>
      request<StudentProfile>('/students/profile', { method: 'PUT', body: JSON.stringify(body) }),
    getNotificationPreferences: () => request<NotificationPreferences>('/students/notification-preferences'),
    updateNotificationPreferences: (body: Partial<NotificationPreferences>) =>
      request<NotificationPreferences>('/students/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    list: (params?: { major?: string; minGpa?: number; skills?: string; yearLevel?: string }) =>
      request<StudentProfile[]>(`/students${toQuery(params)}`),
    getById: (id: string) => request<StudentProfile>(`/students/${id}`),
  },
  pis: {
    getProfile: () => request<PIProfile>('/pis/profile'),
    updateProfile: (body: Partial<PIProfile> & { labAdminId?: string | null }) =>
      request<PIProfile>('/pis/profile', { method: 'PUT', body: JSON.stringify(body) }),
    getRoster: () => request<LabRosterMember[]>('/pis/roster'),
    listLabs: () => request<LabAdminOption[]>('/pis/labs'),
  },
  positions: {
    list: (params?: { search?: string; skills?: string; isFunded?: string; department?: string }) =>
      request<Position[]>(`/positions${toQuery(params)}`),
    getById: (id: string) => request<Position>(`/positions/${id}`),
    create: (body: Partial<Position> & { title: string }) =>
      request<Position>('/positions', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Position>) =>
      request<Position>(`/positions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    close: (id: string) => request<void>(`/positions/${id}`, { method: 'DELETE' }),
    mine: () => request<(Position & { appCount?: number })[]>('/positions/mine'),
    recommended: () => request<Position[]>('/positions/recommended'),
  },
  notifications: {
    getPreferences: () => request<NotificationPreferences>('/notifications/preferences'),
    updatePreferences: (body: Partial<NotificationPreferences>) =>
      request<NotificationPreferences>('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },
  messages: {
    listConversations: () => request<ConversationSummary[]>('/messages/conversations'),
    getConversation: (id: string) => request<ChatMessage[]>(`/messages/conversations/${id}`),
    send: (body: { recipientId: string; body: string }) =>
      request<{
        id: string;
        conversationId: string;
        senderId: string;
        body: string;
        readAt: string | null;
        createdAt: string;
      }>('/messages', { method: 'POST', body: JSON.stringify(body) }),
    markRead: (messageId: string) =>
      request<{
        id: string;
        conversationId: string;
        senderId: string;
        body: string;
        readAt: string | null;
        createdAt: string;
      }>(`/messages/${messageId}/read`, { method: 'PATCH' }),
    sendMessage: (recipientId: string, body: string) =>
      request<Message>('/messages', { method: 'POST', body: JSON.stringify({ recipientId, body }) }),
    findOrCreateConversation: (recipientId: string) =>
      request<{ conversationId: string }>('/messages/conversations', { method: 'POST', body: JSON.stringify({ recipientId }) }),
    getConversations: () =>
      request<Conversation[]>('/messages/conversations'),
    getConversationMessages: (conversationId: string) =>
      request<Message[]>(`/messages/conversations/${conversationId}`),
    markAsRead: (messageId: string) =>
      request<Message>(`/messages/${messageId}/read`, { method: 'PATCH' }),
    deleteConversation: (conversationId: string) =>
      request<void>(`/messages/conversations/${conversationId}`, { method: 'DELETE' }),
  },
  admin: {
    getMetrics: (params?: { startDate?: string; endDate?: string; positionType?: string; piId?: string }) =>
      request<AdminMetrics>(`/admin/metrics${toQuery(params)}`),
    getPIs: () => request<LabPIMember[]>('/admin/pis'),
  },
  applications: {
    create: (body: { positionId: string; coverLetter?: string; questionAnswers?: QuestionAnswersMap }) =>
      request<Application>('/applications', { method: 'POST', body: JSON.stringify(body) }),
    mine: () =>
      request<(Application & { positionTitle?: string; labName?: string; department?: string | null })[]>('/applications/mine'),
    byPosition: (positionId: string) =>
      request<(Application & { studentUserId?: string; firstName?: string; lastName?: string; email?: string; major?: string; gpa?: number; skills?: string[]; bio?: string; resumeUrl?: string; yearLevel?: string })[]>(
        `/applications/position/${positionId}`
      ),
    updateStatus: (id: string, status: string) =>
      request<Application>(`/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    updateNotes: (id: string, notes: string) =>
      request<{ id: string; piNotes: string | null }>(`/applications/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ notes }) }),
  },
};
