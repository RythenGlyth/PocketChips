import React, { useState, useEffect } from 'react';
import { Layers, CheckCircle2, Crown, Sparkles, X } from 'lucide-react';
import type { Street } from '../lib/engine/poker';
import { sounds } from '../lib/audio';
import { useTranslation } from '../lib/i18n';

interface StreetAnnouncementProps {
  street: Street;
  cardsDealtForStreet?: Street;
  isDealer: boolean;
  dealerName?: string;
  handNumber: number;
  onConfirmDealt?: () => void;
}

export const StreetAnnouncement: React.FC<StreetAnnouncementProps> = ({
  street,
  cardsDealtForStreet,
  isDealer,
  dealerName,
  handNumber,
  onConfirmDealt,
}) => {
  const { t } = useTranslation();
  const [lastAnnouncedStreet, setLastAnnouncedStreet] = useState<string>('');
  const [showBanner, setShowBanner] = useState<boolean>(false);

  const getDealerInstruction = (s: Street): string => {
    switch (s) {
      case 'PREFLOP':
        return t('dealer_deal_preflop', { name: dealerName || 'Dealer' });
      case 'FLOP':
        return t('dealer_deal_flop', { name: dealerName || 'Dealer' });
      case 'TURN':
        return t('dealer_deal_turn', { name: dealerName || 'Dealer' });
      case 'RIVER':
        return t('dealer_deal_river', { name: dealerName || 'Dealer' });
      default:
        return 'Compare cards and determine winner.';
    }
  };

  const streetTitle = (() => {
    switch (street) {
      case 'PREFLOP': return t('preflop');
      case 'FLOP': return t('flop');
      case 'TURN': return t('turn');
      case 'RIVER': return t('river');
      case 'SHOWDOWN': return t('showdown');
    }
  })();

  const dealerInstructionText = getDealerInstruction(street);

  // When a new street starts, show the banner and play street dealing sound
  useEffect(() => {
    if (handNumber > 0 && street && street !== lastAnnouncedStreet) {
      setLastAnnouncedStreet(street);
      // Only show if not already confirmed dealt
      if (cardsDealtForStreet !== street) {
        setShowBanner(true);
        sounds.playStreetDeal();
      }
    }
  }, [street, handNumber, lastAnnouncedStreet, cardsDealtForStreet]);

  // When cards are confirmed dealt by the dealer, dismiss banner for everyone table-wide!
  useEffect(() => {
    if (cardsDealtForStreet === street) {
      setShowBanner(false);
    }
  }, [cardsDealtForStreet, street]);

  if (!showBanner) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-3 animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`rounded-2xl border p-3.5 shadow-2xl backdrop-blur-xl flex flex-col gap-2 ${
          isDealer
            ? 'bg-amber-950/95 border-amber-500/80 ring-2 ring-amber-400/30'
            : 'bg-slate-900/95 border-emerald-500/50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                isDealer
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <Layers className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-slate-100 uppercase tracking-wide">
                  {streetTitle}
                </span>
                <span className="text-[10px] bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800 text-amber-300 font-mono font-bold">
                  {street}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowBanner(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dealer Instruction Box */}
        <div
          className={`rounded-xl p-2.5 text-xs flex items-start gap-2 ${
            isDealer
              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-100'
              : 'bg-slate-950/80 border border-slate-800 text-slate-300'
          }`}
        >
          {isDealer ? (
            <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}

          <div className="flex-1">
            {isDealer ? (
              <div>
                <strong className="text-amber-400 uppercase tracking-wider block text-[11px] mb-0.5">
                  👉 {t('dealer_badge')} INSTRUCTION
                </strong>
                <span>{dealerInstructionText}</span>
              </div>
            ) : (
              <div>
                <span className="text-slate-400 block text-[11px]">
                  Dealer: <strong className="text-slate-200">{dealerName || 'Button'}</strong>
                </span>
                <span>{dealerInstructionText}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => {
            sounds.playChipClick();
            setShowBanner(false);
            if (isDealer && onConfirmDealt) {
              onConfirmDealt();
            }
          }}
          className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-98 ${
            isDealer
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>
            {isDealer ? t('confirm_dealt') : t('close')}
          </span>
        </button>
      </div>
    </div>
  );
};

