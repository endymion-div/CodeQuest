import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { ACHIEVEMENTS, BOSS_BATTLES, LESSONS, PROJECT_QUESTS, QUESTS } from './src/data/curriculum.ts';
import { CHALLENGES } from './src/data/challenges.ts';
import {
  awardUserXp,
  buildLeaderboard,
  checkAndGrantAchievements,
  completeLessonForUser,
  db,
  getFullUserState,
  getUserProfile,
  hashPassword,
  initDatabase,
  recordChallengeSubmission,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from './server/db.ts';
import {
  generateAnalyticsInsight,
  generatePersonalizedLearningPlan,
  generateTutorResponse,
} from './server/gemini.ts';
import type {
  DailyTimeBudget,
  ExperienceLevel,
  LearningGoal,
  ProgrammingLanguage,
} from './src/types/codequest.ts';

initDatabase();

const app = express();
app.use(express.json({ limit: '512kb' }));

// Simple per-IP in-memory rate limiter for auth & AI endpoints
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxReq: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (bucket.count >= maxReq) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      return;
    }
    bucket.count += 1;
    next();
  };
}

interface AuthedRequest extends Request {
  userId?: string;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const userId = verifySessionToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Session expired or invalid.' });
    return;
  }
  const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!exists) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }
  req.userId = userId;
  next();
}

// ---------- HEALTH & AUTH ROUTES ----------

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/auth/google-status', (_req, res) => {
  const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  res.json({ configured });
});

