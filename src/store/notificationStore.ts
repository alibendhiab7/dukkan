import { create } from 'zustand';
import type { Notification } from '../core/repositories/interfaces';
import { notificationRepo } from '../core/repositories/turso';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  loadNotifications: (tenantId: string) => Promise<void>;
  loadUnread: (tenantId: string) => Promise<void>;
  markAsRead: (id: string, tenantId: string) => Promise<void>;
  markAllAsRead: (tenantId: string) => Promise<void>;
  deleteNotification: (id: string, tenantId: string) => Promise<void>;
  createNotification: (tenantId: string, title: string, message: string, type: Notification['type']) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  loadNotifications: async (tenantId: string) => {
    set({ isLoading: true });
    try {
      const notifications = await notificationRepo.getAll(tenantId);
      const unreadCount = notifications.filter(n => !n.is_read).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (err) {
      console.error(err);
      set({ isLoading: false });
    }
  },

  loadUnread: async (tenantId: string) => {
    try {
      const notifications = await notificationRepo.getUnread(tenantId);
      set({ unreadCount: notifications.length });
    } catch (err) {
      console.error(err);
    }
  },

  markAsRead: async (id: string, tenantId: string) => {
    const prev = get().notifications;
    const next = prev.map(n => n.id === id ? { ...n, is_read: true } : n);
    set({ notifications: next, unreadCount: next.filter(n => !n.is_read).length });
    try {
      await notificationRepo.markAsRead(id, tenantId);
    } catch (err) {
      console.error(err);
      set({ notifications: prev, unreadCount: prev.filter(n => !n.is_read).length });
    }
  },

  markAllAsRead: async (tenantId: string) => {
    const prev = get().notifications;
    const next = prev.map(n => ({ ...n, is_read: true }));
    set({ notifications: next, unreadCount: 0 });
    try {
      await notificationRepo.markAllAsRead(tenantId);
    } catch (err) {
      console.error(err);
      set({ notifications: prev, unreadCount: prev.filter(n => !n.is_read).length });
    }
  },

  deleteNotification: async (id: string, tenantId: string) => {
    const prev = get().notifications;
    const next = prev.filter(n => n.id !== id);
    set({ notifications: next, unreadCount: next.filter(n => !n.is_read).length });
    try {
      await notificationRepo.delete(id, tenantId);
    } catch (err) {
      console.error(err);
      set({ notifications: prev, unreadCount: prev.filter(n => !n.is_read).length });
    }
  },

  createNotification: async (tenantId: string, title: string, message: string, type: Notification['type']) => {
    try {
      await notificationRepo.create({
        tenant_id: tenantId,
        title,
        message,
        type,
        is_read: false,
      });
      await get().loadNotifications(tenantId);
    } catch (err) {
      console.error(err);
    }
  },
}));
