import {
  Award,
  BarChart3,
  BookOpen,
  Bug,
  Calendar,
  Code2,
  Compass,
  Flame,
  FolderGit2,
  LayoutDashboard,
  LogOut,
  Palette,
  Settings,
  Swords,
  Target,
  Trophy,
  User,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnalyticsView, LearningPlanView } from './components/AnalyticsAndPlanViews';
import { AuthModal } from './components/AuthModal';
import { BossBattleView } from './components/BossBattleView';
import { ChallengeArenaView } from './components/ChallengeArenaView';
import { CodeBattleView } from './components/CodeBattleView';
import {
  AchievementsView,
  LeaderboardView,
  MistakesView,
} from './components/CommunityProgressViews';
import { DailyStreakWidget } from './components/DailyStreakWidget';
import { DashboardView } from './components/DashboardView';
import { GameFeedbackOverlay, type FeedbackEvent } from './components/GameFeedbackOverlay';
import { LandingPage } from './components/LandingPage';
import { LearningWorldView } from './components/LearningWorldView';
import { OnboardingWizard } from './components/OnboardingWizard';
import { ProfileView, SettingsView } from './components/ProfileAndSettingsViews';
import { ProjectQuestsView } from './components/ProjectQuestsView';
import { WORKSPACE_AMBIENCES } from './data/languages';
import type {
  AchievementItem,
  BossBattleItem,
  ChallengeItem,
  DailyTimeBudget,
  ExperienceLevel,
  LeaderboardEntry,
  LearningGoal,
  LessonItem,
  NavSection,
  ProgrammingLanguage,
  ProjectQuestItem,
  SandboxExecutionResult,
  UserStatePayload,
  WorkspaceAmbience,
} from './types/codequest';
import { soundEngine } from './utils/soundEffects';

