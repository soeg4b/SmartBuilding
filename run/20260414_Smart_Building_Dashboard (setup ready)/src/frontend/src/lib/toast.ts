type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

type ToastListener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
const listeners = new Set<ToastListener>();
let idCounter = 0;

function notify() {
  listeners.forEach((fn) => fn([...toasts]));
}

export function showToast(message: string, type: ToastType = 'info') {
  const id = `toast-${++idCounter}-${Date.now()}`;
  toasts = [...toasts, { id, message, type }];
  notify();

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    dismissToast(id);
  }, 5000);
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): ToastMessage[] {
  return [...toasts];
}

export type { ToastMessage, ToastType };
