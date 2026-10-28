import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import streamChatClient from '../lib/streamChat';
import { useAuth } from './AuthContext';

type Ctx = {
  totalUnread: number;
  refresh: () => Promise<void>;
};

const MessageUnreadContext = createContext<Ctx | null>(null);

export function MessageUnreadProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!user || (user.role !== 'student' && user.role !== 'pi')) {
      setTotalUnread(0);
      return;
    }
    try {
      const response = await streamChatClient.getUnreadCount();
      setTotalUnread(response.total_unread_count);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    if (!user || (user.role !== 'student' && user.role !== 'pi')) return;

    // Fetch initial unread count
    streamChatClient.getUnreadCount()
      .then(r => setTotalUnread(r.total_unread_count))
      .catch(() => {});

    // Subscribe to new message notifications
    const handleNewMessage = () => {
      streamChatClient.getUnreadCount()
        .then(r => setTotalUnread(r.total_unread_count))
        .catch(() => {});
    };

    streamChatClient.on('notification.message_new', handleNewMessage);
    return () => streamChatClient.off('notification.message_new', handleNewMessage);
  }, [user]);

  return (
    <MessageUnreadContext.Provider value={{ totalUnread, refresh }}>{children}</MessageUnreadContext.Provider>
  );
}

export function useMessageUnread() {
  const ctx = useContext(MessageUnreadContext);
  if (!ctx) throw new Error('useMessageUnread must be used within MessageUnreadProvider');
  return ctx;
}
