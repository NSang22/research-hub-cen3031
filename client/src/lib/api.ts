import type { User, StudentProfile, PIProfile, Position, Application, LabRosterMember, Conversation, Message, QuestionAnswersMap, NotificationPreferences } from '../types';

const API_BASE = '/api';

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

export const api = {
  auth: {
    register: (body: { email: string; password: string; role: string; firstName: string; lastName: string }) =>
      request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request<User>('/auth/me'),
    demo: (role: 'student' | 'pi') =>
      request<{ token: string; user: User }>('/auth/demo', { method: 'POST', body: JSON.stringify({ role }) }),
    google: (body: { credential: string; role?: 'student' | 'pi' }) =>
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
    list: (params?: { major?: string; minGpa?: number; skills?: string; yearLevel?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return request<StudentProfile[]>(`/students${q ? `?${q}` : ''}`);
    },
    getById: (id: string) => request<StudentProfile>(`/students/${id}`),
  },
  pis: {
    getProfile: () => request<PIProfile>('/pis/profile'),
    updateProfile: (body: Partial<PIProfile>) =>
      request<PIProfile>('/pis/profile', { method: 'PUT', body: JSON.stringify(body) }),
    getRoster: () => request<LabRosterMember[]>('/pis/roster'),
  },
  positions: {
    list: (params?: { search?: string; skills?: string; isFunded?: string; department?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return request<Position[]>(`/positions${q ? `?${q}` : ''}`);
    },
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
  messages: {
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
  messages: {
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
};
