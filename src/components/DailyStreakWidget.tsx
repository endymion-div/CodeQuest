import { ArrowRight, Calendar, CheckCircle2, Flame, ShieldCheck, Trophy } from 'lucide-react';
import type { NavSection, UserStatePayload } from '../types/codequest';
import { getStreakMilestoneInfo } from '../utils/progression';

interface DailyStreakWidgetProps {
  state: UserStatePayload;
  onNavigate?: (section: NavSection, payload?: { worldId?: string; challengeId?: string }) => void;
  compact?: boolean;
}

export function DailyStreakWidget({ state, onNavigate, compact = false }: DailyStreakWidgetProps) {
  const { profile, weeklyActivity, dailyChallengeCompletedDate } = state;
  const todayEntry = weeklyActivity[weeklyActivity.length - 1];
  const activeToday = Boolean(todayEntry && todayEntry.count > 0) || Boolean(dailyChallengeCompletedDate);
  const milestone = getStreakMilestoneInfo(profile.currentStreak);

  return (
    <section
      aria-label="Daily Streaks Widget"
      className={`rounded-xl border border-amber-500/25 bg-[#0D1424] ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15">
            <Flame className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold text-white">Daily Coding Streak</h2>
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-300">
                {milestone.currentBadge}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              {activeToday
                ? 'Today secured! Your streak flame is locked in.'
                : 'Complete 1 lesson or coding challenge today to keep your streak alive.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="font-mono text-2xl font-bold tabular-nums text-amber-300">
              {profile.currentStreak}d
            </div>
            <div className="text-[11px] text-slate-400">Current</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="flex items-center justify-end gap-1 font-mono text-base font-bold tabular-nums text-white">
              <Trophy className="h-3.5 w-3.5 text-cyan-400" />
              {profile.longestStreak}d
            </div>
            <div className="text-[11px] text-slate-400 tabular-nums">
              Best · {profile.totalActiveDays} active
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Flame Chain */}
      <div className="mt-4 grid grid-cols-7 gap-2">
        {weeklyActivity.map((day, idx) => {
          const active = day.count > 0;
          const isToday = idx === weeklyActivity.length - 1;
          return (
            <div
              key={day.date}
              className={`flex flex-col items-center rounded-lg border px-1.5 py-2.5 text-center ${
                active
                  ? 'border-amber-500/45 bg-amber-500/10'
                  : isToday
                    ? 'border-cyan-500/50 bg-[#090E1A]'
                    : 'border-slate-800 bg-[#090E1A]'
              }`}
            >
              <span
                className={`text-[11px] font-medium ${
                  isToday ? 'text-cyan-300' : 'text-slate-400'
                }`}
              >
                {isToday ? 'Today' : day.dayLabel}
              </span>
              <div className="mt-1.5 flex h-6 w-6 items-center justify-center rounded-full">
                {active ? (
                  <Flame className="h-4 w-4 text-amber-400" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-700" />
                )}
              </div>
              <span
                className={`mt-1 font-mono text-[11px] font-semibold tabular-nums ${
                  active ? 'text-emerald-300' : 'text-slate-500'
                }`}
              >
                {day.xp} XP
              </span>
            </div>
          );
        })}
      </div>

      {/* Milestone Progress + Status CTA */}
      <div
        className={`mt-4 flex flex-col gap-3 border-t border-slate-800/90 pt-3.5 ${
          compact ? '' : 'sm:flex-row sm:items-center sm:justify-between'
        }`}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-300 whitespace-nowrap">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              Next Milestone: {milestone.nextMilestone}-Day {milestone.nextBadge}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-amber-300 whitespace-nowrap">
              {milestone.daysRemaining === 0
                ? 'Max Tier Reached'
                : `${milestone.daysRemaining}d left`}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${milestone.progressPercent}%` }}
            />
          </div>
        </div>

        {onNavigate && (
          <div className={compact ? 'flex justify-end' : 'shrink-0'}>
            {activeToday ? (
              <button
                type="button"
                onClick={() => onNavigate('challenges')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 whitespace-nowrap"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Streak Protected · Bonus Practice
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('daily')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-300 whitespace-nowrap"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Secure Today&apos;s Streak
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
