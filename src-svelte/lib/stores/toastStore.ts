import { writable, derived } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'tx';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  txHash?: string;
  duration: number; // ms, 0 = persistent
  createdAt: number;
}

const MAX_TOASTS = 5;

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  function add(opts: Omit<Toast, 'id' | 'createdAt'>) {
    const toast: Toast = {
      ...opts,
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    update(list => {
      const next = [toast, ...list].slice(0, MAX_TOASTS);
      return next;
    });
    if (toast.duration > 0) {
      setTimeout(() => dismiss(toast.id), toast.duration);
    }
    return toast.id;
  }

  function dismiss(id: string) {
    update(list => list.filter(t => t.id !== id));
  }

  function clear() {
    update(() => []);
  }

  // ─── Convenience methods ───
  const success = (title: string, message?: string) =>
    add({ type: 'success', title, message, duration: 4000 });

  const error = (title: string, message?: string) =>
    add({ type: 'error', title, message, duration: 6000 });

  const warning = (title: string, message?: string) =>
    add({ type: 'warning', title, message, duration: 5000 });

  const info = (title: string, message?: string) =>
    add({ type: 'info', title, message, duration: 4000 });

  const tx = (title: string, txHash: string, message?: string) =>
    add({ type: 'tx', title, message, txHash, duration: 8000 });

  return { subscribe, add, dismiss, clear, success, error, warning, info, tx };
}

export const toasts = createToastStore();
