import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLevelInfo,
  classifyMistake,
  computeAdaptiveDifficulty,
  evaluateNewAchievements,
  getStreakMilestoneInfo,
} from './progression';
import type { AchievementItem, SubmissionRecord } from '../types/codequest';

test('calculateLevelInfo maps XP thresholds to CodeQuest titles accurately', () => {
  const lvl1 = calculateLevelInfo(0);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.title, 'Code Rookie');
  assert.equal(lvl1.xpNeededForNext, 100);
  assert.equal(lvl1.progressPercent, 0);

  const lvl2 = calculateLevelInfo(175);
  assert.equal(lvl2.level, 2);
  assert.equal(lvl2.title, 'Syntax Explorer');
  assert.equal(lvl2.xpIntoLevel, 75);
  assert.equal(lvl2.xpNeededForNext, 75);
  assert.equal(lvl2.progressPercent, 50);

  const maxLvl = calculateLevelInfo(6000);
  assert.equal(maxLvl.level, 10);
  assert.equal(maxLvl.title, 'Code Legend');
  assert.equal(maxLvl.nextLevelXp, null);
  assert.equal(maxLvl.progressPercent, 100);
});

test('computeAdaptiveDifficulty increases difficulty when learner excels without hints', () => {
  const strongSubmissions: SubmissionRecord[] = [1, 2, 3, 4].map((n) => ({
    id: `s${n}`,
    challengeId: `c${n}`,
    language: 'javascript',
    passed: true,
    passedCount: 3,
    totalCount: 3,
    executionMs: 120,
    hintsUsed: 0,
    xpEarned: 25,
    createdAt: new Date().toISOString(),
  }));

  const result = computeAdaptiveDifficulty(strongSubmissions, 0, 'Beginner');
  assert.equal(result.recommendedDifficulty, 'Easy');
  assert.equal(result.successRate, 100);
  assert.match(result.reason, /Difficulty increased to Easy/);
});

test('computeAdaptiveDifficulty lowers difficulty when learner struggles repeatedly', () => {
  const strugglingSubmissions: SubmissionRecord[] = [1, 2, 3].map((n) => ({
    id: `s${n}`,
    challengeId: `c${n}`,
    language: 'python',
    passed: false,
    passedCount: 1,
    totalCount: 3,
    executionMs: 420,
    hintsUsed: 3,
    xpEarned: 0,
    createdAt: new Date().toISOString(),
  }));

  const result = computeAdaptiveDifficulty(strugglingSubmissions, 4, 'Intermediate');
  assert.equal(result.recommendedDifficulty, 'Easy');
  assert.match(result.reason, /reinforce the fundamentals/);
});

test('evaluateNewAchievements unlocks eligible badges without duplicating existing ones', () => {
  const catalog: AchievementItem[] = [
    {
      id: 'ach-first-code',
      title: 'First Code',
      description: 'Solve your first challenge',
      category: 'Milestones',
      xpBonus: 15,
      badgeIcon: 'Code2',
      requirementType: 'first_code',
      requirementValue: 1,
    },
    {
      id: 'ach-xp-500',
      title: '500 XP',
      description: 'Reach 500 XP',
      category: 'XP',
      xpBonus: 25,
      badgeIcon: 'Zap',
      requirementType: 'xp_500',
      requirementValue: 500,
    },
  ];

  const unlocked = evaluateNewAchievements(catalog, ['ach-first-code'], {
    xp: 520,
    level: 4,
    currentStreak: 3,
    solvedChallengeCount: 5,
    completedLessonCount: 8,
    defeatedBossCount: 0,
    completedProjectCount: 0,
    resolvedMistakeCount: 1,
    perfectFirstTryCount: 2,
    battleWins: 0,
  });

  assert.equal(unlocked.length, 1);
  assert.equal(unlocked[0].id, 'ach-xp-500');
});

test('classifyMistake identifies syntax, loop timeouts, and missing return values', () => {
  const syntaxRes = classifyMistake('SyntaxError: Unexpected token', 'function f() {', 'Logic');
  assert.equal(syntaxRes.category, 'Syntax');

  const loopRes = classifyMistake('Execution timed out (possible infinite loop)', 'while(true){}', 'Logic');
  assert.equal(loopRes.category, 'Loops');

  const fnRes = classifyMistake('Expected "Even" but got undefined', 'function checkNumber(n) { console.log(n); }', 'Logic');
  assert.equal(fnRes.category, 'Functions');
});

test('getStreakMilestoneInfo computes current streak badge and next milestone', () => {
  const s5 = getStreakMilestoneInfo(5);
  assert.equal(s5.currentBadge, 'Spark');
  assert.equal(s5.nextMilestone, 7);
  assert.equal(s5.nextBadge, 'Flame');
  assert.equal(s5.daysRemaining, 2);
  assert.equal(s5.progressPercent, 50);

  const sMax = getStreakMilestoneInfo(120);
  assert.equal(sMax.currentBadge, 'Legend');
  assert.equal(sMax.daysRemaining, 0);
  assert.equal(sMax.progressPercent, 100);
});

