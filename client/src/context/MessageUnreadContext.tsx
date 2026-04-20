import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const POLL_MS = 25_000;

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
      const list = await api.messages.listConversations();
      setTotalUnread(list.reduce((acc, c) => acc + (c.unreadCount || 0), 0));
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const t = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(t);
  }, [user, refresh]);

  return (
    <MessageUnreadContext.Provider value={{ totalUnread, refresh }}>{children}</MessageUnreadContext.Provider>
  );
}

export function useMessageUnread() {
  const ctx = useContext(MessageUnreadContext);
  if (!ctx) throw new Error('useMessageUnread must be used within MessageUnreadProvider');
  return ctx;
}
