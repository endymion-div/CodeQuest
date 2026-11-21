import type {
  AchievementItem,
  DifficultyTier,
  MistakeCategory,
  SubmissionRecord,
} from '../types/codequest';

export interface LevelDefinition {
  level: number;
  title: string;
  minXp: number;
}

export const LEVELS: LevelDefinition[] = [
  { level: 1, title: 'Code Rookie', minXp: 0 },
  { level: 2, title: 'Syntax Explorer', minXp: 100 },
  { level: 3, title: 'Logic Builder', minXp: 250 },
  { level: 4, title: 'Problem Solver', minXp: 500 },
  { level: 5, title: 'Code Knight', minXp: 850 },
  { level: 6, title: 'Algorithm Hunter', minXp: 1300 },
  { level: 7, title: 'Debugging Master', minXp: 1900 },
  { level: 8, title: 'Code Architect', minXp: 2650 },
  { level: 9, title: 'Algorithm Wizard', minXp: 3600 },
  { level: 10, title: 'Code Legend', minXp: 4800 },
];

export interface LevelProgressInfo {
  level: number;
  title: string;
  currentXp: number;
  levelFloorXp: number;
  nextLevelXp: number | null;
  xpIntoLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
}

export function calculateLevelInfo(xp: number): LevelProgressInfo {
  const safeXp = Math.max(0, Math.floor(xp));
  let active = LEVELS[0];

  for (const def of LEVELS) {
    if (safeXp >= def.minXp) {
      active = def;
    } else {
      break;
    }
  }

  const nextDef = LEVELS.find((l) => l.level === active.level + 1) ?? null;

  if (!nextDef) {
    return {
      level: active.level,
      title: active.title,
      currentXp: safeXp,
      levelFloorXp: active.minXp,
      nextLevelXp: null,
      xpIntoLevel: safeXp - active.minXp,
      xpNeededForNext: 0,
      progressPercent: 100,
    };
  }

  const span = nextDef.minXp - active.minXp;
  const xpIntoLevel = safeXp - active.minXp;
  const xpNeededForNext = Math.max(0, nextDef.minXp - safeXp);
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpIntoLevel / span) * 100)));

  return {
    level: active.level,
    title: active.title,
    currentXp: safeXp,
    levelFloorXp: active.minXp,
    nextLevelXp: nextDef.minXp,
    xpIntoLevel,
    xpNeededForNext,
    progressPercent,
  };
}

export interface AdaptiveDifficultyAssessment {
  recommendedDifficulty: DifficultyTier;
  reason: string;
  successRate: number;
  averageHints: number;
  averageDurationMs: number;
}

export function computeAdaptiveDifficulty(
  recentSubmissions: SubmissionRecord[],
  unresolvedMistakesCount: number,
  currentDifficulty: DifficultyTier = 'Beginner'
): AdaptiveDifficultyAssessment {
  if (recentSubmissions.length === 0) {
    return {
      recommendedDifficulty: currentDifficulty,
      reason: 'Complete your first challenges so the adaptive engine can calibrate your pace.',
      successRate: 100,
      averageHints: 0,
      averageDurationMs: 0,
    };
  }

  const windowSubmissions = recentSubmissions.slice(0, 8);
  const passedCount = windowSubmissions.filter((s) => s.passed).length;
  const successRate = Math.round((passedCount / windowSubmissions.length) * 100);
  const averageHints =
    windowSubmissions.reduce((sum, s) => sum + s.hintsUsed, 0) / windowSubmissions.length;
  const averageDurationMs =
    windowSubmissions.reduce((sum, s) => sum + s.executionMs, 0) / windowSubmissions.length;

  const tiers: DifficultyTier[] = ['Beginner', 'Easy', 'Intermediate', 'Hard'];
  const currentIdx = Math.max(0, tiers.indexOf(currentDifficulty));

  if (successRate >= 85 && averageHints <= 0.6 && windowSubmissions.length >= 3 && unresolvedMistakesCount <= 1) {
    const nextIdx = Math.min(tiers.length - 1, currentIdx + 1);
    const nextTier = tiers[nextIdx];
    return {
      recommendedDifficulty: nextTier,
      reason:
        nextIdx > currentIdx
          ? `Difficulty increased to ${nextTier} based on ${successRate}% accuracy and low hint reliance.`
          : `Maintaining ${nextTier} mastery with ${successRate}% recent accuracy.`,
      successRate,
      averageHints: Number(averageHints.toFixed(1)),
      averageDurationMs: Math.round(averageDurationMs),
    };
  }

  if (successRate < 50 || unresolvedMistakesCount >= 4 || averageHints >= 2.2) {
    const prevIdx = Math.max(0, currentIdx - 1);
    const prevTier = tiers[prevIdx];
    return {
      recommendedDifficulty: prevTier,
      reason: "Let's reinforce the fundamentals with targeted practice before advancing.",
      successRate,
      averageHints: Number(averageHints.toFixed(1)),
      averageDurationMs: Math.round(averageDurationMs),
    };
  }

  return {
    recommendedDifficulty: currentDifficulty,
    reason: `Steady progress at ${currentDifficulty} tier (${successRate}% pass rate).`,
    successRate,
    averageHints: Number(averageHints.toFixed(1)),
    averageDurationMs: Math.round(averageDurationMs),
  };
}

