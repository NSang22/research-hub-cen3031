import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { formatThreadTimestamp } from '../../lib/messagingDisplay';

interface ConversationThreadProps {
  peerName: string;
  messages: ChatMessage[];
  currentUserId: string;
  loading: boolean;
  sending: boolean;
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  onBack: () => void;
  showBackButton: boolean;
}

export function ConversationThread({
  peerName,
  messages,
  currentUserId,
  loading,
  sending,
  draft,
  onDraftChange,
  onSend,
  onBack,
  showBackButton,
}: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  const emptyThread = !loading && messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border border-slate-200 rounded-xl md:rounded-l-none shadow-sm flex-1 overflow-hidden">
      <header className="shrink-0 px-3 py-3 border-b border-slate-100 flex items-center gap-2">
        {showBackButton ? (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100 text-slate-700"
            aria-label="Back to inbox"
          >
            <ArrowLeft size={20} />
          </button>
        ) : null}
        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
          {peerName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{peerName}</h3>
          <p className="text-xs text-slate-500 truncate">Conversation</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3 bg-slate-50/80">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-12 rounded-lg animate-pulse ${i % 2 ? 'bg-slate-200 ml-8' : 'bg-slate-100 mr-8'}`} />
            ))}
          </div>
        ) : emptyThread ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 text-slate-500">
            <p className="font-medium text-slate-700">No messages yet</p>
            <p className="text-sm mt-1 max-w-xs">Send a message below to start the conversation.</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.senderId === currentUserId;
            const senderLabel = mine
              ? 'You'
              : [m.senderFirstName, m.senderLastName].filter(Boolean).join(' ') || 'Participant';
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${
                    mine ? 'bg-teal-600 text-white rounded-br-md' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                  }`}
                >
                  {!mine ? (
                    <p className="text-xs font-medium text-teal-700 mb-0.5">{senderLabel}</p>
                  ) : null}
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-teal-100' : 'text-slate-400'}`}>
                    {formatThreadTimestamp(m.createdAt)}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 p-3 border-t border-slate-100 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 min-h-[44px] max-h-32 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            placeholder="Write a reply..."
            rows={2}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            disabled={sending}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={sending || !draft.trim()}
            className="shrink-0 h-11 w-11 flex items-center justify-center rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 hidden sm:block">Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
}
