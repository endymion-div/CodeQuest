import { Award, CheckCircle2, Flame, LogOut, Palette, Search, Volume2, VolumeX, Zap } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ACHIEVEMENTS } from '../data/curriculum';
import { PROGRAMMING_LANGUAGES, WORKSPACE_AMBIENCES } from '../data/languages';
import type {
  DailyTimeBudget,
  LearningGoal,
  ProgrammingLanguage,
  UserStatePayload,
  WorkspaceAmbience,
} from '../types/codequest';

export function ProfileView({ state }: { state: UserStatePayload }) {
  const { profile } = state;
  const [lookupUsername, setLookupUsername] = useState('');
  const [publicLookup, setPublicLookup] = useState<{
    username: string;
    name: string;
    avatarUrl: string;
    level: number;
    levelTitle: string;
    xp: number;
    currentStreak: number;
    preferredLanguage: string;
    solvedCount: number;
    projectsCount: number;
    badges: string[];
  } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const unlockedAchievements = ACHIEVEMENTS.filter((a) =>
    state.unlockedAchievementIds.includes(a.id)
  );

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    setLookupError(null);
    if (!lookupUsername.trim()) return;
    try {
      const res = await fetch(
        `/api/public-profile/${encodeURIComponent(lookupUsername.trim())}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Profile not found.');
      setPublicLookup(data.profile);
    } catch (err) {
      setPublicLookup(null);
      setLookupError(err instanceof Error ? err.message : 'Profile lookup failed.');
    }
  }

  const display = publicLookup || {
    username: profile.username,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    level: profile.level,
    levelTitle: profile.levelTitle,
    xp: profile.xp,
    currentStreak: profile.currentStreak,
    preferredLanguage: profile.preferredLanguage,
    solvedCount: state.solvedChallengeIds.length,
    projectsCount: state.completedProjectIds.length,
    badges: profile.unlockedCosmetics,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-cyan-300">Public Developer Card</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">CodeQuest Profile</h1>
        </div>

        <form onSubmit={handleLookup} className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              aria-label="Lookup public username"
              value={lookupUsername}
              onChange={(e) => setLookupUsername(e.target.value)}
              placeholder="Lookup username (e.g. nova_coder)"
              className="w-56 rounded-lg border border-slate-700 bg-slate-900 py-2 pl-8 pr-3 text-xs text-white placeholder-slate-500 sm:w-64"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:border-cyan-400"
          >
            View
          </button>
          {publicLookup && (
            <button
              type="button"
              onClick={() => {
                setPublicLookup(null);
                setLookupUsername('');
              }}
              className="rounded-lg px-3 py-2 text-xs text-cyan-300 hover:underline"
            >
              My Profile
            </button>
          )}
        </form>
      </div>

      {lookupError && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          {lookupError}
        </div>
      )}

      {/* Hero Profile Card */}
      <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={display.avatarUrl}
              alt={display.name}
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-xl object-cover border border-cyan-500/40"
            />
            <div>
              <p className="text-xs font-medium text-cyan-300">
                Level {display.level} · {display.levelTitle}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">{display.name}</h2>
              <p className="text-xs text-slate-400">
                @{display.username} · Primary Language: {display.preferredLanguage}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5 border-t border-slate-800 pt-4 sm:border-t-0 sm:pt-0">
            <div>
              <div className="flex items-center gap-1 font-mono text-xl font-bold tabular-nums text-white">
                <Zap className="h-4 w-4 text-cyan-400" />
                {display.xp.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400">Total XP</p>
            </div>
            <div>
              <div className="flex items-center gap-1 font-mono text-xl font-bold tabular-nums text-white">
                <Flame className="h-4 w-4 text-amber-400" />
                {display.currentStreak}d
              </div>
              <p className="text-xs text-slate-400">Streak</p>
            </div>
            <div>
              <div className="flex items-center gap-1 font-mono text-xl font-bold tabular-nums text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {display.solvedCount}
              </div>
              <p className="text-xs text-slate-400">Solved</p>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-800 pt-5">
          <h3 className="text-sm font-semibold text-white">Earned Badges & Titles</h3>
          <p className="mt-2 text-xs text-slate-300">
            {display.badges.join(' · ') || 'Obsidian Core'}
          </p>
        </div>
      </div>

      {/* Achievements Showcase */}
      <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-6">
        <h3 className="font-display text-base font-semibold text-white">
          Unlocked Achievements ({unlockedAchievements.length})
        </h3>
        {unlockedAchievements.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">No achievements unlocked yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {unlockedAchievements.map((ach) => (
              <div
                key={ach.id}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3"
              >
                <Award className="h-5 w-5 shrink-0 text-amber-300" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">{ach.title}</p>
                  <p className="truncate text-[11px] text-slate-400">{ach.category}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsView({
  state,
  ambience,
  onChangeAmbience,
  onSaveProfile,
  onToggleSound,
  onLogout,
}: {
  state: UserStatePayload;
  ambience: WorkspaceAmbience;
  onChangeAmbience: (next: WorkspaceAmbience) => void;
  onSaveProfile: (updates: {
    name: string;
    preferredLanguage: ProgrammingLanguage;
    goal: LearningGoal;
    dailyTime: DailyTimeBudget;
    activeTitle: string;
  }) => Promise<void>;
  onToggleSound: (enabled: boolean) => Promise<void>;
  onLogout: () => void;
}) {
  const { profile } = state;
  const [name, setName] = useState(profile.name);
  const [preferredLanguage, setPreferredLanguage] = useState<ProgrammingLanguage>(
    profile.preferredLanguage
  );
  const [goal, setGoal] = useState<LearningGoal>(profile.goal);
  const [dailyTime, setDailyTime] = useState<DailyTimeBudget>(profile.dailyTime);
  const [activeTitle, setActiveTitle] = useState(profile.activeTitle);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      await onSaveProfile({ name, preferredLanguage, goal, dailyTime, activeTitle });
      setSavedMsg('Profile preferences saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-cyan-300">Account & Preferences</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-800 bg-[#0D1424] p-6 lg:col-span-7"
        >
          <div>
            <label htmlFor="set-name" className="block text-xs font-medium text-slate-300">
              Display Name
            </label>
            <input
              id="set-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="set-lang" className="block text-xs font-medium text-slate-300">
                Preferred Language
              </label>
              <select
                id="set-lang"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as ProgrammingLanguage)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                {PROGRAMMING_LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label} ({l.extension})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="set-time" className="block text-xs font-medium text-slate-300">
                Daily Practice Budget
              </label>
              <select
                id="set-time"
                value={dailyTime}
                onChange={(e) => setDailyTime(e.target.value as DailyTimeBudget)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                <option value="15 minutes">15 minutes</option>
                <option value="30 minutes">30 minutes</option>
                <option value="1 hour">1 hour</option>
                <option value="2+ hours">2+ hours</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="set-goal" className="block text-xs font-medium text-slate-300">
              Primary Learning Goal
            </label>
            <select
              id="set-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value as LearningGoal)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <option value="Learn programming">Learn programming</option>
              <option value="Prepare for interviews">Prepare for interviews</option>
              <option value="Learn DSA">Learn DSA</option>
              <option value="Build projects">Build projects</option>
              <option value="College studies">College studies</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-title" className="block text-xs font-medium text-slate-300">
              Active Profile Title / Badge
            </label>
            <select
              id="set-title"
              value={activeTitle}
              onChange={(e) => setActiveTitle(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <option value={profile.levelTitle}>{profile.levelTitle}</option>
              {profile.unlockedCosmetics.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {savedMsg && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              {savedMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>

        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-6">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-cyan-400" />
              <h2 className="font-display text-base font-semibold text-white">
                Workspace Ambience
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Choose an immersive dark-mode backdrop engineered for long coding sessions.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {WORKSPACE_AMBIENCES.map((preset) => {
                const active = ambience === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onChangeAmbience(preset.id)}
                    className={`rounded-lg border p-2.5 text-left transition-colors ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/10'
                        : 'border-slate-800 bg-[#090E1A] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: preset.accentHex }}
                      />
                      <span className="text-xs font-semibold text-white">{preset.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{preset.tagline}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-6">
            <h2 className="font-display text-base font-semibold text-white">Audio Feedback</h2>
            <p className="mt-1 text-xs text-slate-400">
              Toggle subtle Web Audio sound effects for solved challenges, level ups, and boss
              victories.
            </p>
            <button
              type="button"
              onClick={() => onToggleSound(!profile.soundEnabled)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:border-cyan-400"
            >
              {profile.soundEnabled ? (
                <>
                  <Volume2 className="h-4 w-4 text-cyan-400" />
                  Sound Effects: Enabled
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 text-slate-400" />
                  Sound Effects: Muted
                </>
              )}
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-6">
            <h2 className="font-display text-base font-semibold text-white">Session</h2>
            <p className="mt-1 text-xs text-slate-400">
              Signed in as {profile.email} (@{profile.username}).
            </p>
            <button
              type="button"
              onClick={onLogout}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
