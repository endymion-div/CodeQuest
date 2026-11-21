import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { PROGRAMMING_LANGUAGES } from '../data/languages';
import type {
  DailyTimeBudget,
  ExperienceLevel,
  LearningGoal,
  ProgrammingLanguage,
} from '../types/codequest';

interface OnboardingWizardProps {
  username: string;
  onComplete: (prefs: {
    experienceLevel: ExperienceLevel;
    preferredLanguage: ProgrammingLanguage;
    goal: LearningGoal;
    dailyTime: DailyTimeBudget;
  }) => Promise<void>;
}

const EXPERIENCE_OPTIONS: ExperienceLevel[] = [
  'Complete beginner',
  'Beginner',
  'Intermediate',
  'Advanced',
];

const GOAL_OPTIONS: LearningGoal[] = [
  'Learn programming',
  'Prepare for interviews',
  'Learn DSA',
  'Build projects',
  'College studies',
];

const TIME_OPTIONS: DailyTimeBudget[] = [
  '15 minutes',
  '30 minutes',
  '1 hour',
  '2+ hours',
];

export function OnboardingWizard({ username, onComplete }: OnboardingWizardProps) {
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Beginner');
  const [preferredLanguage, setPreferredLanguage] = useState<ProgrammingLanguage>('python');
  const [goal, setGoal] = useState<LearningGoal>('Learn programming');
  const [dailyTime, setDailyTime] = useState<DailyTimeBudget>('30 minutes');
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    setSaving(true);
    try {
      await onComplete({ experienceLevel, preferredLanguage, goal, dailyTime });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ambience-nebula min-h-screen px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-[#0D1424] p-8">
        <p className="text-xs font-semibold text-cyan-300">Personalize Your Quest</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">
          Welcome, {username}. Let&apos;s tailor your path.
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          CodeQuest adapts starting difficulty, language templates, and daily missions to your goals.
        </p>

        <div className="mt-8 space-y-7">
          <div>
            <p className="text-sm font-semibold text-white">1. Programming experience</p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setExperienceLevel(opt)}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    experienceLevel === opt
                      ? 'border-cyan-400 bg-cyan-500/10 text-white'
                      : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>{opt}</span>
                  {experienceLevel === opt && <Check className="h-4 w-4 text-cyan-400" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              2. Preferred language ({PROGRAMMING_LANGUAGES.length} supported)
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {PROGRAMMING_LANGUAGES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPreferredLanguage(opt.value)}
                  className={`rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors ${
                    preferredLanguage === opt.value
                      ? 'border-cyan-400 bg-cyan-500/10 text-white'
                      : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">3. Primary goal</p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setGoal(opt)}
                  className={`rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                    goal === opt
                      ? 'border-cyan-400 bg-cyan-500/10 text-white'
                      : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">4. Available daily time</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDailyTime(opt)}
                  className={`rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors ${
                    dailyTime === opt
                      ? 'border-cyan-400 bg-cyan-500/10 text-white'
                      : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end border-t border-slate-800 pt-6">
          <button
            type="button"
            disabled={saving}
            onClick={handleFinish}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-60"
          >
            {saving ? 'Configuring Quest...' : 'Enter CodeQuest'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
