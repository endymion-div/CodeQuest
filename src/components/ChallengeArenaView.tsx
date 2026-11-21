import {
  Bot,
  CheckCircle2,
  Play,
  RotateCcw,
  Search,
  Send,
  Shield,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CHALLENGES, getTodaysDailyChallenge } from '../data/challenges';
import { PROGRAMMING_LANGUAGES } from '../data/languages';
import type {
  ChallengeItem,
  DifficultyTier,
  ProgrammingLanguage,
  SandboxExecutionResult,
  TutorMessage,
  UserStatePayload,
} from '../types/codequest';
import { executeChallengeInSandbox } from '../utils/sandboxRunner';
import { soundEngine } from '../utils/soundEffects';
import { MonacoCodeEditor } from './MonacoCodeEditor';

interface ChallengeArenaViewProps {
  authToken: string;
  state: UserStatePayload;
  mode: 'challenges' | 'daily';
  initialChallengeId?: string;
  onChallengeSubmitted: (payload: {
    challenge: ChallengeItem;
    language: ProgrammingLanguage;
    code: string;
    result: SandboxExecutionResult;
    hintsUsed: number;
    isDaily: boolean;
  }) => Promise<void>;
}

function formatDifficultyLabel(diff: DifficultyTier): string {
  return diff === 'Intermediate' ? 'Medium' : diff;
}

function getDifficultyTextColor(diff: DifficultyTier): string {
  switch (diff) {
    case 'Beginner':
      return 'text-cyan-300';
    case 'Easy':
      return 'text-emerald-300';
    case 'Intermediate':
      return 'text-amber-300';
    case 'Hard':
      return 'text-rose-300';
  }
}

