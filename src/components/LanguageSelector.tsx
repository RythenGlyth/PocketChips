import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation, type Language } from '../lib/i18n';
import { sounds } from '../lib/audio';

interface LanguageSelectorProps {
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact = false }) => {
  const { lang, setLanguage, languages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = languages.find((l) => l.code === lang) || languages[0];

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rightDist = Math.max(8, window.innerWidth - rect.right);
      const topDist = Math.min(rect.bottom + 6, window.innerHeight - 280);
      setCoords({
        top: Math.max(8, topDist),
        right: rightDist,
      });
    }
  };

  const handleToggle = () => {
    sounds.playChipClick();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (isOpen) {
        updatePosition();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handleSelect = (code: Language) => {
    sounds.playChipClick();
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1.5 rounded-xl border transition active:scale-95 shrink-0 whitespace-nowrap ${
          compact
            ? 'py-1 px-2 text-xs bg-slate-900 border-slate-700/80 hover:bg-slate-800 text-slate-200'
            : 'py-1.5 px-3 text-xs font-semibold bg-slate-900/90 border-slate-700 hover:bg-slate-800 text-slate-100 shadow-md backdrop-blur-md'
        }`}
        title="Select Language / Sprache wählen"
      >
        <span className="text-sm shrink-0 leading-none">{currentOption.flag}</span>
        {!compact && <span className="font-medium text-slate-200">{currentOption.name}</span>}
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
      </button>

      {isOpen && coords && (
        <div
          ref={dropdownRef}
          style={{ top: `${coords.top}px`, right: `${coords.right}px` }}
          className="fixed w-48 rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 flex items-center gap-1.5">
            <Globe className="w-3 h-3" />
            <span>Choose Language</span>
          </div>
          <div className="py-1 max-h-60 overflow-y-auto">
            {languages.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelect(item.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition hover:bg-slate-800/80 ${
                  item.code === lang
                    ? 'text-amber-400 font-bold bg-amber-500/10'
                    : 'text-slate-200 font-normal'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{item.flag}</span>
                  <span>{item.name}</span>
                </div>
                {item.code === lang && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
