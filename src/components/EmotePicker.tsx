import React from 'react';
import { X, Smile } from 'lucide-react';
import { sounds } from '../lib/audio';
import { useTranslation, type Language } from '../lib/i18n';

export interface Sticker {
  id: string;
  symbol: string;
  name: string;
  shout: string;
}

const STICKER_SHOUTS: Record<Language, Record<string, { name: string; shout: string }>> = {
  en: {
    laugh: { name: 'Laugh', shout: 'Hahaha!' },
    cry: { name: 'Cry', shout: 'Bad beat!' },
    shark: { name: 'Shark', shout: 'Swimming with sharks!' },
    clown: { name: 'Clown', shout: 'Nice bluff!' },
    chicken: { name: 'Chicken', shout: 'Too scared to call?' },
    money: { name: 'Money', shout: 'Pay me my chips!' },
    fire: { name: 'On Fire', shout: 'Hot streak!' },
    crown: { name: 'King', shout: 'Bow to the King!' },
    shock: { name: 'Shock', shout: 'Mind blown!' },
    cool: { name: 'Poker Face', shout: 'Stone cold.' },
    popcorn: { name: 'Popcorn', shout: 'Grabbing popcorn...' },
    rocket: { name: 'All-In', shout: 'To the moon!' },
  },
  de: {
    laugh: { name: 'Lachen', shout: 'Hahaha!' },
    cry: { name: 'Weinen', shout: 'Was für ein Bad Beat!' },
    shark: { name: 'Hai', shout: 'Haifischbecken!' },
    clown: { name: 'Clown', shout: 'Netter Bluff!' },
    chicken: { name: 'Huhn', shout: 'Zu feige zum Mitgehen?' },
    money: { name: 'Geld', shout: 'Her mit den Chips!' },
    fire: { name: 'Feuer', shout: 'Heißer Lauf!' },
    crown: { name: 'König', shout: 'Kniet vor dem König!' },
    shock: { name: 'Schock', shout: 'Nicht dein Ernst!' },
    cool: { name: 'Cool', shout: 'Eiskaltes Pokerface.' },
    popcorn: { name: 'Popcorn', shout: 'Ich hol Popcorn...' },
    rocket: { name: 'All-In', shout: 'Ab geht die Rakete!' },
  },
  es: {
    laugh: { name: 'Risa', shout: '¡Jajaja!' },
    cry: { name: 'Lloro', shout: '¡Qué mala racha!' },
    shark: { name: 'Tiburón', shout: '¡Aguas con los tiburones!' },
    clown: { name: 'Payaso', shout: '¡Vaya farol!' },
    chicken: { name: 'Gallina', shout: '¿Miedo de igualar?' },
    money: { name: 'Dinero', shout: '¡Págame mis fichas!' },
    fire: { name: 'Fuego', shout: '¡En racha ardiente!' },
    crown: { name: 'Rey', shout: '¡Inclinaos ante el Rey!' },
    shock: { name: 'Sorpresa', shout: '¡No me lo creo!' },
    cool: { name: 'Frío', shout: 'Cara de póquer.' },
    popcorn: { name: 'Palomitas', shout: 'Voy por palomitas...' },
    rocket: { name: 'Tapis', shout: '¡Hasta la luna!' },
  },
  fr: {
    laugh: { name: 'Rire', shout: 'Hahaha !' },
    cry: { name: 'Pleurs', shout: 'Quel bad beat !' },
    shark: { name: 'Requin', shout: 'Bassin aux requins !' },
    clown: { name: 'Clown', shout: 'Joli bluff !' },
    chicken: { name: 'Poule', shout: 'Peur de suivre ?' },
    money: { name: 'Jetons', shout: 'Donnez-moi mes jetons !' },
    fire: { name: 'En Feu', shout: 'Série gagnante !' },
    crown: { name: 'Roi', shout: 'Prosternez-vous !' },
    shock: { name: 'Choc', shout: 'Incroyable !' },
    cool: { name: 'Zen', shout: 'Poker face de marbre.' },
    popcorn: { name: 'Popcorn', shout: 'Je prends les popcorns...' },
    rocket: { name: 'Tapis', shout: 'Vers l\'infini !' },
  },
  pirate: {
    laugh: { name: 'Guffaw', shout: 'Gwahahaha, matey!' },
    cry: { name: 'Lament', shout: 'Curse Davy Jones!' },
    shark: { name: 'Megashark', shout: 'Swimming with sharks!' },
    clown: { name: 'Fool', shout: 'Nice bluff, scallywag!' },
    chicken: { name: 'Chicken', shout: 'Too yellow to call?' },
    money: { name: 'Doubloons', shout: 'Hand over the doubloons!' },
    fire: { name: 'Cannons', shout: 'Broadside cannons fired!' },
    crown: { name: 'Cap\'n', shout: 'Bow to the Captain!' },
    shock: { name: 'Kraken', shout: 'Shiver me timbers!' },
    cool: { name: 'Stone Cold', shout: 'Cold as sea foam.' },
    popcorn: { name: 'Grog', shout: 'Pour the grog!' },
    rocket: { name: 'Full Sail', shout: 'Full sail to the treasure!' },
  },
  klingon: {
    laugh: { name: 'Hahaha', shout: 'Hahaha! batlh!' },
    cry: { name: 'Qapbe\'', shout: 'Qapbe\'! Qugh!' },
    shark: { name: 'ghotI\'', shout: 'ghotI\' veS!' },
    clown: { name: 'veqlargh', shout: 'veqlargh! Bluff!' },
    chicken: { name: 'ToH', shout: 'bItaHbe\'! Call?' },
    money: { name: 'Darghmey', shout: 'Darghmey HInob!' },
    fire: { name: 'Qob', shout: 'Qob! Fire!' },
    crown: { name: 'HoD', shout: "HoDvaD yI'a'!" },
    shock: { name: "Qu'vatlh", shout: "Qu'vatlh! Mind blown!" },
    cool: { name: 'pegh', shout: 'pegh. Stone cold.' },
    popcorn: { name: 'tiq', shout: 'tiq ghob loS...' },
    rocket: { name: 'Qapla\'', shout: 'Qapla\'! All-in!' },
  },
};

