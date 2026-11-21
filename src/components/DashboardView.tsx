import {
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  Flame,
  Swords,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { ACHIEVEMENTS, LESSONS, QUESTS, WORLDS } from '../data/curriculum';
import { getTodaysDailyChallenge } from '../data/challenges';
import type { LeaderboardEntry, NavSection, UserStatePayload } from '../types/codequest';
import { calculateLevelInfo } from '../utils/progression';
import { DailyStreakWidget } from './DailyStreakWidget';

interface DashboardViewProps {
  state: UserStatePayload;
  leaderboard: LeaderboardEntry[];
  onNavigate: (section: NavSection, payload?: { worldId?: string; challengeId?: string }) => void;
  onClaimQuest: (questId: string) => Promise<void>;
}

export function DashboardView({
  state,
  leaderboard,
  onNavigate,
  onClaimQuest,
}: DashboardViewProps) {
  const { profile } = state;
  const levelInfo = calculateLevelInfo(profile.xp);
  const dailyChallenge = getTodaysDailyChallenge(profile.level);
  const dailyCompleted = Boolean(state.dailyChallengeCompletedDate);

  const nextLesson =
    LESSONS.find((l) => !state.completedLessonIds.includes(l.id)) || LESSONS[0];
  const currentWorld = WORLDS.find((w) => w.id === nextLesson.worldId) || WORLDS[0];

  const userRankEntry = leaderboard.find((e) => e.isCurrentUser || e.username === profile.username);
  const rankNumber = userRankEntry ? userRankEntry.rank : 1;

  const recentUnlocked = ACHIEVEMENTS.filter((a) =>
    state.unlockedAchievementIds.includes(a.id)
  ).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Primary Welcome & Continue Quest Banner */}
      <section className="rounded-xl border border-slate-800 bg-[#0D1424] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium text-cyan-300">
              Level {levelInfo.level} · {levelInfo.title} · {profile.adaptiveDifficulty} Track
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">
              Welcome back, {profile.username}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{profile.adaptiveNote}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('learn', { worldId: currentWorld.id })}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0"
            >
              Continue Quest
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('daily')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 hover:border-cyan-500/50 whitespace-nowrap shrink-0"
            >
              Daily Challenge
            </button>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-6 border-t border-slate-800/80 pt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">
              Level {levelInfo.level} Progress ({levelInfo.title})
            </span>
            <span className="font-mono tabular-nums text-cyan-300">
              {levelInfo.currentXp} XP
              {levelInfo.nextLevelXp !== null
                ? ` · ${levelInfo.xpNeededForNext} XP to Level ${levelInfo.level + 1}`
                : ' · Max Level Reached'}
            </span>
          </div>
          <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* 4 Core KPI Summary Strip */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Current Streak</span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-white">
            {profile.currentStreak} days
          </div>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            Longest: {profile.longestStreak} days · {profile.totalActiveDays} active
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total XP</span>
            <Zap className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-white">
            {profile.xp.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-400">Rank #{rankNumber} Global</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Completed Challenges</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-white">
            {state.solvedChallengeIds.length}
          </div>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            {state.completedLessonIds.length} lessons · {state.defeatedBossIds.length} bosses
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Leaderboard Rank</span>
            <Trophy className="h-4 w-4 text-amber-300" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-white">
            #{rankNumber}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('leaderboard')}
            className="mt-1 text-xs font-medium text-cyan-300 hover:underline"
          >
            View standings
          </button>
        </div>
      </section>

      {/* Main Split: Daily Streaks Widget + Today's Mission + Daily Challenge */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 7 cols: Daily Streaks Widget, Today's Mission & Daily Challenge */}
        <div className="space-y-6 lg:col-span-7">
          <DailyStreakWidget state={state} onNavigate={onNavigate} />

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Today's Mission */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0D1424] p-5">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Today&apos;s Mission</span>
                  <Compass className="h-4 w-4 text-cyan-400" />
                </div>
                <h2 className="mt-2 font-display text-lg font-semibold text-white">
                  {nextLesson.title}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  World {currentWorld.order}: {currentWorld.title} · +{nextLesson.xpReward} XP
                </p>
                <p className="mt-3 text-sm text-slate-300 line-clamp-2">{nextLesson.concept}</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('learn', { worldId: currentWorld.id })}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:underline"
              >
                Start Lesson
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Daily Challenge */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0D1424] p-5">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Daily Challenge</span>
                  <Target className="h-4 w-4 text-amber-400" />
                </div>
                <h2 className="mt-2 font-display text-lg font-semibold text-white">
                  {dailyChallenge.title}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {dailyChallenge.difficulty === 'Intermediate' ? 'Medium' : dailyChallenge.difficulty} ·{' '}
                  {dailyChallenge.topic} · +50 Bonus XP
                </p>
                <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                  {dailyChallenge.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('daily', { challengeId: dailyChallenge.id })}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 hover:underline"
              >
                {dailyCompleted ? 'Completed Today (Practice Again)' : 'Solve Daily Challenge'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Active Quests & Recent Achievements */}
        <div className="space-y-6 lg:col-span-5">
          {/* Active Quests */}
          <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">Active Quests</h2>
              <span className="text-xs text-slate-400">Daily & Weekly</span>
            </div>

            <div className="mt-4 space-y-3">
              {QUESTS.slice(0, 4).map((quest) => {
                const progress = state.questProgress[quest.id] || 0;
                const pct = Math.min(100, Math.round((progress / quest.target) * 100));
                const claimed = state.claimedQuestIds.includes(quest.id);
                const ready = progress >= quest.target && !claimed;

                return (
                  <div
                    key={quest.id}
                    className="rounded-lg border border-slate-800/90 bg-slate-900/60 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{quest.title}</p>
                        <p className="text-xs text-slate-400">
                          {quest.cadence === 'daily' ? 'Daily' : 'Weekly'} · +{quest.xpReward} XP
                        </p>
                      </div>
                      {ready ? (
                        <button
                          type="button"
                          onClick={() => onClaimQuest(quest.id)}
                          className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400 whitespace-nowrap shrink-0"
                        >
                          Claim
                        </button>
                      ) : (
                        <span className="font-mono text-xs tabular-nums text-slate-300">
                          {claimed ? 'Claimed' : `${progress}/${quest.target}`}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Achievements + Boss Shortcut */}
          <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">
                Recent Achievements
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('achievements')}
                className="text-xs font-medium text-cyan-300 hover:underline"
              >
                All ({state.unlockedAchievementIds.length}/{ACHIEVEMENTS.length})
              </button>
            </div>

            {recentUnlocked.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                Complete your first lesson or challenge to unlock achievement badges.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {recentUnlocked.map((ach) => (
                  <div
                    key={ach.id}
                    className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5"
                  >
                    <Award className="h-4 w-4 shrink-0 text-amber-300" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{ach.title}</p>
                      <p className="truncate text-[11px] text-slate-400">+{ach.xpBonus} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => onNavigate('bosses')}
              className="mt-4 flex w-full items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
            >
              <span className="inline-flex items-center gap-2">
                <Swords className="h-4 w-4 text-rose-400" />
                Challenge a World Boss Battle
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
