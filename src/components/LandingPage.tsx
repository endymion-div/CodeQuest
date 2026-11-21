import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Code2,
  Compass,
  Flame,
  Layers,
  Play,
  Shield,
  Swords,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { WORLDS } from '../data/curriculum';

interface LandingPageProps {
  onStartQuest: () => void;
  onDemoLogin: () => void;
  onOpenLogin: () => void;
}

export function LandingPage({
  onStartQuest,
  onDemoLogin,
  onOpenLogin,
}: LandingPageProps) {
  const [previewAnswer, setPreviewAnswer] = useState<number | null>(null);
  const [selectedWorldOrder, setSelectedWorldOrder] = useState<number>(1);

  const selectedWorld = WORLDS.find((w) => w.order === selectedWorldOrder) || WORLDS[0];

  const platformCapabilities = [
    {
      num: '01',
      title: 'Learn through missions',
      description:
        'Progress across 10 structured coding worlds—from variables and loops to data structures and interview algorithms.',
      icon: Compass,
    },
    {
      num: '02',
      title: 'Real coding challenges',
      description:
        'Write functions in Monaco Editor across 12 languages—Python, JavaScript, TypeScript, Java, C++, C, Go, Rust, C#, Kotlin, Swift, and Ruby—with instant test verification.',
      icon: Code2,
    },
    {
      num: '03',
      title: 'AI-powered hints',
      description:
        'Gemini acts as a Socratic coding tutor—offering progressive 3-step nudges and plain-language mistake explanations.',
      icon: Bot,
    },
    {
      num: '04',
      title: 'XP and levels',
      description:
        'Earn XP for every lesson, challenge, daily mission, and project to ascend from Code Rookie to Code Legend.',
      icon: Zap,
    },
    {
      num: '05',
      title: 'Coding streaks',
      description:
        'Build daily momentum with a live streak tracker, weekly activity heatmap, and adaptive difficulty calibration.',
      icon: Flame,
    },
    {
      num: '06',
      title: 'Boss battles',
      description:
        'Conquer multi-stage boss encounters like Robot Army and Recursion Hydra at the gate of major worlds.',
      icon: Swords,
    },
    {
      num: '07',
      title: 'Progress analytics',
      description:
        'Track topic mastery, accuracy, completion speed, and mistake patterns with interactive Recharts insights.',
      icon: BarChart3,
    },
  ];

  return (
    <div className="ambience-nebula min-h-screen text-slate-100">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#070B14]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            CodeQuest
          </a>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
          >
            <a
              href="#curriculum"
              className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
            >
              Curriculum
            </a>
            <a
              href="#features"
              className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#sandbox-preview"
              className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
            >
              Interactive Demo
            </a>
            <button
              type="button"
              onClick={onOpenLogin}
              className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onStartQuest}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Start Your Quest
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="quest-grid-bg relative overflow-hidden border-b border-slate-800/80">
          <div className="mx-auto grid max-w-7xl items-stretch gap-10 px-6 py-16 lg:grid-cols-12 lg:py-24">
            <div className="flex flex-col justify-center lg:col-span-6">
              <p className="text-sm font-medium text-cyan-300">
                CodeQuest · Code. Solve. Level Up.
              </p>
              <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl text-balance">
                Learn to code by playing.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Master programming through missions, challenges, boss battles and real coding.
                Practice in an interactive editor with adaptive difficulty and guided AI hints.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onStartQuest}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  Start Your Quest
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#curriculum"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-6 py-3 text-sm font-semibold text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  Explore Curriculum
                </a>
                <button
                  type="button"
                  onClick={onDemoLogin}
                  className="inline-flex items-center gap-2 px-3 py-3 text-sm font-medium text-cyan-300 underline-offset-4 hover:underline whitespace-nowrap shrink-0"
                >
                  Launch Demo Workspace
                </button>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-6 border-t border-slate-800/80 pt-6">
                <div>
                  <div className="font-mono text-2xl font-bold tabular-nums text-white">10</div>
                  <div className="mt-1 text-xs text-slate-400">Learning Worlds</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-bold tabular-nums text-white">52+</div>
                  <div className="mt-1 text-xs text-slate-400">Interactive Lessons</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-bold tabular-nums text-white">50+</div>
                  <div className="mt-1 text-xs text-slate-400">Easy to Hard Challenges</div>
                </div>
              </div>
            </div>

            {/* Animated Preview of the CodeQuest World */}
            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[380px] overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
                <img
                  src="/src/assets/images/hero_codequest_world_1795233960378.jpg"
                  alt="CodeQuest futuristic coding world citadel and illuminated circuit pathways"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-[#070B14]/45 to-transparent" />

                {/* Interactive Animated Quest HUD Preview */}
                <div className="absolute inset-x-4 bottom-4 space-y-3">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="glass-panel rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-cyan-300">
                          World 3 · Boss Encounter
                        </p>
                        <p className="mt-0.5 font-display text-base font-semibold text-white">
                          Robot Army — Loops Gauntlet
                        </p>
                      </div>
                      <span className="font-mono text-xs font-semibold tabular-nums text-amber-300">
                        +125 XP
                      </span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <motion.div
                        initial={{ width: '32%' }}
                        animate={{ width: '74%' }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Stage 2 of 3 · Factorial Multiplier</span>
                      <span className="font-mono tabular-nums">74% cleared</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Mini-Lesson & Sandbox Preview */}
        <section id="sandbox-preview" className="border-b border-slate-800/80 py-16 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Try a live mission step
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold text-white text-balance">
                Short interactive concepts, immediate feedback.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                No walls of textbook prose. Every lesson pairs a concise core concept with an
                immediate trace check or coding problem so you learn by solving.
              </p>
              <div className="mt-6 space-y-2 text-xs text-slate-400">
                <p>World 1 · Level 1: Variables · +10 XP</p>
                <p>Supports 12 languages: Python, JS, TS, Java, C++, C, Go, Rust, C#, Kotlin, Swift &amp; Ruby</p>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <p className="text-xs text-slate-400">Level 1 · Variables</p>
                    <h3 className="mt-0.5 font-display text-lg font-semibold text-white">
                      What will this print?
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-amber-300 tabular-nums">+10 XP</span>
                </div>

                <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-800 bg-[#070B14] p-4 font-mono text-sm text-cyan-200">
{`x = 10
y = 5
print(x + y)`}
                </pre>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {['15', '50', '105', 'Error'].map((opt, idx) => {
                    const isSelected = previewAnswer === idx;
                    const isCorrect = idx === 0;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPreviewAnswer(idx)}
                        className={`rounded-lg border px-4 py-2.5 text-sm font-mono font-medium transition-colors ${
                          isSelected
                            ? isCorrect
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                              : 'border-rose-500 bg-rose-500/15 text-rose-300'
                            : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-500/60'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}. {opt}
                      </button>
                    );
                  })}
                </div>

                {previewAnswer !== null && (
                  <div
                    className={`mt-4 flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
                      previewAnswer === 0
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        {previewAnswer === 0
                          ? 'Correct! x + y adds 10 and 5 to print 15.'
                          : 'Not quite — x is 10 and y is 5, so + adds them numerically.'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onStartQuest}
                      className="text-xs font-semibold text-cyan-300 hover:underline whitespace-nowrap shrink-0 ml-3"
                    >
                      Continue Quest
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 7 Core Feature Pillars */}
        <section id="features" className="border-b border-slate-800/80 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Platform Architecture
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold text-white text-balance">
                Designed like a game, engineered like a developer workspace.
              </h2>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {platformCapabilities.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.num}
                    className={`rounded-xl border border-slate-800 bg-[#0D1424] p-6 transition-colors hover:border-slate-700 ${
                      idx === 6 ? 'sm:col-span-2 lg:col-span-3' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-slate-400">{item.num}.</span>
                      <Icon className="h-5 w-5 text-cyan-400" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Interactive 10-World Curriculum Explorer */}
        <section id="curriculum" className="border-b border-slate-800/80 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  10 Progressive Worlds
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold text-white">
                  Explore the CodeQuest Curriculum
                </h2>
              </div>
              <button
                type="button"
                onClick={onDemoLogin}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20 whitespace-nowrap shrink-0"
              >
                <Play className="h-4 w-4" />
                Explore Live Map
              </button>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-12">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 lg:col-span-7">
                {WORLDS.map((w) => {
                  const active = w.order === selectedWorldOrder;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWorldOrder(w.order)}
                      className={`rounded-lg border p-3.5 text-left transition-colors ${
                        active
                          ? 'border-cyan-400 bg-cyan-500/10 text-white'
                          : 'border-slate-800 bg-[#0D1424] text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-mono text-xs text-cyan-300 tabular-nums">
                        World {w.order}
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-snug">{w.title}</div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0D1424] p-6 lg:col-span-5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>World {selectedWorld.order}</span>
                  <span className="font-mono tabular-nums">
                    {selectedWorld.requiredXp} XP unlock
                  </span>
                </div>
                <h3 className="mt-2 font-display text-2xl font-bold text-white">
                  {selectedWorld.title}
                </h3>
                <p className="mt-1 text-sm font-medium text-cyan-300">{selectedWorld.subtitle}</p>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  {selectedWorld.description}
                </p>
                <div className="mt-6 flex items-center gap-4 border-t border-slate-800 pt-4 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-cyan-400" />5+ interactive lessons
                  </span>
                  {selectedWorld.bossId ? (
                    <span className="inline-flex items-center gap-1.5 text-rose-300">
                      <Shield className="h-3.5 w-3.5" />
                      Includes 3-stage Boss Battle
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
          <div>
            <span className="font-display text-base font-bold text-white">CodeQuest</span>
            <span className="ml-3 text-xs text-slate-400">Code. Solve. Level Up.</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <button type="button" onClick={onStartQuest} className="hover:text-white">
              Create Account
            </button>
            <button type="button" onClick={onDemoLogin} className="hover:text-white">
              Demo Explorer
            </button>
            <span>Built for interactive programming mastery</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