const SIDEBAR_ITEMS: { id: NavSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'challenges', label: 'Challenges', icon: Code2 },
  { id: 'daily', label: 'Daily Challenge', icon: Target },
  { id: 'bosses', label: 'Boss Battles', icon: Swords },
  { id: 'battle', label: 'Code Battle', icon: Zap },
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'mistakes', label: 'Mistakes', icon: Bug },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'plan', label: 'Learning Path', icon: Calendar },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const MOBILE_NAV_ITEMS: { id: NavSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'learn', label: 'Learn', icon: Compass },
  { id: 'challenges', label: 'Code', icon: Code2 },
  { id: 'bosses', label: 'Bosses', icon: Swords },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userState, setUserState] = useState<UserStatePayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | null>(null);

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [focusedWorldId, setFocusedWorldId] = useState<string | undefined>(undefined);
  const [focusedChallengeId, setFocusedChallengeId] = useState<string | undefined>(undefined);
  const [focusedBossId, setFocusedBossId] = useState<string | undefined>(undefined);
  const [feedbackEvents, setFeedbackEvents] = useState<FeedbackEvent[]>([]);
  const [ambience, setAmbience] = useState<WorkspaceAmbience>(() => {
    try {
      const saved = localStorage.getItem('codequest_ambience') as WorkspaceAmbience | null;
      if (saved && WORKSPACE_AMBIENCES.some((a) => a.id === saved)) return saved;
    } catch {
      // Ignore storage access failures
    }
    return 'nebula';
  });
  const [ambienceMenuOpen, setAmbienceMenuOpen] = useState(false);
  const [streakPopoverOpen, setStreakPopoverOpen] = useState(false);

  function updateAmbience(next: WorkspaceAmbience) {
    setAmbience(next);
    setAmbienceMenuOpen(false);
    try {
      localStorage.setItem('codequest_ambience', next);
    } catch {
      // Ignore storage failures
    }
  }

  function pushFeedback(ev: Omit<FeedbackEvent, 'id'>) {
    const id = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setFeedbackEvents((prev) => [...prev.slice(-3), { ...ev, id }]);
    setTimeout(() => {
      setFeedbackEvents((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }

  async function refreshLeaderboard(token: string) {
    try {
      const res = await fetch('/api/leaderboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.entries || []);
      }
    } catch {
      // Ignore transient leaderboard fetch failure
    }
  }

  function handleAuthenticated(token: string, state: UserStatePayload) {
    setAuthToken(token);
    setUserState(state);
    setAuthModalMode(null);
    soundEngine.setMuted(!state.profile.soundEnabled);
    void refreshLeaderboard(token);
  }

  async function handleDemoLogin() {
    const res = await fetch('/api/auth/demo', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.token && data.state) {
      handleAuthenticated(data.token, data.state);
    }
  }

  // Support ?autostart=1 for instant demo workspace verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && !authToken) {
      void handleDemoLogin();
    }
  }, []);

  function applyProgressionNotifications(
    prevState: UserStatePayload,
    nextState: UserStatePayload,
    xpGained: number,
    newlyUnlocked: AchievementItem[] = [],
    label = 'XP Earned'
  ) {
    if (xpGained > 0) {
      pushFeedback({
        type: 'xp',
        title: label,
        xpAmount: xpGained,
      });
    }
    if (nextState.profile.level > prevState.profile.level) {
      soundEngine.playLevelUp();
      pushFeedback({
        type: 'level_up',
        title: `Level Up! Level ${nextState.profile.level}`,
        subtitle: `Rank unlocked: ${nextState.profile.levelTitle}`,
      });
    }
    for (const ach of newlyUnlocked) {
      soundEngine.playAchievement();
      pushFeedback({
        type: 'achievement',
        title: `Achievement Unlocked: ${ach.title}`,
        subtitle: ach.description,
        xpAmount: ach.xpBonus,
        achievement: ach,
      });
    }
  }

  async function handleCompleteOnboarding(prefs: {
    experienceLevel: ExperienceLevel;
    preferredLanguage: ProgrammingLanguage;
    goal: LearningGoal;
    dailyTime: DailyTimeBudget;
  }) {
    if (!authToken) return;
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(prefs),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      setUserState(data.state);
    }
  }

  async function handleCompleteLesson(lesson: LessonItem) {
    if (!authToken || !userState) return;
    const res = await fetch('/api/lessons/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ lessonId: lesson.id }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      applyProgressionNotifications(
        userState,
        data.state,
        data.xpGained || 0,
        data.newlyUnlocked || [],
        `Completed: ${lesson.title}`
      );
      setUserState(data.state);
      void refreshLeaderboard(authToken);
    }
  }

  async function handleChallengeSubmitted(payload: {
    challenge: ChallengeItem;
    language: ProgrammingLanguage;
    code: string;
    result: SandboxExecutionResult;
    hintsUsed: number;
    isDaily: boolean;
  }) {
    if (!authToken || !userState) return;
    const res = await fetch('/api/challenges/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        challengeId: payload.challenge.id,
        language: payload.language,
        code: payload.code,
        passed: payload.result.passedAll,
        passedCount: payload.result.passedCount,
        totalCount: payload.result.totalCount,
        executionMs: payload.result.executionMs,
        hintsUsed: payload.hintsUsed,
        isDaily: payload.isDaily,
        errorMessage: payload.result.compileOrRuntimeError,
      }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      applyProgressionNotifications(
        userState,
        data.state,
        data.xpGained || 0,
        data.newlyUnlocked || [],
        payload.isDaily
          ? `Daily Challenge Cleared: ${payload.challenge.title}`
          : `Challenge Solved: ${payload.challenge.title}`
      );
      setUserState(data.state);
      void refreshLeaderboard(authToken);
    }
  }

  async function handleBossDefeated(boss: BossBattleItem) {
    if (!authToken || !userState) return;
    const res = await fetch('/api/bosses/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ bossId: boss.id }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      pushFeedback({
        type: 'boss',
        title: `Boss Defeated: ${boss.name}`,
        subtitle: `Badge unlocked: ${boss.badgeName}`,
        xpAmount: data.xpGained || boss.xpReward,
      });
      applyProgressionNotifications(userState, data.state, 0, data.newlyUnlocked || []);
      setUserState(data.state);
      void refreshLeaderboard(authToken);
    }
  }

  async function handleCompleteProject(project: ProjectQuestItem) {
    if (!authToken || !userState) return;
    const res = await fetch('/api/projects/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ projectId: project.id }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      applyProgressionNotifications(
        userState,
        data.state,
        data.xpGained || 0,
        data.newlyUnlocked || [],
        `Project Shipped: ${project.title}`
      );
      setUserState(data.state);
      void refreshLeaderboard(authToken);
    }
  }

  async function handleClaimQuest(questId: string) {
    if (!authToken || !userState) return;
    const res = await fetch('/api/quests/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ questId }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      soundEngine.playSuccess();
      applyProgressionNotifications(
        userState,
        data.state,
        data.xpGained || 0,
        data.newlyUnlocked || [],
        'Quest Reward Claimed'
      );
      setUserState(data.state);
    }
  }

  async function handleResolveMistake(mistakeId: string) {
    if (!authToken || !userState) return;
    const res = await fetch('/api/mistakes/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ mistakeId }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      applyProgressionNotifications(userState, data.state, 0, data.newlyUnlocked || []);
      setUserState(data.state);
    }
  }

  async function handleBattleFinished(won: boolean) {
    if (!authToken || !userState) return;
    const res = await fetch('/api/battles/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ won }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      applyProgressionNotifications(
        userState,
        data.state,
        data.xpGained || 0,
        data.newlyUnlocked || [],
        won ? 'Code Battle Victory' : 'Code Battle Completed'
      );
      setUserState(data.state);
      void refreshLeaderboard(authToken);
    }
  }

  async function handleUpdateProfile(updates: Partial<{
    name: string;
    preferredLanguage: ProgrammingLanguage;
    soundEnabled: boolean;
    activeTitle: string;
    goal: LearningGoal;
    dailyTime: DailyTimeBudget;
  }>) {
    if (!authToken) return;
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      soundEngine.setMuted(!data.state.profile.soundEnabled);
      setUserState(data.state);
    }
  }

  function handleNavigate(
    section: NavSection,
    payload?: { worldId?: string; challengeId?: string; bossId?: string }
  ) {
    if (payload?.worldId) setFocusedWorldId(payload.worldId);
    if (payload?.challengeId) setFocusedChallengeId(payload.challengeId);
    if (payload?.bossId) setFocusedBossId(payload.bossId);
    setActiveSection(section);
  }

  function handleLogout() {
    setAuthToken(null);
    setUserState(null);
    setLeaderboard([]);
    setActiveSection('dashboard');
  }

  // Unauthenticated -> Landing Page + Auth Modal
  if (!authToken || !userState) {
    return (
      <>
        <LandingPage
          onStartQuest={() => setAuthModalMode('signup')}
          onOpenLogin={() => setAuthModalMode('login')}
          onDemoLogin={() => void handleDemoLogin()}
        />
        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            onClose={() => setAuthModalMode(null)}
            onAuthenticated={handleAuthenticated}
          />
        )}
      </>
    );
  }

  // Onboarding for newly signed-up users
  if (!userState.profile.onboardingCompleted) {
    return (
      <OnboardingWizard
        username={userState.profile.username}
        onComplete={handleCompleteOnboarding}
      />
    );
  }

  const { profile } = userState;
  const activeAmbience =
    WORKSPACE_AMBIENCES.find((a) => a.id === ambience) || WORKSPACE_AMBIENCES[0];

  return (
    <div
      data-ambience={ambience}
      className={`ambience-${ambience} relative flex min-h-screen overflow-x-clip text-slate-100 transition-colors duration-500`}
    >
      {/* Subtle animated atmospheric orbs behind the workspace */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="animate-aurora-slow absolute -left-24 -top-24 h-96 w-96 rounded-full blur-3xl"
          style={{
            background:
              ambience === 'matrix'
                ? 'rgba(16, 185, 129, 0.14)'
                : ambience === 'synth'
                  ? 'rgba(245, 158, 11, 0.14)'
                  : ambience === 'obsidian'
                    ? 'rgba(148, 163, 184, 0.06)'
                    : 'rgba(34, 211, 238, 0.14)',
          }}
        />
        <div
          className="animate-aurora-reverse absolute -bottom-28 right-8 h-[420px] w-[420px] rounded-full blur-3xl"
          style={{
            background:
              ambience === 'matrix'
                ? 'rgba(20, 184, 166, 0.12)'
                : ambience === 'synth'
                  ? 'rgba(244, 63, 94, 0.13)'
                  : ambience === 'obsidian'
                    ? 'rgba(51, 65, 85, 0.08)'
                    : 'rgba(99, 102, 241, 0.15)',
          }}
        />
      </div>

      {/* Desktop Sidebar */}
      <aside className="relative z-20 hidden w-64 shrink-0 flex-col border-r border-slate-800/90 bg-[#090F1C]/90 backdrop-blur-md lg:flex">
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <span className="font-display text-lg font-bold tracking-tight text-white">
            CodeQuest
          </span>
          <button
            type="button"
            aria-label={profile.soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            onClick={() => void handleUpdateProfile({ soundEnabled: !profile.soundEnabled })}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {profile.soundEnabled ? (
              <Volume2 className="h-4 w-4 text-cyan-400" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav aria-label="Workspace Navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-cyan-500/15 text-cyan-300'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800/80 p-4">
          <div className="flex items-center gap-3">
            <img
              src={profile.avatarUrl}
              alt={profile.username}
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-lg object-cover border border-slate-700"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{profile.username}</p>
              <p className="truncate font-mono text-[11px] tabular-nums text-slate-400">
                Lvl {profile.level} · {profile.xp} XP
              </p>
            </div>
            <button
              type="button"
              aria-label="Log out"
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Compact Workspace Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-800/80 bg-[#070B14]/85 px-4 py-3 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <span className="font-display text-base font-bold text-white lg:hidden">
              CodeQuest
            </span>
            <span className="hidden text-xs text-slate-400 sm:inline">
              {SIDEBAR_ITEMS.find((s) => s.id === activeSection)?.label || 'Dashboard'}
            </span>
          </div>

          <div className="relative flex items-center gap-3 text-xs font-mono tabular-nums sm:gap-4">
            {/* Workspace Ambience Switcher */}
            <div className="relative">
              <button
                type="button"
                aria-label="Workspace Ambience"
                aria-expanded={ambienceMenuOpen}
                onClick={() => {
                  setAmbienceMenuOpen((prev) => !prev);
                  setStreakPopoverOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0D1424] px-2.5 py-1.5 font-sans text-xs font-medium text-slate-200 hover:border-cyan-500/50"
              >
                <Palette className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden md:inline">{activeAmbience.label}</span>
              </button>

              {ambienceMenuOpen && (
                <div className="absolute right-0 top-10 z-50 w-64 rounded-xl border border-slate-700 bg-[#0D1424] p-2 shadow-2xl">
                  <p className="px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Coding Atmosphere
                  </p>
                  <div className="mt-1 space-y-1">
                    {WORKSPACE_AMBIENCES.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => updateAmbience(preset.id)}
                        className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left font-sans transition-colors ${
                          ambience === preset.id
                            ? 'bg-cyan-500/15 text-white'
                            : 'text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <span
                          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: preset.accentHex }}
                        />
                        <span>
                          <span className="block text-xs font-semibold">{preset.label}</span>
                          <span className="block text-[11px] text-slate-400">{preset.tagline}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Clickable Daily Streak Quick-Check Pill */}
            <div className="relative">
              <button
                type="button"
                aria-label="Open Daily Streaks Widget"
                aria-expanded={streakPopoverOpen}
                onClick={() => {
                  setStreakPopoverOpen((prev) => !prev);
                  setAmbienceMenuOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-amber-300 hover:bg-amber-500/20"
              >
                <Flame className="h-3.5 w-3.5" />
                {profile.currentStreak}d
              </button>

              {streakPopoverOpen && (
                <div className="absolute right-0 top-10 z-50 w-[340px] sm:w-[440px] rounded-xl shadow-2xl">
                  <DailyStreakWidget
                    state={userState}
                    compact
                    onNavigate={(sec, payload) => {
                      setStreakPopoverOpen(false);
                      handleNavigate(sec, payload);
                    }}
                  />
                </div>
              )}
            </div>

            <span className="inline-flex items-center gap-1.5 text-cyan-300">
              <Zap className="h-3.5 w-3.5" />
              {profile.xp} XP
            </span>
            <button
              type="button"
              onClick={() => setActiveSection('profile')}
              className="hidden sm:inline-flex items-center gap-1.5 text-slate-300 hover:text-white"
            >
              Level {profile.level} · {profile.levelTitle}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-10">
          {activeSection === 'dashboard' && (
            <DashboardView
              state={userState}
              leaderboard={leaderboard}
              onNavigate={handleNavigate}
              onClaimQuest={handleClaimQuest}
            />
          )}

          {activeSection === 'learn' && (
            <LearningWorldView
              state={userState}
              initialWorldId={focusedWorldId}
              onCompleteLesson={handleCompleteLesson}
              onOpenChallenge={(cid) => handleNavigate('challenges', { challengeId: cid })}
              onOpenBoss={(bid) => handleNavigate('bosses', { bossId: bid })}
            />
          )}

          {activeSection === 'challenges' && (
            <ChallengeArenaView
              authToken={authToken}
              state={userState}
              mode="challenges"
              initialChallengeId={focusedChallengeId}
              onChallengeSubmitted={handleChallengeSubmitted}
            />
          )}

          {activeSection === 'daily' && (
            <ChallengeArenaView
              authToken={authToken}
              state={userState}
              mode="daily"
              onChallengeSubmitted={handleChallengeSubmitted}
            />
          )}

          {activeSection === 'bosses' && (
            <BossBattleView
              state={userState}
              initialBossId={focusedBossId}
              onBossDefeated={handleBossDefeated}
            />
          )}

          {activeSection === 'battle' && (
            <CodeBattleView state={userState} onBattleFinished={handleBattleFinished} />
          )}

          {activeSection === 'projects' && (
            <ProjectQuestsView state={userState} onCompleteProject={handleCompleteProject} />
          )}

          {activeSection === 'leaderboard' && <LeaderboardView entries={leaderboard} />}

          {activeSection === 'achievements' && <AchievementsView state={userState} />}

          {activeSection === 'mistakes' && (
            <MistakesView
              state={userState}
              onPracticeChallenge={(cid) => handleNavigate('challenges', { challengeId: cid })}
              onResolveMistake={handleResolveMistake}
            />
          )}

          {activeSection === 'analytics' && (
            <AnalyticsView authToken={authToken} state={userState} />
          )}

          {activeSection === 'plan' && (
            <LearningPlanView
              authToken={authToken}
              state={userState}
              onPlanUpdated={(next) => setUserState(next)}
            />
          )}

          {activeSection === 'profile' && <ProfileView state={userState} />}

          {activeSection === 'settings' && (
            <SettingsView
              state={userState}
              ambience={ambience}
              onChangeAmbience={updateAmbience}
              onSaveProfile={(u) => handleUpdateProfile(u)}
              onToggleSound={(enabled) => handleUpdateProfile({ soundEnabled: enabled })}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (< 15% mobile sticky cap) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-800 bg-[#0A101D]/95 py-1.5 backdrop-blur-md lg:hidden"
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
                active ? 'text-cyan-300' : 'text-slate-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <GameFeedbackOverlay
        events={feedbackEvents}
        onDismiss={(id) => setFeedbackEvents((prev) => prev.filter((e) => e.id !== id))}
      />
    </div>
  );
}
