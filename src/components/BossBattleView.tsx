import { motion } from 'motion/react';
import { CheckCircle2, Play, ShieldAlert, Swords, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BOSS_BATTLES, WORLDS } from '../data/curriculum';
import { CHALLENGES } from '../data/challenges';
import { PROGRAMMING_LANGUAGES } from '../data/languages';
import type {
  BossBattleItem,
  ProgrammingLanguage,
  SandboxExecutionResult,
  UserStatePayload,
} from '../types/codequest';
import { executeChallengeInSandbox } from '../utils/sandboxRunner';
import { soundEngine } from '../utils/soundEffects';
import { MonacoCodeEditor } from './MonacoCodeEditor';

interface BossBattleViewProps {
  state: UserStatePayload;
  initialBossId?: string;
  onBossDefeated: (boss: BossBattleItem) => Promise<void>;
}

export function BossBattleView({
  state,
  initialBossId,
  onBossDefeated,
}: BossBattleViewProps) {
  const [selectedBossId, setSelectedBossId] = useState<string>(
    initialBossId || BOSS_BATTLES[1].id // Default highlight: Robot Army
  );
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);
  const [clearedStages, setClearedStages] = useState<number[]>([]);
  const [language, setLanguage] = useState<ProgrammingLanguage>(
    state.profile.preferredLanguage || 'javascript'
  );
  const [code, setCode] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [execResult, setExecResult] = useState<SandboxExecutionResult | null>(null);
  const [victoryModal, setVictoryModal] = useState(false);

  const boss = BOSS_BATTLES.find((b) => b.id === selectedBossId) || BOSS_BATTLES[0];
  const stage = boss.stages[activeStageIdx] || boss.stages[0];
  const challenge = CHALLENGES.find((c) => c.id === stage.challengeId) || CHALLENGES[0];
  const world = WORLDS.find((w) => w.id === boss.worldId);
  const alreadyDefeated = state.defeatedBossIds.includes(boss.id);

  useEffect(() => {
    setCode(challenge.starterCode[language]);
    setExecResult(null);
  }, [challenge.id, language]);

  function selectBoss(bossId: string) {
    setSelectedBossId(bossId);
    setActiveStageIdx(0);
    setClearedStages([]);
    setVictoryModal(false);
  }

  const bossHpPercent = Math.max(0, Math.round(((3 - clearedStages.length) / 3) * 100));

  async function handleAttackBoss() {
    setRunning(true);
    try {
      const res = await executeChallengeInSandbox(
        code,
        language,
        challenge.functionName,
        challenge.testCases
      );
      setExecResult(res);

      if (res.passedAll) {
        const nextCleared = clearedStages.includes(activeStageIdx)
          ? clearedStages
          : [...clearedStages, activeStageIdx];
        setClearedStages(nextCleared);

        if (nextCleared.length >= 3) {
          soundEngine.playBossDefeated();
          setVictoryModal(true);
          await onBossDefeated(boss);
        } else {
          soundEngine.playSuccess();
          setActiveStageIdx((prev) => Math.min(2, prev + 1));
        }
      } else {
        soundEngine.playError();
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-rose-400">World Guardians · 3-Stage Encounters</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">Boss Battles</h1>
        </div>
        <p className="text-xs text-slate-400 tabular-nums">
          {state.defeatedBossIds.length} of {BOSS_BATTLES.length} bosses defeated
        </p>
      </div>

      {/* Boss Selector Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BOSS_BATTLES.map((b) => {
          const defeated = state.defeatedBossIds.includes(b.id);
          const active = b.id === boss.id;
          const bWorld = WORLDS.find((w) => w.id === b.worldId);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => selectBoss(b.id)}
              className={`flex items-center gap-3.5 rounded-xl border p-3.5 text-left transition-colors ${
                active
                  ? 'border-rose-400 bg-rose-500/10'
                  : 'border-slate-800 bg-[#0D1424] hover:border-slate-700'
              }`}
            >
              <img
                src={b.imageUrl}
                alt={b.name}
                referrerPolicy="no-referrer"
                className="h-14 w-14 shrink-0 rounded-lg object-cover border border-slate-700"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-display text-sm font-bold text-white">{b.name}</p>
                  {defeated && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                </div>
                <p className="truncate text-xs text-slate-400">
                  World {bWorld?.order} · +{b.xpReward} XP
                </p>
                <p className="mt-0.5 truncate text-[11px] text-rose-300">{b.title}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Boss Arena */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Boss Card & HP */}
        <div className="space-y-4 lg:col-span-4">
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0D1424]">
            <div className="relative h-48">
              <img
                src={boss.imageUrl}
                alt={boss.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1424] via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="text-xs font-medium text-rose-300">
                  World {world?.order} Boss · {boss.badgeName}
                </p>
                <h2 className="font-display text-xl font-bold text-white">{boss.name}</h2>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">Boss Shield Integrity</span>
                <span className="font-mono font-semibold tabular-nums text-rose-300">
                  {bossHpPercent}% HP
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  animate={{ width: `${bossHpPercent}%` }}
                  transition={{ duration: 0.45 }}
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400"
                />
              </div>

              <p className="mt-4 text-xs leading-relaxed text-slate-300">{boss.description}</p>

              {/* 3 Stages */}
              <div className="mt-5 space-y-2">
                {boss.stages.map((st, idx) => {
                  const cleared = clearedStages.includes(idx);
                  const current = activeStageIdx === idx;
                  return (
                    <button
                      key={st.stageNumber}
                      type="button"
                      onClick={() => setActiveStageIdx(idx)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                        current
                          ? 'border-rose-400 bg-rose-500/10 text-white'
                          : cleared
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                            : 'border-slate-800 bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <span>
                        Stage {st.stageNumber}: {st.difficulty}
                      </span>
                      {cleared ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Swords className="h-3.5 w-3.5 text-rose-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {alreadyDefeated && (
                <p className="mt-4 text-xs font-medium text-emerald-400">
                  Boss already defeated — you can replay any stage for practice.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Challenge Stage */}
        <div className="space-y-4 lg:col-span-8">
          <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-rose-300">{stage.dialogue}</p>
                <h3 className="mt-1 font-display text-xl font-bold text-white">
                  Stage {stage.stageNumber}: {challenge.title} ({stage.difficulty})
                </h3>
                <p className="mt-1 text-sm text-slate-300">{challenge.description}</p>
              </div>
              <select
                aria-label="Boss Battle language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as ProgrammingLanguage)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-white"
              >
                {PROGRAMMING_LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <MonacoCodeEditor
                value={code}
                onChange={setCode}
                language={language}
                height="280px"
                ariaLabel="Boss battle code editor"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={running}
                onClick={handleAttackBoss}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-400 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {running ? 'Executing Strike...' : 'Run & Strike Boss'}
              </button>

              {execResult && (
                <span
                  className={`font-mono text-xs font-semibold ${
                    execResult.passedAll ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {execResult.passedCount}/{execResult.totalCount} Tests Passed
                </span>
              )}
            </div>

            {execResult && !execResult.passedAll && (
              <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4" />
                  <span>
                    {execResult.compileOrRuntimeError ||
                      'Some test cases failed — inspect your logic and strike again.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {victoryModal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-amber-400/50 bg-amber-500/10 p-5"
            >
              <div className="flex items-center gap-3">
                <Trophy className="h-7 w-7 text-amber-300" />
                <div>
                  <h4 className="font-display text-lg font-bold text-white">
                    Boss Defeated: {boss.name}!
                  </h4>
                  <p className="text-xs text-amber-200">
                    Earned +{boss.xpReward} XP and unlocked badge "{boss.badgeName}". The next world
                    gate is now open.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
