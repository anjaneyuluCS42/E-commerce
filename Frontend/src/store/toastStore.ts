import { create } from 'zustand';
import type { Toast, ToastType } from '../types';

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (message, type = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    set({ toasts: [...get().toasts, { id, message, type }] });
    // Auto-remove after 3.5 seconds
    setTimeout(() => get().removeToast(id), 3500);
  },

  removeToast: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Convenience helpers */
export const toast = {
  success: (msg: string) => useToastStore.getState().addToast(msg, 'success'),
  error: (msg: string) => useToastStore.getState().addToast(msg, 'error'),
  info: (msg: string) => useToastStore.getState().addToast(msg, 'info'),
  warning: (msg: string) => useToastStore.getState().addToast(msg, 'warning'),
};
