import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Copy,
  Check,
  Tv,
  Smartphone,
  Play,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { generateRoomCode } from '../lib/p2p';
import { sounds } from '../lib/audio';
import { useTranslation } from '../lib/i18n';
import { LanguageSelector } from '../components/LanguageSelector';
import { getPlayerSession } from '../lib/storage';

interface LobbyViewProps {
  initialRoomCode?: string;
  onHostGame: (params: {
    roomCode: string;
    hostName: string;
    isHostPlaying: boolean;
    initialChips: number;
    smallBlind: number;
    bigBlind: number;
  }) => void;
  onJoinGame: (params: {
    roomCode: string;
    playerName: string;
    initialChips?: number;
  }) => void;
  error?: string | null;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  initialRoomCode,
  onHostGame,
  onJoinGame,
  error,
}) => {
  const { t } = useTranslation();
  const [savedPlayer] = useState(() => getPlayerSession());

  // Determine room code from prop or URL query parameter
  const getEffectiveRoomCode = () => {
    if (initialRoomCode) return initialRoomCode.trim().toUpperCase();
    if (typeof window !== 'undefined') {
      const room = new URLSearchParams(window.location.search).get('room');
      if (room) return room.trim().toUpperCase();
    }
    return '';
  };

  const initialCode = getEffectiveRoomCode();
  const hasInviteRoom = Boolean(initialCode);

  const [tab, setTab] = useState<'JOIN' | 'HOST'>(() => (hasInviteRoom ? 'JOIN' : 'HOST'));

  // Host form states
  const [hostRoomCode, setHostRoomCode] = useState(() => generateRoomCode());
  const [hostName, setHostName] = useState('Host Player');
  const [isHostPlaying, setIsHostPlaying] = useState(true);
  const [initialChips, setInitialChips] = useState('1000');
  const [smallBlind, setSmallBlind] = useState('5');
  const [bigBlind, setBigBlind] = useState('10');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Join form states
  const [joinRoomCode, setJoinRoomCode] = useState(() => initialCode || savedPlayer?.roomCode || '');
  const [playerName, setPlayerName] = useState(() => savedPlayer?.playerName || '');

  const nameInputRef = useRef<HTMLInputElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);

  // Auto-switch to JOIN tab and prefill room code whenever initialRoomCode or URL room changes
  useEffect(() => {
    const code = getEffectiveRoomCode();
    if (code) {
      setTab('JOIN');
      setJoinRoomCode(code);
    }
  }, [initialRoomCode]);

  // Auto-focus input when in JOIN mode
  useEffect(() => {
    if (tab === 'JOIN') {
      const timer = setTimeout(() => {
        if (joinRoomCode && !playerName) {
          nameInputRef.current?.focus();
        } else if (!joinRoomCode) {
          roomInputRef.current?.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [tab, joinRoomCode, playerName]);

  // Generate QR code for Host table
  useEffect(() => {
    if (tab === 'HOST') {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const joinUrl = `${origin}${pathname}?room=${hostRoomCode}`;

      QRCode.toDataURL(joinUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#f8fafc',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [hostRoomCode, tab]);

  const handleCopyLink = () => {
    sounds.playChipClick();
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const joinUrl = `${origin}${pathname}?room=${hostRoomCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playChipClick();
    onHostGame({
      roomCode: hostRoomCode,
      hostName: hostName.trim() || 'Host',
      isHostPlaying,
      initialChips: parseInt(initialChips, 10) || 1000,
      smallBlind: parseInt(smallBlind, 10) || 5,
      bigBlind: parseInt(bigBlind, 10) || 10,
    });
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playChipClick();
    if (!joinRoomCode.trim()) return;

    onJoinGame({
      roomCode: joinRoomCode.trim(),
      playerName: playerName.trim() || `Player-${Math.floor(100 + Math.random() * 900)}`,
      initialChips: parseInt(initialChips, 10) || 1000,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative">
      {/* Top Bar with Language Selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      <div className="max-w-md w-full flex flex-col gap-5 pt-8 sm:pt-0">
        {/* Branding Header */}
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shadow-xl shadow-amber-500/20 mb-3 animate-in zoom-in-75 duration-300">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <span className="text-2xl font-black bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                ♠
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-100">
            Pocket<span className="text-amber-400">Chips</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
            {t('tagline')}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Tab Switcher: HOST vs JOIN */}
        <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              sounds.playChipClick();
              setTab('JOIN');
            }}
            className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              tab === 'JOIN'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{t('join_game')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playChipClick();
              setTab('HOST');
            }}
            className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              tab === 'HOST'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>{t('host_game')}</span>
          </button>
        </div>

        {/* JOIN GAME PANEL */}
        {tab === 'JOIN' && (
          <form
            onSubmit={handleJoinSubmit}
            className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 backdrop-blur-md"
          >
            {/* Invite notification when visiting via room link or QR code */}
            {hasInviteRoom && joinRoomCode && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-xs text-slate-200">
                    {t('room_code')}: <span className="font-mono font-bold text-amber-400 tracking-wider">{joinRoomCode}</span>
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full">
                  Invited
                </span>
              </div>
            )}

            {/* Quick Rejoin Previous Table Button (if session was saved and not joining a different invited room) */}
            {savedPlayer && savedPlayer.roomCode && (!hasInviteRoom || savedPlayer.roomCode === joinRoomCode) && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                    {t('rejoin_last')}
                  </span>
                  <span className="text-xs text-slate-200 font-semibold truncate">
                    {savedPlayer.playerName} ({savedPlayer.roomCode})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playChipClick();
                    onJoinGame({
                      roomCode: savedPlayer.roomCode,
                      playerName: savedPlayer.playerName,
                    });
                  }}
                  className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow shrink-0 flex items-center gap-1 active:scale-95"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t('enter_table')}</span>
                </button>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {t('your_name')}
              </label>
              <input
                ref={nameInputRef}
                type="text"
                required
                placeholder={t('enter_name')}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 font-medium placeholder-slate-600 focus:border-amber-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {t('room_code')}
              </label>
              <input
                ref={roomInputRef}
                type="text"
                required
                maxLength={4}
                placeholder="e.g. K9QP"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-amber-400 font-mono font-bold tracking-widest text-center uppercase text-xl focus:border-amber-500 focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={!joinRoomCode.trim()}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-98 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{t('enter_table')}</span>
              <Play className="w-4 h-4 fill-slate-950" />
            </button>
          </form>
        )}

        {/* HOST GAME PANEL */}
        {tab === 'HOST' && (
          <form
            onSubmit={handleHostSubmit}
            className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 backdrop-blur-md"
          >
            {/* Room Code & Scannable QR Code */}
            <div className="flex flex-col items-center p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {t('scan_qr')}
              </span>

              {qrDataUrl && (
                <div className="p-2 bg-white rounded-xl shadow-md my-2">
                  <img src={qrDataUrl} alt="Room QR Code" className="w-36 h-36" />
                </div>
              )}

              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">{t('room_code')}:</span>
                <span className="text-2xl font-black font-mono tracking-widest text-amber-400">
                  {hostRoomCode}
                </span>
                <button
                  type="button"
                  title="Generate New Code"
                  onClick={() => {
                    sounds.playChipClick();
                    setHostRoomCode(generateRoomCode());
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="mt-3 inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('link_copied') : t('copy_link')}</span>
              </button>
            </div>

            {/* Host Playing Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <div className="text-xs font-bold text-slate-200">Play from Host Device?</div>
                <div className="text-[11px] text-slate-400">
                  {isHostPlaying
                    ? 'Host joins table as a player'
                    : 'Host is a dedicated TV display screen'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={isHostPlaying}
                onChange={(e) => setIsHostPlaying(e.target.checked)}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {isHostPlaying && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Host Player Name
                </label>
                <input
                  type="text"
                  placeholder={t('enter_name')}
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 font-medium placeholder-slate-600 focus:border-amber-500 focus:outline-none transition"
                />
              </div>
            )}

            {/* Chip Stacks & Stakes */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  {t('initial_chips')}
                </label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={initialChips}
                  onChange={(e) => setInitialChips(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  {t('small_blind')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={smallBlind}
                  onChange={(e) => setSmallBlind(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  {t('big_blind')}
                </label>
                <input
                  type="number"
                  min="2"
                  value={bigBlind}
                  onChange={(e) => setBigBlind(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-98 mt-2"
            >
              <span>{t('create_table')}</span>
              <Play className="w-4 h-4 fill-slate-950" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
