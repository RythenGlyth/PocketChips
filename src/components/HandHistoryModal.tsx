import React from 'react';
import { History, X } from 'lucide-react';
import { sounds } from '../lib/audio';
import { useTranslation, localizeLogEntry } from '../lib/i18n';

interface HandHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: string[];
}

export const HandHistoryModal: React.FC<HandHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{t('action_log')}</h3>
              <p className="text-[10px] text-slate-400">Play-by-play history</p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playChipClick();
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 max-h-80 overflow-y-auto font-mono text-xs text-slate-300 flex flex-col gap-1.5">
          {history.length === 0 ? (
            <div className="text-center text-slate-500 py-6">No action recorded yet.</div>
          ) : (
            history
              .slice()
              .reverse()
              .map((entry, idx) => (
                <div
                  key={idx}
                  className={`py-1.5 px-2 rounded-lg border-b border-slate-900/60 last:border-none flex items-center gap-2 ${
                    entry.startsWith('---')
                      ? 'text-amber-400 font-bold bg-amber-400/5'
                      : entry.includes('wins')
                      ? 'text-emerald-400 font-semibold bg-emerald-400/5'
                      : entry.includes('folds')
                      ? 'text-rose-400/90'
                      : entry.includes('raises') || entry.includes('bets')
                      ? 'text-blue-300 font-medium'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                  <span className="truncate">{localizeLogEntry(entry, t)}</span>
                </div>
              ))
          )}
        </div>

        <button
          onClick={() => {
            sounds.playChipClick();
            onClose();
          }}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-98"
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
};

