import { create } from 'zustand';

interface OnlineUser {
  userId: string;
  username: string;
  tenantId: string;
  lastSeen: string;
}

interface OnlineState {
  onlineUsers: OnlineUser[];
  addOnlineUser: (userId: string, username: string, tenantId: string) => void;
  removeOnlineUser: (userId: string) => void;
  heartbeat: (userId: string) => void;
  getOnlineByTenant: (tenantId: string) => OnlineUser[];
  cleanStale: () => void;
}

const HEARTBEAT_KEY = 'grocery_saas_heartbeat';
const STALE_MS = 2 * 60 * 1000;

export const useOnlineStore = create<OnlineState>((set, get) => ({
  onlineUsers: [],

  addOnlineUser: (userId, username, tenantId) => {
    const user: OnlineUser = { userId, username, tenantId, lastSeen: new Date().toISOString() };
    const beat = JSON.parse(localStorage.getItem(HEARTBEAT_KEY) || '{}');
    beat[userId] = user;
    localStorage.setItem(HEARTBEAT_KEY, JSON.stringify(beat));
    set({ onlineUsers: Object.values(beat) });
  },

  removeOnlineUser: (userId) => {
    const beat = JSON.parse(localStorage.getItem(HEARTBEAT_KEY) || '{}');
    delete beat[userId];
    localStorage.setItem(HEARTBEAT_KEY, JSON.stringify(beat));
    set({ onlineUsers: Object.values(beat) });
  },

  heartbeat: (userId) => {
    const beat = JSON.parse(localStorage.getItem(HEARTBEAT_KEY) || '{}');
    if (beat[userId]) {
      beat[userId].lastSeen = new Date().toISOString();
      localStorage.setItem(HEARTBEAT_KEY, JSON.stringify(beat));
    }
  },

  getOnlineByTenant: (tenantId) => {
    return get().onlineUsers.filter(u => u.tenantId === tenantId);
  },

  cleanStale: () => {
    const now = Date.now();
    const beat = JSON.parse(localStorage.getItem(HEARTBEAT_KEY) || '{}');
    const cleaned: Record<string, OnlineUser> = {};
    for (const [id, user] of Object.entries(beat) as [string, OnlineUser][]) {
      if (now - new Date(user.lastSeen).getTime() < STALE_MS) {
        cleaned[id] = user;
      }
    }
    localStorage.setItem(HEARTBEAT_KEY, JSON.stringify(cleaned));
    set({ onlineUsers: Object.values(cleaned) });
  },
}));

export function startHeartbeat(userId: string, username: string, tenantId: string) {
  const store = useOnlineStore.getState();
  store.addOnlineUser(userId, username, tenantId);

  const interval = setInterval(() => {
    store.heartbeat(userId);
    store.cleanStale();
  }, 30000);

  window.addEventListener('beforeunload', () => {
    store.removeOnlineUser(userId);
  });

  return () => {
    clearInterval(interval);
    store.removeOnlineUser(userId);
  };
}
