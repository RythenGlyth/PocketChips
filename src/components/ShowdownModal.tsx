import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Check, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import type { TableState, Pot } from '../lib/engine/poker';
import { HandRankingsModal } from './HandRankingsModal';
import { sounds } from '../lib/audio';
import { useTranslation } from '../lib/i18n';

interface ShowdownModalProps {
  tableState: TableState;
  onAwardPot: (potIndex: number, winnerIds: string[]) => void;
  onNextHand: () => void;
  isHost: boolean;
}

export const ShowdownModal: React.FC<ShowdownModalProps> = ({
  tableState,
  onAwardPot,
  onNextHand,
  isHost,
}) => {
  const { t } = useTranslation();
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [showRankings, setShowRankings] = useState<boolean>(false);
  const currentPotIndex = 0; // Always resolve the first pot in tableState.pots
  const currentPot: Pot | undefined = tableState.pots[currentPotIndex];

  // Reset selected winners whenever the current pot changes
  useEffect(() => {
    setSelectedWinners([]);
  }, [tableState.pots.length]);

  const toggleWinner = (playerId: string) => {
    if (!isHost) return;
    sounds.playChipClick();
    setSelectedWinners((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleConfirmAward = () => {
    if (!isHost || selectedWinners.length === 0 || !currentPot) return;

    sounds.playWin();
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (e) {}

    onAwardPot(currentPotIndex, selectedWinners);
  };

  // If no more pots remain to resolve at Showdown
  if (!currentPot || tableState.pots.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-1">{t('hand_number', { number: tableState.handNumber })} Complete!</h2>
          <p className="text-sm text-slate-400 mb-4">{t('all_pots_awarded')}</p>

          <button
            onClick={() => setShowRankings(true)}
            className="w-full mb-3 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition active:scale-98"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('hand_rankings')}</span>
          </button>

          {isHost ? (
            <button
              onClick={onNextHand}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition active:scale-98"
            >
              <span>{t('deal_next_hand')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="text-sm text-amber-300/80 bg-amber-500/10 border border-amber-500/20 py-2.5 px-4 rounded-xl">
              {t('waiting_next_hand')}
            </div>
          )}

          <HandRankingsModal
            isOpen={showRankings}
            onClose={() => setShowRankings(false)}
          />
        </div>
      </div>
    );
  }

  const potLabel = currentPotIndex === 0 ? 'Main Pot' : `Side Pot #${currentPotIndex}`;
  const eligiblePlayers = tableState.players.filter((p) =>
    currentPot.eligiblePlayerIds.includes(p.id)
  );

  // Calculate projected payout for each selected winner
  const share = selectedWinners.length > 0 ? Math.floor(currentPot.amount / selectedWinners.length) : 0;
  const remainder = selectedWinners.length > 0 ? currentPot.amount % selectedWinners.length : 0;

  // Sorted winners by distance from dealer's left for odd-chip preview
  const sortedSelected = [...selectedWinners].sort((aId, bId) => {
    const aIdx = tableState.players.findIndex((p) => p.id === aId);
    const bIdx = tableState.players.findIndex((p) => p.id === bId);
    const aDist = (aIdx - tableState.dealerIndex - 1 + tableState.players.length) % tableState.players.length;
    const bDist = (bIdx - tableState.dealerIndex - 1 + tableState.players.length) % tableState.players.length;
    return aDist - bDist;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Showdown Resolution
          </div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center justify-center gap-2">
            <span>{potLabel}</span>
            <span className="text-amber-400 font-mono">${currentPot.amount}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isHost
              ? 'Tap the winning player(s) for this pot.'
              : 'Host is selecting the winning player(s)...'}
          </p>

          <button
            type="button"
            onClick={() => setShowRankings(true)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-400/90 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-1 rounded-xl transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Hand Rankings Guide</span>
          </button>
        </div>

        {/* Remaining pots queue notice */}
        {tableState.pots.length > 1 && (
          <div className="text-xs text-slate-400 bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-center">
            {tableState.pots.length - 1} more side pot(s) remaining after this
          </div>
        )}

        {/* Eligible Players List */}
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {eligiblePlayers.map((player) => {
            const isSelected = selectedWinners.includes(player.id);
            const winnerRank = sortedSelected.indexOf(player.id);
            const getsOddChip = winnerRank >= 0 && winnerRank < remainder;
            const projectedChips = isSelected ? share + (getsOddChip ? 1 : 0) : 0;

            return (
              <button
                key={player.id}
                disabled={!isHost}
                onClick={() => toggleWinner(player.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500 text-slate-100 shadow-md shadow-amber-500/10'
                    : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
                } ${!isHost ? 'cursor-default' : 'cursor-pointer active:scale-98'}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border font-bold text-xs ${
                      isSelected
                        ? 'bg-amber-500 border-amber-400 text-slate-950'
                        : 'border-slate-600 bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : ''}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-100">{player.name}</div>
                    <div className="text-xs text-slate-400">Stack: ${player.chips}</div>
                  </div>
                </div>

                {isSelected && (
                  <div className="text-right">
                    <div className="text-sm font-bold text-amber-400 font-mono">
                      +${projectedChips}
                    </div>
                    {getsOddChip && (
                      <div className="text-[10px] text-amber-300/80">incl. +1 odd chip</div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        {isHost ? (
          <button
            disabled={selectedWinners.length === 0}
            onClick={handleConfirmAward}
            className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg ${
              selectedWinners.length > 0
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-emerald-500/20 active:scale-98 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <span>
              {selectedWinners.length > 1
                ? `Split Pot Between ${selectedWinners.length} Winners`
                : selectedWinners.length === 1
                ? `Award $${currentPot.amount} to Winner`
                : 'Select at least 1 winner'}
            </span>
          </button>
        ) : (
          <div className="text-xs text-center text-slate-400 bg-slate-950 py-3 rounded-xl border border-slate-800">
            Showdown in progress. Winner will be announced shortly.
          </div>
        )}

        <HandRankingsModal
          isOpen={showRankings}
          onClose={() => setShowRankings(false)}
        />
      </div>
    </div>
  );
};

