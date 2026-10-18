import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Users,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  BookOpen,
  Smile,
  History,
  Sun,
} from 'lucide-react';
import type { TableState, PlayerAction } from '../lib/engine/poker';
import { PokerTable } from '../components/PokerTable';
import { BlindTimer } from '../components/BlindTimer';
import { HostControls } from '../components/HostControls';
import { ShowdownModal } from '../components/ShowdownModal';
import { PlayerControls } from '../components/PlayerControls';
import { StreetAnnouncement } from '../components/StreetAnnouncement';
import { HandRankingsModal } from '../components/HandRankingsModal';
import { EmotePicker, type Sticker } from '../components/EmotePicker';
import { HandHistoryModal } from '../components/HandHistoryModal';
import { ActionToast } from '../components/ActionToast';
import { LanguageSelector } from '../components/LanguageSelector';
import { sounds } from '../lib/audio';
import { useTranslation } from '../lib/i18n';
import { wakeLock } from '../lib/wakelock';

interface TableViewProps {
  tableState: TableState;
  hostPlayerId?: string;
  isHostPlaying: boolean;
  onStartHand: () => void;
  onPlayerAction: (playerId: string, action: PlayerAction) => void;
  onAwardPot: (potIndex: number, winnerIds: string[]) => void;
  onUndo: () => void;
  onRebuy: (playerId: string, amount: number) => void;
  onForceFold: (playerId: string) => void;
  onKickPlayer: (playerId: string) => void;
  onToggleSitOut: (playerId: string) => void;
  onUpdateBlinds: (small: number, big: number) => void;
  onMovePlayer: (fromIndex: number, toIndex: number) => void;
  onCloseTable: () => void;
  activeEmotes?: Record<string, { symbol: string; shout: string }>;
  onSendEmote?: (sticker: Sticker) => void;
}

