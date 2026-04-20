import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { InboxList } from '../components/messaging/InboxList';
import { ConversationThread } from '../components/messaging/ConversationThread';
import { ComposeMessage } from '../components/messaging/ComposeMessage';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useMessageUnread } from '../context/MessageUnreadContext';
import type { ChatMessage, ConversationSummary } from '../types';
import { formatParticipantName } from '../lib/messagingDisplay';

const POLL_MS = 20_000;

export function MessagesPage() {
  const { user } = useAuth();
  const { refresh: refreshUnreadBadge } = useMessageUnread();
  const [searchParams, setSearchParams] = useSearchParams();
  const composeOpenedFromUrl = useRef(false);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRecipientId, setComposeRecipientId] = useState<string | null>(null);
  const [composeRecipientName, setComposeRecipientName] = useState('');

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;
  const peerName = formatParticipantName(selectedConv?.otherParticipant ?? null);
  const peerUserId = selectedConv?.otherParticipant?.id ?? null;

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const list = await api.messages.listConversations();
      setConversations(list);
      return list;
    } catch {
      return null;
    }
  }, [user]);

  const markIncomingRead = useCallback(
    async (rows: ChatMessage[]) => {
      if (!user) return;
      const unread = rows.filter((m) => m.senderId !== user.id && !m.readAt);
      await Promise.all(unread.map((m) => api.messages.markRead(m.id).catch(() => undefined)));
      if (unread.length) {
        void loadConversations();
        refreshUnreadBadge();
      }
    },
    [user, loadConversations, refreshUnreadBadge]
  );

  const loadThread = useCallback(
    async (conversationId: string) => {
      if (!user) return;
      setThreadLoading(true);
      try {
        const rows = await api.messages.getConversation(conversationId);
        setMessages(rows);
        await markIncomingRead(rows);
      } catch {
        setMessages([]);
      } finally {
        setThreadLoading(false);
      }
    },
    [user, markIncomingRead]
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setListLoading(true);
      await loadConversations();
      if (!cancelled) setListLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loadConversations]);

  useEffect(() => {
    if (!user) return;
    const t = window.setInterval(() => void loadConversations(), POLL_MS);
    return () => window.clearInterval(t);
  }, [user, loadConversations]);

  useEffect(() => {
    if (!user || !selectedId) {
      setMessages([]);
      return;
    }
    void loadThread(selectedId);
    const t = window.setInterval(() => void loadThread(selectedId), POLL_MS);
    return () => window.clearInterval(t);
  }, [user, selectedId, loadThread]);

  useEffect(() => {
    if (composeOpenedFromUrl.current) return;
    const to = searchParams.get('composeTo');
    const name = searchParams.get('composeName');
    if (to && user) {
      composeOpenedFromUrl.current = true;
      setComposeRecipientId(to);
      setComposeRecipientName(name ? decodeURIComponent(name) : 'Recipient');
      setComposeOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('composeTo');
      next.delete('composeName');
      setSearchParams(next, { replace: true });
    }
  }, [user, searchParams, setSearchParams]);

  const handleSendReply = async () => {
    if (!user || !peerUserId || !draft.trim()) return;
    setSending(true);
    try {
      await api.messages.send({ recipientId: peerUserId, body: draft.trim() });
      setDraft('');
      await loadThread(selectedId!);
      await loadConversations();
      refreshUnreadBadge();
    } catch {
      /* toast optional */
    } finally {
      setSending(false);
    }
  };

  const handleComposeSent = async (conversationId: string) => {
    await loadConversations();
    setSelectedId(conversationId);
    refreshUnreadBadge();
  };

  const openCompose = () => {
    setComposeRecipientId(null);
    setComposeRecipientName('');
    setComposeOpen(true);
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'student' && user.role !== 'pi') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 max-w-5xl mx-auto w-full">
        <h1 className="text-xl font-bold text-slate-900 mb-3 shrink-0">Inbox</h1>

        <div
          className={`flex-1 flex min-h-[420px] md:min-h-[560px] gap-0 ${
            selectedId ? 'flex-col md:flex-row' : 'flex-col md:flex-row'
          }`}
        >
          <div className={`${selectedId ? 'hidden md:flex' : 'flex'} flex-col min-h-[50vh] md:min-h-0 md:h-auto md:w-auto flex-1 md:flex-initial`}>
            <InboxList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
              loading={listLoading}
              onCompose={openCompose}
              showComposeButton
            />
          </div>

          <div
            className={`${
              selectedId ? 'flex' : 'hidden md:flex'
            } flex-col flex-1 min-h-0 min-w-0`}
          >
            {selectedId ? (
              <ConversationThread
                peerName={peerName}
                messages={messages}
                currentUserId={user.id}
                loading={threadLoading}
                sending={sending}
                draft={draft}
                onDraftChange={setDraft}
                onSend={() => void handleSendReply()}
                onBack={() => setSelectedId(null)}
                showBackButton
              />
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center bg-white border border-slate-200 border-dashed rounded-xl text-slate-500 text-sm p-8 text-center">
                Select a conversation to view messages
              </div>
            )}
          </div>
        </div>
      </div>

      <ComposeMessage
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        role={user.role}
        recipientUserId={composeRecipientId}
        recipientDisplayName={composeRecipientName}
        onSent={handleComposeSent}
      />
    </div>
  );
}
