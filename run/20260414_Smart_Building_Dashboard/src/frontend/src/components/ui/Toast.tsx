'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import {
  subscribeToasts,
  dismissToast,
  getToasts,
  type ToastMessage,
  type ToastType,
} from '@/lib/toast';

const TOAST_ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'border-green-500/40 bg-slate-800',
  error: 'border-red-500/40 bg-slate-800',
  info: 'border-blue-500/40 bg-slate-800',
};

const TOAST_ICON_COLORS: Record<ToastType, string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    setToasts(getToasts());
    return subscribeToasts(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = TOAST_ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-xl animate-toastIn ${TOAST_STYLES[toast.type]}`}
          >
            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${TOAST_ICON_COLORS[toast.type]}`} />
            <p className="text-sm text-slate-200 flex-1">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
