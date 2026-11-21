import { Award, Bug, CheckCircle2, Flame, Lock, Trophy } from 'lucide-react';
import { useState } from 'react';
import { ACHIEVEMENTS } from '../data/curriculum';
import type { LeaderboardEntry, MistakeCategory, UserStatePayload } from '../types/codequest';

export function LeaderboardView({ entries }: { entries: LeaderboardEntry[] }) {
  const [scope, setScope] = useState<'global' | 'friends' | 'weekly'>('global');

  const visibleEntries = [...entries]
    .filter((e) => (scope === 'friends' ? e.isFriend || e.isCurrentUser : true))
    .sort((a, b) => (scope === 'weekly' ? b.weeklyXp - a.weeklyXp : b.xp - a.xp))
    .map((e, idx) => ({ ...e, displayRank: idx + 1 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-cyan-300">Skill-Based Standings</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">Leaderboard</h1>
        </div>

        <div className="flex gap-1 rounded-lg bg-slate-900 p-1">
          {(['global', 'friends', 'weekly'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setScope(tab)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                scope === tab ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0D1424]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/70 text-xs text-slate-400">
              <tr>
                <th className="px-5 py-3.5 font-medium">Rank</th>
                <th className="px-5 py-3.5 font-medium">Username</th>
                <th className="px-5 py-3.5 font-medium">Level</th>
                <th className="px-5 py-3.5 font-medium text-right">Streak</th>
                <th className="px-5 py-3.5 font-medium text-right">
                  {scope === 'weekly' ? 'Weekly XP' : 'Total XP'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {visibleEntries.map((row) => (
                <tr
                  key={row.username}
                  className={
                    row.isCurrentUser ? 'bg-cyan-500/10' : 'hover:bg-slate-900/40 transition-colors'
                  }
                >
                  <td className="px-5 py-3.5 font-mono text-sm font-bold tabular-nums text-white">
                    #{row.displayRank}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={row.avatarUrl}
                        alt={row.username}
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 rounded-full object-cover border border-slate-700"
                      />
                      <div>
                        <p className="font-semibold text-white">
                          {row.username} {row.isCurrentUser ? '(You)' : ''}
                        </p>
                        <p className="text-xs text-slate-400">{row.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-300">
                    Level {row.level} · {row.levelTitle}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-amber-300">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5" />
                      {row.streak}d
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-sm font-semibold tabular-nums text-cyan-300">
                    {(scope === 'weekly' ? row.weeklyXp : row.xp).toLocaleString()} XP
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AchievementsView({ state }: { state: UserStatePayload }) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const items = ACHIEVEMENTS.filter((ach) => {
    const unlocked = state.unlockedAchievementIds.includes(ach.id);
    if (filter === 'unlocked') return unlocked;
    if (filter === 'locked') return !unlocked;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-cyan-300">Badges & Milestones</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">
            Achievements ({state.unlockedAchievementIds.length}/{ACHIEVEMENTS.length})
          </h1>
        </div>

        <div className="flex gap-1 rounded-lg bg-slate-900 p-1">
          {(['all', 'unlocked', 'locked'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === tab ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((ach) => {
          const unlocked = state.unlockedAchievementIds.includes(ach.id);
          return (
            <div
              key={ach.id}
              className={`rounded-xl border p-5 transition-colors ${
                unlocked
                  ? 'border-amber-400/40 bg-[#0D1424]'
                  : 'border-slate-800/80 bg-[#090E1A]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    unlocked ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {unlocked ? <Trophy className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </div>
                <span
                  className={`font-mono text-xs tabular-nums ${
                    unlocked ? 'text-cyan-300' : 'text-slate-500'
                  }`}
                >
                  +{ach.xpBonus} XP
                </span>
              </div>
              <h2
                className={`mt-4 font-display text-base font-bold ${
                  unlocked ? 'text-white' : 'text-slate-300'
                }`}
              >
                {ach.title}
              </h2>
              <p
                className={`mt-1 text-xs leading-relaxed ${
                  unlocked ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {ach.description}
              </p>
              <p className="mt-3 text-[11px] font-medium text-slate-400">
                {ach.category} · {unlocked ? 'Unlocked' : 'Locked'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MISTAKE_CATEGORIES: ('All' | MistakeCategory)[] = [
  'All',
  'Syntax',
  'Logic',
  'Loops',
  'Functions',
  'Arrays',
  'DSA',
];

export function MistakesView({
  state,
  onPracticeChallenge,
  onResolveMistake,
}: {
  state: UserStatePayload;
  onPracticeChallenge: (challengeId: string) => void;
  onResolveMistake: (mistakeId: string) => Promise<void>;
}) {
  const [catFilter, setCatFilter] = useState<'All' | MistakeCategory>('All');

  const filtered = state.mistakes.filter(
    (m) => catFilter === 'All' || m.category === catFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-amber-300">Mistake Analyzer</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">My Mistakes</h1>
        </div>
        <p className="text-xs text-slate-400 tabular-nums">
          {state.mistakes.filter((m) => !m.resolved).length} active patterns to reinforce
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {MISTAKE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCatFilter(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              catFilter === cat
                ? 'bg-cyan-500 text-slate-950'
                : 'border border-slate-800 bg-[#0D1424] text-slate-300 hover:border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-8 text-center">
          <Award className="mx-auto h-8 w-8 text-emerald-400" />
          <h2 className="mt-3 font-display text-lg font-semibold text-white">
            No mistakes logged in this category
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Whenever a challenge attempt fails, CodeQuest diagnoses the pattern and recommends
            targeted practice here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-slate-800 bg-[#0D1424] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                    {m.resolved ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Bug className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">
                      {m.category} · {m.challengeTitle} · Seen {m.occurrences}x ·{' '}
                      {m.resolved ? 'Resolved' : 'Needs Practice'}
                    </p>
                    <h2 className="mt-1 text-sm font-semibold text-white">{m.summary}</h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onPracticeChallenge(m.recommendedChallengeId)}
                    className="rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    Practice Now
                  </button>
                  {!m.resolved && (
                    <button
                      type="button"
                      onClick={() => onResolveMistake(m.id)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>

              {m.codeSnippet && (
                <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-[#070B14] p-3 font-mono text-xs text-slate-300">
                  {m.codeSnippet}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
