import type { ConversationOtherParticipant } from '../types';

export function formatParticipantName(p: ConversationOtherParticipant | null): string {
  if (!p) return 'Unknown';
  const n = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  return n || p.email || 'User';
}

export function formatMessageListTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatThreadTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
