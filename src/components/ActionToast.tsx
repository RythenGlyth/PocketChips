import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation, localizeLogEntry } from '../lib/i18n';

export interface ToastItem {
  id: string;
  type: 'ACTION' | 'INFO';
  title?: string;
  message: string;
  icon?: string;
}

interface ActionToastProps {
  history: string[];
}

export const ActionToast: React.FC<ActionToastProps> = ({ history }) => {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const lastSeenIndexRef = useRef<number>(history.length);

  // Monitor table history for new player action entries
  useEffect(() => {
    if (history.length > lastSeenIndexRef.current) {
      const newItems = history.slice(lastSeenIndexRef.current);
      lastSeenIndexRef.current = history.length;

      const isPlayerAction = (entry: string) => {
        return (
          entry.includes('raises') ||
          entry.includes('bets') ||
          entry.includes('calls') ||
          entry.includes('checks') ||
          entry.includes('folds') ||
          entry.includes('all-in') ||
          entry.includes('All-in') ||
          entry.includes('posts Small Blind') ||
          entry.includes('posts Big Blind') ||
          entry.includes('wins') ||
          entry.includes('won Pot') ||
          entry.includes('re-bought')
        );
      };

      const newToasts: ToastItem[] = newItems
        .filter(isPlayerAction)
        .map((entry) => {
          let icon = '♠';

          if (entry.includes('all-in') || entry.includes('All-in')) {
            icon = '⚡';
          } else if (entry.includes('raises') || entry.includes('bets')) {
            icon = '🔥';
          } else if (entry.includes('calls')) {
            icon = '🪙';
          } else if (entry.includes('checks')) {
            icon = '✋';
          } else if (entry.includes('folds')) {
            icon = '🏳️';
          } else if (entry.includes('wins') || entry.includes('won Pot')) {
            icon = '🏆';
          } else if (entry.includes('posts Small Blind') || entry.includes('posts Big Blind')) {
            icon = '🎲';
          } else if (entry.includes('re-bought')) {
            icon = '💰';
          }

          return {
            id: 'toast-' + Math.random().toString(36).substring(2, 8),
            type: 'ACTION',
            message: localizeLogEntry(entry, t).replace(/---/g, '').trim(),
            icon,
          };
        });

      if (newToasts.length > 0) {
        setToasts((prev) => [...prev.slice(-2), ...newToasts]);
      }
    } else {
      lastSeenIndexRef.current = history.length;
    }
  }, [history]);

  // Auto remove oldest toast after 3.5s
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.slice(1));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 sm:top-14 right-3 sm:right-4 z-40 flex flex-col gap-1.5 max-w-xs pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-900/95 border border-slate-700/80 rounded-2xl py-2 px-3 shadow-xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200 transition-all hover:opacity-100"
        >
          <span className="text-base shrink-0 select-none">{toast.icon}</span>

          <div className="flex-1 min-w-0 text-left">
            {toast.title && (
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider truncate">
                {toast.title}
              </div>
            )}
            <div className="text-xs text-slate-200 font-medium truncate">
              {toast.message}
            </div>
          </div>

          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
