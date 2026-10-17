import React, { useState } from 'react';
import {
  RotateCcw,
  PlusCircle,
  Play,
  Settings,
  History,
  Shield,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { TableState, Player } from '../lib/engine/poker';
import { sounds } from '../lib/audio';
import { useTranslation, localizeLogEntry } from '../lib/i18n';

interface HostControlsProps {
  tableState: TableState;
  onStartHand: () => void;
  onUndo: () => void;
  onRebuy: (playerId: string, amount: number) => void;
  onForceFold: (playerId: string) => void;
  onKickPlayer: (playerId: string) => void;
  onToggleSitOut: (playerId: string) => void;
  onUpdateBlinds: (small: number, big: number) => void;
  onMovePlayer: (fromIndex: number, toIndex: number) => void;
}

export const HostControls: React.FC<HostControlsProps> = ({
  tableState,
  onStartHand,
  onUndo,
  onRebuy,
  onForceFold,
  onKickPlayer,
  onToggleSitOut,
  onUpdateBlinds,
  onMovePlayer,
}) => {
  const { t } = useTranslation();
  const [showHistory, setShowHistory] = useState(false);
  const [showPlayerManage, setShowPlayerManage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [sbInput, setSbInput] = useState(tableState.smallBlind.toString());
  const [bbInput, setBbInput] = useState(tableState.bigBlind.toString());

  const canStartHand =
    tableState.street === 'SHOWDOWN' &&
    tableState.pots.length === 0 &&
    tableState.players.filter((p) => !p.sittingOut && p.chips > 0).length >= 2;

  const handleRebuySubmit = (player: Player, amount: number) => {
    sounds.playChipClick();
    onRebuy(player.id, amount);
  };

  const handleApplyBlinds = (e: React.FormEvent) => {
    e.preventDefault();
    const sb = parseInt(sbInput, 10);
    const bb = parseInt(bbInput, 10);
    if (!isNaN(sb) && !isNaN(bb) && sb > 0 && bb > sb) {
      onUpdateBlinds(sb, bb);
      setShowSettings(false);
    }
  };

  return (
    <>
      {/* Floating Host Quick-Action Bar */}
      <div className="flex items-center justify-between gap-1.5 p-2 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md shadow-xl text-xs">
        <div className="flex items-center gap-1.5">
          {/* Deal Next Hand */}
          {canStartHand && (
            <button
              onClick={onStartHand}
              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold flex items-center gap-1 shadow-md shadow-amber-500/20 active:scale-95 transition"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Deal Hand #{tableState.handNumber + 1}</span>
            </button>
          )}

          {/* Undo Button */}
          <button
            disabled={!tableState.lastState}
            onClick={() => {
              sounds.playChipClick();
              onUndo();
            }}
            title="Undo Last Action"
            className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          {/* Manage Players / Rebuy */}
          <button
            onClick={() => setShowPlayerManage(true)}
            className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1 transition active:scale-95 border border-slate-700"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Players</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* History */}
          <button
            onClick={() => setShowHistory(true)}
            title="Action History"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 border border-slate-700"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            title="Table Settings"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 border border-slate-700"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Players Management Modal */}
      {showPlayerManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  Player Management & Seating
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Use the arrows to adjust seat order to match your real poker table.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPlayerManage(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {tableState.players.map((p, index) => (
                <div
                  key={p.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {/* Seat Order Stepper Buttons */}
                      <div className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button
                          type="button"
                          title="Move Seat Up (Clockwise)"
                          disabled={index === 0}
                          onClick={() => {
                            sounds.playChipClick();
                            onMovePlayer(index, index - 1);
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono font-bold text-amber-400 px-1">
                          #{index + 1}
                        </span>
                        <button
                          type="button"
                          title="Move Seat Down (Counter-Clockwise)"
                          disabled={index === tableState.players.length - 1}
                          onClick={() => {
                            sounds.playChipClick();
                            onMovePlayer(index, index + 1);
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <div className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                          {p.name}
                          {index === tableState.dealerIndex && (
                            <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 rounded-full">
                              Dealer
                            </span>
                          )}
                          {p.sittingOut && (
                            <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                              Sitting Out
                            </span>
                          )}
                          {!p.connected && (
                            <span className="text-[10px] text-rose-400 bg-rose-400/10 px-1.5 py-0.2 rounded border border-rose-400/20">
                              Offline
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-amber-400 font-mono">
                          Stack: ${p.chips}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRebuySubmit(p, 500)}
                        className="py-1 px-2 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-600/40 transition"
                      >
                        +500
                      </button>
                      <button
                        onClick={() => handleRebuySubmit(p, 1000)}
                        className="py-1 px-2 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-600/40 transition"
                      >
                        +1k
                      </button>
                    </div>
                  </div>

                  {/* Player Quick Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-xs">
                    <button
                      onClick={() => onToggleSitOut(p.id)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      {p.sittingOut ? 'Return to Game' : 'Sit Out'}
                    </button>
                    {tableState.street !== 'SHOWDOWN' && !p.folded && (
                      <button
                        onClick={() => onForceFold(p.id)}
                        className="text-amber-400 hover:text-amber-300"
                      >
                        Force Fold
                      </button>
                    )}
                    <button
                      onClick={() => onKickPlayer(p.id)}
                      className="text-rose-400 hover:text-rose-300 ml-auto"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Log Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Hand Action Log
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-80 overflow-y-auto font-mono text-xs text-slate-300 flex flex-col gap-1.5">
              {tableState.history.slice().reverse().map((entry, idx) => (
                <div
                  key={idx}
                  className={`py-1 border-b border-slate-900 last:border-none ${
                    entry.startsWith('---')
                      ? 'text-amber-400 font-bold'
                      : entry.includes('wins')
                      ? 'text-emerald-400 font-semibold'
                      : entry.includes('folds')
                      ? 'text-rose-400'
                      : ''
                  }`}
                >
                  {localizeLogEntry(entry, t)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                Table Blind Stakes
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyBlinds} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  Small Blind ($)
                </label>
                <input
                  type="number"
                  min="1"
                  value={sbInput}
                  onChange={(e) => setSbInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  Big Blind ($)
                </label>
                <input
                  type="number"
                  min="2"
                  value={bbInput}
                  onChange={(e) => setBbInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl mt-2 transition"
              >
                Save Stakes
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
