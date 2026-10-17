import React from 'react';
import { X, Sparkles, BookOpen } from 'lucide-react';
import { sounds } from '../lib/audio';
import { useTranslation } from '../lib/i18n';

interface HandRankingItem {
  rank: number;
  name: string;
  cards: { rank: string; suit: '♠' | '♥' | '♦' | '♣'; red?: boolean }[];
  description: string;
  tieBreaker: string;
}

const HAND_RANKINGS: HandRankingItem[] = [
  {
    rank: 1,
    name: 'Royal Flush',
    cards: [
      { rank: 'A', suit: '♠' },
      { rank: 'K', suit: '♠' },
      { rank: 'Q', suit: '♠' },
      { rank: 'J', suit: '♠' },
      { rank: '10', suit: '♠' },
    ],
    description: 'A, K, Q, J, 10 all in the same suit.',
    tieBreaker: 'The best possible hand in poker. Cannot be beaten.',
  },
  {
    rank: 2,
    name: 'Straight Flush',
    cards: [
      { rank: '9', suit: '♥', red: true },
      { rank: '8', suit: '♥', red: true },
      { rank: '7', suit: '♥', red: true },
      { rank: '6', suit: '♥', red: true },
      { rank: '5', suit: '♥', red: true },
    ],
    description: 'Five consecutive cards of the same suit.',
    tieBreaker: 'Higher card at the top of the sequence wins.',
  },
  {
    rank: 3,
    name: 'Four of a Kind',
    cards: [
      { rank: 'Q', suit: '♠' },
      { rank: 'Q', suit: '♥', red: true },
      { rank: 'Q', suit: '♦', red: true },
      { rank: 'Q', suit: '♣' },
      { rank: '4', suit: '♦', red: true },
    ],
    description: 'Four cards of the same numerical rank.',
    tieBreaker: 'Higher four of a kind wins. Higher kicker breaks ties.',
  },
  {
    rank: 4,
    name: 'Full House',
    cards: [
      { rank: 'J', suit: '♠' },
      { rank: 'J', suit: '♥', red: true },
      { rank: 'J', suit: '♣' },
      { rank: '8', suit: '♦', red: true },
      { rank: '8', suit: '♠' },
    ],
    description: 'Three of a kind plus a pair.',
    tieBreaker: 'Higher three of a kind wins, then higher pair.',
  },
  {
    rank: 5,
    name: 'Flush',
    cards: [
      { rank: 'K', suit: '♦', red: true },
      { rank: '10', suit: '♦', red: true },
      { rank: '7', suit: '♦', red: true },
      { rank: '6', suit: '♦', red: true },
      { rank: '2', suit: '♦', red: true },
    ],
    description: 'Any five cards of the same suit, not consecutive.',
    tieBreaker: 'Highest card wins; compares subsequent cards if tied.',
  },
  {
    rank: 6,
    name: 'Straight',
    cards: [
      { rank: '8', suit: '♠' },
      { rank: '7', suit: '♦', red: true },
      { rank: '6', suit: '♥', red: true },
      { rank: '5', suit: '♣' },
      { rank: '4', suit: '♠' },
    ],
    description: 'Five consecutive cards of different suits.',
    tieBreaker: 'Higher card at top of straight wins. (A-2-3-4-5 is lowest).',
  },
  {
    rank: 7,
    name: 'Three of a Kind',
    cards: [
      { rank: '7', suit: '♠' },
      { rank: '7', suit: '♥', red: true },
      { rank: '7', suit: '♦', red: true },
      { rank: 'K', suit: '♣' },
      { rank: '2', suit: '♠' },
    ],
    description: 'Three cards of the same numerical rank.',
    tieBreaker: 'Higher 3-of-a-kind wins; then highest kicker card.',
  },
  {
    rank: 8,
    name: 'Two Pair',
    cards: [
      { rank: '10', suit: '♠' },
      { rank: '10', suit: '♦', red: true },
      { rank: '4', suit: '♣' },
      { rank: '4', suit: '♥', red: true },
      { rank: 'A', suit: '♠' },
    ],
    description: 'Two different pairs of cards.',
    tieBreaker: 'Higher top pair wins, then second pair, then kicker.',
  },
  {
    rank: 9,
    name: 'One Pair',
    cards: [
      { rank: '9', suit: '♥', red: true },
      { rank: '9', suit: '♠' },
      { rank: 'A', suit: '♦', red: true },
      { rank: 'J', suit: '♣' },
      { rank: '4', suit: '♠' },
    ],
    description: 'Two cards of matching rank.',
    tieBreaker: 'Higher pair wins; then highest kickers in descending order.',
  },
  {
    rank: 10,
    name: 'High Card',
    cards: [
      { rank: 'A', suit: '♦', red: true },
      { rank: 'K', suit: '♠' },
      { rank: '9', suit: '♥', red: true },
      { rank: '5', suit: '♣' },
      { rank: '2', suit: '♠' },
    ],
    description: 'No matching cards or combinations.',
    tieBreaker: 'Highest card plays; compare 2nd, 3rd, 4th, 5th if tied.',
  },
];

interface HandRankingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HandRankingsModal: React.FC<HandRankingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <span>{t('hand_rankings_title')}</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {t('hand_rankings_sub')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playChipClick();
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Hand List */}
        <div className="p-3 sm:p-4 overflow-y-auto flex flex-col gap-2.5">
          {HAND_RANKINGS.map((item) => (
            <div
              key={item.rank}
              className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 flex flex-col gap-2 transition hover:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black font-mono shadow ${
                      item.rank === 1
                        ? 'bg-amber-400 text-slate-950'
                        : item.rank <= 3
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    #{item.rank}
                  </span>
                  <span className="font-bold text-sm text-slate-100">
                    {item.name}
                  </span>
                </div>

                {item.rank === 1 && (
                  <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                    <Sparkles className="w-3 h-3" />
                    Unbeatable
                  </span>
                )}
              </div>

              {/* Visual Mini Playing Cards */}
              <div className="flex items-center gap-1.5 py-0.5">
                {item.cards.map((c, idx) => (
                  <div
                    key={idx}
                    className={`h-11 w-8 sm:h-12 sm:w-9 rounded-lg bg-white border border-slate-300 shadow flex flex-col items-center justify-between p-1 font-bold select-none ${
                      c.red ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    <span className="text-xs leading-none self-start font-mono font-black">
                      {c.rank}
                    </span>
                    <span className="text-sm leading-none">{c.suit}</span>
                  </div>
                ))}
              </div>

              <div className="text-xs text-slate-300">
                {item.description}{' '}
                <span className="text-slate-500 text-[11px]">({item.tieBreaker})</span>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
          <button
            onClick={() => {
              sounds.playChipClick();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-98"
          >
            Close Cheat Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
