import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (type: ToastType, message: string, duration: number = 4000) => {
    const id = 'toast_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const toast: Toast = { id, type, message, duration };
    set({ toasts: [...get().toasts, toast] });

    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },

  removeToast: (id: string) => {
    set({ toasts: get().toasts.filter(t => t.id !== id) });
  },

  clearAll: () => set({ toasts: [] }),
}));
