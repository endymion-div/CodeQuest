import { CheckCircle2, FolderGit2, Lock, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PROJECT_QUESTS } from '../data/curriculum';
import type { ProjectQuestItem, SandboxExecutionResult, UserStatePayload } from '../types/codequest';
import { executeChallengeInSandbox } from '../utils/sandboxRunner';
import { soundEngine } from '../utils/soundEffects';
import { MonacoCodeEditor } from './MonacoCodeEditor';

interface ProjectQuestsViewProps {
  state: UserStatePayload;
  onCompleteProject: (project: ProjectQuestItem) => Promise<void>;
}

export function ProjectQuestsView({ state, onCompleteProject }: ProjectQuestsViewProps) {
  const [selectedId, setSelectedId] = useState(PROJECT_QUESTS[0].id);
  const project = PROJECT_QUESTS.find((p) => p.id === selectedId) || PROJECT_QUESTS[0];
  const [code, setCode] = useState(project.starterCode);
  const [running, setRunning] = useState(false);
  const [execResult, setExecResult] = useState<SandboxExecutionResult | null>(null);

  useEffect(() => {
    setCode(project.starterCode);
    setExecResult(null);
  }, [project.id]);

  const unlocked = state.completedLessonIds.length >= project.requiredLessons;
  const completed = state.completedProjectIds.includes(project.id);

  async function handleValidateProject() {
    setRunning(true);
    try {
      const res = await executeChallengeInSandbox(
        code,
        project.language,
        project.validationFunction,
        project.testCases
      );
      setExecResult(res);
      if (res.passedAll) {
        soundEngine.playSuccess();
        await onCompleteProject(project);
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
          <p className="text-xs font-semibold text-cyan-300">Applied Mini-Projects</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">Project Quests</h1>
        </div>
        <p className="text-xs text-slate-400 tabular-nums">
          {state.completedProjectIds.length}/{PROJECT_QUESTS.length} projects shipped
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-2.5 lg:col-span-4">
          {PROJECT_QUESTS.map((p) => {
            const isUnlocked = state.completedLessonIds.length >= p.requiredLessons;
            const isDone = state.completedProjectIds.includes(p.id);
            const active = p.id === project.id;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-slate-800 bg-[#0D1424] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold text-white">{p.title}</span>
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : !isUnlocked ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  ) : (
                    <FolderGit2 className="h-4 w-4 shrink-0 text-cyan-400" />
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {p.difficulty} · +{p.xpReward} XP ·{' '}
                  {isUnlocked ? p.badgeName : `Requires ${p.requiredLessons} lessons`}
                </p>
              </button>
            );
          })}
        </div>

        <div className="space-y-4 lg:col-span-8">
          <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-cyan-300">
                  Badge Reward: {project.badgeName} · +{project.xpReward} XP
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-white">{project.title}</h2>
                <p className="mt-2 text-sm text-slate-300">{project.description}</p>
              </div>
              {completed && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Shipped
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {project.checkpoints.map((cp, idx) => (
                <div
                  key={cp}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-300"
                >
                  <span className="font-mono text-cyan-300">0{idx + 1}. </span>
                  {cp}
                </div>
              ))}
            </div>

            {!unlocked ? (
              <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
                Complete {project.requiredLessons} lessons in the Learning World to unlock this
                project ({state.completedLessonIds.length}/{project.requiredLessons} completed).
              </div>
            ) : (
              <>
                <div className="mt-5">
                  <MonacoCodeEditor
                    value={code}
                    onChange={setCode}
                    language={project.language}
                    height="270px"
                    ariaLabel={`${project.title} editor`}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={running}
                    onClick={handleValidateProject}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {running ? 'Verifying Build...' : 'Verify & Ship Project'}
                  </button>

                  {execResult && (
                    <span
                      className={`font-mono text-xs font-semibold ${
                        execResult.passedAll ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {execResult.passedCount}/{execResult.totalCount} Project Checks Passed
                    </span>
                  )}
                </div>

                {execResult && (
                  <div className="mt-4 space-y-2">
                    {execResult.results.map((r) => (
                      <div
                        key={r.testCaseId}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 font-mono text-xs ${
                          r.passed
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                            : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                        }`}
                      >
                        <span>{r.inputDisplay}</span>
                        <span>
                          {r.passed ? 'PASS' : `Got ${r.actualOutput} (expected ${r.expectedOutput})`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
