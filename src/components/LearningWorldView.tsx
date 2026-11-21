import { ArrowRight, CheckCircle2, Lock, Play, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { LESSONS, WORLDS } from '../data/curriculum';
import { CHALLENGES } from '../data/challenges';
import type { LessonItem, UserStatePayload } from '../types/codequest';
import { soundEngine } from '../utils/soundEffects';

interface LearningWorldViewProps {
  state: UserStatePayload;
  initialWorldId?: string;
  onCompleteLesson: (lesson: LessonItem) => Promise<void>;
  onOpenChallenge: (challengeId: string) => void;
  onOpenBoss: (bossId: string) => void;
}

export function LearningWorldView({
  state,
  initialWorldId,
  onCompleteLesson,
  onOpenChallenge,
  onOpenBoss,
}: LearningWorldViewProps) {
  const [selectedWorldId, setSelectedWorldId] = useState<string>(initialWorldId || 'w1');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submittedCorrect, setSubmittedCorrect] = useState<boolean | null>(null);
  const [completing, setCompleting] = useState(false);

  const selectedWorld = WORLDS.find((w) => w.id === selectedWorldId) || WORLDS[0];
  const worldLessons = LESSONS.filter((l) => l.worldId === selectedWorld.id);
  const worldChallenges = CHALLENGES.filter((c) => c.worldId === selectedWorld.id);
  const activeLesson = worldLessons.find((l) => l.id === activeLessonId) || worldLessons[0];

  function isWorldUnlocked(worldOrder: number, requiredXp: number): boolean {
    if (worldOrder === 1) return true;
    const prevWorld = WORLDS.find((w) => w.order === worldOrder - 1);
    const prevLessons = prevWorld ? LESSONS.filter((l) => l.worldId === prevWorld.id) : [];
    const prevCompleted =
      prevLessons.length > 0 &&
      prevLessons.every((l) => state.completedLessonIds.includes(l.id));
    return state.profile.xp >= requiredXp || prevCompleted;
  }

  function isLessonUnlocked(lesson: LessonItem, index: number): boolean {
    if (index === 0) return true;
    const prevLesson = worldLessons[index - 1];
    return (
      state.completedLessonIds.includes(lesson.id) ||
      state.completedLessonIds.includes(prevLesson.id)
    );
  }

  function selectLesson(lessonId: string) {
    setActiveLessonId(lessonId);
    setSelectedOption(null);
    setSubmittedCorrect(null);
  }

  async function handleCheckAnswer() {
    if (!activeLesson || selectedOption === null) return;
    const isCorrect = selectedOption === activeLesson.question.correctIndex;
    setSubmittedCorrect(isCorrect);

    if (isCorrect) {
      soundEngine.playSuccess();
      setCompleting(true);
      try {
        await onCompleteLesson(activeLesson);
      } finally {
        setCompleting(false);
      }
    } else {
      soundEngine.playError();
    }
  }

  function handleNextLesson() {
    const idx = worldLessons.findIndex((l) => l.id === activeLesson.id);
    if (idx >= 0 && idx < worldLessons.length - 1) {
      selectLesson(worldLessons[idx + 1].id);
    }
  }

  const completedInWorld = worldLessons.filter((l) =>
    state.completedLessonIds.includes(l.id)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-cyan-300">Learning World Map</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">
            10 Worlds · Interactive Missions
          </h1>
        </div>
        <p className="text-xs text-slate-400 tabular-nums">
          {state.completedLessonIds.length} of {LESSONS.length} lessons completed ·{' '}
          {state.profile.xp} XP earned
        </p>
      </div>

      {/* Horizontal World Map Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {WORLDS.map((w) => {
          const unlocked = isWorldUnlocked(w.order, w.requiredXp);
          const active = w.id === selectedWorld.id;
          const lessonsForW = LESSONS.filter((l) => l.worldId === w.id);
          const doneForW = lessonsForW.filter((l) =>
            state.completedLessonIds.includes(l.id)
          ).length;

          return (
            <button
              key={w.id}
              type="button"
              disabled={!unlocked}
              onClick={() => {
                setSelectedWorldId(w.id);
                setActiveLessonId(null);
                setSelectedOption(null);
                setSubmittedCorrect(null);
              }}
              className={`rounded-xl border p-3.5 text-left transition-colors ${
                active
                  ? 'border-cyan-400 bg-[#0D1A2D]'
                  : unlocked
                    ? 'border-slate-800 bg-[#0D1424] hover:border-slate-700'
                    : 'cursor-not-allowed border-slate-800/70 bg-[#090E1A]'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={`font-mono ${unlocked ? 'text-cyan-300' : 'text-slate-500'}`}>
                  World {w.order}
                </span>
                {unlocked ? (
                  <span className="font-mono text-slate-400 tabular-nums">
                    {doneForW}/{lessonsForW.length}
                  </span>
                ) : (
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                )}
              </div>
              <p
                className={`mt-1.5 truncate text-sm font-semibold ${
                  unlocked ? 'text-white' : 'text-slate-400'
                }`}
              >
                {w.title}
              </p>
              <p
                className={`mt-0.5 truncate text-[11px] ${
                  unlocked ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {unlocked ? w.subtitle : `Unlocks at ${w.requiredXp} XP`}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected World Workspace: Left Level Path + Right Interactive Lesson Stage */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Level List */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5">
            <p className="text-xs text-slate-400">
              World {selectedWorld.order} · {completedInWorld}/{worldLessons.length} Lessons
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-white">
              {selectedWorld.title}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {selectedWorld.description}
            </p>

            <div className="mt-4 space-y-2">
              {worldLessons.map((lesson, idx) => {
                const done = state.completedLessonIds.includes(lesson.id);
                const unlocked = isLessonUnlocked(lesson, idx);
                const isSelected = activeLesson?.id === lesson.id;

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => selectLesson(lesson.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/10 text-white'
                        : unlocked
                          ? 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-700'
                          : 'cursor-not-allowed border-slate-800/50 bg-slate-900/30 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      ) : unlocked ? (
                        <Play className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      )}
                      <span className="truncate text-sm font-medium">
                        {lesson.order}. {lesson.title}
                      </span>
                    </div>
                    <span className="font-mono text-xs tabular-nums text-amber-300 shrink-0 ml-2">
                      +{lesson.xpReward} XP
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedWorld.bossId && (
              <button
                type="button"
                onClick={() => onOpenBoss(selectedWorld.bossId!)}
                className="mt-4 flex w-full items-center justify-between rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
              >
                <span>Enter World {selectedWorld.order} Boss Battle</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {worldChallenges.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5">
              <h3 className="text-sm font-semibold text-white">Practice Coding Challenges</h3>
              <div className="mt-3 space-y-2">
                {worldChallenges.map((ch) => {
                  const solved = state.solvedChallengeIds.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => onOpenChallenge(ch.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left text-xs hover:border-cyan-500/50"
                    >
                      <span className="font-medium text-slate-200">{ch.title}</span>
                      <span
                        className={`font-mono ${solved ? 'text-emerald-400' : 'text-cyan-300'}`}
                      >
                        {solved ? 'Solved' : `+${ch.xpReward} XP`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Interactive Lesson Stage */}
        {activeLesson && (
          <div className="lg:col-span-8">
            <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <p className="text-xs text-cyan-300">
                    World {selectedWorld.order} · Level {activeLesson.order}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-white">
                    {activeLesson.title}
                  </h2>
                </div>
                <span className="font-mono text-xs font-semibold tabular-nums text-amber-300">
                  +{activeLesson.xpReward} XP · {activeLesson.durationMinutes} min
                </span>
              </div>

              {/* Concise Concept */}
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Core Concept
                </p>
                <p className="mt-2 text-base leading-relaxed text-slate-200">
                  {activeLesson.concept}
                </p>
                <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-[#070B14] p-4 font-mono text-sm text-emerald-300">
                  {activeLesson.exampleCode}
                </pre>
              </div>

              {/* Immediate Interactive Question */}
              <div className="mt-6 border-t border-slate-800 pt-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Quick Interactive Check
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold text-white">
                  {activeLesson.question.prompt}
                </h3>

                {activeLesson.question.codeSnippet && (
                  <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-[#070B14] p-4 font-mono text-sm text-cyan-200">
                    {activeLesson.question.codeSnippet}
                  </pre>
                )}

                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {activeLesson.question.options.map((opt, idx) => {
                    const selected = selectedOption === idx;
                    const showResult = submittedCorrect !== null;
                    const isCorrectOpt = idx === activeLesson.question.correctIndex;

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSelectedOption(idx);
                          setSubmittedCorrect(null);
                        }}
                        className={`rounded-lg border px-4 py-3 text-left text-sm font-mono transition-colors ${
                          showResult && selected
                            ? isCorrectOpt
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                              : 'border-rose-500 bg-rose-500/15 text-rose-200'
                            : selected
                              ? 'border-cyan-400 bg-cyan-500/15 text-white'
                              : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'
                        }`}
                      >
                        <span className="mr-2 text-slate-400">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {submittedCorrect !== null && (
                  <div
                    className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                      submittedCorrect
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                    }`}
                  >
                    <p className="font-semibold">
                      {submittedCorrect ? 'Correct! Lesson completed.' : 'Not quite — try again!'}
                    </p>
                    <p className="mt-1 text-xs opacity-90">
                      {submittedCorrect
                        ? activeLesson.question.explanation
                        : 'Re-read the snippet line by line and select another option.'}
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={selectedOption === null || completing}
                    onClick={handleCheckAnswer}
                    className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {completing ? 'Saving Progress...' : 'Check Answer'}
                  </button>

                  {submittedCorrect && (
                    <button
                      type="button"
                      onClick={handleNextLesson}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20"
                    >
                      Next Lesson
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