const BASE_STICKERS = [
  { id: 'laugh', symbol: '😂' },
  { id: 'cry', symbol: '😭' },
  { id: 'shark', symbol: '🦈' },
  { id: 'clown', symbol: '🤡' },
  { id: 'chicken', symbol: '🍗' },
  { id: 'money', symbol: '🤑' },
  { id: 'fire', symbol: '🔥' },
  { id: 'crown', symbol: '👑' },
  { id: 'shock', symbol: '🤯' },
  { id: 'cool', symbol: '🕶️' },
  { id: 'popcorn', symbol: '🍿' },
  { id: 'rocket', symbol: '🚀' },
];

interface EmotePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (sticker: Sticker) => void;
}

export const EmotePicker: React.FC<EmotePickerProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
}) => {
  const { lang, t } = useTranslation();

  if (!isOpen) return null;

  const currentPack = STICKER_SHOUTS[lang] || STICKER_SHOUTS.en;
  const stickerList: Sticker[] = BASE_STICKERS.map((s) => ({
    id: s.id,
    symbol: s.symbol,
    name: currentPack[s.id]?.name || s.id,
    shout: currentPack[s.id]?.shout || '!',
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-sm w-full p-4 shadow-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Smile className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{t('table_reactions')}</h3>
              <p className="text-[10px] text-slate-400">Tap to react to the table</p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playChipClick();
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticker Grid */}
        <div className="grid grid-cols-4 gap-2 py-1">
          {stickerList.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => {
                onSelectSticker(sticker);
                onClose();
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 active:scale-90 transition group shadow"
            >
              <span className="text-3xl filter drop-shadow group-hover:scale-110 transition-transform">
                {sticker.symbol}
              </span>
              <span className="text-[10px] font-bold text-slate-300 mt-1 truncate max-w-full">
                {sticker.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
