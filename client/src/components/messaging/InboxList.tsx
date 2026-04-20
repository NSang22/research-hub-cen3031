import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import type { ConversationSummary } from '../../types';
import { formatMessageListTime, formatParticipantName } from '../../lib/messagingDisplay';

interface InboxListProps {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  onCompose: () => void;
  showComposeButton?: boolean;
}

export function InboxList({
  conversations,
  selectedId,
  onSelect,
  loading,
  onCompose,
  showComposeButton = true,
}: InboxListProps) {
  return (
    <div className="flex flex-col h-full min-h-0 bg-white border border-slate-200 rounded-xl md:rounded-r-none md:border-r-0 shadow-sm overflow-hidden w-full md:max-w-sm md:min-w-[280px]">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
        <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
        {showComposeButton ? (
          <button
            type="button"
            onClick={onCompose}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            New
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && conversations.length === 0 ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-16 bg-slate-100 rounded-lg" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 text-slate-500 min-h-[200px]">
            <MessageSquare className="w-12 h-12 mb-3 opacity-40" strokeWidth={1.25} />
            <p className="font-medium text-slate-700">No conversations yet</p>
            <p className="text-sm mt-1 max-w-[220px]">
              When someone sends you a message, or you start a new thread, it will show up here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {conversations.map((c, index) => {
              const name = formatParticipantName(c.otherParticipant);
              const preview = c.lastMessage?.trim() || 'No messages yet';
              const active = c.id === selectedId;
              return (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={`w-full text-left px-3 py-3 flex gap-3 hover:bg-slate-50 transition-colors ${
                      active ? 'bg-teal-50/80 border-l-[3px] border-l-teal-600' : 'border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600 shrink-0">
                      {name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900 truncate">{name}</span>
                        <span className="text-xs text-slate-400 shrink-0">
                          {formatMessageListTime(c.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-slate-600 truncate flex-1">{preview}</p>
                        {c.unreadCount > 0 ? (
                          <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-teal-600 text-white text-xs font-semibold flex items-center justify-center">
                            {c.unreadCount > 99 ? '99+' : c.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