app.post('/api/auth/signup', rateLimit(20, 60_000), (req, res) => {
  const { email, password, username, name } = req.body as {
    email?: string;
    password?: string;
    username?: string;
    name?: string;
  };

  if (!email || !password || !username || !name) {
    res.status(400).json({ error: 'Name, username, email, and password are required.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24);
  if (!cleanEmail.includes('@') || password.length < 6 || cleanUsername.length < 3) {
    res.status(400).json({
      error: 'Provide a valid email, username (3+ alphanumeric chars), and password (6+ chars).',
    });
    return;
  }

  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existingEmail) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const existingUser = db
    .prepare('SELECT user_id FROM profiles WHERE username = ?')
    .get(cleanUsername);
  if (existingUser) {
    res.status(409).json({ error: 'That username is already taken.' });
    return;
  }

  const userId = `u-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    userId,
    cleanEmail,
    hashPassword(password),
    now
  );

  db.prepare(
    `INSERT INTO profiles (
      user_id, username, name, avatar_url, xp, level, level_title,
      preferred_language, experience_level, goal, daily_time,
      onboarding_completed, adaptive_difficulty, adaptive_note,
      sound_enabled, unlocked_cosmetics, active_title, battle_wins, joined_at
    ) VALUES (?, ?, ?, ?, 25, 1, 'Code Rookie', 'javascript', 'Beginner', 'Learn programming', '30 minutes', 0, 'Beginner', 'Ready to start your coding adventure.', 1, '["Obsidian Core"]', 'Code Rookie', 0, ?)`
  ).run(
    userId,
    cleanUsername,
    name.trim().slice(0, 48),
    '/src/assets/images/avatar_coder_default_1795233960343.jpg',
    now
  );

  db.prepare(
    'INSERT INTO streaks (user_id, current_streak, longest_streak, total_active_days, last_active_date) VALUES (?, 1, 1, 1, ?)'
  ).run(userId, today);

  db.prepare(
    'INSERT INTO activity_days (user_id, activity_date, activities_count, xp_earned) VALUES (?, ?, 1, 25)'
  ).run(userId, today);

  const token = signSessionToken(userId);
  res.status(201).json({ token, state: getFullUserState(userId) });
});

app.post('/api/auth/login', rateLimit(30, 60_000), (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db
    .prepare('SELECT id, password_hash FROM users WHERE email = ?')
    .get(cleanEmail) as { id: string; password_hash: string } | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = signSessionToken(user.id);
  res.json({ token, state: getFullUserState(user.id) });
});

app.post('/api/auth/demo', (_req, res) => {
  const demoUser = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get('demo@codequest.dev') as { id: string } | undefined;
  if (!demoUser) {
    res.status(404).json({ error: 'Demo explorer account not available.' });
    return;
  }
  const token = signSessionToken(demoUser.id);
  res.json({ token, state: getFullUserState(demoUser.id) });
});

app.post('/api/auth/forgot-password', rateLimit(10, 60_000), (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }
  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail) as
    | { id: string }
    | undefined;
  if (!user) {
    // Avoid user enumeration while still explaining next step cleanly
    res.json({
      message: 'If an account matches that email, a password reset code has been generated.',
    });
    return;
  }
  const resetCode = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + 15 * 60_000;
  db.prepare('UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE id = ?').run(
    resetCode,
    expiresAt,
    user.id
  );
  res.json({
    message: 'Password reset code generated (valid for 15 minutes).',
    demoResetCode: process.env.NODE_ENV === 'production' ? undefined : resetCode,
  });
});

app.post('/api/auth/reset-password', rateLimit(10, 60_000), (req, res) => {
  const { email, resetCode, newPassword } = req.body as {
    email?: string;
    resetCode?: string;
    newPassword?: string;
  };
  if (!email || !resetCode || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'Valid email, reset code, and 6+ character password required.' });
    return;
  }
  const user = db
    .prepare('SELECT id, reset_token, reset_expires_at FROM users WHERE email = ?')
    .get(email.trim().toLowerCase()) as
    | { id: string; reset_token: string | null; reset_expires_at: number | null }
    | undefined;

  if (
    !user ||
    !user.reset_token ||
    user.reset_token !== resetCode.trim() ||
    !user.reset_expires_at ||
    Date.now() > user.reset_expires_at
  ) {
    res.status(400).json({ error: 'Invalid or expired reset code.' });
    return;
  }

  db.prepare(
    'UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL WHERE id = ?'
  ).run(hashPassword(newPassword), user.id);

  res.json({ message: 'Password updated successfully. You can now sign in.' });
});

app.get('/api/state', requireAuth, (req: AuthedRequest, res) => {
  const state = getFullUserState(req.userId!);
  if (!state) {
    res.status(404).json({ error: 'Profile not found.' });
    return;
  }
  res.json({ state });
});

// ---------- ONBOARDING & PROFILE ----------

app.post('/api/onboarding', requireAuth, (req: AuthedRequest, res) => {
  const { experienceLevel, preferredLanguage, goal, dailyTime } = req.body as {
    experienceLevel?: ExperienceLevel;
    preferredLanguage?: ProgrammingLanguage;
    goal?: LearningGoal;
    dailyTime?: DailyTimeBudget;
  };

  if (!experienceLevel || !preferredLanguage || !goal || !dailyTime) {
    res.status(400).json({ error: 'All onboarding preferences are required.' });
    return;
  }

  const initialDiff =
    experienceLevel === 'Advanced'
      ? 'Intermediate'
      : experienceLevel === 'Intermediate'
        ? 'Easy'
        : 'Beginner';

  db.prepare(
    `UPDATE profiles SET
      experience_level = ?,
      preferred_language = ?,
      goal = ?,
      daily_time = ?,
      adaptive_difficulty = ?,
      adaptive_note = ?,
      onboarding_completed = 1
    WHERE user_id = ?`
  ).run(
    experienceLevel,
    preferredLanguage,
    goal,
    dailyTime,
    initialDiff,
    `Personalized path configured for ${goal} (${dailyTime}/day in ${preferredLanguage}).`,
    req.userId!
  );

  res.json({ state: getFullUserState(req.userId!) });
});

app.patch('/api/profile', requireAuth, (req: AuthedRequest, res) => {
  const { name, preferredLanguage, soundEnabled, activeTitle, goal, dailyTime } = req.body as {
    name?: string;
    preferredLanguage?: ProgrammingLanguage;
    soundEnabled?: boolean;
    activeTitle?: string;
    goal?: LearningGoal;
    dailyTime?: DailyTimeBudget;
  };

  const current = getUserProfile(req.userId!);
  if (!current) {
    res.status(404).json({ error: 'Profile not found.' });
    return;
  }

  db.prepare(
    `UPDATE profiles SET
      name = ?,
      preferred_language = ?,
      sound_enabled = ?,
      active_title = ?,
      goal = ?,
      daily_time = ?
    WHERE user_id = ?`
  ).run(
    name ? name.trim().slice(0, 48) : current.name,
    preferredLanguage || current.preferredLanguage,
    soundEnabled === undefined ? (current.soundEnabled ? 1 : 0) : soundEnabled ? 1 : 0,
    activeTitle || current.activeTitle,
    goal || current.goal,
    dailyTime || current.dailyTime,
    req.userId!
  );

  res.json({ state: getFullUserState(req.userId!) });
});

// ---------- LESSONS, CHALLENGES, BOSSES, PROJECTS, QUESTS ----------

app.post('/api/lessons/complete', requireAuth, (req: AuthedRequest, res) => {
  const { lessonId } = req.body as { lessonId?: string };
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) {
    res.status(404).json({ error: 'Lesson not found.' });
    return;
  }
  const result = completeLessonForUser(req.userId!, lesson.id, lesson.xpReward);
  res.json(result);
});

app.post('/api/challenges/submit', requireAuth, (req: AuthedRequest, res) => {
  const {
    challengeId,
    language,
    code,
    passed,
    passedCount,
    totalCount,
    executionMs,
    hintsUsed,
    isDaily,
    errorMessage,
  } = req.body as {
    challengeId?: string;
    language?: ProgrammingLanguage;
    code?: string;
    passed?: boolean;
    passedCount?: number;
    totalCount?: number;
    executionMs?: number;
    hintsUsed?: number;
    isDaily?: boolean;
    errorMessage?: string;
  };

  const challenge = CHALLENGES.find((c) => c.id === challengeId);
  if (!challenge || !language || typeof code !== 'string') {
    res.status(400).json({ error: 'Invalid challenge submission payload.' });
    return;
  }

  const result = recordChallengeSubmission({
    userId: req.userId!,
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    topic: challenge.topic,
    language,
    code,
    passed: Boolean(passed),
    passedCount: Number(passedCount || 0),
    totalCount: Number(totalCount || challenge.testCases.length),
    executionMs: Number(executionMs || 10),
    hintsUsed: Number(hintsUsed || 0),
    baseXp: challenge.xpReward,
    isDaily: Boolean(isDaily),
    errorMessage,
  });

  res.json(result);
});

app.post('/api/bosses/complete', requireAuth, (req: AuthedRequest, res) => {
  const { bossId } = req.body as { bossId?: string };
  const boss = BOSS_BATTLES.find((b) => b.id === bossId);
  if (!boss) {
    res.status(404).json({ error: 'Boss Battle not found.' });
    return;
  }

  const already = db
    .prepare('SELECT 1 FROM progress WHERE user_id = ? AND item_type = ? AND item_id = ?')
    .get(req.userId!, 'boss', boss.id);

  let xpGained = 0;
  if (!already) {
    db.prepare(
      'INSERT INTO progress (user_id, item_type, item_id, completed_at) VALUES (?, ?, ?, ?)'
    ).run(req.userId!, 'boss', boss.id, new Date().toISOString());
    xpGained = boss.xpReward;
    awardUserXp(req.userId!, xpGained);

    // Grant badge cosmetic
    const prof = getUserProfile(req.userId!);
    if (prof && !prof.unlockedCosmetics.includes(boss.badgeName)) {
      const nextCosmetics = [...prof.unlockedCosmetics, boss.badgeName];
      db.prepare('UPDATE profiles SET unlocked_cosmetics = ? WHERE user_id = ?').run(
        JSON.stringify(nextCosmetics),
        req.userId!
      );
    }
  }

  const newlyUnlocked = checkAndGrantAchievements(req.userId!);
  res.json({ xpGained, newlyUnlocked, state: getFullUserState(req.userId!) });
});

app.post('/api/projects/complete', requireAuth, (req: AuthedRequest, res) => {
  const { projectId } = req.body as { projectId?: string };
  const project = PROJECT_QUESTS.find((p) => p.id === projectId);
  if (!project) {
    res.status(404).json({ error: 'Project Quest not found.' });
    return;
  }

  const already = db
    .prepare('SELECT 1 FROM progress WHERE user_id = ? AND item_type = ? AND item_id = ?')
    .get(req.userId!, 'project', project.id);

  let xpGained = 0;
  if (!already) {
    db.prepare(
      'INSERT INTO progress (user_id, item_type, item_id, completed_at) VALUES (?, ?, ?, ?)'
    ).run(req.userId!, 'project', project.id, new Date().toISOString());
    xpGained = project.xpReward;
    awardUserXp(req.userId!, xpGained);

    const prof = getUserProfile(req.userId!);
    if (prof && !prof.unlockedCosmetics.includes(project.badgeName)) {
      db.prepare('UPDATE profiles SET unlocked_cosmetics = ? WHERE user_id = ?').run(
        JSON.stringify([...prof.unlockedCosmetics, project.badgeName]),
        req.userId!
      );
    }
  }

  const newlyUnlocked = checkAndGrantAchievements(req.userId!);
  res.json({ xpGained, newlyUnlocked, state: getFullUserState(req.userId!) });
});

app.post('/api/quests/claim', requireAuth, (req: AuthedRequest, res) => {
  const { questId } = req.body as { questId?: string };
  const quest = QUESTS.find((q) => q.id === questId);
  if (!quest) {
    res.status(404).json({ error: 'Quest not found.' });
    return;
  }

  const state = getFullUserState(req.userId!);
  if (!state) {
    res.status(404).json({ error: 'State not found.' });
    return;
  }

  if (state.claimedQuestIds.includes(quest.id)) {
    res.status(400).json({ error: 'Quest reward already claimed.' });
    return;
  }

  const progressVal = state.questProgress[quest.id] || 0;
  if (progressVal < quest.target) {
    res.status(400).json({ error: 'Quest requirements not yet completed.' });
    return;
  }

  db.prepare(
    'INSERT INTO quest_claims (user_id, quest_id, claimed_at) VALUES (?, ?, ?)'
  ).run(req.userId!, quest.id, new Date().toISOString());

  awardUserXp(req.userId!, quest.xpReward);
  if (quest.cosmeticReward && !state.profile.unlockedCosmetics.includes(quest.cosmeticReward)) {
    db.prepare('UPDATE profiles SET unlocked_cosmetics = ? WHERE user_id = ?').run(
      JSON.stringify([...state.profile.unlockedCosmetics, quest.cosmeticReward]),
      req.userId!
    );
  }

  const newlyUnlocked = checkAndGrantAchievements(req.userId!);
  res.json({ xpGained: quest.xpReward, newlyUnlocked, state: getFullUserState(req.userId!) });
});

app.post('/api/mistakes/resolve', requireAuth, (req: AuthedRequest, res) => {
  const { mistakeId } = req.body as { mistakeId?: string };
  if (!mistakeId) {
    res.status(400).json({ error: 'mistakeId required.' });
    return;
  }
  db.prepare('UPDATE mistakes SET resolved = 1 WHERE id = ? AND user_id = ?').run(
    mistakeId,
    req.userId!
  );
  const newlyUnlocked = checkAndGrantAchievements(req.userId!);
  res.json({ newlyUnlocked, state: getFullUserState(req.userId!) });
});

app.post('/api/battles/complete', requireAuth, (req: AuthedRequest, res) => {
  const { won } = req.body as { won?: boolean };
  let xpGained = won ? 60 : 15;
  if (won) {
    db.prepare('UPDATE profiles SET battle_wins = battle_wins + 1 WHERE user_id = ?').run(
      req.userId!
    );
  }
  awardUserXp(req.userId!, xpGained);
  const newlyUnlocked = checkAndGrantAchievements(req.userId!);
  res.json({ xpGained, newlyUnlocked, state: getFullUserState(req.userId!) });
});

app.get('/api/leaderboard', requireAuth, (req: AuthedRequest, res) => {
  res.json({ entries: buildLeaderboard(req.userId!) });
});

app.get('/api/public-profile/:username', (req, res) => {
  const row = db
    .prepare('SELECT user_id FROM profiles WHERE username = ?')
    .get(req.params.username) as { user_id: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Developer profile not found.' });
    return;
  }
  const state = getFullUserState(row.user_id);
  if (!state) {
    res.status(404).json({ error: 'Profile unavailable.' });
    return;
  }
  res.json({
    profile: {
      username: state.profile.username,
      name: state.profile.name,
      avatarUrl: state.profile.avatarUrl,
      level: state.profile.level,
      levelTitle: state.profile.levelTitle,
      xp: state.profile.xp,
      currentStreak: state.profile.currentStreak,
      preferredLanguage: state.profile.preferredLanguage,
      solvedCount: state.solvedChallengeIds.length,
      projectsCount: state.completedProjectIds.length,
      achievements: ACHIEVEMENTS.filter((a) => state.unlockedAchievementIds.includes(a.id)),
      badges: state.profile.unlockedCosmetics,
    },
  });
});

// ---------- LEARNING PLAN & GEMINI AI ROUTES ----------

app.post('/api/ai/tutor', requireAuth, rateLimit(25, 60_000), async (req: AuthedRequest, res) => {
  try {
    const {
      challengeId,
      language,
      userCode,
      userMessage,
      hintStep,
      allowSolutionReveal,
      lastError,
    } = req.body as {
      challengeId?: string;
      language?: ProgrammingLanguage;
      userCode?: string;
      userMessage?: string;
      hintStep?: number;
      allowSolutionReveal?: boolean;
      lastError?: string;
    };

    const challenge = CHALLENGES.find((c) => c.id === challengeId);
    if (!challenge || !language || typeof userMessage !== 'string') {
      res.status(400).json({ error: 'Valid challengeId, language, and userMessage are required.' });
      return;
    }

    const result = await generateTutorResponse({
      challengeTitle: challenge.title,
      challengeDescription: challenge.description,
      language,
      userCode: userCode || '',
      userMessage: userMessage.slice(0, 1000),
      hintStep: Math.min(3, Math.max(1, Number(hintStep || 1))),
      hintsList: challenge.hints,
      allowSolutionReveal: Boolean(allowSolutionReveal),
      lastError,
    });

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI Tutor failed to respond.';
    res.status(502).json({ error: message });
  }
});

app.post(
  '/api/ai/learning-plan',
  requireAuth,
  rateLimit(10, 60_000),
  async (req: AuthedRequest, res) => {
    try {
      const { currentSkill, goal, hoursPerWeek, deadline } = req.body as {
        currentSkill?: string;
        goal?: string;
        hoursPerWeek?: number;
        deadline?: string;
      };

      if (!currentSkill || !goal || !hoursPerWeek || !deadline) {
        res.status(400).json({ error: 'All learning plan inputs are required.' });
        return;
      }

      const generated = await generatePersonalizedLearningPlan({
        currentSkill,
        goal,
        hoursPerWeek: Number(hoursPerWeek),
        deadline,
      });

      const planId = `plan-${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO learning_plans (id, user_id, current_skill, goal, hours_per_week, deadline, summary, weeks_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           id = excluded.id,
           current_skill = excluded.current_skill,
           goal = excluded.goal,
           hours_per_week = excluded.hours_per_week,
           deadline = excluded.deadline,
           summary = excluded.summary,
           weeks_json = excluded.weeks_json,
           created_at = excluded.created_at`
      ).run(
        planId,
        req.userId!,
        currentSkill,
        goal,
        Number(hoursPerWeek),
        deadline,
        generated.summary,
        JSON.stringify(generated.weeks),
        now
      );

      res.json({ state: getFullUserState(req.userId!) });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to generate learning plan right now.';
      res.status(502).json({ error: message });
    }
  }
);

app.patch('/api/learning-plan/toggle-week', requireAuth, (req: AuthedRequest, res) => {
  const { week } = req.body as { week?: number };
  const row = db
    .prepare('SELECT weeks_json FROM learning_plans WHERE user_id = ?')
    .get(req.userId!) as { weeks_json: string } | undefined;

  if (!row) {
    res.status(404).json({ error: 'No learning plan found.' });
    return;
  }

  const weeks = JSON.parse(row.weeks_json) as { week: number; completed: boolean }[];
  const updated = weeks.map((w) =>
    w.week === Number(week) ? { ...w, completed: !w.completed } : w
  );
  db.prepare('UPDATE learning_plans SET weeks_json = ? WHERE user_id = ?').run(
    JSON.stringify(updated),
    req.userId!
  );
  res.json({ state: getFullUserState(req.userId!) });
});

app.post(
  '/api/ai/analytics-insight',
  requireAuth,
  rateLimit(10, 60_000),
  async (req: AuthedRequest, res) => {
    try {
      const state = getFullUserState(req.userId!);
      if (!state) {
        res.status(404).json({ error: 'User state not found.' });
        return;
      }

      const topicBuckets = new Map<string, { passed: number; total: number }>();
      for (const sub of state.submissions) {
        const ch = CHALLENGES.find((c) => c.id === sub.challengeId);
        const topic = ch ? ch.topic : 'Logic';
        const cur = topicBuckets.get(topic) || { passed: 0, total: 0 };
        cur.total += 1;
        if (sub.passed) cur.passed += 1;
        topicBuckets.set(topic, cur);
      }

      const topicAccuracy = Array.from(topicBuckets.entries()).map(([topic, data]) => ({
        topic,
        accuracy: Math.round((data.passed / data.total) * 100),
        attempts: data.total,
      }));

      const insight = await generateAnalyticsInsight({
        username: state.profile.username,
        levelTitle: state.profile.levelTitle,
        xp: state.profile.xp,
        solvedCount: state.solvedChallengeIds.length,
        topicAccuracy,
        recentMistakes: state.mistakes.slice(0, 3).map((m) => m.summary),
      });

      res.json({ insight });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate AI insight.';
      res.status(502).json({ error: message });
    }
  }
);

// ---------- VITE / STATIC MOUNT ----------

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(process.cwd(), 'dist');

  if (isProd && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`CodeQuest server listening on http://localhost:${port}`);
  });
}

void startServer();
