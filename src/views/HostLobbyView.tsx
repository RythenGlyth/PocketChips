import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Users,
  Copy,
  Check,
  Play,
  ChevronUp,
  ChevronDown,
  UserX,
  LogOut,
  Sparkles,
} from 'lucide-react';
import type { TableState } from '../lib/engine/poker';
import { sounds } from '../lib/audio';
import { useTranslation } from '../lib/i18n';
import { LanguageSelector } from '../components/LanguageSelector';
import { wakeLock } from '../lib/wakelock';

interface HostLobbyViewProps {
  tableState: TableState;
  onStartGame: () => void;
  onMovePlayer: (fromIndex: number, toIndex: number) => void;
  onKickPlayer: (playerId: string) => void;
  onCloseLobby: () => void;
}

export const HostLobbyView: React.FC<HostLobbyViewProps> = ({
  tableState,
  onStartGame,
  onMovePlayer,
  onKickPlayer,
  onCloseLobby,
}) => {
  const { t } = useTranslation();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    wakeLock.request();
    return () => {
      wakeLock.release();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const joinUrl = `${window.location.origin}${window.location.pathname}?room=${tableState.roomCode}`;
      QRCode.toDataURL(joinUrl, {
        width: 256,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [tableState.roomCode]);

  const handleCopyLink = () => {
    sounds.playChipClick();
    const joinUrl = `${window.location.origin}${window.location.pathname}?room=${tableState.roomCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const eligiblePlayers = tableState.players.filter(
    (p) => !p.sittingOut && p.chips > 0
  );
  const canStart = eligiblePlayers.length >= 2;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 safe-area-inset">
      {/* Top Header */}
      <header className="flex items-center justify-between max-w-2xl w-full mx-auto pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <img
            src="./poker-chip.svg"
            alt="PocketChips"
            className="w-8 h-8 filter drop-shadow shrink-0"
          />
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-100">
              Host Waiting Lobby
            </h1>
            <p className="text-[11px] text-slate-400">Waiting for players to join...</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector compact />
          <button
            onClick={onCloseLobby}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('leave_table')}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl w-full mx-auto my-auto flex flex-col gap-6 py-4">
        {/* Room Code & QR Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center gap-6">
          {/* QR Code Container */}
          <div className="flex flex-col items-center">
            {qrDataUrl && (
              <div className="p-2.5 bg-white rounded-2xl shadow-xl">
                <img src={qrDataUrl} alt="Room QR Code" className="w-40 h-40" />
              </div>
            )}
            <span className="text-[10px] text-slate-400 mt-1.5 font-medium">
              Scan with phone camera
            </span>
          </div>

          {/* Room Code and Share Details */}
          <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Share this Room Code
            </div>

            <div>
              <div className="font-mono text-4xl sm:text-5xl font-black text-amber-400 tracking-widest">
                {tableState.roomCode}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Players go to PocketChips and enter this code, or scan the QR code.
              </p>
            </div>

            <button
              onClick={handleCopyLink}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2 shadow active:scale-95 border border-slate-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Direct Link Copied!' : 'Copy Direct Join Link'}</span>
            </button>

            {isLocalhost && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] leading-relaxed">
                <span className="font-bold">⚠️ Hosting on localhost:</span> For phones to scan this QR code, open this site using your laptop's Wi-Fi IP (e.g. <span className="font-mono">http://192.168.x.x:5173</span>) or have them enter room code <span className="font-mono font-bold">{tableState.roomCode}</span> on their browser.
              </div>
            )}
          </div>
        </div>

        {/* Players Seating List */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-100">
                Connected Players ({tableState.players.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Blinds: {tableState.smallBlind}/{tableState.bigBlind}
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Arrange players using the arrows so their order matches physical seating around your table.
          </p>

          {tableState.players.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-dashed border-slate-800">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
              <div className="text-sm font-semibold text-slate-300">No players yet</div>
              <div className="text-xs text-slate-500 mt-1">
                Tell players to join room <strong className="text-amber-400">{tableState.roomCode}</strong>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {tableState.players.map((p, index) => (
                <div
                  key={p.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-2xl p-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    {/* Steppers */}
                    <div className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          sounds.playChipClick();
                          onMovePlayer(index, index - 1);
                        }}
                        className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-20 transition"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono font-bold text-amber-400 px-1">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={index === tableState.players.length - 1}
                        onClick={() => {
                          sounds.playChipClick();
                          onMovePlayer(index, index + 1);
                        }}
                        className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-20 transition"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        {p.name}
                        {index === tableState.dealerIndex && (
                          <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 rounded-full">
                            Dealer (Button)
                          </span>
                        )}
                        {!p.connected && (
                          <span className="text-[9px] text-rose-400 bg-rose-400/10 px-1.5 rounded border border-rose-400/20">
                            Disconnected
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-amber-400 font-mono">
                        ${p.chips} Chips
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onKickPlayer(p.id)}
                    title="Remove Player"
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Start Game Bar */}
      <footer className="max-w-2xl w-full mx-auto pt-2">
        <button
          disabled={!canStart}
          onClick={() => {
            sounds.playWin();
            onStartGame();
          }}
          className={`w-full py-4 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 transition shadow-2xl ${
            canStart
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25 active:scale-98 cursor-pointer'
              : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          <span>
            {canStart
              ? `Start Game with ${eligiblePlayers.length} Players (Deal Hand #1)`
              : 'Waiting for at least 2 players to join...'}
          </span>
        </button>
      </footer>
    </div>
  );
};
