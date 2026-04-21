import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Message, Conversation } from '../../types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getInboxBase(role: string | undefined): string {
  return role === 'pi' ? '/pi/inbox' : '/student/inbox';
}

export function ChatView() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  //Load conversation metadata from conversations list
  useEffect(() => {
    api.messages.getConversations().then((convs) => {
      const match = convs.find((c) => c.id === conversationId);
      if (match) setConversation(match);
    }).catch(() => {});
  }, [conversationId]);

  //Load messages and mark unread ones as read
  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    api.messages
      .getConversationMessages(conversationId)
      .then((data) => {
        setMessages(data);
        //Mark received (unread) messages as read
        data
          .filter((m) => m.senderId !== user?.id && m.readAt === null)
          .forEach((m) => {
            api.messages.markAsRead(m.id).catch(() => {});
          });
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [conversationId, user?.id]);

  //Subscribe to Realtime inserts on the messages table filtered to this conversation.
  //Depends on `loading` so the subscription is set up after the initial fetch completes,
  //avoiding duplicate messages from events that race with the initial load.
  useEffect(() => {
    if (!conversationId || loading) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('realtime event received', payload);
          const row = payload.new as Record<string, unknown>;
          const incoming: Message = {
            id: row.id as string,
            conversationId: row.conversation_id as string,
            senderId: row.sender_id as string,
            body: row.body as string,
            readAt: (row.read_at as string | null) ?? null,
            createdAt: row.created_at as string,
          };
          setMessages((prev) => {
            //Deduplicate: ignore if we already have this message (e.g. from optimistic update)
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          //Mark as read if we didn't send it
          if (incoming.senderId !== user?.id) {
            api.messages.markAsRead(incoming.id).catch(() => {});
          }
        }
      )
      .subscribe((status) => {
        console.log('realtime status', status);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, loading, user?.id]);

  //Auto-scroll to bottom when messages load or new message sent
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!body.trim() || !conversation?.otherParticipant || sending) return;
    setSendError('');
    setSending(true);
    try {
      const newMsg = await api.messages.sendMessage(conversation.otherParticipant.id, body.trim());
      setMessages((prev) => [...prev, newMsg]);
      setBody('');
      textareaRef.current?.focus();
    } catch {
      setSendError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [body, conversation, sending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const otherName = conversation?.otherParticipant
    ? `${conversation.otherParticipant.firstName ?? ''} ${conversation.otherParticipant.lastName ?? ''}`.trim() ||
      conversation.otherParticipant.email
    : 'Conversation';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb' }}>
      <Navbar />
      <main style={{
        marginLeft: '224px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxWidth: '720px',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem',
          background: '#fff',
          borderBottom: '1px solid rgba(0,82,204,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <button
            type="button"
            onClick={() => navigate(getInboxBase(user?.role))}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#0052CC',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem',
              borderRadius: '6px',
            }}
            aria-label="Back to inbox"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p style={{ fontWeight: 700, color: '#1a2152', fontSize: '0.95rem', lineHeight: 1.2 }}>{otherName}</p>
            {conversation?.otherParticipant?.role && (
              <p style={{ fontSize: '0.75rem', color: '#6b7194', textTransform: 'capitalize' }}>
                {conversation.otherParticipant.role === 'pi' ? 'Principal Investigator' : 'Student'}
              </p>
            )}
          </div>
        </div>

        {/* Message list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.625rem',
        }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start',
                  width: `${30 + i * 12}%`,
                  height: '48px',
                  borderRadius: '12px',
                  background: '#e8edf6',
                }} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#8b90ad', fontSize: '0.875rem' }}>
                No messages yet. Send one below to start the conversation.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === user?.id;
              return (
                <div key={msg.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMine ? 'flex-end' : 'flex-start',
                  gap: '0.2rem',
                }}>
                  {!isMine && (
                    <span style={{ fontSize: '0.7rem', color: '#8b90ad', paddingLeft: '0.5rem' }}>
                      {[msg.senderFirstName, msg.senderLastName].filter(Boolean).join(' ') || 'Them'}
                    </span>
                  )}
                  <div style={{
                    maxWidth: '68%',
                    padding: '0.6rem 0.875rem',
                    borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isMine ? '#0052CC' : '#fff',
                    color: isMine ? '#fff' : '#1a2152',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    border: isMine ? 'none' : '1px solid rgba(0,82,204,0.15)',
                    wordBreak: 'break-word',
                  }}>
                    {msg.body}
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#8b90ad', paddingLeft: isMine ? 0 : '0.5rem', paddingRight: isMine ? '0.5rem' : 0 }}>
                    {formatTime(msg.createdAt)}
                    {isMine && msg.readAt && (
                      <span style={{ marginLeft: '0.3rem', color: '#4caf50' }}>· Read</span>
                    )}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Compose area */}
        <div style={{
          padding: '0.875rem 1.5rem',
          background: '#fff',
          borderTop: '1px solid rgba(0,82,204,0.12)',
        }}>
          {sendError && (
            <p style={{ fontSize: '0.8rem', color: '#c62828', marginBottom: '0.5rem' }}>{sendError}</p>
          )}
          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
              rows={2}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid rgba(0,82,204,0.25)',
                borderRadius: '10px',
                padding: '0.6rem 0.875rem',
                fontSize: '0.875rem',
                color: '#1a2152',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                background: '#fff',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#0052CC'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,82,204,0.25)'; }}
            />
            <button
              type="button"
              onClick={() => { void handleSend(); }}
              disabled={sending || !body.trim()}
              aria-label="Send message"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                background: body.trim() && !sending ? '#0052CC' : 'rgba(0,82,204,0.2)',
                color: body.trim() && !sending ? '#fff' : 'rgba(0,82,204,0.4)',
                cursor: body.trim() && !sending ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <Send size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
