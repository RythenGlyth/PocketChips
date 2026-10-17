import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, FastForward, Volume2, VolumeX } from 'lucide-react';
import { sounds } from '../lib/audio';

interface BlindLevel {
  small: number;
  big: number;
}

const DEFAULT_BLIND_SCHEDULE: BlindLevel[] = [
  { small: 5, big: 10 },
  { small: 10, big: 20 },
  { small: 15, big: 30 },
  { small: 25, big: 50 },
  { small: 50, big: 100 },
  { small: 75, big: 150 },
  { small: 100, big: 200 },
  { small: 150, big: 300 },
  { small: 200, big: 400 },
  { small: 300, big: 600 },
  { small: 500, big: 1000 },
];

interface BlindTimerProps {
  currentSmallBlind: number;
  currentBigBlind: number;
  onBlindsChange: (small: number, big: number) => void;
  isHost: boolean;
  levelDurationMinutes?: number;
}

export const BlindTimer: React.FC<BlindTimerProps> = ({
  currentSmallBlind,
  currentBigBlind,
  onBlindsChange,
  isHost,
  levelDurationMinutes = 15,
}) => {
  const [levelIndex, setLevelIndex] = useState(0);
  const durationSeconds = levelDurationMinutes * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // Initialize blind level matching initial state
  useEffect(() => {
    const idx = DEFAULT_BLIND_SCHEDULE.findIndex(
      (b) => b.small === currentSmallBlind && b.big === currentBigBlind
    );
    if (idx >= 0) {
      setLevelIndex(idx);
    }
  }, [currentSmallBlind, currentBigBlind]);

  useEffect(() => {
    let timer: any = null;
    if (isRunning && remainingSeconds > 0) {
      timer = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            handleLevelComplete();
            return durationSeconds;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, remainingSeconds, durationSeconds, levelIndex]);

  const handleLevelComplete = () => {
    sounds.playBlindIncrease();
    const nextIdx = Math.min(levelIndex + 1, DEFAULT_BLIND_SCHEDULE.length - 1);
    setLevelIndex(nextIdx);
    const nextLevel = DEFAULT_BLIND_SCHEDULE[nextIdx];
    onBlindsChange(nextLevel.small, nextLevel.big);
  };

  const handleNextLevel = () => {
    const nextIdx = Math.min(levelIndex + 1, DEFAULT_BLIND_SCHEDULE.length - 1);
    setLevelIndex(nextIdx);
    setRemainingSeconds(durationSeconds);
    const nextLevel = DEFAULT_BLIND_SCHEDULE[nextIdx];
    onBlindsChange(nextLevel.small, nextLevel.big);
    sounds.playChipClick();
  };

  const handleResetTimer = () => {
    setRemainingSeconds(durationSeconds);
    setIsRunning(false);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sounds.setSoundEnabled(next);
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const nextLevel = DEFAULT_BLIND_SCHEDULE[levelIndex + 1];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Level {levelIndex + 1}
          </span>
          <span className="text-sm font-bold text-slate-100">
            {currentSmallBlind} / {currentBigBlind}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute Sounds' : 'Unmute Sounds'}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>

          <div className="font-mono text-base font-bold text-amber-300 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
            {timeFormatted}
          </div>
        </div>
      </div>

      {nextLevel && (
        <div className="text-[11px] text-slate-400 flex justify-between items-center px-0.5">
          <span>Next: {nextLevel.small} / {nextLevel.big}</span>
          <span className="text-slate-500">Duration: {durationSeconds / 60}m</span>
        </div>
      )}

      {isHost && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              isRunning
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 hover:bg-amber-600/40'
                : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Pause' : 'Start Timer'}
          </button>

          <button
            onClick={handleResetTimer}
            title="Reset Timer"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleNextLevel}
            title="Skip to Next Level"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
