import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Conversation } from '../../types';

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInboxBase(role: string | undefined): string {
  return role === 'pi' ? '/pi/inbox' : '/student/inbox';
}

export function Inbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchConversations = useCallback(() => {
    api.messages
      .getConversations()
      .then((data) => {
        // Sort by most recent message descending; conversations with no messages go last
        const sorted = [...data].sort((a, b) => {
          const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return tb - ta;
        });
        setConversations(sorted);
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to Realtime inserts on the messages table to keep previews/unread counts live
  useEffect(() => {
    const channel = supabase
      .channel('inbox:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          // Refetch the full conversations list so last-message previews and
          // unread counts are always up to date without manual cache management.
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  const handleDelete = async (conversationId: string) => {
    setDeleting(true);
    try {
      await api.messages.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setConfirmDeleteId(null);
    } catch {
      // leave confirm state open so user can retry
    } finally {
      setDeleting(false);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb' }}>
      <Navbar />
      <main style={{ marginLeft: '224px', flex: 1, padding: '2rem 2.5rem', maxWidth: '720px' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1a2152', marginBottom: '0.25rem' }}>
            Inbox
            {totalUnread > 0 && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '0.625rem',
                minWidth: '1.375rem',
                height: '1.375rem',
                borderRadius: '999px',
                background: '#0052CC',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0 0.3rem',
              }}>
                {totalUnread}
              </span>
            )}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7194' }}>
            Messages with {user?.role === 'pi' ? 'students' : 'research PIs'}
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                background: '#fff',
                borderRadius: '10px',
                border: '1px solid rgba(0,82,204,0.12)',
                padding: '1rem 1.25rem',
                display: 'flex',
                gap: '0.875rem',
                alignItems: 'center',
              }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e8edf6' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: '14px', width: '40%', background: '#e8edf6', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ height: '12px', width: '70%', background: '#f0f2f8', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid rgba(0,82,204,0.12)',
            padding: '3.5rem 2rem',
            textAlign: 'center',
          }}>
            <MessageSquare size={40} style={{ color: 'rgba(0,82,204,0.25)', margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600, color: '#1a2152', marginBottom: '0.375rem' }}>No messages yet</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7194' }}>
              {user?.role === 'student'
                ? 'Start a conversation by messaging a PI from a position page.'
                : 'Conversations with students will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {conversations.map((conv) => {
              const other = conv.otherParticipant;
              const displayName = other
                ? `${other.firstName} ${other.lastName}`.trim() || other.email
                : 'Unknown';
              const initials = other
                ? `${other.firstName?.[0] ?? ''}${other.lastName?.[0] ?? ''}`.toUpperCase() || '?'
                : '?';
              const hasUnread = conv.unreadCount > 0;

              const isConfirming = confirmDeleteId === conv.id;

              return (
                <div key={conv.id} style={{ display: 'flex', alignItems: 'stretch', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => navigate(`${getInboxBase(user?.role)}/${conv.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      background: '#fff',
                      borderRadius: '10px',
                      border: `1px solid ${hasUnread ? 'rgba(0,82,204,0.25)' : 'rgba(0,82,204,0.12)'}`,
                      padding: '0.875rem 1.25rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      flex: 1,
                      transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 10px rgba(0,82,204,0.1)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: hasUnread ? '#0052CC' : 'rgba(0,82,204,0.12)',
                      color: hasUnread ? '#fff' : '#0052CC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: hasUnread ? 700 : 600, fontSize: '0.9rem', color: '#1a2152' }}>
                          {displayName}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#8b90ad', flexShrink: 0, marginLeft: '0.5rem' }}>
                          {formatRelativeTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <p style={{
                          fontSize: '0.8rem',
                          color: hasUnread ? '#3d4260' : '#8b90ad',
                          fontWeight: hasUnread ? 500 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}>
                          {conv.lastMessage ?? 'No messages yet'}
                        </p>
                        {hasUnread && (
                          <span style={{
                            minWidth: '1.25rem',
                            height: '1.25rem',
                            borderRadius: '999px',
                            background: '#0052CC',
                            color: '#fff',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 0.25rem',
                            flexShrink: 0,
                          }}>
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Delete control */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}>
                    {isConfirming ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: '#fff',
                        border: '1px solid rgba(198,40,40,0.3)',
                        borderRadius: '10px',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.75rem',
                      }}>
                        <span style={{ color: '#c62828', fontWeight: 600 }}>Delete?</span>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => { void handleDelete(conv.id); }}
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '5px',
                              border: 'none',
                              background: '#c62828',
                              color: '#fff',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: deleting ? 'not-allowed' : 'pointer',
                              opacity: deleting ? 0.7 : 1,
                            }}
                          >
                            {deleting ? '…' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => setConfirmDeleteId(null)}
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '5px',
                              border: '1px solid rgba(0,0,0,0.15)',
                              background: '#fff',
                              color: '#3d4260',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: deleting ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(conv.id)}
                        title="Delete conversation"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid rgba(0,0,0,0.1)',
                          background: '#fff',
                          color: '#8b90ad',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'color 0.15s, border-color 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color = '#c62828';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(198,40,40,0.35)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color = '#8b90ad';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.1)';
                        }}
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
