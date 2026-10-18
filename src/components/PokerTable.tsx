import React from 'react';
import { WifiOff, Zap } from 'lucide-react';
import type { TableState, Player } from '../lib/engine/poker';
import { useTranslation } from '../lib/i18n';

interface PokerTableProps {
  tableState: TableState;
  myPlayerId?: string;
  onSeatClick?: (player: Player) => void;
  activeEmotes?: Record<string, { symbol: string; shout: string }>;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  tableState,
  myPlayerId,
  onSeatClick,
  activeEmotes,
}) => {
  const { t } = useTranslation();
  const { players, dealerIndex, activePlayerIndex, pots, street, currentHighestBet } = tableState;

  // Calculate total chips in play for this hand
  const currentBetsTotal = players.reduce((sum, p) => sum + p.currentBet, 0);
  const potsTotal = pots.reduce((sum, p) => sum + p.amount, 0);
  const totalPotValue = Math.max(
    currentBetsTotal + potsTotal,
    players.reduce((sum, p) => sum + p.totalHandBet, 0)
  );

  // Determine SB and BB positions
  const activePlayers = players.filter((p) => !p.sittingOut && p.chips + p.totalHandBet > 0);
  let sbIndex = -1;
  let bbIndex = -1;

  if (activePlayers.length === 2) {
    sbIndex = dealerIndex;
    bbIndex = (dealerIndex + 1) % players.length;
  } else if (activePlayers.length > 2) {
    sbIndex = (dealerIndex + 1) % players.length;
    bbIndex = (dealerIndex + 2) % players.length;
  }

  // Pre-calculate positions around ellipse for up to 10 players
  const getSeatPositionStyle = (index: number, total: number) => {
    // If user is seated, rotate seats so myPlayer is always at bottom (index 0)
    let myIndex = myPlayerId ? players.findIndex((p) => p.id === myPlayerId) : -1;
    if (myIndex === -1) myIndex = 0;

    const relativeIndex = (index - myIndex + total) % total;
    // Calculate angle in radians. 90 deg (PI/2) is bottom
    const angle = (relativeIndex / total) * 2 * Math.PI + Math.PI / 2;

    // Radius in percentage: RX = 42%, RY = 38%
    const rx = 42;
    const ry = 38;
    const x = 50 + rx * Math.cos(angle);
    const y = 50 + ry * Math.sin(angle);

    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div className="relative w-full aspect-[4/3] max-h-[580px] my-auto select-none p-2">
      {/* Outer Wooden / Leather Rail */}
      <div className="absolute inset-2 sm:inset-4 rounded-[60px] sm:rounded-[100px] bg-slate-900 border-4 sm:border-8 border-slate-800 table-rail flex items-center justify-center overflow-hidden">
        {/* Inner Green Felt */}
        <div className="absolute inset-2 sm:inset-3 rounded-[52px] sm:rounded-[90px] poker-felt flex flex-col items-center justify-center border-2 border-emerald-600/30">
          {/* Subtle Poker Table Ring Marker */}
          <div className="absolute inset-10 sm:inset-14 rounded-[40px] sm:rounded-[70px] border border-emerald-400/10 pointer-events-none" />

          {/* Center Table Info: Pot, Street, Stakes */}
          <div className="relative z-30 flex flex-col items-center justify-center text-center p-3 max-w-[220px] sm:max-w-xs">
            {/* Street Badge */}
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 mb-1.5 shadow-sm">
              {street}
            </div>

            {/* Total Pot */}
            <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-amber-300/80">
              {t('total_pot')}
            </div>
            <div className="flex items-center justify-center gap-1.5 my-0.5">
              <img
                src="./poker-chip.svg"
                alt="Pot"
                className="w-5 h-5 sm:w-7 sm:h-7 filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)] shrink-0"
              />
              <span className="text-2xl sm:text-4xl font-black font-mono text-amber-400 drop-shadow-md tracking-tight">
                ${totalPotValue}
              </span>
            </div>

            {/* Side Pots Breakdown (if multiple pots exist) */}
            {pots.length > 1 && (
              <div className="flex flex-wrap gap-1 justify-center mt-1.5 max-w-[200px]">
                {pots.map((pot, idx) => (
                  <span
                    key={pot.id}
                    className="text-[9px] sm:text-[10px] bg-slate-950/70 border border-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded font-mono"
                  >
                    {idx === 0 ? t('main_pot') : t('side_pot', { index: idx })}: ${pot.amount}
                  </span>
                ))}
              </div>
            )}

            {/* Current Bet to Call */}
            {currentHighestBet > 0 && street !== 'SHOWDOWN' && (
              <div className="mt-1 text-[10px] sm:text-xs text-emerald-200/90 font-medium">
                {t('current_bet')}: <strong className="font-mono text-white">${currentHighestBet}</strong>
              </div>
            )}

            {/* Table Host Reaction (when host is running dedicated table display and not seated) */}
            {(() => {
              const hasSeatedHost = players.some((p) => p.id.startsWith('host-') || p.id === myPlayerId);
              const hostEmote =
                !hasSeatedHost &&
                activeEmotes &&
                (activeEmotes['host'] || (tableState.hostPeerId && activeEmotes[tableState.hostPeerId]));
              if (!hostEmote) return null;
              return (
                <div className="mt-2 relative z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border-2 border-amber-400 shadow-[0_8px_30px_rgba(245,158,11,0.7)] animate-bounce pointer-events-none whitespace-nowrap">
                  <span className="text-xl leading-none">{hostEmote.symbol}</span>
                  <span className="text-[10px] font-black tracking-wide text-amber-200">
                    Host: {hostEmote.shout}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Players Seated Around Table */}
      {players.map((player, index) => {
        const isCurrentTurn = activePlayerIndex === index && street !== 'SHOWDOWN';
        const isMe = player.id === myPlayerId;
        const isDealer = index === dealerIndex;
        const isSB = index === sbIndex;
        const isBB = index === bbIndex;
        const posStyle = getSeatPositionStyle(index, players.length || 1);

        const isHostPlayer = player.id.startsWith('host-') || player.id === myPlayerId;
        const emoteData =
          activeEmotes &&
          (activeEmotes[player.id] ||
            (isHostPlayer && (activeEmotes['host'] || (tableState.hostPeerId && activeEmotes[tableState.hostPeerId]))));
        const hasActiveEmote = !!emoteData;

        return (
          <div
            key={player.id}
            style={posStyle}
            onClick={() => onSeatClick && onSeatClick(player)}
            className={`absolute flex flex-col items-center transition-all duration-300 cursor-pointer ${
              hasActiveEmote
                ? 'z-50'
                : isCurrentTurn
                ? 'z-30'
                : 'z-20'
            } ${player.folded ? 'opacity-40 grayscale' : 'opacity-100'}`}
          >
            {/* Emote Reaction Bubble */}
            {emoteData && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border-2 border-amber-400 shadow-[0_8px_30px_rgba(245,158,11,0.7)] animate-bounce pointer-events-none whitespace-nowrap">
                <span className="text-xl filter drop-shadow leading-none">
                  {emoteData.symbol}
                </span>
                <span className="text-[10px] font-black tracking-wide whitespace-nowrap text-amber-200">
                  {emoteData.shout}
                </span>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-amber-400" />
              </div>
            )}

            {/* Player Card / Avatar Pod */}
            <div
              className={`relative flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-2xl border transition-all duration-300 backdrop-blur-md shadow-lg ${
                isCurrentTurn
                  ? 'bg-amber-950/90 border-amber-400 ring-4 ring-amber-400/40 turn-pulse scale-105 z-30'
                  : isMe
                  ? 'bg-slate-900/95 border-emerald-500/80 ring-2 ring-emerald-500/20'
                  : 'bg-slate-900/90 border-slate-700/80'
              }`}
            >
              {/* Turn Indicator Glow */}
              {isCurrentTurn && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                  <Zap className="w-2.5 h-2.5 fill-slate-950" />
                  Turn
                </div>
              )}

              {/* Avatar Icon */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  isMe
                    ? 'bg-emerald-500 text-slate-950'
                    : isCurrentTurn
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {player.connected ? (
                  player.name.charAt(0).toUpperCase()
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>

              {/* Player Name & Chips */}
              <div className="flex flex-col min-w-0 pr-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-bold truncate max-w-[70px] sm:max-w-[90px] text-slate-100">
                    {player.name}
                  </span>
                  {isMe && (
                    <span className="text-[9px] text-emerald-400 font-semibold">(You)</span>
                  )}
                </div>
                <div className="text-[11px] sm:text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                  <img src="./poker-chip.svg" alt="Chips" className="w-3 h-3 shrink-0" />
                  <span>${player.chips}</span>
                </div>
              </div>

              {/* Badges: D, SB, BB, All-In */}
              <div className="absolute -bottom-2 -right-1 flex items-center gap-0.5">
                {isDealer && (
                  <span
                    title="Dealer Button"
                    className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-md border border-amber-300"
                  >
                    D
                  </span>
                )}
                {isSB && !isDealer && (
                  <span
                    title="Small Blind"
                    className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold text-[9px] flex items-center justify-center shadow-md border border-blue-400"
                  >
                    SB
                  </span>
                )}
                {isBB && !isDealer && (
                  <span
                    title="Big Blind"
                    className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center shadow-md border border-indigo-400"
                  >
                    BB
                  </span>
                )}
                {player.isAllIn && (
                  <span
                    title="All-In"
                    className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[8px] uppercase tracking-wider shadow-md animate-pulse"
                  >
                    All-in
                  </span>
                )}
              </div>
            </div>

            {/* Current Round Bet Chip Placed in Front of Player */}
            {player.currentBet > 0 && (
              <div className="mt-1.5 px-2 py-0.5 rounded-full bg-slate-950/90 border border-amber-500/60 text-amber-300 font-mono text-[10px] sm:text-xs font-black shadow-md flex items-center gap-1 animate-in fade-in zoom-in-75 duration-150">
                <img src="./poker-chip.svg" alt="Bet" className="w-3.5 h-3.5 shrink-0" />
                <span>${player.currentBet}</span>
              </div>
            )}

            {/* Folded Badge */}
            {player.folded && (
              <div className="mt-1 px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 text-[9px] font-semibold uppercase">
                Folded
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