export interface AchievementCheckInput {
  xp: number;
  level: number;
  currentStreak: number;
  solvedChallengeCount: number;
  completedLessonCount: number;
  defeatedBossCount: number;
  completedProjectCount: number;
  resolvedMistakeCount: number;
  perfectFirstTryCount: number;
  battleWins: number;
}

export function evaluateNewAchievements(
  catalog: AchievementItem[],
  alreadyUnlockedIds: string[],
  stats: AchievementCheckInput
): AchievementItem[] {
  const unlockedSet = new Set(alreadyUnlockedIds);
  const newlyUnlocked: AchievementItem[] = [];

  for (const item of catalog) {
    if (unlockedSet.has(item.id)) continue;

    let met = false;
    switch (item.requirementType) {
      case 'first_code':
        met = stats.solvedChallengeCount >= item.requirementValue;
        break;
      case 'first_perfect':
        met = stats.perfectFirstTryCount >= item.requirementValue;
        break;
      case 'streak_7':
        met = stats.currentStreak >= item.requirementValue;
        break;
      case 'xp_100':
      case 'xp_500':
        met = stats.xp >= item.requirementValue;
        break;
      case 'challenges_10':
        met = stats.solvedChallengeCount >= item.requirementValue;
        break;
      case 'lessons_10':
        met = stats.completedLessonCount >= item.requirementValue;
        break;
      case 'boss_1':
        met = stats.defeatedBossCount >= item.requirementValue;
        break;
      case 'project_1':
        met = stats.completedProjectCount >= item.requirementValue;
        break;
      case 'mistakes_resolved':
        met = stats.resolvedMistakeCount >= item.requirementValue;
        break;
      case 'level_10':
        met = stats.level >= item.requirementValue;
        break;
      case 'battle_win':
        met = stats.battleWins >= item.requirementValue;
        break;
    }

    if (met) {
      newlyUnlocked.push(item);
    }
  }

  return newlyUnlocked;
}

export function classifyMistake(
  errorMessage: string,
  code: string,
  fallbackTopic: MistakeCategory
): { category: MistakeCategory; summary: string } {
  const lowerErr = errorMessage.toLowerCase();
  const lowerCode = code.toLowerCase();

  if (
    lowerErr.includes('syntaxerror') ||
    lowerErr.includes('unexpected token') ||
    lowerErr.includes('indentation') ||
    lowerErr.includes('missing )') ||
    lowerErr.includes('unterminated')
  ) {
    return {
      category: 'Syntax',
      summary: 'Syntax mismatch detected — check brackets, colons, indentation, or punctuation.',
    };
  }

  if (lowerErr.includes('timed out') || lowerErr.includes('infinite') || lowerErr.includes('loop')) {
    return {
      category: 'Loops',
      summary: 'Loop execution exceeded time limit — verify your loop exit condition and counter update.',
    };
  }

  if (lowerCode.includes('for') || lowerCode.includes('while')) {
    if (lowerErr.includes('off by') || lowerErr.includes('undefined') || lowerErr.includes('index')) {
      return {
        category: 'Loops',
        summary: 'Check your loop bounds (< vs <=) and ensure your loop variable updates properly.',
      };
    }
  }

  if (lowerErr.includes('not a function') || lowerErr.includes('return') || !lowerCode.includes('return')) {
    return {
      category: 'Functions',
      summary: 'Ensure your function explicitly returns the computed value instead of only logging it.',
    };
  }

  if (lowerErr.includes('length') || lowerErr.includes('index') || lowerErr.includes('slice')) {
    return {
      category: 'Arrays',
      summary: 'Array or string index boundary issue — double-check zero-based indexing.',
    };
  }

  return {
    category: fallbackTopic,
    summary: errorMessage
      ? `Runtime or assertion mismatch: ${errorMessage.slice(0, 120)}`
      : `Output did not match all expected ${fallbackTopic.toLowerCase()} test cases.`,
  };
}

export interface StreakMilestoneInfo {
  currentStreak: number;
  currentBadge: string;
  nextMilestone: number;
  nextBadge: string;
  daysRemaining: number;
  progressPercent: number;
}

const STREAK_TIERS = [
  { days: 3, badge: 'Spark' },
  { days: 7, badge: 'Flame' },
  { days: 14, badge: 'Surge' },
  { days: 30, badge: 'Nova' },
  { days: 60, badge: 'Titan' },
  { days: 100, badge: 'Legend' },
];

export function getStreakMilestoneInfo(currentStreak: number): StreakMilestoneInfo {
  const safeStreak = Math.max(0, Math.floor(currentStreak));
  let currentBadge = 'Initiate';
  let prevThreshold = 0;

  for (const tier of STREAK_TIERS) {
    if (safeStreak >= tier.days) {
      currentBadge = tier.badge;
      prevThreshold = tier.days;
    } else {
      const span = tier.days - prevThreshold;
      const intoTier = safeStreak - prevThreshold;
      return {
        currentStreak: safeStreak,
        currentBadge,
        nextMilestone: tier.days,
        nextBadge: tier.badge,
        daysRemaining: tier.days - safeStreak,
        progressPercent: Math.min(100, Math.max(0, Math.round((intoTier / span) * 100))),
      };
    }
  }

  return {
    currentStreak: safeStreak,
    currentBadge: 'Legend',
    nextMilestone: 100,
    nextBadge: 'Legend',
    daysRemaining: 0,
    progressPercent: 100,
  };
}