export function ChallengeArenaView({
  authToken,
  state,
  mode,
  initialChallengeId,
  onChallengeSubmitted,
}: ChallengeArenaViewProps) {
  const dailyChallenge = getTodaysDailyChallenge(state.profile.level);
  const [selectedId, setSelectedId] = useState<string>(
    mode === 'daily' ? dailyChallenge.id : initialChallengeId || CHALLENGES[0].id
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');

  const activeChallenge =
    (mode === 'daily'
      ? dailyChallenge
      : CHALLENGES.find((c) => c.id === selectedId) || CHALLENGES[0]);

  const [language, setLanguage] = useState<ProgrammingLanguage>(
    state.profile.preferredLanguage || 'javascript'
  );
  const [code, setCode] = useState<string>(activeChallenge.starterCode[language]);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [execResult, setExecResult] = useState<SandboxExecutionResult | null>(null);

  // AI Tutor state
  const [hintsUsed, setHintsUsed] = useState(0);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);

  useEffect(() => {
    setCode(activeChallenge.starterCode[language]);
    setExecResult(null);
    setHintsUsed(0);
    setMessages([]);
    setTutorError(null);
  }, [activeChallenge.id, language]);

  const filteredChallenges = CHALLENGES.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiff =
      difficultyFilter === 'All' ||
      (difficultyFilter === 'Medium' ? c.difficulty === 'Intermediate' : c.difficulty === difficultyFilter);
    return matchesSearch && matchesDiff;
  });

  async function handleRunCode(): Promise<SandboxExecutionResult> {
    setRunning(true);
    try {
      const res = await executeChallengeInSandbox(
        code,
        language,
        activeChallenge.functionName,
        activeChallenge.testCases
      );
      setExecResult(res);
      return res;
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmitSolution() {
    setSubmitting(true);
    try {
      const res = await handleRunCode();
      if (res.passedAll) {
        soundEngine.playSuccess();
      } else {
        soundEngine.playError();
      }
      await onChallengeSubmitted({
        challenge: activeChallenge,
        language,
        code,
        result: res,
        hintsUsed,
        isDaily: mode === 'daily',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function requestTutorHelp(customPrompt?: string, allowSolutionReveal = false) {
    setTutorOpen(true);
    setTutorError(null);
    const nextHint = Math.min(3, hintsUsed + 1);
    if (!customPrompt) {
      setHintsUsed(nextHint);
    }

    const userMsgText =
      customPrompt || `Please give me progressive Hint ${nextHint} without spoiling the full answer.`;
    const userEntry: TutorMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userMsgText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userEntry]);
    setTutorLoading(true);

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          challengeId: activeChallenge.id,
          language,
          userCode: code,
          userMessage: userMsgText,
          hintStep: nextHint,
          allowSolutionReveal,
          lastError: execResult?.compileOrRuntimeError,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI Tutor unavailable.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          hintLevel: data.hintLevel,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      const fallbackHint = activeChallenge.hints[Math.min(nextHint - 1, activeChallenge.hints.length - 1)];
      setTutorError(
        `${err instanceof Error ? err.message : 'AI request failed.'} Showing built-in Hint ${nextHint}: ${fallbackHint}`
      );
    } finally {
      setTutorLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-cyan-300">
            {mode === 'daily'
              ? 'Daily Coding Challenge · +50 Bonus XP'
              : `Coding Arena · Adaptive Tier: ${state.profile.adaptiveDifficulty}`}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">
            {activeChallenge.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span>{execResult?.runtimeLabel || 'Isolated Web Worker Sandbox (Demo Runtime)'}</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left Sidebar: Challenge List (hidden in single Daily Challenge focus unless user wants switch) */}
        {mode === 'challenges' && (
          <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-4 lg:col-span-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="search"
                aria-label="Search challenges"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search challenges..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-medium">Difficulty</span>
              <span className="font-mono tabular-nums">
                {filteredChallenges.length}/{CHALLENGES.length} challenges
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {['All', 'Beginner', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficultyFilter(diff)}
                  className={`rounded-md px-2.5 py-1 text-center text-[11px] font-medium transition-colors whitespace-nowrap ${
                    difficultyFilter === diff
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            <div className="mt-3 max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
              {filteredChallenges.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No challenges match your filter.
                </p>
              ) : (
                filteredChallenges.map((c) => {
                  const solved = state.solvedChallengeIds.includes(c.id);
                  const active = c.id === activeChallenge.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        active
                          ? 'border-cyan-400 bg-cyan-500/10'
                          : 'border-slate-800/80 bg-[#090E1A] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-white">{c.title}</span>
                        {solved && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        <span className={getDifficultyTextColor(c.difficulty)}>
                          {formatDifficultyLabel(c.difficulty)}
                        </span>{' '}
                        · {c.topic} · +{c.xpReward} XP
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Center/Right: Problem Description + Monaco Editor + Test Cases + AI Tutor */}
        <div
          className={`space-y-4 ${mode === 'challenges' ? 'lg:col-span-9' : 'lg:col-span-12'}`}
        >
          {/* Problem Brief & Language Toolbar */}
          <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-400">
                  <span className={`font-semibold ${getDifficultyTextColor(activeChallenge.difficulty)}`}>
                    {formatDifficultyLabel(activeChallenge.difficulty)}
                  </span>{' '}
                  · {activeChallenge.topic} · +{mode === 'daily' ? 50 : activeChallenge.xpReward} XP
                </p>
                <p className="text-sm leading-relaxed text-slate-200">
                  {activeChallenge.description}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label htmlFor="challenge-lang-select" className="text-xs text-slate-400">
                  Language
                </label>
                <select
                  id="challenge-lang-select"
                  aria-label="Programming Language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as ProgrammingLanguage)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-white focus:border-cyan-500 focus:outline-none"
                >
                  {PROGRAMMING_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label} ({l.extension})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Monaco Code Editor + Action Bar */}
          <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-4">
            <MonacoCodeEditor
              value={code}
              onChange={setCode}
              language={language}
              height="320px"
              ariaLabel={`${activeChallenge.title} code editor`}
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={running || submitting}
                  onClick={handleRunCode}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:border-cyan-500/60 disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5 text-cyan-400" />
                  {running ? 'Running...' : 'Run Code'}
                </button>

                <button
                  type="button"
                  disabled={running || submitting}
                  onClick={handleSubmitSolution}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>

                <button
                  type="button"
                  onClick={() => requestTutorHelp()}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Get Hint ({Math.min(hintsUsed + 1, 3)}/3)
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCode(activeChallenge.starterCode[language]);
                  setExecResult(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* Test Cases & Output + AI Tutor Split */}
          <div className="grid gap-5 lg:grid-cols-12">
            {/* Test Cases Panel */}
            <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5 lg:col-span-7">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-white">Test Cases</h2>
                {execResult ? (
                  <span
                    className={`font-mono text-xs font-semibold tabular-nums ${
                      execResult.passedAll ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {execResult.passedCount}/{execResult.totalCount} Passed · {execResult.executionMs}ms
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
                    {activeChallenge.testCases.length} checks ready
                  </span>
                )}
              </div>

              {execResult?.compileOrRuntimeError && (
                <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 font-mono text-xs text-rose-200">
                  {execResult.compileOrRuntimeError}
                </div>
              )}

              <div className="mt-3 space-y-2.5">
                {activeChallenge.testCases.map((tc, idx) => {
                  const resRow = execResult?.results[idx];
                  return (
                    <div
                      key={tc.id}
                      className={`rounded-lg border p-3 ${
                        resRow
                          ? resRow.passed
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : 'border-rose-500/40 bg-rose-500/10'
                          : 'border-slate-800 bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-medium text-white">
                          {tc.functionCall}
                        </span>
                        {resRow ? (
                          resRow.passed ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-300">
                              <XCircle className="h-3.5 w-3.5" />
                              Failed
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-400">{tc.description}</span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-4 font-mono text-[11px] text-slate-300">
                        <span>Expected: {tc.expectedOutput}</span>
                        {resRow && <span>Actual: {resRow.actualOutput}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {execResult?.stdout && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-400">Execution Output</p>
                  <pre className="mt-1.5 rounded-lg border border-slate-800 bg-[#070B14] p-3 font-mono text-xs text-slate-200">
                    {execResult.stdout}
                  </pre>
                </div>
              )}
            </div>

            {/* AI Coding Tutor */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0D1424] p-5 lg:col-span-5">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-cyan-400" />
                    <h2 className="font-display text-base font-semibold text-white">
                      AI Coding Tutor
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      requestTutorHelp(
                        'I explicitly request the complete solution and step-by-step explanation.',
                        true
                      )
                    }
                    className="text-[11px] font-medium text-slate-400 hover:text-cyan-300"
                  >
                    Reveal Solution
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Guides you step-by-step without spoiling the solution unless asked.
                </p>

                <div className="mt-3 max-h-56 space-y-2.5 overflow-y-auto pr-1">
                  {!tutorOpen && messages.length === 0 ? (
                    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-300">
                      Click <span className="font-semibold text-amber-300">Get Hint</span> or ask a
                      question below to receive progressive guidance on {activeChallenge.title}.
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-lg p-3 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-slate-800/80 text-slate-200'
                            : 'border border-cyan-500/25 bg-cyan-500/10 text-slate-100'
                        }`}
                      >
                        <p className="mb-1 font-semibold text-[11px] text-cyan-300">
                          {msg.role === 'user' ? 'You' : `CodeQuest Tutor${msg.hintLevel ? ` · Hint ${msg.hintLevel}` : ''}`}
                        </p>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))
                  )}
                  {tutorLoading && (
                    <div className="text-xs text-cyan-300">Analyzing your code...</div>
                  )}
                  {tutorError && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                      {tutorError}
                    </div>
                  )}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!tutorInput.trim()) return;
                  const txt = tutorInput.trim();
                  setTutorInput('');
                  void requestTutorHelp(txt, false);
                }}
                className="mt-4 flex gap-2"
              >
                <input
                  type="text"
                  aria-label="Ask AI Coding Tutor"
                  value={tutorInput}
                  onChange={(e) => setTutorInput(e.target.value)}
                  placeholder="Ask why your code failed..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={tutorLoading}
                  aria-label="Send tutor question"
                  className="rounded-lg bg-cyan-500 px-3 py-2 text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
