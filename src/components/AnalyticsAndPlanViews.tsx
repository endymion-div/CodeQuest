import { Bot, Calendar, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHALLENGES } from '../data/challenges';
import type { UserStatePayload } from '../types/codequest';

export function AnalyticsView({
  authToken,
  state,
}: {
  authToken: string;
  state: UserStatePayload;
}) {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const totalSubmissions = state.submissions.length;
  const passedSubmissions = state.submissions.filter((s) => s.passed).length;
  const overallAccuracy =
    totalSubmissions > 0 ? Math.round((passedSubmissions / totalSubmissions) * 100) : 100;

  const avgDurationMs =
    totalSubmissions > 0
      ? Math.round(
          state.submissions.reduce((sum, s) => sum + s.executionMs, 0) / totalSubmissions
        )
      : 0;

  // Topic mastery aggregation
  const topicList = ['Syntax', 'Logic', 'Loops', 'Functions', 'Arrays', 'DSA'];
  const topicData = topicList.map((topic) => {
    const subs = state.submissions.filter((s) => {
      const ch = CHALLENGES.find((c) => c.id === s.challengeId);
      return ch?.topic === topic;
    });
    const solvedInTopic = state.solvedChallengeIds.filter((id) => {
      const ch = CHALLENGES.find((c) => c.id === id);
      return ch?.topic === topic;
    }).length;

    const totalInTopic = CHALLENGES.filter((c) => c.topic === topic).length || 1;
    const accuracy =
      subs.length > 0
        ? Math.round((subs.filter((s) => s.passed).length / subs.length) * 100)
        : Math.round((solvedInTopic / totalInTopic) * 100);

    return {
      topic,
      mastery: Math.max(accuracy, Math.round((solvedInTopic / totalInTopic) * 100)),
      solved: solvedInTopic,
    };
  });

  // Difficulty progression data
  const difficultyProgression = state.weeklyActivity.map((day, idx) => ({
    day: day.dayLabel,
    xp: day.xp,
    activities: day.count,
    difficultyScore: Math.min(100, 35 + idx * 7 + (day.count > 0 ? 10 : 0)),
  }));

  async function handleGenerateInsight() {
    setLoadingInsight(true);
    setInsightError(null);
    try {
      const res = await fetch('/api/ai/analytics-insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate AI insight.');
      setAiInsight(data.insight);
    } catch (err) {
      setInsightError(
        err instanceof Error
          ? err.message
          : 'Unable to contact Gemini AI insights right now.'
      );
    } finally {
      setLoadingInsight(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-cyan-300">Performance & Mastery Telemetry</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">Progress Analytics</h1>
        </div>
        <button
          type="button"
          disabled={loadingInsight}
          onClick={handleGenerateInsight}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Bot className="h-4 w-4" />
          {loadingInsight ? 'Analyzing...' : 'Generate AI Coaching Insight'}
        </button>
      </div>

      {aiInsight && (
        <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
            <Sparkles className="h-4 w-4" />
            Gemini Progress Insight
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-100">{aiInsight}</p>
        </div>
      )}

      {insightError && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
          {insightError}
        </div>
      )}

      {/* 4 Summary Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-4">
          <p className="text-xs text-slate-400">Overall Accuracy</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-300">
            {overallAccuracy}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-4">
          <p className="text-xs text-slate-400">Problems Solved</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-white">
            {state.solvedChallengeIds.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-4">
          <p className="text-xs text-slate-400">Avg Execution Speed</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-cyan-300">
            {avgDurationMs}ms
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-4">
          <p className="text-xs text-slate-400">Total Active Days</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-300">
            {state.profile.totalActiveDays}d
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5">
          <h2 className="font-display text-base font-semibold text-white">
            XP Earned (Last 7 Days)
          </h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={difficultyProgression}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="xp"
                  stroke="#22D3EE"
                  fill="#22D3EE"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5">
          <h2 className="font-display text-base font-semibold text-white">
            Topic Mastery & Accuracy (%)
          </h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="topic" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                  }}
                />
                <Bar dataKey="mastery" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-5 lg:col-span-2">
          <h2 className="font-display text-base font-semibold text-white">
            Difficulty Progression & Activity Cadence
          </h2>
          <div className="mt-4 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={difficultyProgression}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="difficultyScore"
                  name="Difficulty Index"
                  stroke="#F59E0B"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="activities"
                  name="Daily Sessions"
                  stroke="#22D3EE"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LearningPlanView({
  authToken,
  state,
  onPlanUpdated,
}: {
  authToken: string;
  state: UserStatePayload;
  onPlanUpdated: (nextState: UserStatePayload) => void;
}) {
  const [currentSkill, setCurrentSkill] = useState<string>(state.profile.experienceLevel);
  const [goal, setGoal] = useState<string>(state.profile.goal);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(6);
  const [deadline, setDeadline] = useState<string>('5 weeks');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/learning-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ currentSkill, goal, hoursPerWeek, deadline }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to build learning path.');
      onPlanUpdated(data.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate learning plan.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleWeek(weekNum: number) {
    const res = await fetch('/api/learning-plan/toggle-week', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ week: weekNum }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      onPlanUpdated(data.state);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-cyan-300">Gemini Curriculum Architect</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-white">
          Build My Learning Path
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleGenerate}
          className="space-y-4 rounded-xl border border-slate-800 bg-[#0D1424] p-5 lg:col-span-4"
        >
          <div>
            <label htmlFor="lp-skill" className="block text-xs font-medium text-slate-300">
              Current Skill Level
            </label>
            <select
              id="lp-skill"
              value={currentSkill}
              onChange={(e) => setCurrentSkill(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <option>Complete beginner</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>

          <div>
            <label htmlFor="lp-goal" className="block text-xs font-medium text-slate-300">
              Target Goal
            </label>
            <input
              id="lp-goal"
              type="text"
              required
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label htmlFor="lp-hours" className="block text-xs font-medium text-slate-300">
              Available Hours / Week
            </label>
            <input
              id="lp-hours"
              type="number"
              min={1}
              max={60}
              required
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white"
            />
          </div>

          <div>
            <label htmlFor="lp-deadline" className="block text-xs font-medium text-slate-300">
              Target Deadline
            </label>
            <input
              id="lp-deadline"
              type="text"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="e.g., 5 weeks or Dec 30"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? 'Generating Roadmap...' : 'Generate Personalized Plan'}
          </button>
        </form>

        <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-6 lg:col-span-8">
          {!state.learningPlan ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-9 w-9 text-cyan-400" />
              <h2 className="mt-3 font-display text-lg font-semibold text-white">
                No Roadmap Generated Yet
              </h2>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-400">
                Enter your current skill level, goal, weekly hours, and target deadline to generate
                a week-by-week CodeQuest roadmap with Gemini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-cyan-300">
                  {state.learningPlan.goal} · {state.learningPlan.hoursPerWeek} hrs/week · Target:{' '}
                  {state.learningPlan.deadline}
                </p>
                <p className="mt-1 text-sm text-slate-200">{state.learningPlan.summary}</p>
              </div>

              <div className="space-y-3">
                {state.learningPlan.weeks.map((wk) => (
                  <div
                    key={wk.week}
                    className={`rounded-lg border p-4 transition-colors ${
                      wk.completed
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-cyan-300">Week {wk.week}</p>
                        <h3 className="font-display text-base font-bold text-white">{wk.title}</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {wk.focusTopics.join(' · ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleWeek(wk.week)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400"
                      >
                        {wk.completed ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            Done
                          </>
                        ) : (
                          <>
                            <Circle className="h-3.5 w-3.5 text-slate-400" />
                            Mark Done
                          </>
                        )}
                      </button>
                    </div>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-300">
                      {wk.tasks.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
