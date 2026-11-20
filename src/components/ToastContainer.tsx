import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  variant?: 'success' | 'info' | 'error';
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-24 right-4 z-50 flex flex-col gap-2 sm:right-6"
    >
      {toasts.map((toast) => {
        const variant = toast.variant ?? 'info';
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white/95 px-3.5 py-2.5 text-xs font-medium text-slate-800 shadow-lg backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-slate-100"
          >
            {variant === 'success' && (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            )}
            {variant === 'error' && (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            )}
            {variant === 'info' && (
              <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-violet-400" aria-hidden="true" />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="ml-1 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
