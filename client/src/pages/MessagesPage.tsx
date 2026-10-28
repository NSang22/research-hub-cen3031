import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Navigate } from 'react-router-dom';
import {
  Chat,
  Channel,
  ChannelList,
  ChannelHeader,
  MessageList,
  MessageComposer,
  Window,
  useChatContext,
  useMessageContext,
  WithComponents,
  MessageActions,
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';
import type { Channel as StreamChannel } from 'stream-chat';
import streamChatClient from '../lib/streamChat';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { api } from '../lib/api';
import type { User, StudentProfile } from '../types';

// ---------------------------------------------------------------------------
// Shared confirmation modal
// ---------------------------------------------------------------------------

interface ConfirmModalProps {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ message, confirmLabel = 'Delete', onConfirm, onCancel }: ConfirmModalProps) {
  // Portal to document.body so the overlay escapes any overflow:clip ancestor
  // (the main panel container uses overflow:clip for rounded corners, which
  // clips position:fixed descendants at the paint boundary).
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          padding: '24px 28px',
          maxWidth: 360,
          width: '90%',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        }}
      >
        <p style={{ fontSize: 15, color: '#1a1d2e', marginBottom: 20, lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#0d9488',
              color: 'white',
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Message-level delete (own messages only)
// ---------------------------------------------------------------------------

/**
 * Trash icon shown on hover for the current user's own messages only.
 * On click, shows a confirmation modal before calling handleDelete().
 */
function DeleteMessageButton() {
  const { handleDelete, isMyMessage } = useMessageContext();
  const [showConfirm, setShowConfirm] = useState(false);

  // Only render for the current user's own messages
  if (!isMyMessage()) return null;

  const handleConfirm = async () => {
    setShowConfirm(false);
    try {
      await handleDelete();
    } catch (err) {
      console.error('[MessagesPage] Failed to delete message:', err);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowConfirm(true);
        }}
        title="Delete message"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 'var(--str-chat__message-options-button-size, 28px)',
          height: 'var(--str-chat__message-options-button-size, 28px)',
          borderRadius: 'var(--str-chat__message-options-border-radius, 4px)',
          color: 'var(--str-chat__message-options-color, #9da2a9)',
          padding: 0,
        }}
      >
        {/* Trash icon */}
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </button>
      {showConfirm && (
        <ConfirmModal
          message="Delete this message? This cannot be undone."
          onConfirm={() => {
            void handleConfirm();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Custom message action set — delete-message button only; no reactions, no reply
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const customMessageActionSet: any[] = [
  { Component: DeleteMessageButton, placement: 'quick' as const, type: 'delete' },
];

/** Renders only the delete-message action — no emoji, no reply, no dropdown. */
function CustomMessageActions() {
  return (
    <MessageActions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messageActionSet={customMessageActionSet as any}
      disableBaseMessageActionSetFilter
    />
  );
}

/** Replaces any Stream sub-component with nothing. */
const NoOp = () => null;

// ---------------------------------------------------------------------------
// Channel preview with conversation-level delete (hover → confirm → hide)
// ---------------------------------------------------------------------------

/**
 * Standalone channel preview row.
 * Shows a trash icon on hover to soft-delete (hide) the conversation for
 * the current user only. The other participant keeps the channel.
 */
function CustomChannelPreview({
  channel,
  setActiveChannel,
  activeChannel,
}: {
  channel: StreamChannel;
  setActiveChannel: (ch: StreamChannel) => void;
  activeChannel?: StreamChannel | null;
}) {
  const { setActiveChannel: clearActiveChannel } = useChatContext();
  const currentUserId = streamChatClient.userID;
  const members = Object.values(channel.state.members);
  const otherMember = members.find((m) => m.user?.id !== currentUserId);
  const displayName = otherMember?.user?.name ?? 'Unknown';
  const lastMessage = channel.state.messages[channel.state.messages.length - 1];
  const preview = lastMessage?.text ?? 'No messages yet';
  const unread = channel.countUnread();
  const isActive = activeChannel?.cid === channel.cid;

  const [hovered, setHovered] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleHide = async () => {
    setShowConfirm(false);
    try {
      await channel.hide();
    } catch (err) {
      console.error('[MessagesPage] Failed to hide channel:', err);
    }
    // Clear the active channel; ChannelList removes it via the channel.hidden event
    clearActiveChannel();
  };

  return (
    <>
      <div
        onClick={() => setActiveChannel(channel)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          backgroundColor: isActive ? '#f0f2f5' : 'white',
          borderBottom: '1px solid #f0f2f5',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'relative',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#0052CC',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {displayName.slice(0, 1).toUpperCase()}
        </div>

        {/* Name + preview */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: unread > 0 ? 700 : 500, fontSize: 14, color: '#1a1d2e' }}>
            {displayName}
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#8b90ad',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {preview}
          </div>
        </div>

        {/* Trash icon on hover; unread badge otherwise */}
        {hovered ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowConfirm(true);
            }}
            title="Delete conversation"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              color: '#9da2a9',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        ) : unread > 0 ? (
          <div
            style={{
              background: '#0052CC',
              color: 'white',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {unread}
          </div>
        ) : null}
      </div>

      {showConfirm && (
        <ConfirmModal
          message="Delete this conversation? It will only be removed from your inbox."
          onConfirm={() => {
            void handleHide();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

export function MessagesPage() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'student' && user.role !== 'pi') return <Navigate to="/" replace />;

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-3 sm:p-4 max-w-6xl mx-auto w-full">
        <h1 className="text-xl font-bold text-slate-900 mb-3 shrink-0">Inbox</h1>
        {/* Wrapper stretches div.str-chat (Chat has no className prop) into the flex column.
            No overflow:hidden here — Stream's dialog overlay needs to escape the clip boundary. */}
        <div className="flex-1 min-h-0 flex flex-col [&>*]:flex-1 [&>*]:min-h-0">
          <Chat client={streamChatClient} theme="str-chat__theme-light">
            <MessagesPageInner user={user} />
          </Chat>
        </div>
      </div>
    </div>
  );
}

function MessagesPageInner({ user }: { user: User }) {
  // Active channel and its setter come from the Chat context.
  // ChannelList automatically calls setActiveChannel when a channel is clicked.
  // We also call setActiveChannel manually when a PI creates a new channel.
  const { channel: activeChannel, setActiveChannel } = useChatContext();

  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Ref for click-outside detection on the student picker dropdown
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showStudentPicker) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowStudentPicker(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [showStudentPicker]);

  const openStudentPicker = async () => {
    setStudentSearch('');
    setShowStudentPicker(true);
    setLoadingStudents(true);
    try {
      const list = await api.students.list();
      setStudents(list);
    } catch {
      /* ignore */
    } finally {
      setLoadingStudents(false);
    }
  };

  const startConversation = async (student: StudentProfile) => {
    if (creatingChannel) return;
    const studentUserId = student.userId ?? (student as unknown as { id: string }).id;
    // Deterministic channel ID: sort the two UUIDs, strip dashes, join, and
    // truncate to 64 chars (Stream's hard limit). The same two users always
    // produce the same ID regardless of who initiates the conversation.
    const channelId = [user.id, studentUserId]
      .sort()
      .join('')
      .replace(/-/g, '')
      .substring(0, 64);
    const studentName = ((student.firstName ?? '') + ' ' + (student.lastName ?? '')).trim();
    setCreatingChannel(true);
    try {
      // Ensure the student is registered in Stream before creating the channel.
      await api.stream.upsertUser(studentUserId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const channel = streamChatClient.channel('messaging', channelId, {
        members: [user.id, studentUserId],
        name: studentName,
      } as any);
      await channel.create();
      setActiveChannel(channel);
      setShowStudentPicker(false);
    } catch (err) {
      console.error('[MessagesPage] Failed to create channel:', err);
    } finally {
      setCreatingChannel(false);
    }
  };

  return (
    <div className="flex flex-row h-full min-h-0 gap-0 border border-slate-200 rounded-xl overflow-clip shadow-sm">
      {/* Left: channel list + optional new conversation UI for PIs */}
      <div className="w-full md:max-w-sm md:min-w-[280px] flex flex-col bg-white">
        {user.role === 'pi' && (
          <div className="p-2 border-b border-slate-100 shrink-0">
            <button
              onClick={() => void openStudentPicker()}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
            >
              + New Conversation
            </button>

            {showStudentPicker && (
              <div
                ref={pickerRef}
                className="mt-2 border border-slate-200 rounded-lg bg-white shadow-lg"
              >
                {/* Search input — sits above the scrollable list */}
                <div className="p-2 border-b border-slate-100">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search students…"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  />
                </div>

                {/* Scrollable student list */}
                <div className="max-h-48 overflow-y-auto">
                  {loadingStudents ? (
                    <div className="p-3 text-sm text-slate-500 text-center">Loading students…</div>
                  ) : (() => {
                    const query = studentSearch.trim().toLowerCase();
                    const visible = students
                      .map((s) => ({
                        s,
                        sId: s.userId ?? (s as unknown as { id: string }).id,
                        name:
                          [s.firstName, s.lastName].filter(Boolean).join(' ') ||
                          (s as unknown as { email?: string }).email ||
                          (s.userId ?? (s as unknown as { id: string }).id),
                      }))
                      .filter(({ name }) => name.toLowerCase().includes(query))
                      .sort((a, b) => a.name.localeCompare(b.name));

                    return visible.length === 0 ? (
                      <div className="p-3 text-sm text-slate-500 text-center">
                        {students.length === 0 ? 'No students found' : 'No matches'}
                      </div>
                    ) : (
                      visible.map(({ s, sId, name }) => (
                        <button
                          key={sId}
                          disabled={creatingChannel}
                          onClick={() => {
                            void startConversation(s);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors disabled:opacity-50 disabled:cursor-wait"
                        >
                          {name}
                        </button>
                      ))
                    );
                  })()}
                </div>

                <button
                  onClick={() => setShowStudentPicker(false)}
                  className="w-full px-3 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors border-t border-slate-100"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        <ChannelList
          filters={{ type: 'messaging', members: { $in: [user.id] } }}
          sort={{ last_message_at: -1 }}
          options={{ state: true, presence: true, limit: 30 }}
          customActiveChannel={activeChannel?.id}
          renderChannels={(channels) =>
            channels.map((ch) => (
              <CustomChannelPreview
                key={ch.cid}
                channel={ch}
                setActiveChannel={setActiveChannel}
                activeChannel={activeChannel}
              />
            ))
          }
        />
      </div>

      {/* Right: active channel thread */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeChannel ? (
          <Channel channel={activeChannel}>
            {/* Delete-only message actions; suppress reactions and reply-count badges */}
            <WithComponents
              overrides={{
                MessageActions: CustomMessageActions,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                MessageRepliesCountButton: NoOp as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                MessageReactions: NoOp as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ReactionSelector: NoOp as any,
              }}
            >
              <Window>
                <ChannelHeader />
                <MessageList />
                <MessageComposer />
              </Window>
            </WithComponents>
          </Channel>
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-400 text-sm p-8 text-center">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}
