import React, { useState, useEffect, useRef } from 'react';
import { LogOut, BookOpen, Smile, History, AlertCircle, Sun, Settings, Copy, Check, X } from 'lucide-react';
import type { TableState, PlayerAction } from '../lib/engine/poker';
import { PokerTable } from '../components/PokerTable';
import { PlayerControls } from '../components/PlayerControls';
import { ShowdownModal } from '../components/ShowdownModal';
import { StreetAnnouncement } from '../components/StreetAnnouncement';
import { HandRankingsModal } from '../components/HandRankingsModal';
import { EmotePicker, type Sticker } from '../components/EmotePicker';
import { HandHistoryModal } from '../components/HandHistoryModal';
import { ActionToast } from '../components/ActionToast';
import { LanguageSelector } from '../components/LanguageSelector';
import { sounds } from '../lib/audio';
import { useTranslation } from '../lib/i18n';
import { wakeLock } from '../lib/wakelock';

interface PlayerViewProps {
  tableState: TableState;
  myPlayerId: string;
  onAction: (action: PlayerAction) => void;
  onLeaveTable: () => void;
  isConnected: boolean;
  activeEmotes?: Record<string, { symbol: string; shout: string }>;
  onSendEmote: (sticker: Sticker) => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  tableState,
  myPlayerId,
  onAction,
  onLeaveTable,
  isConnected,
  activeEmotes,
  onSendEmote,
}) => {
  const { t } = useTranslation();
  const [showRankings, setShowRankings] = useState(false);
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const prevActiveIndexRef = useRef<number>(-1);

  const handleCopyJoinLink = () => {
    sounds.playChipClick();
    if (typeof window !== 'undefined') {
      const joinUrl = `${window.location.origin}${window.location.pathname}?room=${tableState.roomCode}`;
      navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Keep screen awake while in game
  useEffect(() => {
    wakeLock.request();
    return () => {
      wakeLock.release();
    };
  }, []);

  const myPlayer = tableState.players.find((p) => p.id === myPlayerId);
  const myIndex = tableState.players.findIndex((p) => p.id === myPlayerId);
  const isDealer = tableState.dealerIndex === myIndex;
  const dealerName = tableState.players[tableState.dealerIndex]?.name;

  const isMyTurn =
    tableState.street !== 'SHOWDOWN' &&
    tableState.activePlayerIndex >= 0 &&
    tableState.activePlayerIndex === myIndex;

  const activePlayer =
    tableState.activePlayerIndex >= 0
      ? tableState.players[tableState.activePlayerIndex]
      : null;

  // Trigger alert / vibration when turn starts
  useEffect(() => {
    if (
      isMyTurn &&
      prevActiveIndexRef.current !== tableState.activePlayerIndex
    ) {
      sounds.playYourTurn();
    }
    prevActiveIndexRef.current = tableState.activePlayerIndex;
  }, [isMyTurn, tableState.activePlayerIndex]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden safe-area-inset">
      {/* Offline / Screen Lock Alert Banner */}
      {!isConnected && (
        <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs flex items-center justify-center gap-2 shadow-md animate-pulse z-50">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{t('host_offline_banner')}</span>
        </div>
      )}

      {/* Top Header Bar with Horizontally Scrollable Action Bar */}
      <header className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Room Code Badge with Online status dot */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isConnected ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'
              }`}
            />
            <span className="font-mono font-bold text-xs text-amber-400 tracking-wider">
              {tableState.roomCode}
            </span>
          </div>

          {/* Current Blinds Indicator */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 shrink-0">
            <span className="text-[10px] text-slate-400 font-medium">Blinds:</span>
            <span className="font-mono font-bold text-amber-400">
              {tableState.smallBlind}/{tableState.bigBlind}
            </span>
          </div>
        </div>

        {/* Horizontally Scrollable Button Bar: works no matter how many buttons or how wide */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar flex-nowrap touch-pan-x py-0.5 max-w-full">
          {/* Reaction / Sticker Emote Button */}
          <button
            onClick={() => {
              sounds.playChipClick();
              setShowEmotePicker(true);
            }}
            title={t('table_reactions')}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition active:scale-95 shrink-0 whitespace-nowrap"
          >
            <Smile className="w-4 h-4 shrink-0" />
            <span>{t('react')}</span>
          </button>

          {/* Hand Rankings / Overview Button */}
          <button
            onClick={() => {
              sounds.playChipClick();
              setShowRankings(true);
            }}
            title={t('hand_rankings')}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold transition active:scale-95 shadow-sm shrink-0 whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>{t('hand_rankings')}</span>
          </button>

          {/* Hand History Action Log Button */}
          <button
            onClick={() => {
              sounds.playChipClick();
              setShowHistoryModal(true);
            }}
            title={t('action_log')}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold transition active:scale-95 shrink-0 whitespace-nowrap"
          >
            <History className="w-4 h-4 shrink-0" />
            <span>{t('action_log')}</span>
          </button>

          {/* Language Selector */}
          <div className="shrink-0">
            <LanguageSelector compact />
          </div>

          {/* Settings / Table Menu Button */}
          <button
            onClick={() => {
              sounds.playChipClick();
              setShowSettingsModal(true);
            }}
            title={t('settings')}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition active:scale-95 shrink-0"
          >
            <Settings className="w-4 h-4 shrink-0" />
          </button>

          {/* Direct Leave Table Button */}
          <button
            onClick={onLeaveTable}
            title={t('leave_table')}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition active:scale-95 shrink-0 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>{t('leave_table')}</span>
          </button>
        </div>
      </header>

      {/* Floating Action Toasts */}
      <ActionToast history={tableState.history} />

      {/* Emote Picker Modal */}
      <EmotePicker
        isOpen={showEmotePicker}
        onClose={() => setShowEmotePicker(false)}
        onSelectSticker={onSendEmote}
      />

      {/* Hand History Modal */}
      <HandHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={tableState.history}
      />

      {/* Hand Rankings Modal */}
      <HandRankingsModal
        isOpen={showRankings}
        onClose={() => setShowRankings(false)}
      />

      {/* Street Deal & Physical Dealer Instructions Banner */}
      <StreetAnnouncement
        street={tableState.street}
        cardsDealtForStreet={tableState.cardsDealtForStreet}
        isDealer={isDealer}
        dealerName={dealerName}
        handNumber={tableState.handNumber}
        onConfirmDealt={() => onAction({ type: 'CONFIRM_CARDS_DEALT' })}
      />

      {/* Center Table Area */}
      <main className="flex-1 flex flex-col items-center justify-center relative p-2 sm:p-4 max-w-4xl w-full mx-auto">
        <PokerTable
          tableState={tableState}
          myPlayerId={myPlayerId}
          activeEmotes={activeEmotes}
        />
      </main>

      {/* Showdown Modal */}
      {tableState.street === 'SHOWDOWN' && (
        <ShowdownModal
          tableState={tableState}
          isHost={false}
          onAwardPot={() => {}}
          onNextHand={() => {}}
        />
      )}

      {/* Bottom Action Area */}
      <footer className="w-full z-40">
        {isMyTurn && myPlayer && !myPlayer.folded && (
          <PlayerControls
            tableState={tableState}
            myPlayer={myPlayer}
            onAction={onAction}
            disabled={!isConnected}
          />
        )}

        {!isMyTurn && (
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 text-center backdrop-blur-md">
            {myPlayer?.folded ? (
              <span className="text-xs text-rose-400 font-semibold">
                {t('you_folded')}
              </span>
            ) : myPlayer?.isAllIn ? (
              <span className="text-xs text-amber-400 font-semibold animate-pulse">
                {t('you_all_in')}
              </span>
            ) : activePlayer ? (
              <span className="text-xs text-slate-300 font-medium">
                {t('waiting_on', { name: activePlayer.name })}
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                {t('waiting_next_hand')}
              </span>
            )}
          </div>
        )}
      </footer>

      {/* Table Settings & Menu Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{t('settings')}</h3>
                  <p className="text-[10px] text-slate-400">Table & Preferences</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Room & Share Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Room Code</span>
                <span className="font-mono text-base font-bold text-amber-400">{tableState.roomCode}</span>
              </div>
              <button
                onClick={handleCopyJoinLink}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            {/* Screen Awake Status */}
            <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Sun className="w-3.5 h-3.5" />
                {t('screen_awake')}
              </span>
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Active</span>
            </div>

            {/* Language Selector */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-slate-300 font-medium">Language</span>
              <LanguageSelector compact />
            </div>

            {/* Leave Table Button */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  onLeaveTable();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('leave_table')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