export const TableView: React.FC<TableViewProps> = ({
  tableState,
  hostPlayerId,
  isHostPlaying,
  onStartHand,
  onPlayerAction,
  onAwardPot,
  onUndo,
  onRebuy,
  onForceFold,
  onKickPlayer,
  onToggleSitOut,
  onUpdateBlinds,
  onMovePlayer,
  onCloseTable,
  activeEmotes,
  onSendEmote,
}) => {
  const { t } = useTranslation();
  const [showQR, setShowQR] = useState(false);
  const [showRankings, setShowRankings] = useState(false);
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Keep screen awake while host table is running
  useEffect(() => {
    wakeLock.request();
    return () => {
      wakeLock.release();
    };
  }, []);

  // Generate QR code for Room Join link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const joinUrl = `${window.location.origin}${window.location.pathname}?room=${tableState.roomCode}`;
      QRCode.toDataURL(joinUrl, {
        width: 256,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      }).then(setQrDataUrl);
    }
  }, [tableState.roomCode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleCopyLink = () => {
    sounds.playChipClick();
    const joinUrl = `${window.location.origin}${window.location.pathname}?room=${tableState.roomCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hostPlayer = hostPlayerId
    ? tableState.players.find((p) => p.id === hostPlayerId)
    : undefined;

  const isHostTurn =
    isHostPlaying &&
    hostPlayer &&
    tableState.street !== 'SHOWDOWN' &&
    tableState.activePlayerIndex >= 0 &&
    tableState.players[tableState.activePlayerIndex]?.id === hostPlayerId;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden safe-area-inset">
      {/* Top TV/Host Bar */}
      <header className="p-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 z-30">
        <div className="flex items-center gap-2">
          <img
            src="./poker-chip.svg"
            alt="PocketChips"
            className="w-7 h-7 filter drop-shadow shrink-0 hidden sm:block"
          />
          {/* Room Code Badge */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">{t('room_code')}:</span>
            <span className="font-mono font-black text-sm text-amber-400 tracking-wider">
              {tableState.roomCode}
            </span>
          </div>

          {/* QR Code toggle */}
          <button
            onClick={() => setShowQR(!showQR)}
            className="flex items-center gap-1.5 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition active:scale-95"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            <span>Join QR</span>
          </button>

          {/* Connected Players Count */}
          <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('players', { count: tableState.players.length })}</span>
          </div>

          {/* Screen Awake Indicator */}
          <div
            title="Screen Wake Lock is active to prevent device sleeping"
            className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-medium"
          >
            <Sun className="w-3 h-3 text-emerald-400" />
            <span>{t('screen_awake')}</span>
          </div>
        </div>

        {/* Center / Right Quick Bar - Horizontally scrollable */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar flex-nowrap touch-pan-x py-0.5 max-w-full">
          {/* Reaction / Sticker Emote Button */}
          {onSendEmote && (
            <button
              onClick={() => {
                sounds.playChipClick();
                setShowEmotePicker(true);
              }}
              title={t('table_reactions')}
              className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-xl transition active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Smile className="w-3.5 h-3.5 shrink-0" />
              <span>{t('react')}</span>
            </button>
          )}

          {/* Hand History Action Log Button */}
          <button
            onClick={() => {
              sounds.playChipClick();
              setShowHistoryModal(true);
            }}
            title={t('action_log')}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold rounded-xl transition active:scale-95 shrink-0 whitespace-nowrap"
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            <span>{t('action_log')}</span>
          </button>

          {/* Hand Rankings Cheat Sheet */}
          <button
            onClick={() => {
              sounds.playChipClick();
              setShowRankings(true);
            }}
            title={t('hand_rankings')}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold rounded-xl transition active:scale-95 shrink-0 whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>{t('hand_rankings')}</span>
          </button>

          {/* Language Selector */}
          <div className="shrink-0">
            <LanguageSelector compact />
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700 shrink-0"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 shrink-0" /> : <Maximize2 className="w-4 h-4 shrink-0" />}
          </button>

          {/* Close Table */}
          <button
            onClick={onCloseTable}
            title={t('close_table')}
            className="py-1 px-2.5 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-500/30 text-xs font-semibold hover:bg-rose-600/30 transition shrink-0 whitespace-nowrap"
          >
            {t('close_table')}
          </button>
        </div>
      </header>

      {/* Floating Action Toasts */}
      <ActionToast history={tableState.history} />

      {/* Emote Picker Modal */}
      {onSendEmote && (
        <EmotePicker
          isOpen={showEmotePicker}
          onClose={() => setShowEmotePicker(false)}
          onSelectSticker={onSendEmote}
        />
      )}

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

      {/* QR Code Modal Overlay */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl flex flex-col items-center gap-3">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              {t('scan_qr')}
            </h3>
            {qrDataUrl && (
              <div className="p-2 bg-white rounded-2xl shadow-lg my-1">
                <img src={qrDataUrl} alt="Room QR" className="w-48 h-48" />
              </div>
            )}
            <div className="font-mono text-2xl font-black text-amber-400 tracking-widest">
              {tableState.roomCode}
            </div>
            <button
              onClick={handleCopyLink}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? t('link_copied') : t('copy_link')}</span>
            </button>
            {isLocalhost && (
              <p className="text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl text-left">
                <strong>Localhost Notice:</strong> When hosting on localhost, other devices must join using your laptop's Wi-Fi IP or by entering room code <strong>{tableState.roomCode}</strong>.
              </p>
            )}
            <button
              onClick={() => setShowQR(false)}
              className="text-xs text-slate-400 hover:text-slate-200 mt-1"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}

      {/* Street Deal & Physical Dealer Instructions Banner */}
      <StreetAnnouncement
        street={tableState.street}
        cardsDealtForStreet={tableState.cardsDealtForStreet}
        isDealer={isHostPlaying && hostPlayerId === tableState.players[tableState.dealerIndex]?.id}
        dealerName={tableState.players[tableState.dealerIndex]?.name}
        handNumber={tableState.handNumber}
        onConfirmDealt={() =>
          onPlayerAction(
            tableState.players[tableState.dealerIndex]?.id || hostPlayerId || 'host',
            { type: 'CONFIRM_CARDS_DEALT' }
          )
        }
      />

      {/* Main Table Screen Area */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-2 sm:p-4 gap-4 max-w-7xl w-full mx-auto">
        {/* Left Side: Blind Timer & Table Quick Stats */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-3">
          <BlindTimer
            currentSmallBlind={tableState.smallBlind}
            currentBigBlind={tableState.bigBlind}
            onBlindsChange={onUpdateBlinds}
            isHost={true}
          />

          {/* Quick Hand Info Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>{t('hand_number', { number: tableState.handNumber })}</span>
              <strong className="text-slate-100 font-mono">#{tableState.handNumber}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Street</span>
              <strong className="text-emerald-400 uppercase font-bold">{tableState.street}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>{t('min_raise')}</span>
              <strong className="text-amber-400 font-mono">${tableState.minRaise}</strong>
            </div>
          </div>
        </div>

        {/* Center: Interactive Poker Table */}
        <div className="flex-1 w-full flex items-center justify-center">
          <PokerTable
            tableState={tableState}
            myPlayerId={hostPlayerId}
            activeEmotes={activeEmotes}
          />
        </div>
      </main>

      {/* Showdown Modal */}
      {tableState.street === 'SHOWDOWN' && (
        <ShowdownModal
          tableState={tableState}
          isHost={true}
          onAwardPot={onAwardPot}
          onNextHand={onStartHand}
        />
      )}

      {/* Bottom Host Controls & Optional Player Action Drawer */}
      <footer className="w-full z-40 p-2 max-w-4xl mx-auto flex flex-col gap-2">
        {/* If Host is playing and it's their turn */}
        {isHostTurn && hostPlayer && (
          <PlayerControls
            tableState={tableState}
            myPlayer={hostPlayer}
            onAction={(action) => onPlayerAction(hostPlayer.id, action)}
          />
        )}

        {/* Host Operations Bar */}
        <HostControls
          tableState={tableState}
          onStartHand={onStartHand}
          onUndo={onUndo}
          onRebuy={onRebuy}
          onForceFold={onForceFold}
          onKickPlayer={onKickPlayer}
          onToggleSitOut={onToggleSitOut}
          onUpdateBlinds={onUpdateBlinds}
          onMovePlayer={onMovePlayer}
        />
      </footer>
    </div>
  );
};
