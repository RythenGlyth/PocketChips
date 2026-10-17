import React, { useState, useEffect } from 'react';
import { Minus, Plus, Flame } from 'lucide-react';
import type { TableState, Player, PlayerAction } from '../lib/engine/poker';
import { sounds } from '../lib/audio';
import { useTranslation } from '../lib/i18n';

interface PlayerControlsProps {
  tableState: TableState;
  myPlayer: Player;
  onAction: (action: PlayerAction) => void;
  disabled?: boolean;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  tableState,
  myPlayer,
  onAction,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const currentHighest = tableState.currentHighestBet;
  const currentBet = myPlayer.currentBet;
  const chips = myPlayer.chips;
  const neededToCall = Math.max(0, currentHighest - currentBet);
  const canCheck = neededToCall === 0;

  // Minimum raise/bet calculation
  const minRequiredBet =
    currentHighest === 0
      ? tableState.bigBlind
      : currentHighest + tableState.minRaise;

  const maxTotalBet = chips + currentBet;
  const minTargetBet = Math.min(minRequiredBet, maxTotalBet);

  const [raiseAmount, setRaiseAmount] = useState<number>(minTargetBet);

  // Update default raise amount when street or highest bet changes
  useEffect(() => {
    setRaiseAmount(Math.min(minRequiredBet, maxTotalBet));
  }, [minRequiredBet, maxTotalBet]);

  // Total current pot size for preset calculation
  const totalPot =
    tableState.pots.reduce((sum, p) => sum + p.amount, 0) +
    tableState.players.reduce((sum, p) => sum + p.currentBet, 0);

  const handleFold = () => {
    sounds.playFold();
    onAction({ type: 'FOLD' });
  };

  const handleCheckOrCall = () => {
    if (canCheck) {
      sounds.playCheck();
      onAction({ type: 'CHECK' });
    } else {
      sounds.playChipClick();
      onAction({ type: 'CALL' });
    }
  };

  const handleRaise = () => {
    sounds.playChipClick();
    onAction({
      type: currentHighest === 0 ? 'BET' : 'RAISE',
      amount: raiseAmount,
    });
  };

  const handlePreset = (amount: number) => {
    sounds.playChipClick();
    const clamped = Math.max(minTargetBet, Math.min(amount, maxTotalBet));
    setRaiseAmount(clamped);
  };

  const stepChange = (delta: number) => {
    sounds.playChipClick();
    setRaiseAmount((prev) => {
      const next = prev + delta;
      return Math.max(minTargetBet, Math.min(next, maxTotalBet));
    });
  };

  // Presets: compact so all 5 buttons fit side-by-side with zero cramming
  const presets = [
    {
      label: 'Min',
      amount: minTargetBet,
    },
    {
      label: '3x BB',
      amount: tableState.bigBlind * 3,
    },
    {
      label: '½ Pot',
      amount: currentHighest + Math.round(totalPot / 2),
    },
    {
      label: 'Pot',
      amount: currentHighest + totalPot,
    },
    {
      label: 'All-In',
      amount: maxTotalBet,
      isAllIn: true,
    },
  ];

  const isRaiseAllIn = raiseAmount === maxTotalBet;
  const canRaise = maxTotalBet > currentHighest;

  return (
    <div className="w-full bg-slate-900/95 border-t border-slate-800 backdrop-blur-md p-3 sm:p-4 rounded-t-3xl shadow-2xl flex flex-col gap-3 max-w-lg mx-auto">
      {/* Turn Banner */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-semibold text-amber-400 flex items-center gap-1.5 animate-pulse">
          <Flame className="w-4 h-4 fill-amber-400" />
          YOUR TURN TO ACT
        </span>
        <span className="text-slate-400">
          Your Stack: <strong className="text-slate-100 font-mono">${chips}</strong>
        </span>
      </div>

      {/* Preset Chips: 5-column grid so all 5 buttons fit perfectly without cramming */}
      {canRaise && (
        <div className="grid grid-cols-5 gap-1 sm:gap-1.5 w-full">
          {presets.map((preset, idx) => {
            const isSelected = raiseAmount === preset.amount;
            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => handlePreset(preset.amount)}
                className={`py-1.5 px-0.5 rounded-xl text-[11px] sm:text-xs font-bold transition text-center truncate active:scale-95 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : preset.isAllIn
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Raise Stepper & Slider */}
      {canRaise && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={disabled || raiseAmount <= minTargetBet}
              onClick={() => stepChange(-tableState.bigBlind)}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold transition disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">
                {currentHighest === 0 ? 'Bet Total' : 'Raise Total'}
              </span>
              <span className="text-xl font-black font-mono text-amber-400">
                ${raiseAmount}
                {isRaiseAllIn && (
                  <span className="text-xs ml-1.5 text-red-400 font-bold uppercase">(All-in)</span>
                )}
              </span>
            </div>

            <button
              type="button"
              disabled={disabled || raiseAmount >= maxTotalBet}
              onClick={() => stepChange(tableState.bigBlind)}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold transition disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={minTargetBet}
            max={maxTotalBet}
            step={tableState.smallBlind}
            value={raiseAmount}
            onChange={(e) => {
              sounds.playChipClick();
              setRaiseAmount(Number(e.target.value));
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      )}

      {/* Action Buttons: FOLD | CHECK/CALL | RAISE */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {/* FOLD Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleFold}
          className="py-3.5 px-3 rounded-2xl bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-95 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-rose-900/30 flex flex-col items-center justify-center transition border border-rose-500/30 cursor-pointer"
        >
          <span>{t('fold')}</span>
          <span className="text-[10px] font-normal text-rose-200/80">Give up</span>
        </button>

        {/* CHECK / CALL Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleCheckOrCall}
          className="py-3.5 px-3 rounded-2xl bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-95 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/30 flex flex-col items-center justify-center transition border border-emerald-500/30 cursor-pointer"
        >
          <span>{canCheck ? t('check') : t('call', { amount: neededToCall })}</span>
          <span className="text-[10px] font-normal text-emerald-200/90 font-mono">
            {canCheck
              ? 'Free'
              : neededToCall >= chips
              ? `All-In ($${chips})`
              : `$${neededToCall}`}
          </span>
        </button>

        {/* RAISE / BET Button */}
        <button
          type="button"
          disabled={disabled || !canRaise}
          onClick={handleRaise}
          className={`py-3.5 px-3 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg flex flex-col items-center justify-center transition border ${
            canRaise
              ? 'bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-95 text-white shadow-blue-900/30 border-blue-500/30 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          <span>{currentHighest === 0 ? t('bet') : t('raise', { amount: raiseAmount }).split(' ')[0]}</span>
          <span className="text-[10px] font-normal text-blue-200/90 font-mono">
            {canRaise ? `$${raiseAmount}` : 'No chips'}
          </span>
        </button>
      </div>
    </div>
  );
};
