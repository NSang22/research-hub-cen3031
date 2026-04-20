import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import type { UserRole } from '../../types';

interface ComposeMessageProps {
  open: boolean;
  onClose: () => void;
  role: UserRole;
  /** When set, user can send. Otherwise show how to start a thread. */
  recipientUserId: string | null;
  recipientDisplayName: string;
  onSent: (conversationId: string) => void;
}

export function ComposeMessage({
  open,
  onClose,
  role,
  recipientUserId,
  recipientDisplayName,
  onSent,
}: ComposeMessageProps) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBody('');
      setError(null);
    }
  }, [open, recipientUserId]);

  const send = async () => {
    if (!recipientUserId || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const msg = await api.messages.send({ recipientId: recipientUserId, body: body.trim() });
      onSent(msg.conversationId);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-title"
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
              <h2 id="compose-title" className="text-lg font-semibold text-slate-900">
                New message
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {!recipientUserId ? (
                <div className="text-sm text-slate-600 space-y-3">
                  <p>To start a conversation, choose someone to message first.</p>
                  {role === 'pi' ? (
                    <Link
                      to="/pi/students"
                      onClick={onClose}
                      className="inline-flex font-medium text-teal-600 hover:underline"
                    >
                      Open student directory
                    </Link>
                  ) : (
                    <p>
                      When a lab contacts you, you will see the thread here. You can also browse{' '}
                      <Link to="/student/positions" onClick={onClose} className="text-teal-600 font-medium hover:underline">
                        open positions
                      </Link>
                      .
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-500 mb-2">
                    To: <span className="font-medium text-slate-800">{recipientDisplayName}</span>
                  </p>
                  {error ? (
                    <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
                      {error}
                    </div>
                  ) : null}
                  <textarea
                    className="w-full min-h-[120px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
                    placeholder="Write your message..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={sending}
                  />
                </>
              )}
            </div>

            {recipientUserId ? (
              <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={sending || !body.trim()}
                  className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
