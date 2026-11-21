import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ACHIEVEMENTS, LEADERBOARD_COMPETITORS, QUESTS } from '../src/data/curriculum.ts';
import {
  calculateLevelInfo,
  classifyMistake,
  computeAdaptiveDifficulty,
  evaluateNewAchievements,
} from '../src/utils/progression.ts';
import type {
  DailyTimeBudget,
  DifficultyTier,
  ExperienceLevel,
  LeaderboardEntry,
  LearningGoal,
  LearningPlan,
  MistakeRecord,
  ProgrammingLanguage,
  SubmissionRecord,
  UserProfile,
  UserStatePayload,
} from '../src/types/codequest.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'codequest.sqlite');
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ephemeral fallback signing key when SESSION_SECRET is unset
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHex] = storedHash.split(':');
  if (!salt || !originalHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const originalBuf = Buffer.from(originalHex, 'hex');
  if (derived.length !== originalBuf.length) return false;
  return crypto.timingSafeEqual(derived, originalBuf);
}

export function signSessionToken(userId: string): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub: string;
      exp: number;
    };
    if (!decoded.sub || Date.now() > decoded.exp) return null;
    return decoded.sub;
  } catch {
    return null;
  }
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      reset_token TEXT,
      reset_expires_at INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      level_title TEXT NOT NULL DEFAULT 'Code Rookie',
      preferred_language TEXT NOT NULL DEFAULT 'javascript',
      experience_level TEXT NOT NULL DEFAULT 'Beginner',
      goal TEXT NOT NULL DEFAULT 'Learn programming',
      daily_time TEXT NOT NULL DEFAULT '30 minutes',
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      adaptive_difficulty TEXT NOT NULL DEFAULT 'Beginner',
      adaptive_note TEXT NOT NULL DEFAULT 'Calibrating to your coding pace.',
      sound_enabled INTEGER NOT NULL DEFAULT 1,
      unlocked_cosmetics TEXT NOT NULL DEFAULT '["Obsidian Core"]',
      active_title TEXT NOT NULL DEFAULT 'Code Rookie',
      battle_wins INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS streaks (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      current_streak INTEGER NOT NULL DEFAULT 1,
      longest_streak INTEGER NOT NULL DEFAULT 1,
      total_active_days INTEGER NOT NULL DEFAULT 1,
      last_active_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      activity_date TEXT NOT NULL,
      activities_count INTEGER NOT NULL DEFAULT 0,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, activity_date)
    );

    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      UNIQUE(user_id, item_type, item_id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_id TEXT NOT NULL,
      language TEXT NOT NULL,
      code TEXT NOT NULL,
      passed INTEGER NOT NULL,
      passed_count INTEGER NOT NULL,
      total_count INTEGER NOT NULL,
      execution_ms INTEGER NOT NULL,
      hints_used INTEGER NOT NULL DEFAULT 0,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id TEXT NOT NULL,
      unlocked_at TEXT NOT NULL,
      PRIMARY KEY(user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS quest_claims (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quest_id TEXT NOT NULL,
      claimed_at TEXT NOT NULL,
      PRIMARY KEY(user_id, quest_id)
    );

    CREATE TABLE IF NOT EXISTS mistakes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_id TEXT NOT NULL,
      challenge_title TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      code_snippet TEXT NOT NULL,
      recommended_challenge_id TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      occurrences INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      current_skill TEXT NOT NULL,
      goal TEXT NOT NULL,
      hours_per_week INTEGER NOT NULL,
      deadline TEXT NOT NULL,
      summary TEXT NOT NULL,
      weeks_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_completions (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      completed_date TEXT NOT NULL,
      challenge_id TEXT NOT NULL,
      PRIMARY KEY(user_id, completed_date)
    );
  `);

  seedDemoUsers();
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function seedDemoUsers() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@codequest.dev') as
    | { id: string }
    | undefined;
  if (existing) return;

  const userId = 'user-demo-explorer';
  const now = new Date().toISOString();
  const hash = hashPassword('CodeQuest123!');

  db.prepare(
    'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)'
  ).run(userId, 'demo@codequest.dev', hash, now);

  const initialXp = 310;
  const lvl = calculateLevelInfo(initialXp);

  db.prepare(
    `INSERT INTO profiles (
      user_id, username, name, avatar_url, xp, level, level_title,
      preferred_language, experience_level, goal, daily_time,
      onboarding_completed, adaptive_difficulty, adaptive_note,
      sound_enabled, unlocked_cosmetics, active_title, battle_wins, joined_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userId,
    'nova_coder',
    'Alex Nova',
    '/src/assets/images/avatar_coder_default_1795233960343.jpg',
    initialXp,
    lvl.level,
    lvl.title,
    'javascript',
    'Beginner',
    'Learn DSA',
    '30 minutes',
    1,
    'Easy',
    'Difficulty calibrated to Easy based on strong Foundations accuracy.',
    1,
    JSON.stringify(['Obsidian Core', 'Cyan Grid Aura']),
    lvl.title,
    1,
    getDateDaysAgo(14)
  );

  db.prepare(
    'INSERT INTO streaks (user_id, current_streak, longest_streak, total_active_days, last_active_date) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, 5, 7, 12, getTodayIsoDate());

  const activitySeed = [
    { daysAgo: 6, count: 2, xp: 45 },
    { daysAgo: 5, count: 3, xp: 60 },
    { daysAgo: 4, count: 1, xp: 25 },
    { daysAgo: 3, count: 4, xp: 85 },
    { daysAgo: 2, count: 2, xp: 40 },
    { daysAgo: 1, count: 2, xp: 35 },
    { daysAgo: 0, count: 1, xp: 20 },
  ];
  const insertAct = db.prepare(
    'INSERT INTO activity_days (user_id, activity_date, activities_count, xp_earned) VALUES (?, ?, ?, ?)'
  );
  for (const row of activitySeed) {
    insertAct.run(userId, getDateDaysAgo(row.daysAgo), row.count, row.xp);
  }

  const insertProgress = db.prepare(
    'INSERT INTO progress (user_id, item_type, item_id, completed_at) VALUES (?, ?, ?, ?)'
  );
  const seededLessons = [
    'w1-l1',
    'w1-l2',
    'w1-l3',
    'w1-l4',
    'w1-l5',
    'w1-l6',
    'w2-l1',
    'w2-l2',
    'w2-l3',
  ];
  for (const lid of seededLessons) {
    insertProgress.run(userId, 'lesson', lid, getDateDaysAgo(2));
  }

  const seededChallenges = ['c-sum-two', 'c-celsius-fahrenheit', 'c-even-odd', 'c-max-three'];
  for (const cid of seededChallenges) {
    insertProgress.run(userId, 'challenge', cid, getDateDaysAgo(1));
  }

  const insertSub = db.prepare(
    `INSERT INTO submissions (
      id, user_id, challenge_id, language, code, passed, passed_count, total_count, execution_ms, hints_used, xp_earned, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertSub.run(
    'sub-seed-1',
    userId,
    'c-sum-two',
    'javascript',
    'function addNumbers(a, b) { return a + b; }',
    1,
    3,
    3,
    12,
    0,
    25,
    getDateDaysAgo(3)
  );
  insertSub.run(
    'sub-seed-2',
    userId,
    'c-even-odd',
    'javascript',
    'function checkNumber(n) { return n % 2 === 0 ? "Even" : "Odd"; }',
    1,
    3,
    3,
    14,
    0,
    25,
    getDateDaysAgo(2)
  );
  insertSub.run(
    'sub-seed-3',
    userId,
    'c-sum-n',
    'javascript',
    'function sumToN(n) { let s = 0; for (let i = 1; i < n; i++) s += i; return s; }',
    0,
    1,
    3,
    18,
    1,
    0,
    getDateDaysAgo(1)
  );

  db.prepare(
    `INSERT INTO mistakes (
      id, user_id, challenge_id, challenge_title, category, summary, code_snippet, recommended_challenge_id, resolved, occurrences, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    'mistake-seed-1',
    userId,
    'c-sum-n',
    'Sum 1 to N',
    'Loops',
    'Off-by-one loop bound: using i < n skips the final integer n. Use i <= n for inclusive ranges.',
    'for (let i = 1; i < n; i++) s += i;',
    'c-sum-n',
    0,
    2,
    getDateDaysAgo(1)
  );

  db.prepare(
    `INSERT INTO mistakes (
      id, user_id, challenge_id, challenge_title, category, summary, code_snippet, recommended_challenge_id, resolved, occurrences, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    'mistake-seed-2',
    userId,
    'c-fizzbuzz',
    'FizzBuzz Signal',
    'Logic',
    'Check combined divisibility (n % 15 === 0) before individual 3 or 5 checks.',
    'if (n % 3 === 0) return "Fizz";',
    'c-fizzbuzz',
    0,
    1,
    getDateDaysAgo(2)
  );

  const insertAch = db.prepare(
    'INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)'
  );
  insertAch.run(userId, 'ach-first-code', getDateDaysAgo(3));
  insertAch.run(userId, 'ach-first-perfect', getDateDaysAgo(3));
  insertAch.run(userId, 'ach-100-xp', getDateDaysAgo(2));
  insertAch.run(userId, 'ach-battle-victor', getDateDaysAgo(1));
}

export function getUserProfile(userId: string): UserProfile | null {
  const row = db
    .prepare(
      `SELECT u.id, u.email, p.*, s.current_streak, s.longest_streak, s.total_active_days
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       JOIN streaks s ON s.user_id = u.id
       WHERE u.id = ?`
    )
    .get(userId) as Record<string, unknown> | undefined;

  if (!row) return null;

  let cosmetics: string[] = ['Obsidian Core'];
  try {
    cosmetics = JSON.parse(String(row.unlocked_cosmetics || '["Obsidian Core"]'));
  } catch {
    cosmetics = ['Obsidian Core'];
  }

  return {
    id: String(row.id),
    email: String(row.email),
    username: String(row.username),
    name: String(row.name),
    avatarUrl: String(row.avatar_url),
    xp: Number(row.xp),
    level: Number(row.level),
    levelTitle: String(row.level_title),
    currentStreak: Number(row.current_streak),
    longestStreak: Number(row.longest_streak),
    totalActiveDays: Number(row.total_active_days),
    preferredLanguage: row.preferred_language as ProgrammingLanguage,
    experienceLevel: row.experience_level as ExperienceLevel,
    goal: row.goal as LearningGoal,
    dailyTime: row.daily_time as DailyTimeBudget,
    onboardingCompleted: Boolean(row.onboarding_completed),
    adaptiveDifficulty: row.adaptive_difficulty as DifficultyTier,
    adaptiveNote: String(row.adaptive_note),
    soundEnabled: Boolean(row.sound_enabled),
    unlockedCosmetics: cosmetics,
    activeTitle: String(row.active_title),
    joinedAt: String(row.joined_at),
  };
}

function recordDailyActivity(userId: string, xpGained: number) {
  const today = getTodayIsoDate();
  const streakRow = db
    .prepare('SELECT * FROM streaks WHERE user_id = ?')
    .get(userId) as
    | {
        current_streak: number;
        longest_streak: number;
        total_active_days: number;
        last_active_date: string;
      }
    | undefined;

  const existingDay = db
    .prepare('SELECT * FROM activity_days WHERE user_id = ? AND activity_date = ?')
    .get(userId, today) as { activities_count: number; xp_earned: number } | undefined;

  if (existingDay) {
    db.prepare(
      'UPDATE activity_days SET activities_count = activities_count + 1, xp_earned = xp_earned + ? WHERE user_id = ? AND activity_date = ?'
    ).run(xpGained, userId, today);
  } else {
    db.prepare(
      'INSERT INTO activity_days (user_id, activity_date, activities_count, xp_earned) VALUES (?, ?, 1, ?)'
    ).run(userId, today, xpGained);

    if (streakRow) {
      const yesterday = getDateDaysAgo(1);
      const nextStreak =
        streakRow.last_active_date === yesterday ? streakRow.current_streak + 1 : 1;
      const longest = Math.max(streakRow.longest_streak, nextStreak);
      db.prepare(
        'UPDATE streaks SET current_streak = ?, longest_streak = ?, total_active_days = total_active_days + 1, last_active_date = ? WHERE user_id = ?'
      ).run(nextStreak, longest, today, userId);
    }
  }
}

export function awardUserXp(userId: string, deltaXp: number) {
  const profile = getUserProfile(userId);
  if (!profile) return null;
  const newXp = profile.xp + Math.max(0, deltaXp);
  const lvlInfo = calculateLevelInfo(newXp);
  const leveledUp = lvlInfo.level > profile.level;

  db.prepare(
    'UPDATE profiles SET xp = ?, level = ?, level_title = ?, active_title = CASE WHEN active_title = ? THEN ? ELSE active_title END WHERE user_id = ?'
  ).run(newXp, lvlInfo.level, lvlInfo.title, profile.levelTitle, lvlInfo.title, userId);

  return { newXp, levelInfo: lvlInfo, leveledUp };
}

export function checkAndGrantAchievements(userId: string) {
  const state = getFullUserState(userId);
  if (!state) return [];

  const perfectFirstTryCount = state.submissions.filter(
    (s) => s.passed && s.hintsUsed === 0
  ).length;
  const resolvedMistakeCount = state.mistakes.filter((m) => m.resolved).length;

  const newlyUnlocked = evaluateNewAchievements(
    ACHIEVEMENTS,
    state.unlockedAchievementIds,
    {
      xp: state.profile.xp,
      level: state.profile.level,
      currentStreak: state.profile.currentStreak,
      solvedChallengeCount: state.solvedChallengeIds.length,
      completedLessonCount: state.completedLessonIds.length,
      defeatedBossCount: state.defeatedBossIds.length,
      completedProjectCount: state.completedProjectIds.length,
      resolvedMistakeCount,
      perfectFirstTryCount,
      battleWins: state.battleWins,
    }
  );

  if (newlyUnlocked.length > 0) {
    const insertAch = db.prepare(
      'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)'
    );
    const now = new Date().toISOString();
    let bonusXp = 0;
    for (const ach of newlyUnlocked) {
      insertAch.run(userId, ach.id, now);
      bonusXp += ach.xpBonus;
    }
    if (bonusXp > 0) {
      awardUserXp(userId, bonusXp);
    }
  }

  return newlyUnlocked;
}

export function getFullUserState(userId: string): UserStatePayload | null {
  const profile = getUserProfile(userId);
  if (!profile) return null;

  const progressRows = db
    .prepare('SELECT item_type, item_id FROM progress WHERE user_id = ?')
    .all(userId) as { item_type: string; item_id: string }[];

  const completedLessonIds = progressRows
    .filter((r) => r.item_type === 'lesson')
    .map((r) => r.item_id);
  const solvedChallengeIds = progressRows
    .filter((r) => r.item_type === 'challenge')
    .map((r) => r.item_id);
  const defeatedBossIds = progressRows
    .filter((r) => r.item_type === 'boss')
    .map((r) => r.item_id);
  const completedProjectIds = progressRows
    .filter((r) => r.item_type === 'project')
    .map((r) => r.item_id);

  const unlockedAchievementIds = (
    db
      .prepare('SELECT achievement_id FROM user_achievements WHERE user_id = ?')
      .all(userId) as { achievement_id: string }[]
  ).map((r) => r.achievement_id);

  const claimedQuestIds = (
    db
      .prepare('SELECT quest_id FROM quest_claims WHERE user_id = ?')
      .all(userId) as { quest_id: string }[]
  ).map((r) => r.quest_id);

  const dailyRow = db
    .prepare('SELECT completed_date FROM daily_completions WHERE user_id = ? AND completed_date = ?')
    .get(userId, getTodayIsoDate()) as { completed_date: string } | undefined;

  const activityRows = db
    .prepare('SELECT activity_date, activities_count, xp_earned FROM activity_days WHERE user_id = ?')
    .all(userId) as { activity_date: string; activities_count: number; xp_earned: number }[];
  const actMap = new Map(activityRows.map((r) => [r.activity_date, r]));

  const weeklyActivity = [];
  for (let i = 6; i >= 0; i--) {
    const dateStr = getDateDaysAgo(i);
    const d = new Date(dateStr + 'T12:00:00Z');
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const entry = actMap.get(dateStr);
    weeklyActivity.push({
      date: dateStr,
      dayLabel,
      count: entry ? entry.activities_count : 0,
      xp: entry ? entry.xp_earned : 0,
    });
  }

  const submissions = (
    db
      .prepare(
        'SELECT id, challenge_id, language, passed, passed_count, total_count, execution_ms, hints_used, xp_earned, created_at FROM submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT 40'
      )
      .all(userId) as Record<string, unknown>[]
  ).map(
    (r): SubmissionRecord => ({
      id: String(r.id),
      challengeId: String(r.challenge_id),
      language: r.language as ProgrammingLanguage,
      passed: Boolean(r.passed),
      passedCount: Number(r.passed_count),
      totalCount: Number(r.total_count),
      executionMs: Number(r.execution_ms),
      hintsUsed: Number(r.hints_used),
      xpEarned: Number(r.xp_earned),
      createdAt: String(r.created_at),
    })
  );

  const mistakes = (
    db
      .prepare('SELECT * FROM mistakes WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Record<string, unknown>[]
  ).map(
    (r): MistakeRecord => ({
      id: String(r.id),
      userId: String(r.user_id),
      challengeId: String(r.challenge_id),
      challengeTitle: String(r.challenge_title),
      category: r.category as MistakeRecord['category'],
      summary: String(r.summary),
      codeSnippet: String(r.code_snippet),
      recommendedChallengeId: String(r.recommended_challenge_id),
      resolved: Boolean(r.resolved),
      occurrences: Number(r.occurrences),
      createdAt: String(r.created_at),
    })
  );

  const planRow = db
    .prepare('SELECT * FROM learning_plans WHERE user_id = ?')
    .get(userId) as Record<string, unknown> | undefined;

  let learningPlan: LearningPlan | null = null;
  if (planRow) {
    learningPlan = {
      id: String(planRow.id),
      currentSkill: String(planRow.current_skill),
      goal: String(planRow.goal),
      hoursPerWeek: Number(planRow.hours_per_week),
      deadline: String(planRow.deadline),
      summary: String(planRow.summary),
      weeks: JSON.parse(String(planRow.weeks_json)),
      createdAt: String(planRow.created_at),
    };
  }

  const profileRow = db
    .prepare('SELECT battle_wins FROM profiles WHERE user_id = ?')
    .get(userId) as { battle_wins: number } | undefined;

  const weeklyXpSum = weeklyActivity.reduce((s, d) => s + d.xp, 0);
  const questProgress: Record<string, number> = {};
  for (const q of QUESTS) {
    if (q.metric === 'lessons') questProgress[q.id] = Math.min(q.target, completedLessonIds.length);
    else if (q.metric === 'challenges')
      questProgress[q.id] = Math.min(q.target, solvedChallengeIds.length);
    else if (q.metric === 'xp') questProgress[q.id] = Math.min(q.target, weeklyXpSum);
    else if (q.metric === 'daily_challenge') questProgress[q.id] = dailyRow ? 1 : 0;
    else if (q.metric === 'boss') questProgress[q.id] = Math.min(q.target, defeatedBossIds.length);
  }

  return {
    profile,
    completedLessonIds,
    solvedChallengeIds,
    defeatedBossIds,
    completedProjectIds,
    unlockedAchievementIds,
    claimedQuestIds,
    dailyChallengeCompletedDate: dailyRow ? dailyRow.completed_date : null,
    weeklyActivity,
    questProgress,
    submissions,
    mistakes,
    learningPlan,
    battleWins: profileRow ? profileRow.battle_wins : 0,
  };
}

export function completeLessonForUser(userId: string, lessonId: string, xpReward: number) {
  const existing = db
    .prepare('SELECT 1 FROM progress WHERE user_id = ? AND item_type = ? AND item_id = ?')
    .get(userId, 'lesson', lessonId);

  const now = new Date().toISOString();
  let xpGained = 0;

  if (!existing) {
    db.prepare(
      'INSERT INTO progress (user_id, item_type, item_id, completed_at) VALUES (?, ?, ?, ?)'
    ).run(userId, 'lesson', lessonId, now);
    xpGained = xpReward;
    awardUserXp(userId, xpGained);
  }

  recordDailyActivity(userId, xpGained);
  const newlyUnlocked = checkAndGrantAchievements(userId);
  return { xpGained, newlyUnlocked, state: getFullUserState(userId) };
}

export function recordChallengeSubmission(params: {
  userId: string;
  challengeId: string;
  challengeTitle: string;
  topic: MistakeRecord['category'];
  language: ProgrammingLanguage;
  code: string;
  passed: boolean;
  passedCount: number;
  totalCount: number;
  executionMs: number;
  hintsUsed: number;
  baseXp: number;
  isDaily: boolean;
  errorMessage?: string;
}) {
  const now = new Date().toISOString();
  const alreadySolved = db
    .prepare('SELECT 1 FROM progress WHERE user_id = ? AND item_type = ? AND item_id = ?')
    .get(params.userId, 'challenge', params.challengeId);

  let xpGained = 0;
  if (params.passed) {
    if (!alreadySolved) {
      db.prepare(
        'INSERT INTO progress (user_id, item_type, item_id, completed_at) VALUES (?, ?, ?, ?)'
      ).run(params.userId, 'challenge', params.challengeId, now);
      xpGained += params.isDaily ? 50 : params.baseXp;
    } else if (params.isDaily) {
      const today = getTodayIsoDate();
      const doneDaily = db
        .prepare('SELECT 1 FROM daily_completions WHERE user_id = ? AND completed_date = ?')
        .get(params.userId, today);
      if (!doneDaily) xpGained += 50;
    }

    if (params.isDaily) {
      db.prepare(
        'INSERT OR IGNORE INTO daily_completions (user_id, completed_date, challenge_id) VALUES (?, ?, ?)'
      ).run(params.userId, getTodayIsoDate(), params.challengeId);
    }

    // Mark matching unresolved mistakes as resolved
    db.prepare(
      'UPDATE mistakes SET resolved = 1 WHERE user_id = ? AND challenge_id = ? AND resolved = 0'
    ).run(params.userId, params.challengeId);
  } else {
    const classified = classifyMistake(
      params.errorMessage || '',
      params.code,
      params.topic
    );
    const existingMistake = db
      .prepare(
        'SELECT id FROM mistakes WHERE user_id = ? AND challenge_id = ? AND resolved = 0'
      )
      .get(params.userId, params.challengeId) as { id: string } | undefined;

    if (existingMistake) {
      db.prepare(
        'UPDATE mistakes SET occurrences = occurrences + 1, summary = ?, code_snippet = ?, created_at = ? WHERE id = ?'
      ).run(classified.summary, params.code.slice(0, 320), now, existingMistake.id);
    } else {
      db.prepare(
        `INSERT INTO mistakes (
          id, user_id, challenge_id, challenge_title, category, summary, code_snippet, recommended_challenge_id, resolved, occurrences, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)`
      ).run(
        `m-${crypto.randomUUID().slice(0, 8)}`,
        params.userId,
        params.challengeId,
        params.challengeTitle,
        classified.category,
        classified.summary,
        params.code.slice(0, 320),
        params.challengeId,
        now
      );
    }
  }

  db.prepare(
    `INSERT INTO submissions (
      id, user_id, challenge_id, language, code, passed, passed_count, total_count, execution_ms, hints_used, xp_earned, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    `sub-${crypto.randomUUID().slice(0, 10)}`,
    params.userId,
    params.challengeId,
    params.language,
    params.code,
    params.passed ? 1 : 0,
    params.passedCount,
    params.totalCount,
    params.executionMs,
    params.hintsUsed,
    xpGained,
    now
  );

  if (xpGained > 0) {
    awardUserXp(params.userId, xpGained);
  }
  recordDailyActivity(params.userId, xpGained);

  // Update adaptive difficulty
  const stateAfter = getFullUserState(params.userId);
  if (stateAfter) {
    const unresolved = stateAfter.mistakes.filter((m) => !m.resolved).length;
    const assessment = computeAdaptiveDifficulty(
      stateAfter.submissions,
      unresolved,
      stateAfter.profile.adaptiveDifficulty
    );
    db.prepare(
      'UPDATE profiles SET adaptive_difficulty = ?, adaptive_note = ? WHERE user_id = ?'
    ).run(assessment.recommendedDifficulty, assessment.reason, params.userId);
  }

  const newlyUnlocked = checkAndGrantAchievements(params.userId);
  return {
    xpGained,
    newlyUnlocked,
    state: getFullUserState(params.userId),
  };
}

export function buildLeaderboard(currentUserId: string): LeaderboardEntry[] {
  const dbProfiles = db
    .prepare(
      `SELECT p.user_id, p.username, p.name, p.avatar_url, p.xp, p.level, p.level_title, s.current_streak
       FROM profiles p
       JOIN streaks s ON s.user_id = p.user_id`
    )
    .all() as Record<string, unknown>[];

  const entries: LeaderboardEntry[] = LEADERBOARD_COMPETITORS.map((c) => ({ ...c }));

  for (const row of dbProfiles) {
    const uid = String(row.user_id);
    const uname = String(row.username);
    const actRows = db
      .prepare(
        'SELECT COALESCE(SUM(xp_earned), 0) as wxp FROM activity_days WHERE user_id = ? AND activity_date >= ?'
      )
      .get(uid, getDateDaysAgo(6)) as { wxp: number };

    const existingIdx = entries.findIndex((e) => e.username === uname);
    const item: LeaderboardEntry = {
      rank: 0,
      username: uname,
      name: String(row.name),
      avatarUrl: String(row.avatar_url),
      xp: Number(row.xp),
      weeklyXp: Math.max(Number(actRows.wxp), 40),
      level: Number(row.level),
      levelTitle: String(row.level_title),
      streak: Number(row.current_streak),
      isFriend: true,
      isCurrentUser: uid === currentUserId,
    };

    if (existingIdx >= 0) {
      entries[existingIdx] = item;
    } else {
      entries.push(item);
    }
  }

  entries.sort((a, b) => b.xp - a.xp);
  return entries.map((e, idx) => ({ ...e, rank: idx + 1 }));
}
