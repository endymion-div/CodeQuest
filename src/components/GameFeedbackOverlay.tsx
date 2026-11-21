import { AnimatePresence, motion } from 'motion/react';
import { Award, Crown, Flame, Swords, X, Zap } from 'lucide-react';
import type { AchievementItem } from '../types/codequest';

export interface FeedbackEvent {
  id: string;
  type: 'xp' | 'level_up' | 'achievement' | 'boss';
  title: string;
  subtitle?: string;
  xpAmount?: number;
  achievement?: AchievementItem;
}

interface GameFeedbackOverlayProps {
  events: FeedbackEvent[];
  onDismiss: (id: string) => void;
}

export function GameFeedbackOverlay({ events, onDismiss }: GameFeedbackOverlayProps) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-20 right-4 z-50 flex max-w-sm flex-col gap-3 md:bottom-6 md:right-6"
    >
      <AnimatePresence>
        {events.map((ev) => {
          const isSpecial = ev.type === 'level_up' || ev.type === 'boss';
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-md ${
                ev.type === 'boss'
                  ? 'border-rose-500/40 bg-slate-900/95 text-slate-100'
                  : ev.type === 'level_up'
                    ? 'border-amber-400/50 bg-slate-900/95 text-slate-100'
                    : ev.type === 'achievement'
                      ? 'border-cyan-400/40 bg-slate-900/95 text-slate-100'
                      : 'border-emerald-500/40 bg-slate-900/95 text-slate-100'
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  ev.type === 'boss'
                    ? 'bg-rose-500/20 text-rose-400'
                    : ev.type === 'level_up'
                      ? 'bg-amber-500/20 text-amber-300'
                      : ev.type === 'achievement'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {ev.type === 'boss' ? (
                  <Swords className="h-5 w-5" />
                ) : ev.type === 'level_up' ? (
                  <Crown className="h-5 w-5" />
                ) : ev.type === 'achievement' ? (
                  <Award className="h-5 w-5" />
                ) : isSpecial ? (
                  <Flame className="h-5 w-5" />
                ) : (
                  <Zap className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{ev.title}</p>
                  {ev.xpAmount ? (
                    <span className="font-mono text-xs font-semibold tabular-nums text-amber-300">
                      +{ev.xpAmount} XP
                    </span>
                  ) : null}
                </div>
                {ev.subtitle ? (
                  <p className="mt-0.5 text-xs text-slate-300">{ev.subtitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => onDismiss(ev.id)}
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
