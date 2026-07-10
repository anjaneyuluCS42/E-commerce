import React from 'react';
import { useToastStore } from '../../store/toastStore';
import type { Toast as ToastType } from '../../types';

const iconMap: Record<ToastType['type'], string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
};

const colorMap: Record<ToastType['type'], string> = {
  success: 'bg-green-50 border-green-400 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  error: 'bg-red-50 border-red-400 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  info: 'bg-blue-50 border-blue-400 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  warning: 'bg-yellow-50 border-yellow-400 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
};

interface ToastItemProps {
  toast: ToastType;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast }) => {
  const { removeToast } = useToastStore();

  return (
    <div
      className={`flex items-start gap-3 border rounded-xl shadow-lg px-4 py-3 text-sm font-semibold min-w-[280px] max-w-sm animate-slideDown ${colorMap[toast.type]}`}
      role="alert"
    >
      <span className="text-base flex-shrink-0">{iconMap[toast.type]}</span>
      <span className="flex-grow">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity font-black text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};

const Toast: React.FC = () => {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-20 right-4 z-[9999] flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
};

export default Toast;
