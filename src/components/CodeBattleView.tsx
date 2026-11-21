import { Clock, Play, Swords, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CHALLENGES } from '../data/challenges';
import { PROGRAMMING_LANGUAGES } from '../data/languages';
import type { ProgrammingLanguage, SandboxExecutionResult, UserStatePayload } from '../types/codequest';
import { executeChallengeInSandbox } from '../utils/sandboxRunner';
import { soundEngine } from '../utils/soundEffects';
import { MonacoCodeEditor } from './MonacoCodeEditor';

interface CodeBattleViewProps {
  state: UserStatePayload;
  onBattleFinished: (won: boolean) => Promise<void>;
}

const OPPONENTS = [
  { name: 'Arjun Mehta', handle: 'arjun_algo', level: 7, speedSec: 45 },
  { name: 'Maya Lin', handle: 'maya_py', level: 6, speedSec: 60 },
  { name: 'Zara Okafor', handle: 'zara_stack', level: 5, speedSec: 75 },
];

export function CodeBattleView({ state, onBattleFinished }: CodeBattleViewProps) {
  const battlePool = CHALLENGES.slice(0, 8);
  const [challengeId, setChallengeId] = useState(battlePool[0].id);
  const [opponentIdx, setOpponentIdx] = useState(0);
  const [language, setLanguage] = useState<ProgrammingLanguage>(
    state.profile.preferredLanguage || 'javascript'
  );
  const [matchState, setMatchState] = useState<'ready' | 'live' | 'finished'>('ready');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [code, setCode] = useState('');
  const [execResult, setExecResult] = useState<SandboxExecutionResult | null>(null);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);

  const challenge = battlePool.find((c) => c.id === challengeId) || battlePool[0];
  const opponent = OPPONENTS[opponentIdx];

  useEffect(() => {
    setCode(challenge.starterCode[language]);
    setExecResult(null);
  }, [challenge.id, language]);

  useEffect(() => {
    if (matchState !== 'live') return;
    const interval = setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 1;
        if (next >= opponent.speedSec) {
          setMatchState('finished');
          setWinner('opponent');
          void onBattleFinished(false);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [matchState, opponent.speedSec]);

  function startMatch() {
    setCode(challenge.starterCode[language]);
    setElapsedSec(0);
    setExecResult(null);
    setWinner(null);
    setMatchState('live');
  }

  async function submitBattleCode() {
    const res = await executeChallengeInSandbox(
      code,
      language,
      challenge.functionName,
      challenge.testCases
    );
    setExecResult(res);

    if (res.passedAll) {
      soundEngine.playLevelUp();
      setMatchState('finished');
      setWinner('player');
      await onBattleFinished(true);
    } else {
      soundEngine.playError();
    }
  }

  const opponentProgress = Math.min(100, Math.round((elapsedSec / opponent.speedSec) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-cyan-300">Competitive Sandbox Arena</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">Code Battle (1v1)</h1>
        </div>
        <p className="text-xs text-slate-400 tabular-nums">Battle Wins: {state.battleWins}</p>
      </div>

      {/* Player A vs Player B Scoreboard */}
      <div className="grid gap-4 rounded-xl border border-slate-800 bg-[#0D1424] p-5 md:grid-cols-3 md:items-center">
        <div>
          <p className="text-xs text-cyan-300">Player A (You)</p>
          <p className="mt-1 font-display text-lg font-bold text-white">
            {state.profile.username}
          </p>
          <p className="text-xs text-slate-400">
            Level {state.profile.level} · {execResult?.passedAll ? 'All Tests Passed' : 'Coding'}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-1.5 border-y border-slate-800 py-3 md:border-x md:border-y-0">
          <div className="flex items-center gap-2 font-mono text-lg font-bold tabular-nums text-white">
            <Swords className="h-5 w-5 text-amber-400" />
            <span>VS</span>
          </div>
          <div className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-slate-300">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            {elapsedSec}s / {opponent.speedSec}s limit
          </div>
        </div>

        <div className="md:text-right">
          <p className="text-xs text-rose-300">Player B (Opponent)</p>
          <p className="mt-1 font-display text-lg font-bold text-white">{opponent.name}</p>
          <p className="text-xs text-slate-400">
            @{opponent.handle} · Level {opponent.level}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-rose-400 transition-all duration-500"
              style={{ width: `${opponentProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Match Setup Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0D1424] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Battle problem"
            disabled={matchState === 'live'}
            value={challengeId}
            onChange={(e) => setChallengeId(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
          >
            {battlePool.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.difficulty})
              </option>
            ))}
          </select>

          <select
            aria-label="Battle opponent"
            disabled={matchState === 'live'}
            value={opponentIdx}
            onChange={(e) => setOpponentIdx(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
          >
            {OPPONENTS.map((o, idx) => (
              <option key={o.handle} value={idx}>
                vs {o.name} ({o.speedSec}s pace)
              </option>
            ))}
          </select>

          <select
            aria-label="Battle language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as ProgrammingLanguage)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
          >
            {PROGRAMMING_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={startMatch}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
        >
          <Play className="h-3.5 w-3.5" />
          {matchState === 'ready' ? 'Start Duel' : 'Restart Duel'}
        </button>
      </div>

      {/* Coding Area */}
      <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5">
        <h2 className="font-display text-lg font-bold text-white">{challenge.title}</h2>
        <p className="mt-1 text-sm text-slate-300">{challenge.description}</p>

        <div className="mt-4">
          <MonacoCodeEditor
            value={code}
            onChange={setCode}
            language={language}
            height="280px"
            ariaLabel="Code Battle editor"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={matchState !== 'live'}
            onClick={submitBattleCode}
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            Submit & Finish Race
          </button>

          {execResult && !execResult.passedAll && (
            <span className="font-mono text-xs text-rose-400">
              {execResult.passedCount}/{execResult.totalCount} tests passed — keep coding!
            </span>
          )}
        </div>

        {matchState === 'finished' && winner && (
          <div
            className={`mt-4 flex items-center gap-3 rounded-lg border p-4 ${
              winner === 'player'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
            }`}
          >
            <Trophy className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">
                {winner === 'player'
                  ? `Victory! You solved ${challenge.title} in ${elapsedSec}s (+60 XP).`
                  : `${opponent.name} finished first at ${opponent.speedSec}s (+15 XP participation).`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
